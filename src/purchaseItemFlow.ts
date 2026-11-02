/**
 * Stanford CSP Migration – Purchase Item Import flow.
 *
 * Source: "Purchase Item" tab of the mapping workbook. Each Purchase Item is a
 * line on a Purchase → one OrderItem on the Order that Purchase Import created.
 *
 * MUST RUN AFTER: Purchase Inventory Import (Product2 + PricebookEntry) and
 * Purchase Import (the Orders, which carry Pricebook2Id = the order price
 * book: first custom book in the "Price Books" config var).
 *
 * Upsert key: OrderItem.External_ID_4D__c = "PI-" + Purchase_Item.ID.
 * (Prefixed so a later Registration OrderItem load can't collide with it.)
 *
 * Pre-flight caches (built once per window, before the Bulk job):
 *   - Product name → PricebookEntry Id (order price book). Item_Type is
 *     resolved by Product2.Name, as the workbook says ("Product2Id will need
 *     to be found by the name of the Product"). OrderItem takes the
 *     PricebookEntryId (which implies the Product2); Product2Id is derived by
 *     Salesforce and is not written.
 *   - Set of PUR-… Order External IDs that exist. A line whose parent Purchase
 *     was not loaded (outside the 2-year scope, or failed) is SKIPPED and
 *     counted instead of producing one Bulk failure per line.
 *
 * OrderId is resolved by Salesforce via the external-ID relationship
 * `Order.External_ID_4D__c` — the "Id of the created Order" conversion in the
 * workbook needs no separate lookup.
 *
 * Differences from the workbook that the review flagged:
 *   - Extended_Amount → TotalPrice: OrderItem.TotalPrice is calculated
 *     (UnitPrice × Quantity) and not writable. Not mapped. (Extended_Amount is
 *     still compared to UnitPrice × Quantity and mismatches are logged.)
 *   - Item_Type (classification) → OrderItem.Type: Type is a restricted
 *     standard picklist, and the source value ("Transcript") is a product
 *     category, not a valid Type. Gated behind MAP_ORDER_ITEM_TYPE (off).
 *   - Description: OrderItem.Description is 255 chars; longer text is truncated.
 *   - Quantity must be > 0; zero/negative lines are skipped with a warning.
 *   - Ref_Table_Number: Do Not Map.
 *
 * Windowed execution / TEST_MODE: same model as Registration; TEST_MODE is ON.
 */

import { flow, type Connection } from "@prismatic-io/spectral";
import { str, getAccessToken, getSfInstanceUrl } from "./utils";
import { createPerObjectResultsSheet } from "./reportResults";
import {
  EXT_ID_FIELD,
  type SfRecord,
  PRICE_BOOKS_CONFIG_VAR,
  orderPricebook,
  resolveConfiguredPricebooks,
  invokeNextWindow,
  parseCurrency,
  readWindowCursor,
  sfQueryAll,
  streamTsvWindow,
  stripDotZero,
  upsertInBatches,
} from "./commerceShared";
import { purchaseExtId } from "./purchaseFlow";

const SF_ORDER_ITEM = "OrderItem";
const FLOW_NAME = "Purchase Item Import";
export const ORDER_ITEM_EXT_PREFIX = "PI-";

const MAX_ROWS = 25_000;
const TEST_MODE = true;
const TEST_LIMIT = 50;
const TEST_SKIP = 0;

/** OrderItem.Type is a restricted picklist; see header. Flip on after a describe. */
const MAP_ORDER_ITEM_TYPE = false;

export interface RawPurchaseItemRow {
  ID?: string;
  Purchase_ID?: string;
  Item_Type?: string;
  "Item_Type (classification)"?: string;
  Unit_Price?: string;
  Quantity?: string;
  Extended_Amount?: string;
  Description?: string;
  Unit_Description?: string;
  Ref_Table_Number?: string;
  Ref_Record_ID?: string;
  [key: string]: string | undefined;
}

export interface PurchaseItemCaches {
  /** Product2.Name → order-price-book PricebookEntry.Id */
  pricebookEntryByProductName: Map<string, string>;
  /** External IDs ("PUR-…") of Orders that exist in the org */
  existingOrderExtIds: Set<string>;
}

export interface PurchaseItemSkips {
  noPurchaseId: number;
  orderNotLoaded: number;
  badQuantity: number;
  unmatchedProducts: Map<string, number>;
}

export function newSkips(): PurchaseItemSkips {
  return {
    noPurchaseId: 0,
    orderNotLoaded: 0,
    badQuantity: 0,
    unmatchedProducts: new Map(),
  };
}

