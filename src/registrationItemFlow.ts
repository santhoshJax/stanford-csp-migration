/**
 * Stanford CSP Migration – Registration Item Import flow.
 *
 * Source: the "Enrollment" TSV (config var "Enrollment File ID"), read per the
 * OrderItem rows on the "Registration" tab of the mapping workbook. Each
 * enrollment is the tuition line of a course checkout, so it becomes ONE
 * OrderItem on the Order that Registration Import created for its
 * Registration_ID.
 *
 * ORDER OF RUNS (same two-round model as Purchase):
 *   1. Course imports  — Product2 + PricebookEntry per course
 *   2. Registration Import, "Activate Registration Orders" = false
 *                      — Orders created Draft, Pricebook2Id = order price book
 *   3. Registration Item Import (this flow) — OrderItems on the Draft Orders
 *   4. Registration Import, "Activate Registration Orders" = true
 *                      — Draft Orders that have line items → Activated
 *
 * Workbook mapping (Registration tab, OrderItem rows):
 *   Enrollment.Registration_ID → OrderId        (Order.External_ID_4D__c = REG-{Registration_ID}, resolved by Salesforce)
 *   Enrollment.Tuition         → UnitPrice      (Direct Map)
 *   (default)                  → Quantity = 1
 *   Enrollment.Course_ID       → Course_Offering__c (CourseOffering.External_ID_4D__c)
 *   Enrollment.Course_ID       → Product2Id     (the course Product) — written
 *                                 as PricebookEntryId, which implies the Product2
 *   Enrollment.Student_ID      → Student__c     (Account.Student_ID_4D__c)
 *   (default)                  → Type = "Order Product"
 *
 * Upsert key: OrderItem.External_ID_4D__c = "ENR-" + Enrollment.ID. OrderItem
 * is its own object, so this does not collide with the "ENR-" keys on
 * CourseOfferingParticipant; Purchase Item uses "PIT-" on the same object.
 *
 * Pre-flight caches (built per window, before the Bulk job):
 *   - Course_ID → PricebookEntry Id in the ORDER price book (same rule
 *     Registration Import uses). Only entries whose Product2 has
 *     Course_Offering__c are loaded, so Purchase Inventory products can never
 *     match a course line.
 *   - Order state by Registration_ID. A line is only sent when its Order
 *     exists AND is still Draft (Salesforce cannot add items to an Activated
 *     Order). Everything else is skipped and counted, not left to fail one by
 *     one in the Bulk job.
 *
 * WHICH ENROLLMENT ROWS GET A LINE — each rule is a constant below, not silent:
 *   - EVERY enrollment row under a registration gets a line, whatever its
 *     Status — CONFIRMED by the architect (2026-11-02): "bring all enrollment
 *     rows under each registration". Status "New" and "DupEnrollment" are no
 *     longer skipped (EXCLUDED_STATUSES is empty).
 *   - Add, Drop and Adjustment (AJST) rows EACH get their own line —
 *     CONFIRMED by the architect (Trevor, 2026-11-02): "They'll need to have
 *     a line item and show up as extra rows. CSP has already agreed to the
 *     extra rows living in salesforce for the migration."
 *     (INCLUDE_DROP_ROWS / INCLUDE_ADJUSTMENT_ROWS = true.) The line's
 *     UnitPrice is the row's Tuition as-is; whether 4D stores Tuition on a
 *     Drop/AJST row as negative or repeats the positive price is not yet
 *     checked against real Enrollment rows — if positive, Order totals will
 *     overstate the charge.
 *   - UnitPrice = Tuition — CONFIRMED by the architect (2026-11-02): "Use the
 *     tuition". Fee, Extension (net) and TA_Discount have no line and are not
 *     mapped. Salesforce totals the Order from its line items.
 *   - Orders are the 2-year scope (Registration_Date), so enrollments of older
 *     registrations are skipped as "Order not loaded".
 *
 * Skipped rows: every row not sent (and why) is written to a "Skipped" tab on
 * the results sheet — the Enrollment source columns plus "Skip Reason".
 *
 * Windowed execution / TEST_MODE: same model as Registration; TEST_MODE is ON.
 */

