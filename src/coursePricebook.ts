/**
 * PricebookEntry step shared by Course Import - All, 2 Year and 5 Year.
 *
 * Each course Product2 gets one PricebookEntry in the Standard Price Book and
 * one in the custom book named in the "Price Books" config var (e.g.
 * "StanfordContinuingStudies Price Book"). Decisions and key rules live with
 * the pure helpers in courseUtils.ts (parsePriceBookNames, resolvePriceBooks,
 * parseListPrice, pricebookEntryKey).
 *
 * How a window is saved (after its Product2 rows):
 *   1. One query finds the existing entries for this window's Products in the
 *      two books (match on Product2Id + Pricebook2Id, which Salesforce keeps
 *      unique).
 *   2. Pass A — Standard entries: missing ones are inserted, existing ones are
 *      updated (UnitPrice, IsActive, External_ID_4D__c).
 *   3. Pass B — custom entries, only for Products that now have a Standard
 *      entry. The rest are reported as skipped, not as a second error.
 *
 * Why insert + update instead of an upsert on External_ID_4D__c: Product2Id
 * and Pricebook2Id can only be set when an entry is created, so an upsert that
 * sends them would fail on every re-run. The outcome is the same as an upsert
 * (no duplicates, price refreshed every run) and an entry that already
 * existed without a key gets its key filled in.
 *
 * Both passes use the sObject Collections API, 200 records per call,
 * allOrNone = false, so one bad record does not fail the others.
 */
import axios from "axios";
import { SF_API_VERSION } from "./utils";
import { sfQueryAll } from "./commerceShared";
import {
  parsePriceBookNames,
  resolvePriceBooks,
  pricebookEntryKey,
  type PricebookRecord,
  type ResolvedPriceBooks,
} from "./courseUtils";

const COLLECTION_SIZE = 200;
/** Ids per SOQL IN list — keeps the query URL well under the length limit. */
const QUERY_ID_CHUNK = 150;

interface PricebookLogger {
  info: (m: string) => void;
  warn: (m: string) => void;
  error: (m: string) => void;
}

