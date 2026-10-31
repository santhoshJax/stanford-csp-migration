/**
 * Shared helpers for the commerce-side flows (Purchase Inventory, Purchase,
 * Purchase Item, Payments).
 *
 * These mirror the helpers that live inline in registrationFlow.ts (windowed
 * TSV streaming by byte offset, Bulk API batching, successfulResults Id
 * extraction, SOQL paging). registrationFlow.ts is intentionally left
 * untouched so the already-tested Registration import does not change
 * behaviour; a follow-up could point it at this module.
 */

import axios from "axios";
import { parse as papaParse, type ParseResult, type Parser } from "papaparse";
import { Transform } from "stream";
import { str, runBulkJob, SF_API_VERSION } from "./utils";
import {
  parsePriceBookNames,
  resolvePriceBooks,
  type PricebookRecord,
  type ResolvedPriceBooks,
} from "./courseUtils";

export type SfRecord = Record<string, unknown>;

export interface Logger {
  info: (m: string) => void;
  warn: (m: string) => void;
  error: (m: string) => void;
}

export const EXT_ID_FIELD = "External_ID_4D__c";
export const BULK_BATCH_SIZE = 50_000;

/**
 * 2-year scope cutoff. Same fixed date Registration uses (architect decision,
 * 2026-10-06) so every commerce object is cut at the same point and child
 * records (Payments, Purchase Items) line up with the parents that were
 * actually loaded. NOTE: the new workbook tabs (Purchase, Purchase Item,
 * Purchase Inventory, Payments) have no "Field to Determine 2-Year Cutoff"
 * column — applying this to Purchase_Date / Date_Time_New is an assumption
 * to confirm with the architect.
 */
export const COMMERCE_TWO_YEAR_CUTOFF = "2024-10-06";

// ── Value helpers ─────────────────────────────────────────────────────────────

/** Strips trailing ".0" (4D Longint-to-Text export artifact). */
export function stripDotZero(v: string | undefined): string {
  return str(v).trim().replace(/\.0$/, "");
}