export function mapToOrderItem(
  raw: RawPurchaseItemRow,
  caches: PurchaseItemCaches,
  skips: PurchaseItemSkips,
  logger: { warn: (m: string) => void },
): SfRecord | null {
  const id = str(raw.ID).trim();
  if (!id) return null;

  const purchaseId = stripDotZero(raw.Purchase_ID);
  if (!purchaseId || purchaseId === "0") {
    skips.noPurchaseId++;
    return null;
  }
  const orderExtId = purchaseExtId(purchaseId);
  if (!caches.existingOrderExtIds.has(orderExtId)) {
    skips.orderNotLoaded++;
    return null;
  }

  const itemType = str(raw.Item_Type).trim();
  const pbeId = caches.pricebookEntryByProductName.get(itemType);
  if (!pbeId) {
    skips.unmatchedProducts.set(
      itemType || "(blank)",
      (skips.unmatchedProducts.get(itemType || "(blank)") ?? 0) + 1,
    );
    return null;
  }

  const quantity = parseCurrency(raw.Quantity);
  if (quantity === undefined || quantity <= 0) {
    skips.badQuantity++;
    logger.warn(
      `[Purchase Item Import] Purchase Item ${id} has Quantity "${str(raw.Quantity)}" — OrderItem.Quantity must be > 0, skipped`,
    );
    return null;
  }

  const unitPrice = parseCurrency(raw.Unit_Price);
  if (unitPrice === undefined) {
    logger.warn(
      `[Purchase Item Import] Purchase Item ${id} has no parseable Unit_Price — skipped (UnitPrice is required)`,
    );
    return null;
  }

  const extended = parseCurrency(raw.Extended_Amount);
  if (
    extended !== undefined &&
    Math.abs(extended - unitPrice * quantity) > 0.005
  ) {
    logger.warn(
      `[Purchase Item Import] Purchase Item ${id}: Extended_Amount ${extended} ≠ Unit_Price ${unitPrice} × Quantity ${quantity} ` +
        "— OrderItem.TotalPrice will be the calculated value",
    );
  }

  const record: SfRecord = {
    [EXT_ID_FIELD]: `${ORDER_ITEM_EXT_PREFIX}${id}`,
    "Order.External_ID_4D__c": orderExtId,
    PricebookEntryId: pbeId,
    UnitPrice: unitPrice,
    Quantity: quantity,
  };

  const classification = str(raw["Item_Type (classification)"]).trim();
  if (MAP_ORDER_ITEM_TYPE && classification) record.Type = classification;

  const description = str(raw.Description)
    .replace(/_4DNL_/g, "\n")
    .trim();
  if (description) record.Description = description.slice(0, 255);

  const unitDescription = str(raw.Unit_Description).trim();
  if (unitDescription) record.Unit_Description__c = unitDescription;

  const refRecordId = str(raw.Ref_Record_ID).trim();
  if (refRecordId) record.Ref_Record_ID__c = refRecordId;

  return record;
}

