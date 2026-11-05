/**
 * Stanford CSP Migration – Quarter Import Before 2013 flow.
 *
 * Reads the Stanford-provided pre-2013 quarter workbook
 * ("Quarters Table - Mock fa88-su12.xlsx", Sheet1: Abbreviation,
 * Class Start Date, Class End Date) and upserts three Salesforce objects
 * in dependency order via Bulk API 2.0:
 *   1. AcademicYear    (upsert key: External_ID__c)
 *   2. AcademicTerm    (upsert key: Code__c, references AcademicYear)
 *   3. AcademicSession (upsert key: Code__c, references AcademicTerm)
 *
 * The source file may be an uploaded .xlsx in Drive or a native Google
 * Sheet; a native Sheet is exported to .xlsx first.
 *
 * Differences from the main Quarter flow (see D01 design):
 *   - External_ID_4D__c is set on AcademicYear only (the Term links to its
 *     Year through it). It is NOT set on Term or Session.
 *   - Web_Launch_Date__c and RegistrationOpenDate are left blank (no source).
 *   - su12 is skipped: it already exists in the org (Code__c 20124) with real
 *     dates, and an upsert would overwrite them with mock values.
 */

import { flow, type Connection } from "@prismatic-io/spectral";
import axios from "axios";
import { Workbook, type CellValue, type Buffer as ExcelBuffer } from "exceljs";
import { str, getAccessToken, getSfInstanceUrl, runBulkJob } from "./utils";
import type { BulkJobResult } from "./utils";
import { createResultsSheet } from "./reportResults";

const LOG_PREFIX = "[QuarterBefore2013]";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";

// Season code -> Salesforce Season picklist value and Code__c digit
// (digits confirmed from existing org data, e.g. wi26 = 20262).
const SEASONS: Record<string, { name: string; digit: string }> = {
  fa: { name: "Fall", digit: "1" },
  wi: { name: "Winter", digit: "2" },
  sp: { name: "Spring", digit: "3" },
  su: { name: "Summer", digit: "4" },
};

// Quarters that already exist in the org with real data. Never overwrite.
const EXISTING_ABBREVIATIONS = new Set(["su12"]);

interface FlowLogger {
  info: (m: string) => void;
  warn: (m: string) => void;
  error: (m: string) => void;
}

// ── SF record shapes ──────────────────────────────────────────────────────────

export interface AcademicYearRecord {
  Name: string;
  Year: string;
  External_ID_4D__c: string;
  External_ID__c: string;
}

export interface AcademicTermRecord {
  Name: string;
  IsActive: boolean;
  "AcademicYear.External_ID_4D__c": string;
  Season: string;
  Code__c: string;
  Abbreviation__c: string;
}

export interface AcademicSessionRecord {
  Name: string;
  "AcademicTerm.Code__c": string;
  Code__c: string;
  IsActive: boolean;
  Season: string;
  Abbreviation__c: string;
  ClassStartDate?: string;
  ClassEndDate?: string;
}

export interface QuarterRecords {
  years: AcademicYearRecord[];
  terms: AcademicTermRecord[];
  sessions: AcademicSessionRecord[];
  skipped: string[];
}

// ── Transformation helpers ────────────────────────────────────────────────────

/**
 * Two-digit code year -> four-digit year. Pivot confirmed by Stanford:
 * 50-99 => 19xx, 00-49 => 20xx (workbook covers 88-99 and 00-12).
 */
export function toFourDigitYear(twoDigits: string): number {
  const yy = parseInt(twoDigits, 10);
  return yy >= 50 ? 1900 + yy : 2000 + yy;
}

/** Excel cell value -> trimmed string (handles Date, rich text, formulas). */
function cellText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText
        .map((part) => part.text)
        .join("")
        .trim();
    }
    if ("result" in value) {
      return cellText(value.result as CellValue);
    }
    if ("text" in value) {
      return String(value.text).trim();
    }
    return "";
  }
  return str(String(value));
}

/**
 * Accepts ISO YYYY-MM-DD (optionally followed by a time, as produced by an
 * Excel date cell). Returns the same ISO timestamp shape the main Quarter
 * flow sends to Salesforce, or undefined when the value is not a valid date.
 */