export function parseCurrency(raw: string | undefined): number | undefined {
  const s = str(raw).trim();
  if (!s) return undefined;
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

export function parseInteger(raw: string | undefined): number | undefined {
  const s = str(raw).trim();
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return isNaN(n) ? undefined : n;
}

/**
 * CC_Exp_Date — packed "M" + "YY" digits, e.g. "610" = month 6 / year 10,
 * "1020" = month 10 / year 20. Last two digits are the year.
 */
export function parseExpiry(
  raw: string | undefined,
): { month: number; year: number } | undefined {
  const digits = str(raw).replace(/\D/g, "");
  if (digits.length < 2) return undefined;
  const year = parseInt(digits.slice(-2), 10);
  const month = parseInt(digits.slice(0, -2), 10);
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return undefined;
  return { month, year };
}

/** 4D YYYYMMDDHHMMSS → ISO DateTime (no UTC offset applied — same as Waiver flow). */
export function parseDateTime4D(raw: string | undefined): string | null {
  const s = str(raw).trim();
  if (!/^\d{14}$/.test(s)) return null;
  return (
    `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T` +
    `${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}.000Z`
  );
}

// ── Salesforce query helper ───────────────────────────────────────────────────

const SF_QUERY_TIMEOUT_MS = 120_000;
const SF_QUERY_API = "v60.0";

export async function sfQueryAll<T>(
  base: string,
  token: string,
  soql: string,
  logger?: { info: (m: string) => void },
): Promise<T[]> {
  const headers = { Authorization: `Bearer ${token}` };
  const all: T[] = [];
  let nextUrl: string | null = null;
  let done = false;
  let page = 0;

  const fetchPage = async (url: string | null) => {
    const { data } = await axios.get<{
      records: T[];
      done: boolean;
      nextRecordsUrl?: string;
    }>(
      url ?? `${base}/services/data/${SF_QUERY_API}/query`,
      url
        ? { headers, timeout: SF_QUERY_TIMEOUT_MS }
        : { params: { q: soql }, headers, timeout: SF_QUERY_TIMEOUT_MS },
    );
    all.push(...data.records);
    done = data.done;
    nextUrl = data.nextRecordsUrl ? `${base}${data.nextRecordsUrl}` : null;
    page++;
    logger?.info(
      `  … page ${page} — ${all.length} record(s) so far${done ? " (done)" : ""}`,
    );
  };

  await fetchPage(null);
  while (!done && nextUrl) await fetchPage(nextUrl);
  return all;
}

/** Student_ID_4D__c → PersonEmail (Payment.GroupPayee, same as Registration). */
export async function buildStudentEmailCache(
  base: string,
  token: string,
  logger: { info: (m: string) => void },
): Promise<Map<string, string>> {
  const records = await sfQueryAll<{
    PersonEmail: string | null;
    Student_ID_4D__c: string;
  }>(
    base,
    token,
    "SELECT PersonEmail, Student_ID_4D__c FROM Account WHERE IsPersonAccount = true AND Student_ID_4D__c != null",
    logger,
  );
  const map = new Map<string, string>();
  for (const r of records) {
    if (r.Student_ID_4D__c && r.PersonEmail) {
      map.set(r.Student_ID_4D__c, r.PersonEmail);
    }
  }
  return map;
}

/**
 * Id of the Standard Price Book. Every product must have a Standard Price
 * Book entry before Salesforce allows an entry in any custom price book.
 */
export async function getStandardPricebookId(
  base: string,
  token: string,
): Promise<string> {
  const rows = await sfQueryAll<{ Id: string }>(
    base,
    token,
    "SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1",
  );
  if (rows.length === 0) {
    throw new Error(
      "No Standard Price Book found (Pricebook2.IsStandard = true).",
    );
  }
  return rows[0].Id;
}

// ── Configurable price books (shared "Price Books" config var) ──────────────
//
// The "Price Books" config var lives on the Course Configuration page and is
// shared by the course flows and Purchase Inventory / Purchase / Purchase Item
// Import, so course and inventory Products land in the same books. Parsing and
// validation are the course flows' own (courseUtils.parsePriceBookNames /
// resolvePriceBooks), so both streams fail the same way on a bad name: a name
// that matches no Pricebook2, an inactive book, or more than one custom book
// stops the run before any row is written. Standard is always added first.

/** Name of the shared config var holding the comma-separated price book names. */
export const PRICE_BOOKS_CONFIG_VAR = "Price Books";

export interface ResolvedPricebook {
  id: string;
  name: string;
  isStandard: boolean;
}

/**
 * Turns a resolvePriceBooks result into load order: the Standard Price Book
 * first (Salesforce rejects a custom-book entry for a product with no
 * Standard entry), then the custom book, when one is configured.
 */
export function pricebooksInLoadOrder(
  resolved: ResolvedPriceBooks,
): ResolvedPricebook[] {
  const books: ResolvedPricebook[] = [
    { id: resolved.standard.Id, name: resolved.standard.Name, isStandard: true },
  ];
  if (resolved.custom) {
    books.push({
      id: resolved.custom.Id,
      name: resolved.custom.Name,
      isStandard: false,
    });
  }
  return books;
}

/**
 * Reads the shared "Price Books" config value and resolves each name to a
 * Pricebook2 Id, in load order (see pricebooksInLoadOrder). Non-fatal notes
 * (e.g. Standard added because it was left out) are logged as warnings.
 */
export async function resolveConfiguredPricebooks(
  base: string,
  token: string,
  rawConfig: string | undefined,
  log?: { warn: (msg: string) => void },
): Promise<ResolvedPricebook[]> {
  const names = parsePriceBookNames(rawConfig);
  const conditions = ["IsStandard = true"];
  if (names.length > 0) {
    const quoted = names.map((n) => `'${n.replace(/'/g, "\\'")}'`).join(", ");
    conditions.push(`Name IN (${quoted})`);
  }
  const found = await sfQueryAll<PricebookRecord>(
    base,
    token,
    `SELECT Id, Name, IsStandard, IsActive FROM Pricebook2 WHERE ${conditions.join(" OR ")}`,
  );
  const resolved = resolvePriceBooks(names, found);
  for (const w of resolved.warnings) log?.warn(`[Price Books] ${w}`);
  return pricebooksInLoadOrder(resolved);
}

/**
 * The single price book Purchase Orders are created in. An Order can only
 * have one Pricebook2, and every OrderItem on it must use an entry from that
 * same book, so Purchase Import and Purchase Item Import must agree on it.
 * Rule: the first CUSTOM price book in the "Price Books" list; the Standard
 * Price Book only when no custom book is configured.
 */
export function orderPricebook(
  books: ResolvedPricebook[],
): ResolvedPricebook {
  const custom = books.find((b) => !b.isStandard);
  return custom ?? books[0];
}

// ── Bulk helpers ──────────────────────────────────────────────────────────────

export interface UpsertResult {
  processed: number;
  failed: number;
  successfulCsv: string;
  failedCsv: string;
}

export async function upsertInBatches(
  records: SfRecord[],
  objectName: string,
  sfBase: string,
  sfToken: string,
  logger: Logger,
  logPrefix: string,
  extIdField: string = EXT_ID_FIELD,
): Promise<UpsertResult> {
  let processed = 0;
  let failed = 0;
  let successfulCsv = "";
  let failedCsv = "";

  const batches: SfRecord[][] = [];
  for (let i = 0; i < records.length; i += BULK_BATCH_SIZE) {
    batches.push(records.slice(i, i + BULK_BATCH_SIZE));
  }

  for (let b = 0; b < batches.length; b++) {
    logger.info(
      `${logPrefix} Batch ${b + 1}/${batches.length} — ${batches[b].length} records`,
    );
    const result = await runBulkJob(
      sfBase,
      sfToken,
      objectName,
      extIdField,
      batches[b],
      logger,
      `${logPrefix} Batch ${b + 1}`,
    );
    processed += result.numberRecordsProcessed;
    failed += result.numberRecordsFailed;
    if (result.successfulCsv)
      successfulCsv += (successfulCsv ? "\n" : "") + result.successfulCsv;
    if (result.failedCsv)
      failedCsv += (failedCsv ? "\n" : "") + result.failedCsv;
  }

  return { processed, failed, successfulCsv, failedCsv };
}

/**
 * Insert-only load through the REST sObject Collections API, 200 records per
 * call, allOrNone=false. For objects with no external id to upsert on
 * (PricebookEntry, RefundLinePayment) — callers must skip records that
 * already exist BEFORE calling, or a re-run inserts duplicates.
 * Each record must carry `attributes: { type }`.
 */
export async function insertViaComposite(
  records: SfRecord[],
  sfBase: string,
  sfToken: string,
  logger: Logger,
  logPrefix: string,
): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;
  for (let i = 0; i < records.length; i += 200) {
    const chunk = records.slice(i, i + 200);
    const { data } = await axios.post<
      { success: boolean; errors?: { message: string }[] }[]
    >(
      `${sfBase}/services/data/${SF_API_VERSION}/composite/sobjects`,
      { allOrNone: false, records: chunk },
      { headers: { Authorization: `Bearer ${sfToken}` } },
    );
    data.forEach((r, idx) => {
      if (r.success) {
        created++;
        return;
      }
      failed++;
      const msg = (r.errors ?? []).map((e) => e.message).join("; ");
      logger.error(`${logPrefix} record ${i + idx + 1}: ${msg}`);
    });
  }
  return { created, failed };
}

