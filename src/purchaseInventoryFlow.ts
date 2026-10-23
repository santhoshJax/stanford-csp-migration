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
 *   2. PricebookEntry  — one per Product2 in the Standard Price Book, created
 *                        via the REST sObject Collections API (insert only).
 *                        The workbook gives PricebookEntry no External ID, so
 *                        re-runs query the Standard Price Book first and skip
 *                        products that already have an entry (an existing
 *                        entry's price is NOT updated).
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
 *   - QuantityUnitOfMeasure is a restricted picklist; the source value is
 *     free text ("per 1,000 words"). Only values in VALID_QUANTITY_UNITS are
 *     written, anything else is skipped with a warning (same defensive
 *     pattern as Registration's TA_Discount_Type__c). Extend the set once the
 *     real picklist values are known.
 *   - PricebookEntry needs a Pricebook2Id the workbook never names; the
 *     Standard Price Book is used.
 */

import { flow, type Connection } from "@prismatic-io/spectral";
import axios from "axios";
import {
  str,
  toBool,
  SF_API_VERSION,
  getAccessToken,
  getSfInstanceUrl,
} from "./utils";
import { createPerObjectResultsSheet } from "./reportResults";
import {
  EXT_ID_FIELD,
  type SfRecord,
  getStandardPricebookId,
  parseCurrency,
  parseSuccessfulSfIds,
  sfQueryAll,
  streamTsvWindow,
  upsertInBatches,
} from "./commerceShared";

const SF_PRODUCT2 = "Product2";

/** Restricted picklist Product2.QuantityUnitOfMeasure — extend after a describe. */
export const VALID_QUANTITY_UNITS = new Set<string>(["Each"]);

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
    "Product2, then creates a Standard Price Book PricebookEntry for each. " +
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

    // ── Phase 2: PricebookEntry (insert-only, Standard Price Book) ───────────
    const productSfIds = parseSuccessfulSfIds(productResult.successfulCsv);
    const stdPricebookId = await getStandardPricebookId(sfBase, sfToken);
    const existing = await sfQueryAll<{ Product2Id: string }>(
      sfBase,
      sfToken,
      `SELECT Product2Id FROM PricebookEntry WHERE Pricebook2Id = '${stdPricebookId}'`,
    );
    const hasEntry = new Set(existing.map((e) => e.Product2Id));

    const entries: SfRecord[] = [];
    let noPrice = 0;
    let alreadyHadEntry = 0;
    for (const [extId, sfId] of productSfIds) {
      if (hasEntry.has(sfId)) {
        alreadyHadEntry++;
        continue;
      }
      const price = unitPriceByExtId.get(extId);
      if (price === undefined) {
        noPrice++;
        continue;
      }
      entries.push({
        attributes: { type: "PricebookEntry" },
        Pricebook2Id: stdPricebookId,
        Product2Id: sfId,
        UnitPrice: price,
        IsActive: activeByExtId.get(extId) ?? true,
      });
    }
    if (noPrice > 0) {
      logger.warn(
        `[Purchase Inventory][PricebookEntry] ${noPrice} product(s) have no parseable Unit_Price — no PricebookEntry created`,
      );
    }

    let pbeCreated = 0;
    let pbeFailed = 0;
    const pbeFailures: string[] = [];
    for (let i = 0; i < entries.length; i += 200) {
      const chunk = entries.slice(i, i + 200);
      const { data } = await axios.post<
        { success: boolean; errors?: { message: string }[] }[]
      >(
        `${sfBase}/services/data/${SF_API_VERSION}/composite/sobjects`,
        { allOrNone: false, records: chunk },
        { headers: { Authorization: `Bearer ${sfToken}` } },
      );
      data.forEach((r, idx) => {
        if (r.success) {
          pbeCreated++;
        } else {
          pbeFailed++;
          pbeFailures.push(
            `Product2Id=${String(chunk[idx].Product2Id)}: ${(r.errors ?? [])
              .map((e) => e.message)
              .join("; ")}`,
          );
        }
      });
    }
    pbeFailures.forEach((f) =>
      logger.error(`[Purchase Inventory][PricebookEntry] ${f}`),
    );

    // ── Results sheet (Product2 only — PricebookEntry has no Bulk CSVs) ──────
    try {
      const sheet = await createPerObjectResultsSheet({
        flowName: "Purchase Inventory Import",
        objects: [
          {
            objectName: SF_PRODUCT2,
            successfulCsv: productResult.successfulCsv,
            failedCsv: productResult.failedCsv,
          },
        ],
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
        `\n  PricebookEntry created: ${pbeCreated}, failed: ${pbeFailed}, already existed: ${alreadyHadEntry}`,
    );

    return {
      data: {
        products: products.length,
        productsProcessed: productResult.processed,
        productsFailed: productResult.failed,
        pricebookEntriesCreated: pbeCreated,
        pricebookEntriesFailed: pbeFailed,
        pricebookEntriesAlreadyExisted: alreadyHadEntry,
      },
    };
  },
});

export default [purchaseInventoryImport];