function soqlQuote(v: string): string {
  return `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/**
 * Reads the "Price Books" config var and finds those books (plus the Standard
 * book) with one query. Throws — before any row is written — when a name is
 * missing or inactive, or more than one custom book is listed.
 */
export async function loadPriceBooks(
  sfBase: string,
  sfToken: string,
  configValue: string | undefined | null,
  logger: PricebookLogger,
  logPrefix: string,
): Promise<ResolvedPriceBooks> {
  const names = parsePriceBookNames(configValue);
  const nameFilter =
    names.length > 0 ? ` OR Name IN (${names.map(soqlQuote).join(",")})` : "";
  const found = await sfQueryAll<PricebookRecord>(
    sfBase,
    sfToken,
    `SELECT Id, Name, IsStandard, IsActive FROM Pricebook2 WHERE IsStandard = true${nameFilter}`,
  );
  const books = resolvePriceBooks(names, found);
  for (const w of books.warnings) logger.warn(`${logPrefix}[Price Books] ${w}`);
  logger.info(
    `${logPrefix}[Price Books] Standard="${books.standard.Name}" (${books.standard.Id})` +
      (books.custom
        ? `, custom="${books.custom.Name}" (${books.custom.Id})`
        : ", no custom book configured"),
  );
  return books;
}

export interface CourseProductForPricing {
  /** Course.ID — the Product2's External_ID_4D__c. */
  sourceId: string;
  /** Salesforce Id of the Product2 saved for this row. */
  productId: string;
  /** UnitPrice, already parsed (parseListPrice). */
  unitPrice: number;
}

export type PricebookEntryOutcome =
  "created" | "updated" | "skipped" | "failed";

export interface PricebookEntryResult {
  sourceId: string;
  book: "Standard" | "Custom";
  bookName: string;
  key: string;
  productId: string;
  pricebookId: string;
  unitPrice: number;
  outcome: PricebookEntryOutcome;
  sfId?: string;
  error?: string;
}

interface ExistingEntry {
  Id: string;
  Product2Id: string;
  Pricebook2Id: string;
  External_ID_4D__c?: string | null;
}

interface CollectionResult {
  id?: string;
  success: boolean;
  errors?: { statusCode?: string; message?: string }[];
}

interface Plan {
  result: PricebookEntryResult;
  record: Record<string, unknown>;
}

async function findExistingEntries(
  sfBase: string,
  sfToken: string,
  productIds: string[],
  pricebookIds: string[],
): Promise<Map<string, ExistingEntry>> {
  const map = new Map<string, ExistingEntry>();
  const books = pricebookIds.map(soqlQuote).join(",");
  for (let i = 0; i < productIds.length; i += QUERY_ID_CHUNK) {
    const chunk = productIds.slice(i, i + QUERY_ID_CHUNK);
    const rows = await sfQueryAll<ExistingEntry>(
      sfBase,
      sfToken,
      "SELECT Id, Product2Id, Pricebook2Id, External_ID_4D__c FROM PricebookEntry " +
        `WHERE Pricebook2Id IN (${books}) AND Product2Id IN (${chunk.map(soqlQuote).join(",")})`,
    );
    for (const r of rows) map.set(`${r.Product2Id}|${r.Pricebook2Id}`, r);
  }
  return map;
}

function errorText(r: CollectionResult): string {
  return (
    (r.errors ?? [])
      .map((e) => [e.statusCode, e.message].filter(Boolean).join(": "))
      .join("; ") || "Unknown error"
  );
}

function httpErrorText(err: unknown): string {
  const e = err as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };
  if (e.response) {
    return `HTTP ${e.response.status} — ${JSON.stringify(e.response.data)}`;
  }
  return e.message ?? String(err);
}

/** Sends one collection call per 200 plans and fills in each plan's outcome. */
async function saveCollection(
  sfBase: string,
  sfToken: string,
  method: "post" | "patch",
  plans: Plan[],
): Promise<void> {
  const url = `${sfBase}/services/data/${SF_API_VERSION}/composite/sobjects`;
  const headers = {
    Authorization: `Bearer ${sfToken}`,
    "Content-Type": "application/json",
  };
  for (let i = 0; i < plans.length; i += COLLECTION_SIZE) {
    const chunk = plans.slice(i, i + COLLECTION_SIZE);
    const body = { allOrNone: false, records: chunk.map((p) => p.record) };
    try {
      const { data } =
        method === "post"
          ? await axios.post<CollectionResult[]>(url, body, { headers })
          : await axios.patch<CollectionResult[]>(url, body, { headers });
      chunk.forEach((p, idx) => {
        const r = data[idx];
        if (r?.success) {
          if (r.id) p.result.sfId = r.id;
          return;
        }
        p.result.outcome = "failed";
        p.result.error = r ? errorText(r) : "No result returned for record";
      });
    } catch (err) {
      const msg = httpErrorText(err);
      for (const p of chunk) {
        p.result.outcome = "failed";
        p.result.error = msg;
      }
    }
  }
}

/** Builds and saves the entries for one book. */
async function saveBook(
  sfBase: string,
  sfToken: string,
  products: CourseProductForPricing[],
  book: PricebookRecord,
  role: "Standard" | "Custom",
  existing: Map<string, ExistingEntry>,
): Promise<PricebookEntryResult[]> {
  const inserts: Plan[] = [];
  const updates: Plan[] = [];
  for (const p of products) {
    const key = pricebookEntryKey(p.sourceId, role === "Standard");
    const found = existing.get(`${p.productId}|${book.Id}`);
    const result: PricebookEntryResult = {
      sourceId: p.sourceId,
      book: role,
      bookName: book.Name,
      key,
      productId: p.productId,
      pricebookId: book.Id,
      unitPrice: p.unitPrice,
      outcome: found ? "updated" : "created",
      sfId: found?.Id,
    };
    const common = {
      attributes: { type: "PricebookEntry" },
      UnitPrice: p.unitPrice,
      IsActive: true,
      External_ID_4D__c: key,
    };
    if (found) {
      updates.push({ result, record: { ...common, Id: found.Id } });
    } else {
      inserts.push({
        result,
        record: {
          ...common,
          Pricebook2Id: book.Id,
          Product2Id: p.productId,
          // Custom entries carry their own price, not the Standard one.
          ...(role === "Custom" ? { UseStandardPrice: false } : {}),
        },
      });
    }
  }
  await saveCollection(sfBase, sfToken, "post", inserts);
  await saveCollection(sfBase, sfToken, "patch", updates);
  return [...inserts, ...updates].map((p) => p.result);
}

/**
 * Saves the PricebookEntry rows for one window of course Products: Standard
 * first, then the custom book for Products that have a Standard entry.
 * Never throws for a record-level problem — every entry comes back with an
 * outcome. A failed lookup query is reported on every entry of the window.
 */
export async function saveCoursePricebookEntries(
  sfBase: string,
  sfToken: string,
  books: ResolvedPriceBooks,
  products: CourseProductForPricing[],
): Promise<PricebookEntryResult[]> {
  // One entry per Product per book — the last row wins if a Course.ID repeats.
  const byProduct = new Map<string, CourseProductForPricing>();
  for (const p of products) byProduct.set(p.productId, p);
  const unique = [...byProduct.values()];
  if (unique.length === 0) return [];

  const bookIds = [
    books.standard.Id,
    ...(books.custom ? [books.custom.Id] : []),
  ];
  let existing: Map<string, ExistingEntry>;
  try {
    existing = await findExistingEntries(
      sfBase,
      sfToken,
      unique.map((p) => p.productId),
      bookIds,
    );
  } catch (err) {
    const msg = `Could not read existing PricebookEntry rows: ${httpErrorText(err)}`;
    const roles: [PricebookRecord, "Standard" | "Custom"][] = [
      [books.standard, "Standard"],
      ...(books.custom
        ? [[books.custom, "Custom"] as [PricebookRecord, "Custom"]]
        : []),
    ];
    return roles.flatMap(([book, role]) =>
      unique.map((p) => ({
        sourceId: p.sourceId,
        book: role,
        bookName: book.Name,
        key: pricebookEntryKey(p.sourceId, role === "Standard"),
        productId: p.productId,
        pricebookId: book.Id,
        unitPrice: p.unitPrice,
        outcome: "failed" as const,
        error: msg,
      })),
    );
  }

  // Pass A — Standard.
  const standardResults = await saveBook(
    sfBase,
    sfToken,
    unique,
    books.standard,
    "Standard",
    existing,
  );
  if (!books.custom) return standardResults;

  // Pass B — custom, only where a Standard entry now exists. An update that
  // failed still leaves the existing Standard entry in place.
  const hasStandard = new Set(
    standardResults
      .filter(
        (r) =>
          r.outcome !== "failed" ||
          existing.has(`${r.productId}|${books.standard.Id}`),
      )
      .map((r) => r.productId),
  );
  const ready = unique.filter((p) => hasStandard.has(p.productId));
  const customResults = await saveBook(
    sfBase,
    sfToken,
    ready,
    books.custom,
    "Custom",
    existing,
  );
  const skipped: PricebookEntryResult[] = unique
    .filter((p) => !hasStandard.has(p.productId))
    .map((p) => ({
      sourceId: p.sourceId,
      book: "Custom",
      bookName: books.custom!.Name,
      key: pricebookEntryKey(p.sourceId, false),
      productId: p.productId,
      pricebookId: books.custom!.Id,
      unitPrice: p.unitPrice,
      outcome: "skipped",
      error: "Skipped – Standard entry failed",
    }));
  return [...standardResults, ...customResults, ...skipped];
}

/** "PBE: Standard 98 ok · Custom 98 ok · 0 skipped · 0 failed" style counts. */
export function summarisePricebookEntries(results: PricebookEntryResult[]): {
  standardOk: number;
  customOk: number;
  skipped: number;
  failed: number;
  text: string;
} {
  const isOk = (r: PricebookEntryResult) =>
    r.outcome === "created" || r.outcome === "updated";
  const standardOk = results.filter(
    (r) => r.book === "Standard" && isOk(r),
  ).length;
  const customOk = results.filter((r) => r.book === "Custom" && isOk(r)).length;
  const skipped = results.filter((r) => r.outcome === "skipped").length;
  const failed = results.filter((r) => r.outcome === "failed").length;
  return {
    standardOk,
    customOk,
    skipped,
    failed,
    text: `Standard ${standardOk} ok · Custom ${customOk} ok · ${skipped} skipped · ${failed} failed`,
  };
}

/** Columns written to the PricebookEntry tab of the results sheet. */
export function pricebookEntryResultFields(
  r: PricebookEntryResult,
): Record<string, unknown> {
  return {
    Price_Book: r.bookName,
    Book_Type: r.book,
    External_ID_4D__c: r.key,
    Product2Id: r.productId,
    Pricebook2Id: r.pricebookId,
    UnitPrice: r.unitPrice,
    IsActive: true,
    Outcome: r.outcome,
  };
}