/** extIdField → sf__Id from a Bulk API 2.0 successfulResults CSV. */
export function parseSuccessfulSfIds(
  successfulCsv: string,
  extIdField: string = EXT_ID_FIELD,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!successfulCsv.trim()) return map;
  const parsed = papaParse<Record<string, string>>(successfulCsv, {
    header: true,
    skipEmptyLines: true,
  });
  for (const row of parsed.data) {
    const extId = row[extIdField];
    const sfId = row.sf__Id;
    if (extId && sfId) map.set(extId, sfId);
  }
  return map;
}

// ── Windowed execution cursor ─────────────────────────────────────────────────

export interface WindowCursor {
  byteOffset: number;
  knownHeaders: string[];
  windowNumber: number;
}

/** Reads the byte-offset cursor from the trigger payload (same shape as Registration). */
export function readWindowCursor(params: {
  onTrigger: { results: unknown };
}): WindowCursor {
  const triggerBody = (
    params.onTrigger.results as { body?: { data?: unknown } } | undefined
  )?.body?.data as Record<string, unknown> | undefined;
  return {
    byteOffset:
      typeof triggerBody?.byteOffset === "number" ? triggerBody.byteOffset : 0,
    knownHeaders: Array.isArray(triggerBody?.headers)
      ? (triggerBody.headers as string[])
      : [],
    windowNumber:
      typeof triggerBody?.windowNumber === "number"
        ? triggerBody.windowNumber
        : 1,
  };
}