import { flow, type Connection } from "@prismatic-io/spectral";
import { str, getAccessToken, getSfInstanceUrl } from "./utils";
import {
  buildSkippedTab,
  createPerObjectResultsSheet,
  type SkippedRow,
} from "./reportResults";
import {
  EXT_ID_FIELD,
  type SfRecord,
  PRICE_BOOKS_CONFIG_VAR,
  loadOrderStates,
  orderPricebook,
  REGISTRATION_EXT_PREFIX,
  registrationExtId,
  resolveConfiguredPricebooks,
  invokeNextWindow,
  parseCurrency,
  readWindowCursor,
  sfQueryAll,
  streamTsvWindow,
  stripDotZero,
  upsertInBatches,
} from "./commerceShared";

const SF_ORDER_ITEM = "OrderItem";
const FLOW_NAME = "Registration Item Import";
export const REGISTRATION_ITEM_EXT_PREFIX = "ENR-";

/** OrderItem.Type default per the workbook. */
export const ORDER_ITEM_TYPE = "Order Product";

const MAX_ROWS = 25_000;
const TEST_MODE = true;
const TEST_LIMIT = 50;
const TEST_SKIP = 0;

/**
 * Drop rows are refund records 4D creates beside the original Add row.
 * true = they get their own line (architect, 2026-11-02).
 */
export const INCLUDE_DROP_ROWS = true;
/**
 * Adjustment (AJST) rows are late refunds / tuition changes.
 * true = they get their own line (architect, 2026-11-02).
 */
export const INCLUDE_ADJUSTMENT_ROWS = true;
/**
 * Enrollment.Status values that never get a line (lower case). EMPTY by
 * architect decision (2026-11-02): every enrollment row under a registration
 * gets a line, including Status "New" and "DupEnrollment". Kept as a set so a
 * status can be excluded again without touching the mapper.
 */
export const EXCLUDED_STATUSES = new Set<string>();

export interface RawEnrollmentRow {
  ID?: string;
  Registration_ID?: string;
  Student_ID?: string;
  Course_ID?: string;
  Status?: string;
  Add_Drop?: string;
  Tuition?: string;
  [key: string]: string | undefined;
}

export interface RegistrationItemCaches {
  /** Course_ID (Product2.External_ID_4D__c) → order-price-book PricebookEntry.Id */
  pricebookEntryByCourseId: Map<string, string>;
  /** Registration_ID → Status of the Order (only Orders that exist). */
  orderStatusByRegistrationId: Map<string, string>;
}

export interface RegistrationItemSkips {
  noId: number;
  noRegistrationId: number;
  excludedStatus: number;
  dropRows: number;
  adjustmentRows: number;
  orderNotLoaded: number;
  orderNotDraft: number;
  noCourseId: number;
  badTuition: number;
  unmatchedCourses: Map<string, number>;
  /** Every skipped row with its reason — written to the "Skipped" tab. */
  records: SkippedRow[];
}

export function newSkips(): RegistrationItemSkips {
  return {
    noId: 0,
    noRegistrationId: 0,
    excludedStatus: 0,
    dropRows: 0,
    adjustmentRows: 0,
    orderNotLoaded: 0,
    orderNotDraft: 0,
    noCourseId: 0,
    badTuition: 0,
    unmatchedCourses: new Map(),
    records: [],
  };
}

/** "ADD"/"Add" → add, "DROP"/"Drop" → drop, "AJST" → adjustment (per the Enrollment tab). */
export function normalizeAddDrop(
  raw: string | undefined,
): "add" | "drop" | "adjustment" | "" {
  const v = str(raw).trim().toLowerCase();
  if (v === "add") return "add";
  if (v === "drop") return "drop";
  if (v === "ajst" || v === "adjustment") return "adjustment";
  return "";
}

/**
 * Maps one Enrollment row to an OrderItem, or returns null (and counts why).
 * Pure — tested directly. Check order is deliberate: cheap row-level rules
 * first, then the Order, then the Product.
 */