export function parseIsoDate(value: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(value));
  if (!match) return undefined;
  const iso = `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(`${iso}T00:00:00.000Z`);
  // Reject roll-overs such as 2001-02-30 that Date would silently accept.
  if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {
    return undefined;
  }
  return date.toISOString();
}

/**
 * Parses the workbook buffer into rows of [Abbreviation, Class Start Date,
 * Class End Date] text. Uses "Sheet1" when present, else the first sheet.
 * Row 0 is the header row.
 */
export async function parseWorkbook(buffer: Buffer): Promise<string[][]> {
  const workbook = new Workbook();
  // exceljs's load() type predates Node's generic Buffer<ArrayBufferLike>.
  await workbook.xlsx.load(buffer as unknown as ExcelBuffer);
  const sheet = workbook.getWorksheet("Sheet1") ?? workbook.worksheets[0];
  if (!sheet) throw new Error("Workbook has no worksheets.");

  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    rows.push([1, 2, 3].map((col) => cellText(row.getCell(col).value)));
  });
  return rows;
}

/** Builds deduplicated AcademicYear plus Term/Session records from data rows. */
export function buildQuarterRecords(
  dataRows: string[][],
  logger: Pick<FlowLogger, "warn">,
): QuarterRecords {
  const yearsMap = new Map<string, AcademicYearRecord>();
  const terms: AcademicTermRecord[] = [];
  const sessions: AcademicSessionRecord[] = [];
  const skipped: string[] = [];
  const seenCodes = new Set<string>();

  for (const [abbreviationRaw = "", startRaw = "", endRaw = ""] of dataRows) {
    const abbreviation = str(abbreviationRaw).toLowerCase();
    if (!abbreviation) continue; // blank row

    const match = /^(fa|wi|sp|su)(\d{2})$/.exec(abbreviation);
    if (!match) {
      logger.warn(
        `${LOG_PREFIX} Skipping "${abbreviationRaw}": not a valid quarter abbreviation.`,
      );
      skipped.push(abbreviationRaw);
      continue;
    }
    if (EXISTING_ABBREVIATIONS.has(abbreviation)) {
      logger.warn(
        `${LOG_PREFIX} Skipping "${abbreviationRaw}": already exists in the org.`,
      );
      skipped.push(abbreviationRaw);
      continue;
    }

    const seasonCode = match[1];
    const season = SEASONS[seasonCode];
    const codeYear = toFourDigitYear(match[2]);
    const ayKey = String(codeYear);
    const code = `${ayKey}${season.digit}`;

    if (seenCodes.has(code)) {
      logger.warn(
        `${LOG_PREFIX} Skipping "${abbreviationRaw}": duplicate of Code__c ${code}.`,
      );
      skipped.push(abbreviationRaw);
      continue;
    }
    seenCodes.add(code);

    // Fall keeps the code year; Winter/Spring/Summer fall in the next one.
    const calendarYear = seasonCode === "fa" ? codeYear : codeYear + 1;
    const name = `${season.name} ${calendarYear}`;

    if (!yearsMap.has(ayKey)) {
      yearsMap.set(ayKey, {
        Name: `${ayKey}-${codeYear + 1}`,
        Year: ayKey,
        External_ID_4D__c: ayKey,
        External_ID__c: ayKey,
      });
    }

    terms.push({
      Name: name,
      IsActive: true, // same as the main Quarter flow: SF rejects links to inactive terms
      "AcademicYear.External_ID_4D__c": ayKey,
      Season: season.name,
      Code__c: code,
      Abbreviation__c: abbreviation,
    });

    const session: AcademicSessionRecord = {
      Name: name,
      "AcademicTerm.Code__c": code,
      Code__c: code,
      IsActive: true,
      Season: season.name,
      Abbreviation__c: abbreviation,
    };
    const classStart = parseIsoDate(startRaw);
    const classEnd = parseIsoDate(endRaw);
    if (classStart) {
      session.ClassStartDate = classStart;
    } else {
      logger.warn(
        `${LOG_PREFIX} ${abbreviation}: Class Start Date "${startRaw}" is not an ISO date; left blank.`,
      );
    }
    if (classEnd) {
      session.ClassEndDate = classEnd;
    } else {
      logger.warn(
        `${LOG_PREFIX} ${abbreviation}: Class End Date "${endRaw}" is not an ISO date; left blank.`,
      );
    }
    sessions.push(session);
  }

  return { years: Array.from(yearsMap.values()), terms, sessions, skipped };
}

// ── Google Drive fetch ────────────────────────────────────────────────────────

/** Downloads the file as .xlsx bytes, exporting first if it is a Google Sheet. */
async function fetchWorkbookBuffer(
  fileId: string,
  accessToken: string,
): Promise<Buffer> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const base = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`;

  const meta = await axios.get(base, {
    params: { fields: "mimeType", supportsAllDrives: "true" },
    headers,
  });
  const isNativeSheet = meta.data?.mimeType === GOOGLE_SHEET_MIME;

  const response = isNativeSheet
    ? await axios.get(`${base}/export`, {
        params: { mimeType: XLSX_MIME },
        headers,
        responseType: "arraybuffer",
      })
    : await axios.get(base, {
        params: { alt: "media", supportsAllDrives: "true" },
        headers,
        responseType: "arraybuffer",
      });

  return Buffer.from(response.data as ArrayBuffer);
}

