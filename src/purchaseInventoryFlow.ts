/**
 * Stanford CSP Migration – Purchase Inventory Import flow.
 *
 * Source: "Purchase Inventory" tab of the Registration-area mapping workbook.
 * Purchase Inventory is the 4D catalogue of things that can be bought on a
 * Purchase (e.g. Manuscript_Surcharge, Transcript). It becomes the Product2 /
 * PricebookEntry catalogue that Purchase Item (OrderItem) lines point at.
 *
 *   1. Product2        — bulk-upserted on External_ID_4D__c = Purchase
 *                        Inventory.ID.
 *   2. PricebookEntry  — one per Product2 in EVERY price book named in the
 *                        "Price Books" config var (comma-separated). The
 *                        Standard Price Book is always loaded first, because
 *                        Salesforce rejects a custom-book entry for a product
 *                        with no standard entry.
 *                        Bulk-upserted on External_ID_4D__c (D01, 2026-11-11):
 *                          Standard Price Book → "STD-" + Purchase Inventory.ID
 *                          custom price book   → Purchase Inventory.ID
 *                        The file is the source of truth: on a re-run an
 *                        existing entry's UnitPrice and IsActive are
 *                        overwritten with the file values.
 *                        Pricebook2Id / Product2Id cannot be changed on an
 *                        existing entry, so they are sent on NEW entries only;
 *                        existing entries get a key + UnitPrice + IsActive
 *                        upsert. An existing entry with no key (loaded before
 *                        D01) is given its key first by an update on its Id.
 *                        See planPricebookEntries.
 *
 * The catalogue is small (a few dozen rows), so this runs as a single pass —
 * no windowing / self-invoke.
 *
 * MUST RUN BEFORE: Purchase Item Import (it resolves Item_Type → PricebookEntry
 * by Product2.Name). Independent of the Student flow.
 *
 * Field mapping (workbook "Map Type" column):
 *   Product2:      ID → External_ID_4D__c, Item_Type → ProductCode AND Name,
 *                  Description → Description, Unit_Description →
 *                  QuantityUnitOfMeasure, Active → IsActive
 *   PricebookEntry: Unit_Price → UnitPrice, Active → IsActive,
 *                  Product2Id → the Product2 created above (conversion)
 *   Do Not Map:    Created_*, Last_Modified_*
 *
 * OPEN / ASSUMPTIONS (surfaced in the review, not silently decided):
 *   - The workbook spells the external id "External_Id_4D"; every verified
 *     object in this org uses External_ID_4D__c, so that is what is written.
 *     Confirm the field exists + is flagged External ID on Product2.
 *   - Product2.Name is used later as the lookup key for Purchase Item. If two
 *     inventory rows share an Item_Type the lookup is ambiguous — the first
 *     one wins and a warning is logged here.
 *   - QuantityUnitOfMeasure is a restricted picklist. The 5 values found in
 *     the source were added to the org picklist (2026-10-31) and are listed in
 *     VALID_QUANTITY_UNITS. Any other value is skipped with a warning.
 *   - Product IDs: inventory IDs (1-9) and course IDs never overlap
 *     (confirmed 2026-10-31), so the raw ID is the key with no prefix.
 *   - The workbook never names a Pricebook2; the price books come from the
 *     "Price Books" config var (blank = Standard Price Book only). A name
 *     that matches no active Pricebook2 stops the run before any entry is
 *     written.
 *   - The key format gives every custom book the same key ({ID}), so it only
 *     supports ONE custom price book. More than one in the config var stops
 *     the run before anything is written.
 *
 * Results sheet: Product2 Success/Errors, one Success/Errors pair PER PRICE
 * BOOK ("PricebookEntry <book name> - …"), and a "PricebookEntry - Skipped"
 * tab for entries not sent (no price, key conflict, key backfill failed).
 */

import { flow, type Connection } from "@prismatic-io/spectral";
import { str, toBool, getAccessToken, getSfInstanceUrl } from "./utils";
import {
  createPerObjectResultsSheet,
  SKIP_REASON_COLUMN,
  type ObjectResultData,
} from "./reportResults";
import {
  EXT_ID_FIELD,
  type SfRecord,
  type ResolvedPricebook,
  PRICE_BOOKS_CONFIG_VAR,
  mergeResultCsvs,
  updateViaComposite,
  parseCurrency,
  resolveConfiguredPricebooks,
  parseSuccessfulSfIds,
  sfQueryAll,
  streamTsvWindow,
  upsertInBatches,
} from "./commerceShared";