export const purchaseItemImport = flow({
  name: FLOW_NAME,
  stableKey: "pitm2026-1014-4a03-9b10-0a1b2c3d4e03",
  description:
    "Streams the Purchase Item TSV from Google Drive one window at a time " +
    "and bulk-upserts OrderItem records onto the Orders created by Purchase " +
    "Import. Must run after Purchase Inventory Import and Purchase Import.",

  onTrigger: async (_context, payload) => {
    await Promise.resolve();
    return { payload };
  },

  onExecution: async (context, params) => {
    const { logger, configVars } = context;
    const { byteOffset, knownHeaders, windowNumber } = readWindowCursor(params);

    logger.info(
      `[Purchase Item Import] Starting window ${windowNumber} at byte ${byteOffset}…`,
    );

    const gdConn = configVars[
      "Google Drive Connection"
    ] as unknown as Connection;
    const sfConn = configVars["Salesforce Connection"] as unknown as Connection;
    const fileId = configVars["Purchase Item File ID"] as unknown as string;
    const failedFolderId = configVars["Failed Records Folder ID"] as
      string | undefined;
    if (!fileId) throw new Error("Purchase Item File ID config var is empty.");

    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfBase = getSfInstanceUrl(sfConn);

    // ── Caches ───────────────────────────────────────────────────────────────
    // Same order price book Purchase Import put on the Orders — an OrderItem
    // must use an entry from its Order's price book.
    const orderBook = orderPricebook(
      await resolveConfiguredPricebooks(
        sfBase,
        sfToken,
        configVars[PRICE_BOOKS_CONFIG_VAR] as unknown as string | undefined,
        logger,
      ),
    );
    logger.info(`[Purchase Item Import] Order price book: "${orderBook.name}"`);
    const [entries, orders] = await Promise.all([
      sfQueryAll<{ Id: string; Product2: { Name: string } | null }>(
        sfBase,
        sfToken,
        `SELECT Id, Product2.Name FROM PricebookEntry WHERE Pricebook2Id = '${orderBook.id}' AND Product2.External_ID_4D__c != null`,
        logger,
      ),
      sfQueryAll<{ External_ID_4D__c: string }>(
        sfBase,
        sfToken,
        "SELECT External_ID_4D__c FROM Order WHERE External_ID_4D__c LIKE 'PUR-%'",
        logger,
      ),
    ]);
    const caches: PurchaseItemCaches = {
      pricebookEntryByProductName: new Map(),
      existingOrderExtIds: new Set(orders.map((o) => o.External_ID_4D__c)),
    };
    for (const e of entries) {
      const name = e.Product2?.Name;
      if (name && !caches.pricebookEntryByProductName.has(name)) {
        caches.pricebookEntryByProductName.set(name, e.Id);
      }
    }
    logger.info(
      `[Purchase Item Import] Caches — products with an entry in "${orderBook.name}"=${caches.pricebookEntryByProductName.size}, ` +
        `PUR- orders=${caches.existingOrderExtIds.size}`,
    );
    if (caches.pricebookEntryByProductName.size === 0) {
      throw new Error(
        `No Product2/PricebookEntry rows with External_ID_4D__c found in "${orderBook.name}" — ` +
          "run Purchase Inventory Import first (with this price book in the Price Books config var).",
      );
    }
    if (caches.existingOrderExtIds.size === 0) {
      throw new Error("No PUR- Orders found — run Purchase Import first.");
    }

    // ── Stream + map this window ─────────────────────────────────────────────
    let items: SfRecord[] = [];
    const skips = newSkips();
    const window = await streamTsvWindow(
      fileId,
      gdToken,
      byteOffset,
      MAX_ROWS,
      knownHeaders,
      (row: RawPurchaseItemRow) => {
        const item = mapToOrderItem(row, caches, skips, logger);
        if (item) items.push(item);
      },
    );
    const { rowsInWindow, hasMore, nextByteOffset, parsedHeaders } = window;

    const unmatched = [...skips.unmatchedProducts.entries()]
      .map(([k, v]) => `${k}×${v}`)
      .join(", ");
    logger.info(
      `[Purchase Item Import] Window ${windowNumber} stream complete — rows=${rowsInWindow}, ` +
        `orderItems=${items.length}, skipped: noPurchaseId=${skips.noPurchaseId}, ` +
        `parentOrderNotLoaded=${skips.orderNotLoaded}, badQuantity=${skips.badQuantity}, ` +
        `unmatchedProduct=${unmatched || "0"}`,
    );
    if (skips.unmatchedProducts.size > 0) {
      logger.warn(
        `[Purchase Item Import] Item_Type value(s) with no Product2.Name match (load them via Purchase Inventory): ${unmatched}`,
      );
    }

    if (TEST_MODE) {
      items = items.slice(TEST_SKIP, TEST_SKIP + TEST_LIMIT);
      logger.info(
        `[Purchase Item Import] TEST MODE: limited to ${TEST_LIMIT} OrderItem(s) and won't invoke the next window.`,
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
            "[Purchase Item Import][OrderItem]",
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
        accessToken: gdToken,
        folderId: failedFolderId,
      });
      logger.info(`[Purchase Item Import] Results sheet: ${sheet.url}`);
    } catch (err) {
      logger.warn(
        `[Purchase Item Import] Could not write results sheet: ${String(err)}`,
      );
    }

    logger.info(
      `[Purchase Item Import] Window ${windowNumber} complete — OrderItem submitted: ${items.length}, ` +
        `processed: ${result.processed}, failed: ${result.failed}`,
    );

    if (TEST_MODE && hasMore) {
      logger.info(
        "[Purchase Item Import] TEST MODE: more rows remain, but stopping here — set TEST_MODE = false to process the full file.",
      );
    } else if (hasMore) {
      await invokeNextWindow(context, FLOW_NAME, {
        byteOffset: nextByteOffset,
        headers: parsedHeaders,
        windowNumber: windowNumber + 1,
      });
    } else {
      logger.info(
        `[Purchase Item Import] All rows processed — import complete after ${windowNumber} window(s).`,
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
        skippedParentOrderNotLoaded: skips.orderNotLoaded,
        skippedUnmatchedProduct: [...skips.unmatchedProducts.values()].reduce(
          (a, b) => a + b,
          0,
        ),
      },
    };
  },
});

export default [purchaseItemImport];