export function mapToOrderItem(
  raw: RawEnrollmentRow,
  caches: RegistrationItemCaches,
  skips: RegistrationItemSkips,
  logger: { warn: (m: string) => void },
): SfRecord | null {
  const skip = (reason: string): null => {
    skips.records.push({ row: raw, reason });
    return null;
  };

  const id = stripDotZero(raw.ID);
  if (!id) {
    skips.noId++;
    return skip("No Enrollment ID");
  }

  const registrationId = stripDotZero(raw.Registration_ID);
  if (!registrationId || registrationId === "0") {
    skips.noRegistrationId++;
    return skip("No Registration_ID");
  }

  const status = str(raw.Status).trim();
  if (EXCLUDED_STATUSES.has(status.toLowerCase())) {
    skips.excludedStatus++;
    return skip(`Status "${status}" is excluded (EXCLUDED_STATUSES)`);
  }

  const kind = normalizeAddDrop(raw.Add_Drop);
  if (kind === "drop" && !INCLUDE_DROP_ROWS) {
    skips.dropRows++;
    return skip("Drop row (INCLUDE_DROP_ROWS = false)");
  }
  if (kind === "adjustment" && !INCLUDE_ADJUSTMENT_ROWS) {
    skips.adjustmentRows++;
    return skip("Adjustment row (INCLUDE_ADJUSTMENT_ROWS = false)");
  }

  const orderStatus = caches.orderStatusByRegistrationId.get(registrationId);
  if (orderStatus === undefined) {
    skips.orderNotLoaded++;
    return skip(
      `Order not loaded — no Order with External_ID_4D__c = ${registrationId} ` +
        "(outside the 2-year Order window, or Registration Import failed for it)",
    );
  }
  if (orderStatus !== "Draft") {
    skips.orderNotDraft++;
    return skip(
      `Order ${registrationId} is ${orderStatus} — line items can only be added to a Draft Order`,
    );
  }

  const courseId = str(raw.Course_ID).trim();
  if (!courseId) {
    skips.noCourseId++;
    return skip("No Course_ID");
  }
  const pbeId = caches.pricebookEntryByCourseId.get(courseId);
  if (!pbeId) {
    skips.unmatchedCourses.set(
      courseId,
      (skips.unmatchedCourses.get(courseId) ?? 0) + 1,
    );
    return skip(
      `No course Product with an active entry in the order price book for Course_ID ${courseId}`,
    );
  }

  // Zero tuition is valid (15,783 source rows per the Enrollment tab) and kept.
  const tuition = parseCurrency(raw.Tuition);
  if (tuition === undefined) {
    skips.badTuition++;
    logger.warn(
      `[${FLOW_NAME}] Enrollment ${id} has no parseable Tuition "${str(raw.Tuition)}" — skipped (UnitPrice is required)`,
    );
    return skip(
      `Tuition "${str(raw.Tuition)}" is not a number (UnitPrice is required)`,
    );
  }
  if (tuition < 0) {
    logger.warn(
      `[${FLOW_NAME}] Enrollment ${id} has negative Tuition ${tuition} — loaded as-is; confirm the org accepts a negative UnitPrice`,
    );
  }

  const record: SfRecord = {
    [EXT_ID_FIELD]: `${REGISTRATION_ITEM_EXT_PREFIX}${id}`,
    // Order was created by Registration Import with key REG-{Registration.ID}.
    "Order.External_ID_4D__c": registrationExtId(registrationId),
    PricebookEntryId: pbeId,
    UnitPrice: tuition,
    Quantity: 1,
    Type: ORDER_ITEM_TYPE,
    "Course_Offering__r.External_ID_4D__c": courseId,
  };

  const studentId = stripDotZero(raw.Student_ID);
  if (studentId && studentId !== "0") {
    record["Student__r.Student_ID_4D__c"] = studentId;
  }

  return record;
}