const SF_PRODUCT2 = "Product2";

/** Restricted picklist Product2.QuantityUnitOfMeasure — values added to the org 2026-10-31. */
export const VALID_QUANTITY_UNITS = new Set<string>([
  "Each",
  "per 1,000 words",
  "per application cycle",
  "First one is free, $10 charged for each additional",
  "per course",
]);

const SF_PRICEBOOK_ENTRY = "PricebookEntry";

/** Key prefix for Standard Price Book entries (D01). Custom-book keys are the raw ID. */
export const STANDARD_PBE_KEY_PREFIX = "STD-";

/** PricebookEntry.External_ID_4D__c for one inventory item in one price book. */
export function pricebookEntryExtId(
  book: Pick<ResolvedPricebook, "isStandard">,
  inventoryId: string,
): string {
  return book.isStandard
    ? `${STANDARD_PBE_KEY_PREFIX}${inventoryId}`
    : inventoryId;
}

/**
 * The key format gives every custom book the key {ID}, so two custom books
 * would collide on External_ID_4D__c. Throws before anything is written.
 */
export function assertSupportedPricebooks(
  books: Pick<ResolvedPricebook, "name" | "isStandard">[],
): void {
  const custom = books.filter((b) => !b.isStandard);
  if (custom.length > 1) {
    throw new Error(
      `Purchase Inventory supports one custom price book, but the "${PRICE_BOOKS_CONFIG_VAR}" config var ` +
        `names ${custom.length}: ${custom.map((b) => `"${b.name}"`).join(", ")}. ` +
        "Custom-book PricebookEntry keys are the raw inventory ID, so a second custom book would " +
        "collide on External_ID_4D__c. Nothing was written.",
    );
  }
}