async function writeResults(
  objectName: string,
  result: BulkJobResult,
  accessToken: string,
  folderId: string | undefined,
  logger: FlowLogger,
): Promise<void> {
  try {
    const sheet = await createResultsSheet({
      flowName: "QuarterBefore2013",
      objectName,
      successfulCsv: result.successfulCsv,
      failedCsv: result.failedCsv,
      accessToken,
      folderId,
    });
    logger.info(`${LOG_PREFIX} ${objectName} results sheet: ${sheet.url}`);
  } catch (err: unknown) {
    logger.warn(
      `${LOG_PREFIX} Could not update ${objectName} results sheet: ${String(err)}`,
    );
  }
}

// ── Flow ───────────────────────────────────────────────────────────────────────

export const quarterImportBefore2013 = flow({
  name: "Quarter Import Before 2013",
  stableKey: "410d1a61-06ec-4898-baf6-24bf9f675407",
  description:
    "Reads the Stanford pre-2013 quarter workbook (Excel or Google Sheet) and " +
    "upserts AcademicYear, AcademicTerm and AcademicSession via Bulk API 2.0.",

  onTrigger: (_context, payload) => Promise.resolve({ payload }),

  onExecution: async (context) => {
    const { logger, configVars } = context;

    const gdConn = configVars["Google Drive Connection"];
    const sfConn = configVars["Salesforce Connection"];
    const fileId = configVars["Quarter Before 2013 File ID"];
    const failedFolderId = configVars["Failed Records Folder ID"] as
      string | undefined;

    if (!fileId)
      throw new Error("Quarter Before 2013 File ID config var is empty.");

    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfInstanceUrl = getSfInstanceUrl(sfConn);

    // ── 1. Fetch & parse (row 0 is the header) ─────────────────────────────────
    logger.info(`${LOG_PREFIX} Fetching workbook ${fileId}…`);
    const rows = await parseWorkbook(
      await fetchWorkbookBuffer(fileId, gdToken),
    );
    if (rows.length <= 1) {
      logger.info(`${LOG_PREFIX} No data rows found.`);
      return {
        data: {
          academicYears: 0,
          academicTerms: 0,
          academicSessions: 0,
          skipped: 0,
        },
      };
    }

    // ── 2. Build records ───────────────────────────────────────────────────────
    const { years, terms, sessions, skipped } = buildQuarterRecords(
      rows.slice(1),
      logger,
    );
    logger.info(
      `${LOG_PREFIX} ${rows.length - 1} rows: ${years.length} years, ${terms.length} terms, ` +
        `${sessions.length} sessions, ${skipped.length} skipped (${skipped.join(", ")}).`,
    );

    // ── 3. Upsert in dependency order ─────────────────────────────────────────
    const ayResult = await runBulkJob(
      sfInstanceUrl,
      sfToken,
      "AcademicYear",
      "External_ID__c",
      years as unknown as Record<string, unknown>[],
      logger,
      `${LOG_PREFIX}[AcademicYear]`,
    );
    await writeResults(
      "AcademicYear",
      ayResult,
      gdToken,
      failedFolderId,
      logger,
    );

    const atResult = await runBulkJob(
      sfInstanceUrl,
      sfToken,
      "AcademicTerm",
      "Code__c",
      terms as unknown as Record<string, unknown>[],
      logger,
      `${LOG_PREFIX}[AcademicTerm]`,
    );
    await writeResults(
      "AcademicTerm",
      atResult,
      gdToken,
      failedFolderId,
      logger,
    );

    const asResult = await runBulkJob(
      sfInstanceUrl,
      sfToken,
      "AcademicSession",
      "Code__c",
      sessions as unknown as Record<string, unknown>[],
      logger,
      `${LOG_PREFIX}[AcademicSession]`,
    );
    await writeResults(
      "AcademicSession",
      asResult,
      gdToken,
      failedFolderId,
      logger,
    );

    logger.info(`${LOG_PREFIX} Import complete.`);
    return {
      data: {
        academicYears: years.length,
        academicTerms: terms.length,
        academicSessions: sessions.length,
        skipped: skipped.length,
        failed: {
          academicYears: ayResult.numberRecordsFailed,
          academicTerms: atResult.numberRecordsFailed,
          academicSessions: asResult.numberRecordsFailed,
        },
      },
    };
  },
});

export default [quarterImportBefore2013];