export async function invokeNextWindow(
  context: unknown,
  flowName: string,
  payload: {
    byteOffset: number;
    headers: string[];
    windowNumber: number;
  },
): Promise<void> {
  await (
    context as {
      invokeFlow(name: string, payload: unknown): Promise<void>;
    }
  ).invokeFlow(flowName, payload);
}

// ── TSV streaming (windowed) ──────────────────────────────────────────────────

export interface TsvWindowResult {
  rowsInWindow: number;
  hasMore: boolean;
  nextByteOffset: number;
  parsedHeaders: string[];
}

/**
 * Streams one window of a TSV from Google Drive via an HTTP Range header and
 * calls `onRow` for each data row that has a non-blank `idColumn`. Identical
 * mechanism to registrationFlow.streamAndMapWindow: byte positions are tracked
 * after every newline so the resume cursor is exact even with multi-byte
 * UTF-8, and parsing stops (abort) once `maxRows` rows have been handed out.
 */
export async function streamTsvWindow(
  fileId: string,
  accessToken: string,
  byteOffset: number,
  maxRows: number,
  knownHeaders: string[],
  onRow: (row: Record<string, string>) => void,
  idColumn = "ID",
): Promise<TsvWindowResult> {
  const reqHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (byteOffset > 0) reqHeaders.Range = `bytes=${byteOffset}-`;

  const response = await axios.get(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      params: { alt: "media", supportsAllDrives: "true" },
      headers: reqHeaders,
      responseType: "stream",
    },
  );

  const lineEndBytes: number[] = [];
  let totalBytesReceived = 0;

  const byteTracker = new Transform({
    transform(
      chunk: Buffer,
      _encoding: BufferEncoding,
      callback: (err?: Error | null, data?: Buffer) => void,
    ) {
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === 0x0a) {
          lineEndBytes.push(byteOffset + totalBytesReceived + i + 1);
        }
      }
      totalBytesReceived += chunk.length;
      callback(null, chunk);
    },
  });

  (response.data as NodeJS.ReadableStream).pipe(byteTracker);

  return new Promise((resolve, reject) => {
    let headers: string[] = knownHeaders.length > 0 ? [...knownHeaders] : [];
    let rowsInWindow = 0;
    let aborted = false;
    let lastCompletedCursor = byteOffset;
    let stepCount = 0;

    papaParse(byteTracker as unknown as NodeJS.ReadableStream, {
      delimiter: "\t",
      quoteChar: "\0",
      header: false,
      skipEmptyLines: false,

      step: (result: ParseResult<string[]>, parser: Parser) => {
        if (aborted) return;

        const raw = result.data as unknown as string[];
        const rowEndByte =
          lineEndBytes[stepCount] ?? byteOffset + totalBytesReceived;
        stepCount++;

        if (raw.length === 0 || raw.every((c) => c.replace(/\r/g, "") === "")) {
          lastCompletedCursor = rowEndByte;
          return;
        }

        if (headers.length === 0) {
          headers = raw.map(
            (h, i) =>
              h
                .replace(/^\uFEFF/, "")
                .replace(/\r/g, "")
                .trim() || `__blank_${i}`,
          );
          lastCompletedCursor = rowEndByte;
          return;
        }

        if (rowsInWindow >= maxRows) {
          aborted = true;
          parser.abort();
          return;
        }

        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          if (!h.startsWith("__blank_")) {
            row[h] = (raw[i] ?? "").replace(/\r/g, "");
          }
        });

        if (!str(row[idColumn]).trim()) {
          lastCompletedCursor = rowEndByte;
          return;
        }
        rowsInWindow++;
        onRow(row);
        lastCompletedCursor = rowEndByte;
      },

      complete: () =>
        resolve({
          rowsInWindow,
          hasMore: aborted,
          nextByteOffset: lastCompletedCursor,
          parsedHeaders: headers,
        }),
      error: (err: Error) => reject(err),
    });
  });
}