/** Results-sheet object name for one price book (tab-safe characters only). */
export function pricebookResultObjectName(
  book: Pick<ResolvedPricebook, "name">,
): string {
  const safe = book.name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${SF_PRICEBOOK_ENTRY} ${safe || "Price Book"}`;
}

/** A PricebookEntry already in Salesforce (from the pre-load query). */
export interface ExistingPricebookEntry {
  Id: string;
  Pricebook2Id: string;
  Product2Id: string;
  External_ID_4D__c: string | null;
}

/** One inventory item ready for pricing. */
export interface InventoryPriceInput {
  extId: string;
  product2Id: string;
  unitPrice?: number;
  isActive: boolean;
}

export interface PricebookEntrySkip {
  extId: string;
  product2Id: string;
  reason: string;
}

export interface PricebookEntryPlan {
  /** New entries — full record, upserted on External_ID_4D__c. */
  toCreate: SfRecord[];
  /** Existing entries — key + UnitPrice + IsActive only, upserted on External_ID_4D__c. */
  toUpdate: SfRecord[];
  /** Existing entries with no key — composite update by Id that sets the key, BEFORE toUpdate. */
  toBackfill: SfRecord[];
  skipped: PricebookEntrySkip[];
}

/**
 * Decides, for one price book, what this run sends for each inventory item.
 * Pure — tested directly. `existing` holds the entries in this book plus any
 * entry (in any book) that already uses one of this book's keys.
 *   - No parseable Unit_Price                       → skipped.
 *   - Entry for the product in this book:
 *       key matches                                 → update price/active.
 *       no key, and no other entry holds the key    → backfill key, then update.
 *       no key, but another entry holds the key     → skipped (conflict).
 *       a different key                             → skipped (conflict, not overwritten).
 *   - No entry for the product in this book:
 *       key free                                    → create.
 *       key used by another entry                   → skipped (conflict).
 */
export function planPricebookEntries(
  book: Pick<ResolvedPricebook, "id" | "isStandard">,
  inputs: InventoryPriceInput[],
  existing: ExistingPricebookEntry[],
): PricebookEntryPlan {
  const plan: PricebookEntryPlan = {
    toCreate: [],
    toUpdate: [],
    toBackfill: [],
    skipped: [],
  };
  const inBookByProduct = new Map<string, ExistingPricebookEntry>();
  const byKey = new Map<string, ExistingPricebookEntry>();
  for (const e of existing) {
    if (e.Pricebook2Id === book.id && !inBookByProduct.has(e.Product2Id)) {
      inBookByProduct.set(e.Product2Id, e);
    }
    if (e.External_ID_4D__c) byKey.set(e.External_ID_4D__c, e);
  }

  for (const input of inputs) {
    const skip = (reason: string) =>
      plan.skipped.push({
        extId: input.extId,
        product2Id: input.product2Id,
        reason,
      });
    if (input.unitPrice === undefined) {
      skip("No parseable Unit_Price — PricebookEntry.UnitPrice is required");
      continue;
    }
    const key = pricebookEntryExtId(book, input.extId);
    const update: SfRecord = {
      [EXT_ID_FIELD]: key,
      UnitPrice: input.unitPrice,
      IsActive: input.isActive,
    };
    const current = inBookByProduct.get(input.product2Id);
    const holder = byKey.get(key);

    if (current) {
      const currentKey = current.External_ID_4D__c;
      if (currentKey === key) {
        plan.toUpdate.push(update);
      } else if (!currentKey) {
        if (holder && holder.Id !== current.Id) {
          skip(
            `Existing entry ${current.Id} has no key, but key "${key}" is already on PricebookEntry ${holder.Id}`,
          );
        } else {
          plan.toBackfill.push({
            attributes: { type: SF_PRICEBOOK_ENTRY },
            Id: current.Id,
            [EXT_ID_FIELD]: key,
          });
          plan.toUpdate.push(update);
        }
      } else {
        skip(
          `Existing entry ${current.Id} has External_ID_4D__c "${currentKey}", expected "${key}" — not overwritten`,
        );
      }
    } else if (holder) {
      skip(
        `Key "${key}" is already on PricebookEntry ${holder.Id} (another product or price book)`,
      );
    } else {
      plan.toCreate.push({
        [EXT_ID_FIELD]: key,
        Pricebook2Id: book.id,
        Product2Id: input.product2Id,
        UnitPrice: input.unitPrice,
        IsActive: input.isActive,
      });
    }
  }
  return plan;
}

/** Drops toUpdate records whose key backfill failed, moving them to skipped. */
export function applyBackfillFailures(
  plan: PricebookEntryPlan,
  failedIds: Map<string, string>,
): void {
  if (failedIds.size === 0) return;
  const failedKeys = new Map<string, string>();
  for (const b of plan.toBackfill) {
    const err = failedIds.get(String(b.Id));
    if (err !== undefined)
      failedKeys.set(String(b[EXT_ID_FIELD]), `${String(b.Id)}: ${err}`);
  }
  plan.toUpdate = plan.toUpdate.filter((u) => {
    const key = String(u[EXT_ID_FIELD]);
    const err = failedKeys.get(key);
    if (err === undefined) return true;
    plan.skipped.push({
      extId: key.startsWith(STANDARD_PBE_KEY_PREFIX)
        ? key.slice(STANDARD_PBE_KEY_PREFIX.length)
        : key,
      product2Id: "",
      reason: `Could not set the key on existing entry ${err}`,
    });
    return false;
  });
}

interface PricebookLoadSummary {
  pricebook: string;
  created: number;
  updated: number;
  failed: number;
  skipped: number;
}

export interface RawPurchaseInventoryRow {
  ID?: string;
  Item_Type?: string;
  Description?: string;
  Unit_Price?: string;
  Unit_Description?: string;
  Active?: string;
  [key: string]: string | undefined;
}

export function mapToProduct2(
  raw: RawPurchaseInventoryRow,
  logger: { warn: (m: string) => void },
): SfRecord | null {
  const id = str(raw.ID).trim();
  const itemType = str(raw.Item_Type).trim();
  if (!id) return null;
  if (!itemType) {
    logger.warn(
      `[Purchase Inventory][Product2] Row ${id} has no Item_Type — Product2.Name is required, skipped`,
    );
    return null;
  }

  const record: SfRecord = {
    [EXT_ID_FIELD]: id,
    ProductCode: itemType,
    Name: itemType,
    IsActive: toBool(raw.Active),
  };

  const description = str(raw.Description).trim();
  if (description) record.Description = description.slice(0, 4000);

  const unit = str(raw.Unit_Description).trim();
  if (unit) {
    if (VALID_QUANTITY_UNITS.has(unit)) {
      record.QuantityUnitOfMeasure = unit;
    } else {
      logger.warn(
        `[Purchase Inventory][Product2] Unit_Description "${unit}" for row ${id} is not in the ` +
          "known QuantityUnitOfMeasure picklist values — skipped (field left blank)",
      );
    }
  }
  return record;
}

export const purchaseInventoryImport = flow({
  name: "Purchase Inventory Import",
  stableKey: "pinv2026-1014-4a01-9b10-0a1b2c3d4e01",
  description:
    "Reads the Purchase Inventory TSV from Google Drive and bulk-upserts " +
    "Product2, then creates a PricebookEntry for each product in every price " +
    "book listed in the Price Books config var (Standard Price Book first). " +
    "Must run before Purchase Item Import.",

  onTrigger: async (_context, payload) => {
    await Promise.resolve();
    return { payload };
  },

  onExecution: async (context) => {
    const { logger, configVars } = context;

    const gdConn = configVars[
      "Google Drive Connection"
    ] as unknown as Connection;
    const sfConn = configVars["Salesforce Connection"] as unknown as Connection;
    const fileId = configVars[
      "Purchase Inventory File ID"
    ] as unknown as string;
    const failedFolderId = configVars["Failed Records Folder ID"] as
      string | undefined;
    if (!fileId)
      throw new Error("Purchase Inventory File ID config var is empty.");

    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfBase = getSfInstanceUrl(sfConn);

    // ── Read + map the whole (small) file ────────────────────────────────────
    const rawRows: RawPurchaseInventoryRow[] = [];
    await streamTsvWindow(
      fileId,
      gdToken,
      0,
      Number.MAX_SAFE_INTEGER,
      [],
      (row) => rawRows.push(row),
    );
    logger.info(`[Purchase Inventory] Read ${rawRows.length} source row(s).`);

    const products: SfRecord[] = [];
    const unitPriceByExtId = new Map<string, number>();
    const activeByExtId = new Map<string, boolean>();
    const nameSeen = new Map<string, string>();
    for (const raw of rawRows) {
      const p = mapToProduct2(raw, logger);
      if (!p) continue;
      const extId = p[EXT_ID_FIELD] as string;
      const name = p.Name as string;
      const prior = nameSeen.get(name);
      if (prior) {
        logger.warn(
          `[Purchase Inventory][Product2] Item_Type "${name}" appears on rows ${prior} and ${extId} — ` +
            "Purchase Item lookup by Name is ambiguous; the first row wins",
        );
      } else {
        nameSeen.set(name, extId);
      }
      products.push(p);
      const price = parseCurrency(raw.Unit_Price);
      if (price !== undefined) unitPriceByExtId.set(extId, price);
      activeByExtId.set(extId, p.IsActive as boolean);
    }

    // Resolve the price books BEFORE writing anything, so a wrong name in the
    // "Price Books" config var fails the run with no partial load.
    const pricebooks = await resolveConfiguredPricebooks(
      sfBase,
      sfToken,
      configVars[PRICE_BOOKS_CONFIG_VAR] as unknown as string | undefined,
      logger,
    );
    assertSupportedPricebooks(pricebooks);
    logger.info(
      `[Purchase Inventory][PricebookEntry] Price books (load order): ` +
        pricebooks.map((b) => `"${b.name}"`).join(", "),
    );

    // ── Phase 1: Product2 ────────────────────────────────────────────────────
    const productResult =
      products.length > 0
        ? await upsertInBatches(
            products,
            SF_PRODUCT2,
            sfBase,
            sfToken,
            logger,
            "[Purchase Inventory][Product2]",
          )
        : { processed: 0, failed: 0, successfulCsv: "", failedCsv: "" };

    // ── Phase 2: PricebookEntry — one per product per configured price book ─
    // Standard Price Book first (Salesforce requires it before any custom
    // entry), then the custom book. Upserted on External_ID_4D__c; see
    // planPricebookEntries for the create / update / backfill split.
    const productSfIds = parseSuccessfulSfIds(productResult.successfulCsv);
    const inputs: InventoryPriceInput[] = [...productSfIds].map(
      ([extId, sfId]) => ({
        extId,
        product2Id: sfId,
        unitPrice: unitPriceByExtId.get(extId),
        isActive: activeByExtId.get(extId) ?? true,
      }),
    );

    const perBook: PricebookLoadSummary[] = [];
    const bookResults: ObjectResultData[] = [];
    const skippedRows: string[][] = [];
    let pbeCreated = 0;
    let pbeUpdated = 0;
    let pbeFailed = 0;
    for (const book of pricebooks) {
      const prefix = `[Purchase Inventory][PricebookEntry][${book.name}]`;
      const keys = inputs.map((i) => pricebookEntryExtId(book, i.extId));
      const keyFilter =
        keys.length > 0
          ? ` OR External_ID_4D__c IN (${keys
              .map((k) => `'${k.replace(/'/g, "\\'")}'`)
              .join(", ")})`
          : "";
      const existing = await sfQueryAll<ExistingPricebookEntry>(
        sfBase,
        sfToken,
        "SELECT Id, Pricebook2Id, Product2Id, External_ID_4D__c FROM PricebookEntry " +
          `WHERE Pricebook2Id = '${book.id}'${keyFilter}`,
      );
      const plan = planPricebookEntries(book, inputs, existing);
      logger.info(
        `${prefix} plan — create=${plan.toCreate.length}, update=${plan.toUpdate.length} ` +
          `(key backfill=${plan.toBackfill.length}), skipped=${plan.skipped.length}`,
      );

      if (plan.toBackfill.length > 0) {
        const outcomes = await updateViaComposite(
          plan.toBackfill,
          sfBase,
          sfToken,
          logger,
          `${prefix}[key backfill]`,
        );
        const failedIds = new Map<string, string>();
        for (const o of outcomes) {
          if (!o.success) failedIds.set(o.id, o.error ?? "update failed");
        }
        applyBackfillFailures(plan, failedIds);
      }

      const empty = {
        processed: 0,
        failed: 0,
        successfulCsv: "",
        failedCsv: "",
      };
      const created =
        plan.toCreate.length > 0
          ? await upsertInBatches(
              plan.toCreate,
              SF_PRICEBOOK_ENTRY,
              sfBase,
              sfToken,
              logger,
              `${prefix}[create]`,
            )
          : empty;
      const updated =
        plan.toUpdate.length > 0
          ? await upsertInBatches(
              plan.toUpdate,
              SF_PRICEBOOK_ENTRY,
              sfBase,
              sfToken,
              logger,
              `${prefix}[update]`,
            )
          : empty;

      for (const sk of plan.skipped) {
        skippedRows.push([book.name, sk.extId, sk.product2Id, sk.reason]);
      }
      if (plan.skipped.length > 0) {
        logger.warn(
          `${prefix} ${plan.skipped.length} entr(ies) not sent — see the "PricebookEntry - Skipped" tab`,
        );
      }

      const failed = created.failed + updated.failed;
      perBook.push({
        pricebook: book.name,
        created: created.processed - created.failed,
        updated: updated.processed - updated.failed,
        failed,
        skipped: plan.skipped.length,
      });
      bookResults.push({
        objectName: pricebookResultObjectName(book),
        successfulCsv: mergeResultCsvs(
          created.successfulCsv,
          updated.successfulCsv,
        ),
        failedCsv: mergeResultCsvs(created.failedCsv, updated.failedCsv),
      });
      pbeCreated += created.processed - created.failed;
      pbeUpdated += updated.processed - updated.failed;
      pbeFailed += failed;
    }

    // ── Results sheet: Product2 + one tab pair per price book + Skipped ──────
    try {
      const sheet = await createPerObjectResultsSheet({
        flowName: "Purchase Inventory Import",
        objects: [
          {
            objectName: SF_PRODUCT2,
            successfulCsv: productResult.successfulCsv,
            failedCsv: productResult.failedCsv,
          },
          ...bookResults,
        ],
        skipped:
          skippedRows.length > 0
            ? {
                tabName: "PricebookEntry - Skipped",
                headers: [
                  "Price Book",
                  "Inventory ID",
                  "Product2Id",
                  SKIP_REASON_COLUMN,
                ],
                rows: skippedRows,
              }
            : undefined,
        accessToken: gdToken,
        folderId: failedFolderId,
      });
      logger.info(`[Purchase Inventory] Results sheet: ${sheet.url}`);
    } catch (err) {
      logger.warn(
        `[Purchase Inventory] Could not write results sheet: ${String(err)}`,
      );
    }

    logger.info(
      `[Purchase Inventory] Complete —` +
        `\n  Product2 submitted: ${products.length}, processed: ${productResult.processed}, failed: ${productResult.failed}` +
        perBook
          .map(
            (b) =>
              `\n  PricebookEntry [${b.pricebook}] created: ${b.created}, updated: ${b.updated}, failed: ${b.failed}, skipped: ${b.skipped}`,
          )
          .join(""),
    );

    return {
      data: {
        products: products.length,
        productsProcessed: productResult.processed,
        productsFailed: productResult.failed,
        pricebookEntriesCreated: pbeCreated,
        pricebookEntriesUpdated: pbeUpdated,
        pricebookEntriesFailed: pbeFailed,
        pricebookEntriesSkipped: skippedRows.length,
        pricebookEntriesByPricebook: perBook,
      },
    };
  },
});

export default [purchaseInventoryImport];