export const registrationItemImport = flow({
  name: FLOW_NAME,
  stableKey: "regi2026-1102-4c01-9d10-0a1b2c3d4e11",
  description:
    "Streams the Enrollment TSV from Google Drive one window at a time and " +
    "bulk-upserts one OrderItem (tuition line) per enrollment onto the Draft " +
    "Orders created by Registration Import. Must run after the Course imports " +
    "and Registration Import; then run Registration Import again with " +
    "Activate Registration Orders = true.",

  onTrigger: async (_context, payload) => {
    await Promise.resolve();
    return { payload };
  },

  onExecution: async (context, params) => {
    const { logger, configVars } = context;
    const { byteOffset, knownHeaders, windowNumber } = readWindowCursor(params);

    logger.info(
      `[${FLOW_NAME}] Starting window ${windowNumber} at byte ${byteOffset}…`,
    );

    const gdConn = configVars[
      "Google Drive Connection"
    ] as unknown as Connection;
    const sfConn = configVars["Salesforce Connection"] as unknown as Connection;
    const fileId = configVars["Enrollment File ID"] as unknown as string;
    const failedFolderId = configVars["Failed Records Folder ID"] as
      string | undefined;
    if (!fileId) throw new Error("Enrollment File ID config var is empty.");

    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfBase = getSfInstanceUrl(sfConn);

    // ── Product cache: same order price book Registration Import used ───────
    const orderBook = orderPricebook(
      await resolveConfiguredPricebooks(
        sfBase,
        sfToken,
        configVars[PRICE_BOOKS_CONFIG_VAR] as unknown as string | undefined,
        logger,
      ),
    );
    logger.info(`[${FLOW_NAME}] Order price book: "${orderBook.name}"`);
    const entries = await sfQueryAll<{
      Id: string;
      Product2: { External_ID_4D__c: string | null } | null;
    }>(
      sfBase,
      sfToken,
      `SELECT Id, Product2.External_ID_4D__c FROM PricebookEntry WHERE Pricebook2Id = '${orderBook.id}' ` +
        "AND IsActive = true AND Product2.Course_Offering__c != null AND Product2.External_ID_4D__c != null",
      logger,
    );
    const pricebookEntryByCourseId = new Map<string, string>();
    for (const e of entries) {
      const courseId = e.Product2?.External_ID_4D__c;
      if (courseId && !pricebookEntryByCourseId.has(courseId)) {
        pricebookEntryByCourseId.set(courseId, e.Id);
      }
    }
    logger.info(
      `[${FLOW_NAME}] Course products with an active entry in "${orderBook.name}": ${pricebookEntryByCourseId.size}`,
    );
    if (pricebookEntryByCourseId.size === 0) {
      throw new Error(
        `No course Product2/PricebookEntry rows found in "${orderBook.name}" — ` +
          "run the Course imports first (with this price book in the Price Books config var).",
      );
    }

    // ── Stream this window ───────────────────────────────────────────────────
    const rows: RawEnrollmentRow[] = [];
    const window = await streamTsvWindow(
      fileId,
      gdToken,
      byteOffset,
      MAX_ROWS,
      knownHeaders,
      (row: RawEnrollmentRow) => {
        rows.push(row);
      },
    );
    const { rowsInWindow, hasMore, nextByteOffset, parsedHeaders } = window;

    // ── Order cache for just this window's Registration_IDs ─────────────────
    const registrationIds = rows
      .map((r) => stripDotZero(r.Registration_ID))
      .filter((v) => v && v !== "0");
    // Orders are keyed "REG-{id}"; the cache is keyed by the raw
    // Registration_ID so mapToOrderItem can look it up straight from the row.
    const orderStates = await loadOrderStates(
      sfBase,
      sfToken,
      registrationIds.map(registrationExtId),
      logger,
    );
    const caches: RegistrationItemCaches = {
      pricebookEntryByCourseId,
      orderStatusByRegistrationId: new Map(
        [...orderStates].map(([extId, v]) => [
          extId.startsWith(REGISTRATION_EXT_PREFIX)
            ? extId.slice(REGISTRATION_EXT_PREFIX.length)
            : extId,
          v.status,
        ]),
      ),
    };

    let items: SfRecord[] = [];
    const skips = newSkips();
    for (const row of rows) {
      const item = mapToOrderItem(row, caches, skips, logger);
      if (item) items.push(item);
    }

    const unmatched = [...skips.unmatchedCourses.entries()]
      .slice(0, 20)
      .map(([k, v]) => `${k}×${v}`)
      .join(", ");
    logger.info(
      `[${FLOW_NAME}] Window ${windowNumber} mapped — rows=${rowsInWindow}, orderItems=${items.length}, skipped: ` +
        `noRegistrationId=${skips.noRegistrationId}, excludedStatus=${skips.excludedStatus}, ` +
        `dropRows=${skips.dropRows}, adjustmentRows=${skips.adjustmentRows}, ` +
        `orderNotLoaded=${skips.orderNotLoaded}, orderNotDraft=${skips.orderNotDraft}, ` +
        `noCourseId=${skips.noCourseId}, badTuition=${skips.badTuition}, ` +
        `courseWithoutProduct=${[...skips.unmatchedCourses.values()].reduce((a, b) => a + b, 0)}`,
    );
    if (skips.unmatchedCourses.size > 0) {
      logger.warn(
        `[${FLOW_NAME}] ${skips.unmatchedCourses.size} Course_ID(s) have no course Product with an active entry in "${orderBook.name}" ` +
          `(load them via the Course imports) — first 20: ${unmatched}`,
      );
    }
    if (skips.orderNotDraft > 0) {
      logger.warn(
        `[${FLOW_NAME}] ${skips.orderNotDraft} enrollment(s) belong to an Order that is no longer Draft — ` +
          "line items cannot be added to an Activated Order.",
      );
    }

    if (TEST_MODE) {
      items = items.slice(TEST_SKIP, TEST_SKIP + TEST_LIMIT);
      logger.info(
        `[${FLOW_NAME}] TEST MODE: limited to ${TEST_LIMIT} OrderItem(s) and won't invoke the next window.`,
      );
    }

    const result =
      items.length > 0
        ? await upsertInBatches(
            items,
            SF_ORDER_ITEM,
            sfBase,
            sfToken,
            logger,
            `[${FLOW_NAME}][OrderItem]`,
          )
        : { processed: 0, failed: 0, successfulCsv: "", failedCsv: "" };

    try {
      const sheet = await createPerObjectResultsSheet({
        flowName: FLOW_NAME,
        objects: [
          {
            objectName: SF_ORDER_ITEM,
            successfulCsv: result.successfulCsv,
            failedCsv: result.failedCsv,
          },
        ],
        skipped: buildSkippedTab(parsedHeaders, skips.records),
        accessToken: gdToken,
        folderId: failedFolderId,
      });
      logger.info(`[${FLOW_NAME}] Results sheet: ${sheet.url}`);
    } catch (err) {
      logger.warn(
        `[${FLOW_NAME}] Could not write results sheet: ${String(err)}`,
      );
    }

    logger.info(
      `[${FLOW_NAME}] Window ${windowNumber} complete — OrderItem submitted: ${items.length}, ` +
        `processed: ${result.processed}, failed: ${result.failed}`,
    );

    if (TEST_MODE && hasMore) {
      logger.info(
        `[${FLOW_NAME}] TEST MODE: more rows remain, but stopping here — set TEST_MODE = false to process the full file.`,
      );
    } else if (hasMore) {
      await invokeNextWindow(context, FLOW_NAME, {
        byteOffset: nextByteOffset,
        headers: parsedHeaders,
        windowNumber: windowNumber + 1,
      });
    } else {
      logger.info(
        `[${FLOW_NAME}] All rows processed — import complete after ${windowNumber} window(s).`,
      );
    }

    return {
      data: {
        windowNumber,
        byteOffset,
        nextByteOffset,
        hasMore,
        rowsInWindow,
        orderItems: items.length,
        orderItemsProcessed: result.processed,
        orderItemsFailed: result.failed,
        skippedTotal: skips.records.length,
        skippedOrderNotLoaded: skips.orderNotLoaded,
        skippedOrderNotDraft: skips.orderNotDraft,
        skippedDropRows: skips.dropRows,
        skippedAdjustmentRows: skips.adjustmentRows,
        skippedExcludedStatus: skips.excludedStatus,
        skippedCourseWithoutProduct: [
          ...skips.unmatchedCourses.values(),
        ].reduce((a, b) => a + b, 0),
      },
    };
  },
});

export default [registrationItemImport];
