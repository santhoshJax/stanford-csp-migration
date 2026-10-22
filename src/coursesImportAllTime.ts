/**
 * Stanford CSP Migration – Course 18-Field Import flow (Tier 3).
 *
 * Same processing style as coursesImport2Year.ts (Tier 1) and coursesImport5Year.ts
 * (Tier 2), but maps only the Tier 3 fields confirmed by the architect, and
 * covers every academic year older than Tier 2.
 *
 * Course data tiers (Julia / architect, Sep–Oct 2026):
 *   Tier 1 – all fields      – AY 2024-25, 2025-26 (coursesImport2Year.ts)
 *   Tier 2 – 32 fields       – AY 2021-22, 2022-23, 2023-24 (coursesImport5Year.ts)
 *   Tier 3 – 18 fields       – AY 2020-21 and older (this flow)
 * The number in a 4D quarter code is the academic year (starts in Fall), so
 * Tier 3 = any quarter whose 2-digit year is 20 or lower (fa08…su20, wi20, etc).
 *
 * All checked fields come from the Course source table only — nothing is
 * checked under Course_Department, Room_AV_Request, or Course_Submission for
 * this tier, so none of those joins/objects are touched here.
 *
 * Confirmed fields (user-provided list, Oct 2026):
 *   ID, Code, Title, Quarter, Start_Date, End_Date, Enrollment_Count,
 *   Max_Enrollment, Catalog_Notes, Description, Units, Tuition,
 *   Additional_Fee, Cancelled, Dropped_Special_Percent, Global_Eval,
 *   Return_Rate, Format
 *
 * Course_Summary, Drop_By_Date, Dropped_Percent, and Enrollment_Status were
 * originally included (matching Tier 1/Tier 3, but notably absent from
 * Tier 2) — architect confirmed (Oct 2026) these should be dropped from
 * Tier 3 too, to match Tier 2's scope. Enrollment_Status__c (the target
 * field) is still written, same as Tier 2: derived purely from Cancelled,
 * since the raw Enrollment_Status source text is no longer read here.
 *
 * Four fields are intentionally NOT written, matching decisions already
 * made (and left in place) by the other two tiers:
 *   - Enrollment_Count → EnrolleeCount: system-calculated/read-only in
 *     Salesforce, cannot be written via API (same as Tier 1 and Tier 2).
 *   - Units → LearningCourse.DurationUnit: only CourseOffering.Units__c is
 *     written; Tier 1/2 never set DurationUnit either.
 *   - Cancelled → CourseOffering.Status: Tier 1/2 only fold Cancelled into
 *     Enrollment_Status__c, never touch the standard Status field — matched
 *     here for consistency, per explicit instruction (Oct 2026).
 *
 * Each row triggers sequential Salesforce REST API calls in dependency order:
 *   Learning → LearningCourse → CourseOffering
 * No CourseOfferingSchedule, CourseOfferingParticipant, Location, or
 * Department records — none of their source fields (Weekday, Course_Time,
 * Primary_Instructor, Primary_Associate, Building, Room, Coordinator_ID,
 * RecID, Tuition_Rule_ID) are in the checked set.
 *
 * Learning / LearningCourse are shared with Tier 1 and Tier 2 by base course
 * code. If one already exists in Salesforce it is left untouched, so older
 * Tier 3 title/description data never overwrites newer catalog data.
 *
 * AcademicSession is looked up by the offering's own quarter abbreviation
 * (fa08 → the fa08 session). The earlier pre-2013 → 2013 remap was removed
 * once the Quarter Import Before 2013 flow loaded the fa88–sp12 sessions.
 * Quarters older than fa88 have no AcademicSession, so those offerings fail
 * the lookup and are reported in the CourseOffering failed-records sheet.
 *
 * Recurses via context.invokeFlow until the full file is processed.
 */

import { flow, type Connection } from "@prismatic-io/spectral";
import axios from "axios";
import Papa, { unparse as papaUnparse } from "papaparse";
import { str, getAccessToken, getSfInstanceUrl } from "./utils";
import { createPerObjectResultsSheet } from "./reportResults";
import {
  parseCourseDate,
  normaliseEnrollmentStatus,
  normaliseCatalogNotes,
  parseBool,
  normaliseFormat,
  parseIntVal,
  parseFloatVal,
  stripSectionSuffix,
  extractSectionSuffix,
  formatFromSuffix,
} from "./courseUtils";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_ROWS = 100;
const TEST_MODE = false; // set true to limit a run while testing
const TEST_MAX_ROWS = 100;
const SF_API = "v60.0";

// ── Quarter filter ────────────────────────────────────────────────────────────
// Tier 3 = everything NOT already owned by Tier 1 (24-25) or Tier 2 (21-23) —
// i.e. any academic year 2020 or earlier. Open-ended on the old end.
// Two-digit years use the same pivot as the Quarter flows: 50-99 are 19xx and
// 00-49 are 20xx, so 1900s quarters (e.g. fa95) are Tier 3, not "year 95".
const MAX_TIER3_YEAR = 2020;

export function isTier3Quarter(quarter: string): boolean {
  const m = /^([a-z]+)(\d{2})$/.exec(quarter.trim().toLowerCase());
  if (!m) return false;
  const seasons = ["wi", "sp", "su", "fa"];
  if (!seasons.includes(m[1])) return false;
  const yy = parseInt(m[2], 10);
  const fullYear = yy >= 50 ? 1900 + yy : 2000 + yy;
  return fullYear <= MAX_TIER3_YEAR;
}

// ── Correction mode ───────────────────────────────────────────────────────────
// Same pattern as Student / Instructor / Associate: when "Course Correction
// Enabled" is true, the flow reads the 'Course' tab of the shared Correction
// Sheet, processes ONLY the course IDs listed there, and overrides the listed
// fields. Every other field still comes from the course TSV. When the switch
// is false, nothing below is used and the flow behaves exactly as before.
//
// Added Oct 2026 for the 8 CourseOfferings that failed the "End Date cannot be
// before Start Date" validation rule — the client supplied corrected dates.
const CORRECTION_TAB = "Course";

// Corrected field → accepted column headers on the tab. The Salesforce field
// name is preferred (as on the other tabs), but the source TSV column name is
// also accepted so the client's sheet can be pasted in unchanged.
const CORRECTION_COLUMNS: Record<CourseCorrectionField, string[]> = {
  StartDate: ["StartDate", "Start_Date"],
  EndDate: ["EndDate", "End_Date"],
};

export type CourseCorrectionField = "StartDate" | "EndDate";
export type CourseCorrection = Partial<Record<CourseCorrectionField, string>>;

/**
 * Parses a date from the correction tab. Accepts M/D/YYYY (the source TSV
 * format) and YYYY-MM-DD (how Google Sheets may display a date cell).
 * Returns a Salesforce date-time string, or null when the value is not a real
 * calendar date — callers treat null as an error, never as "leave blank".
 */
export function parseCorrectionDate(
  v: string | undefined | null,
): string | null {
  const s = (v ?? "").trim();
  let year: number;
  let month: number;
  let day: number;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (us) {
    month = Number(us[1]);
    day = Number(us[2]);
    year = Number(us[3]);
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    return null;
  }
  // Round-trip through Date.UTC so values like 2/30 are rejected, not rolled over.
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return dt.toISOString().slice(0, 10) + "T00:00:00.000Z";
}

/**
 * Turns the raw values of the 'Course' tab (first row = headers) into a
 * Map<sourceId, {StartDate?, EndDate?}>. IDs are trimmed. Blank cells are not
 * captured, so a blank cell means "no override" for that field.
 */
export function buildCourseCorrectionMap(
  values: string[][],
): Map<string, CourseCorrection> {
  const map = new Map<string, CourseCorrection>();
  if (values.length < 2) return map;
  const headers = values[0].map((h) => (h ?? "").trim());
  const idIdx = headers.indexOf("ID");
  if (idIdx === -1) return map;
  const colIdx = {} as Record<CourseCorrectionField, number>;
  for (const field of Object.keys(
    CORRECTION_COLUMNS,
  ) as CourseCorrectionField[]) {
    colIdx[field] = headers.findIndex((h) =>
      CORRECTION_COLUMNS[field].includes(h),
    );
  }
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = (row[idIdx] ?? "").trim();
    if (!id) continue;
    const correction: CourseCorrection = {};
    for (const field of Object.keys(colIdx) as CourseCorrectionField[]) {
      if (colIdx[field] === -1) continue;
      const val = (row[colIdx[field]] ?? "").trim();
      if (val !== "") correction[field] = val;
    }
    map.set(id, correction);
  }
  return map;
}

/**
 * Applies one correction-tab entry to a CourseOffering payload (in place).
 * Returns an error message instead of applying anything when a corrected date
 * is unreadable or the resulting End Date is before the Start Date, so the
 * record is reported as failed rather than sent to Salesforce.
 */
export function applyCourseCorrection(
  co: Record<string, unknown>,
  correction: CourseCorrection,
): { applied: CourseCorrectionField[]; error?: string } {
  const parsed: Partial<Record<CourseCorrectionField, string>> = {};
  for (const field of Object.keys(correction) as CourseCorrectionField[]) {
    const d = parseCorrectionDate(correction[field]);
    if (!d) {
      return {
        applied: [],
        error: `Correction sheet ${field} "${correction[field]}" is not a valid date (use M/D/YYYY or YYYY-MM-DD).`,
      };
    }
    parsed[field] = d;
  }
  const start = (parsed.StartDate ?? co.StartDate) as string | undefined;
  const end = (parsed.EndDate ?? co.EndDate) as string | undefined;
  if (start && end && end < start) {
    return {
      applied: [],
      error: `Corrected End Date ${end.slice(0, 10)} is before Start Date ${start.slice(0, 10)} — not sent to Salesforce.`,
    };
  }
  const applied = Object.keys(parsed) as CourseCorrectionField[];
  for (const field of applied) co[field] = parsed[field];
  return { applied };
}

/** Reads the 'Course' tab of the Correction Sheet through the Sheets API. */
async function loadCourseCorrectionSheet(
  spreadsheetId: string,
  accessToken: string,
): Promise<Map<string, CourseCorrection>> {
  const { data } = await axios.get<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(CORRECTION_TAB)}!A:Z`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return buildCourseCorrectionMap(data.values ?? []);
}

// ── Salesforce REST helpers ───────────────────────────────────────────────────
function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
function readHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
async function sfUpsert(
  base: string,
  token: string,
  object: string,
  extIdField: string,
  extIdValue: string,
  payload: Record<string, unknown>,
): Promise<{ id: string; created: boolean }> {
  const url = `${base}/services/data/${SF_API}/sobjects/${object}/${extIdField}/${encodeURIComponent(extIdValue)}`;
  const { data, status } = await axios.patch<{
    id?: string;
    created?: boolean;
  }>(url, payload, {
    headers: authHeaders(token),
    validateStatus: (s) => s < 500,
  });
  if (status === 201) return { id: data.id!, created: true };
  if (status === 200) return { id: data.id!, created: data.created ?? false };
  if (status === 204) {
    const { data: rec } = await axios.get<{ Id: string }>(
      `${base}/services/data/${SF_API}/sobjects/${object}/${extIdField}/${encodeURIComponent(extIdValue)}`,
      { params: { fields: "Id" }, headers: readHeaders(token) },
    );
    return { id: rec.Id, created: false };
  }
  throw new Error(`Upsert ${object} HTTP ${status}: ${JSON.stringify(data)}`);
}

// ── Cache builder (handles SOQL pagination) ───────────────────────────────────

async function buildFieldCache(
  base: string,
  token: string,
  soql: string,
  keyField: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let nextUrl: string | null = null;
  let done = false;

  const fetchPage = async (url: string | null) => {
    const { data } = await axios.get<{
      records: Record<string, string>[];
      done: boolean;
      nextRecordsUrl?: string;
    }>(
      url ?? `${base}/services/data/${SF_API}/query`,
      url
        ? { headers: readHeaders(token) }
        : { params: { q: soql }, headers: readHeaders(token) },
    );
    for (const r of data.records) {
      if (r[keyField]) map.set(r[keyField], r.Id);
    }
    done = data.done;
    nextUrl = data.nextRecordsUrl ? `${base}${data.nextRecordsUrl}` : null;
  };

  await fetchPage(null);
  while (!done && nextUrl) await fetchPage(nextUrl);
  return map;
}

// ── Raw row type (22 mapped fields) ───────────────────────────────────────────

interface RawCourseRow {
  id?: string;
  Code?: string;
  Title?: string;
  Quarter?: string;
  Start_Date?: string;
  End_Date?: string;
  Max_Enrollment?: string;
  Catalog_Notes?: string;
  Description?: string;
  Units?: string;
  Tuition?: string;
  Additional_Fee?: string;
  Cancelled?: string;
  Dropped_Special_Percent?: string;
  Global_Eval?: string;
  Return_Rate?: string;
  Format?: string;
  [key: string]: string | undefined;
}

// ── Result rows ───────────────────────────────────────────────────────────────

interface SuccessRow {
  Source_ID: string;
  Code: string;
  Title: string;
  Quarter: string;
  Object: string;
  fields?: Record<string, unknown>;
  sf__Id: string;
  sf__Created: string;
}

interface ErrorRow {
  Source_ID: string;
  Code: string;
  Title: string;
  Quarter: string;
  Object: string;
  fields?: Record<string, unknown>;
  sf__Error: string;
}

// ── TSV streaming ─────────────────────────────────────────────────────────────

interface StreamResult {
  rows: RawCourseRow[];
  hasMore: boolean;
  nextStartRow: number;
  skippedByQuarter: number;
  skippedByCorrection: number;
  allCorrectionRecordsFound: boolean;
}

/**
 * correctionIds / foundIds are only passed in correction mode. Rows whose ID is
 * not in correctionIds are skipped; each kept ID is added to foundIds (which
 * carries over from earlier runs), and parsing stops as soon as every
 * correction ID has been found.
 */
async function streamAndParseTsv(
  fileId: string,
  accessToken: string,
  startRow: number,
  maxRows: number,
  correctionIds?: Set<string>,
  foundIds?: Set<string>,
): Promise<StreamResult> {
  const response = await axios.get(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      params: { alt: "media", supportsAllDrives: "true" },
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: "stream",
    },
  );

  return new Promise((resolve, reject) => {
    let headers: string[] = [];
    let idField = "id";
    let dataRowIndex = 0;
    const rows: RawCourseRow[] = [];
    let aborted = false;
    let skippedByQuarter = 0;
    let skippedByCorrection = 0;
    let allCorrectionRecordsFound = false;

    Papa.parse(response.data as unknown as NodeJS.ReadableStream, {
      delimiter: "\t",
      quoteChar: "\0",
      header: false,
      skipEmptyLines: true,

      step: (result: Papa.ParseResult<string[]>, parser: Papa.Parser) => {
        if (aborted) return;
        const raw = result.data as unknown as string[];

        if (headers.length === 0) {
          const stripBom = (s: string) =>
            s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
          headers = raw.map(
            (h, i) => stripBom(h).replace(/\r/g, "").trim() || `__blank_${i}`,
          );
          idField =
            headers.find((h) => stripBom(h).toLowerCase() === "id") ?? "id";
          return;
        }

        if (dataRowIndex < startRow) {
          dataRowIndex++;
          return;
        }

        if (rows.length >= maxRows) {
          aborted = true;
          parser.abort();
          return;
        }

        const record: RawCourseRow = {};
        headers.forEach((header, i) => {
          if (!header.startsWith("__blank_")) {
            record[header] = (raw[i] ?? "").replace(/\r/g, "");
          }
        });

        if (idField !== "id" && record[idField] !== undefined) {
          record.id = record[idField];
        }

        if (!(record.id ?? "").trim()) {
          dataRowIndex++;
          return;
        }

        // Quarter filter — Tier 3 academic years only (20 and older). Most of
        // the file is outside this window (Tier 1 / Tier 2), so skips are
        // counted, not logged individually.
        const quarterNorm = (record.Quarter ?? "").trim().toLowerCase();
        if (!isTier3Quarter(quarterNorm)) {
          skippedByQuarter++;
          dataRowIndex++;
          return;
        }

        // Correction mode — keep only the IDs listed on the 'Course' tab.
        if (correctionIds) {
          const rowId = (record.id ?? "").trim();
          if (!correctionIds.has(rowId)) {
            skippedByCorrection++;
            dataRowIndex++;
            return;
          }
          foundIds?.add(rowId);
        }

        rows.push(record);
        dataRowIndex++;

        // Correction mode — stop reading once every listed ID has been found.
        if (
          correctionIds &&
          foundIds &&
          correctionIds.size > 0 &&
          [...correctionIds].every((cid) => foundIds.has(cid))
        ) {
          allCorrectionRecordsFound = true;
          parser.abort();
        }
      },

      complete: () =>
        resolve({
          rows,
          // An early stop in correction mode is not "more rows to process".
          hasMore: aborted && !allCorrectionRecordsFound,
          nextStartRow: dataRowIndex,
          skippedByQuarter,
          skippedByCorrection,
          allCorrectionRecordsFound,
        }),
      error: (err: Error) => reject(err),
    });
  });
}

// ── Error message helper ──────────────────────────────────────────────────────

function sfErrMsg(err: unknown): string {
  const e = err as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };
  if (e.response?.data) {
    const d = e.response.data;
    if (Array.isArray(d)) {
      return (
        `HTTP ${e.response.status} — ` +
        (d as { errorCode?: string; message?: string }[])
          .map((r) => [r.errorCode, r.message].filter(Boolean).join(": "))
          .join("; ")
      );
    }
    return `HTTP ${e.response.status} — ${JSON.stringify(d)}`;
  }
  return e.message ?? String(err);
}

// ── Flow ──────────────────────────────────────────────────────────────────────

export const coursesImportAllTime = flow({
  name: "Course Import - All",
  stableKey: "12b887cb-9f69-4c7f-b860-39d7c7bc66ec",
  description:
    "Tier 3 course import: streams the course TSV, keeps academic year 2020-21 " +
    "and older, and maps the 22 Tier 3 fields to Learning, LearningCourse, " +
    "and CourseOffering.",

  onTrigger: (_context, payload) => Promise.resolve({ payload }),

  onExecution: async (context, params) => {
    const { logger, configVars } = context;

    // ── Cursor from trigger payload ───────────────────────────────────────────
    const triggerBody = (
      params.onTrigger.results as unknown as
        { body?: { data?: unknown } } | undefined
    )?.body?.data as Record<string, unknown> | undefined;

    const startRow =
      typeof triggerBody?.startRow === "number" ? triggerBody.startRow : 0;
    const courseSheetId =
      typeof triggerBody?.courseSheetId === "string"
        ? triggerBody.courseSheetId
        : undefined;

    // IDs already found by earlier runs of a correction-mode import, so the
    // "never matched" warning at the end covers the whole file, not one window.
    const priorFoundIds = Array.isArray(triggerBody?.correctionFoundIds)
      ? (triggerBody.correctionFoundIds as unknown[]).map((v) => String(v))
      : [];

    logger.info(`[Course22] Starting at row ${startRow}`);

    // ── Connections ───────────────────────────────────────────────────────────
    const gdConn = configVars[
      "Google Drive Connection"
    ] as unknown as Connection;
    const sfConn = configVars["Salesforce Connection"] as unknown as Connection;
    const fileId = configVars["Course File ID"] as unknown as string;
    const failedFolderId = configVars["Failed Records Folder ID"] as
      string | undefined;

    const correctionEnabled =
      String(configVars["Course Correction Enabled"]) === "true";

    if (!fileId) throw new Error("Course File ID config var is empty.");

    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfBase = getSfInstanceUrl(sfConn);

    // ── Correction sheet ('Course' tab) ───────────────────────────────────────
    // Unlike the person flows, a missing or empty tab stops the run: in
    // correction mode an empty map would silently skip every row in the file.
    const correctionMap = new Map<string, CourseCorrection>();
    if (correctionEnabled) {
      const correctionSheetId = String(
        (configVars as Record<string, unknown>)["Correction Sheet ID"] ?? "",
      ).trim();
      if (!correctionSheetId) {
        throw new Error(
          "Course Correction Enabled is true but Correction Sheet ID is empty.",
        );
      }
      try {
        const loaded = await loadCourseCorrectionSheet(
          correctionSheetId,
          gdToken,
        );
        for (const [k, v] of loaded) correctionMap.set(k, v);
      } catch (err) {
        throw new Error(
          `[Course22] Could not load the '${CORRECTION_TAB}' tab of the correction sheet: ${sfErrMsg(err)}`,
        );
      }
      if (correctionMap.size === 0) {
        throw new Error(
          `[Course22] Correction mode is on but the '${CORRECTION_TAB}' tab has no rows with an ID.`,
        );
      }
      logger.info(
        `[Course22] Correction mode ON — ${correctionMap.size} course IDs loaded from the '${CORRECTION_TAB}' tab. Only these IDs are processed.`,
      );
    }
    const correctionIds = correctionEnabled
      ? new Set(correctionMap.keys())
      : undefined;
    const foundIds = correctionEnabled ? new Set(priorFoundIds) : undefined;

    // ── Existing catalog records (owned by Tier 1 / Tier 2 / newer rows) ──────
    logger.info("[Course22] Building lookup caches…");
    const existingLearningCache = await buildFieldCache(
      sfBase,
      sfToken,
      "SELECT Id, External_ID_4D__c FROM Learning WHERE External_ID_4D__c != null",
      "External_ID_4D__c",
    );
    logger.info(
      `[Course22] Caches — existing Learning=${existingLearningCache.size}`,
    );

    // ── Stream TSV window ─────────────────────────────────────────────────────
    logger.info(
      `[Course22] Streaming rows ${startRow}–${startRow + MAX_ROWS - 1}… Tier 3 = year <= ${MAX_TIER3_YEAR}`,
    );
    const {
      rows,
      hasMore,
      nextStartRow,
      skippedByQuarter,
      skippedByCorrection,
      allCorrectionRecordsFound,
    } = await streamAndParseTsv(
      fileId,
      gdToken,
      startRow,
      MAX_ROWS,
      correctionIds,
      foundIds,
    );
    logger.info(
      `[Course22] Parsed ${rows.length} rows, skipped ${skippedByQuarter} (outside Tier 3 quarters)` +
        (correctionEnabled
          ? `, skipped ${skippedByCorrection} (not on correction tab)`
          : "") +
        ` (hasMore=${hasMore})`,
    );

    // ── Counters ──────────────────────────────────────────────────────────────
    const counts = {
      learning: { ok: 0, skipped: 0, err: 0 },
      learningCourse: { ok: 0, skipped: 0, err: 0 },
      courseOffering: { ok: 0, err: 0, corrected: 0 },
    };

    const successRows: SuccessRow[] = [];
    const errorRows: ErrorRow[] = [];

    // ── Row loop ──────────────────────────────────────────────────────────────
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sourceId = str(row.id);
      const code = str(row.Code);
      const baseCode = stripSectionSuffix(code) || code;
      const sectionSuffix = extractSectionSuffix(code);
      const title = str(row.Title)
        .replace(/_4DNL_/g, " ")
        .trim();
      const quarter = str(row.Quarter);

      const ok = (
        object: string,
        sfId: string,
        created: boolean,
        fields?: Record<string, unknown>,
      ) =>
        successRows.push({
          Source_ID: sourceId,
          Code: code,
          Title: title,
          Quarter: quarter,
          Object: object,
          fields,
          sf__Id: sfId,
          sf__Created: String(created),
        });

      const fail = (
        object: string,
        error: string,
        fields?: Record<string, unknown>,
      ) =>
        errorRows.push({
          Source_ID: sourceId,
          Code: code,
          Title: title,
          Quarter: quarter,
          Object: object,
          fields,
          sf__Error: error,
        });

      // 1–2. Learning + LearningCourse — only when this base course doesn't
      // exist yet, so Tier 1/Tier 2 (newer) catalog data is never overwritten.
      if (existingLearningCache.has(baseCode)) {
        counts.learning.skipped++;
        counts.learningCourse.skipped++;
      } else {
        const learningPayload: Record<string, unknown> = {
          Name: (title || baseCode).slice(0, 255),
          Type: "LearningCourse",
          IsActive: true,
        };
        try {
          const r = await sfUpsert(
            sfBase,
            sfToken,
            "Learning",
            "External_ID_4D__c",
            baseCode,
            learningPayload,
          );
          existingLearningCache.set(baseCode, r.id);
          counts.learning.ok++;
          ok("Learning", r.id, r.created, {
            External_ID_4D__c: baseCode,
            ...learningPayload,
          });
        } catch (err) {
          counts.learning.err++;
          const msg = sfErrMsg(err);
          logger.error(
            `[Course22] Row ${startRow + i} (${sourceId}) Learning: ${msg}`,
          );
          fail("Learning", msg, {
            External_ID_4D__c: baseCode,
            ...learningPayload,
          });
          continue;
        }

        const lc: Record<string, unknown> = {
          Name: (title || baseCode).slice(0, 255),
          CourseNumber: baseCode.replace(/\s+/g, ""),
        };
        const catalogNotes = normaliseCatalogNotes(row.Catalog_Notes);
        if (catalogNotes) lc.Catalog_Notes__c = catalogNotes;
        const description = normaliseCatalogNotes(row.Description);
        if (description) lc.Description = description.slice(0, 32000);
        lc.Learning = { External_ID_4D__c: baseCode };
        try {
          const r = await sfUpsert(
            sfBase,
            sfToken,
            "LearningCourse",
            "External_ID_4D__c",
            baseCode,
            lc,
          );
          counts.learningCourse.ok++;
          ok("LearningCourse", r.id, r.created, lc);
        } catch (err) {
          counts.learningCourse.err++;
          logger.error(
            `[Course22] Row ${startRow + i} (${sourceId}) LearningCourse: ${sfErrMsg(err)}`,
          );
          fail("LearningCourse", sfErrMsg(err), lc);
        }
      }

      // 3. CourseOffering
      const isCancelled = parseBool(row.Cancelled) === true;
      // Link to the offering's own quarter (fa08 → fa08). The old pre-2013 →
      // 2013 remap was removed once the pre-2013 sessions were imported.
      const effectiveQuarter = quarter.trim().toLowerCase();
      const co: Record<string, unknown> = {
        Name: code || sourceId,
        ...(sectionSuffix ? { SectionNumber: sectionSuffix } : {}),
        // Enrollment_Status is not a Tier 3 field (dropped per architect
        // confirmation, Oct 2026, to match Tier 2) — derive from Cancelled
        // only, same as Tier 2.
        Enrollment_Status__c: normaliseEnrollmentStatus(undefined, isCancelled),
      };
      co.LearningCourse = { External_ID_4D__c: baseCode };
      if (effectiveQuarter)
        co.AcademicSession = { Abbreviation__c: effectiveQuarter };
      // Results-sheet column (correction mode only) — which dates came from
      // the correction tab. Not sent to Salesforce.
      let correctionApplied = "";
      const resultCols = (): Record<string, unknown> =>
        correctionEnabled ? { Correction_Applied: correctionApplied } : {};
      try {
        const setDate = (field: string, v: string | undefined) => {
          const d = parseCourseDate(v);
          if (d) co[field] = d;
        };
        const setInt = (field: string, v: string | undefined) => {
          const n = parseIntVal(v);
          if (n !== null) co[field] = n;
        };
        const setFloat = (field: string, v: string | undefined) => {
          const n = parseFloatVal(v);
          if (n !== null) co[field] = n;
        };

        setDate("StartDate", row.Start_Date);
        setDate("EndDate", row.End_Date);

        // Correction mode — replace the TSV dates with the tab's dates.
        // Every other field above/below still comes from the TSV row.
        const correction = correctionMap.get(sourceId.trim());
        if (correctionEnabled && correction) {
          const tsvStart = row.Start_Date ?? "";
          const tsvEnd = row.End_Date ?? "";
          const result = applyCourseCorrection(co, correction);
          if (result.error) {
            counts.courseOffering.err++;
            logger.error(
              `[Course22] Row ${startRow + i} (${sourceId}) CourseOffering: ${result.error}`,
            );
            fail("CourseOffering", result.error, {
              External_ID_4D__c: sourceId,
              ...co,
              Correction_Applied: "error",
            });
            continue;
          }
          correctionApplied = result.applied.length
            ? result.applied.join(", ")
            : "none (tab row had no dates)";
          counts.courseOffering.corrected++;
          logger.info(
            `[Course22] Correction applied for ${sourceId}: ` +
              `Start ${tsvStart || "(blank)"} → ${String(co.StartDate ?? "").slice(0, 10)}, ` +
              `End ${tsvEnd || "(blank)"} → ${String(co.EndDate ?? "").slice(0, 10)}`,
          );
        }
        // EnrolleeCount is system-calculated (read-only) — cannot be written
        // via API, same as Tier 1 and Tier 2.
        setInt("EnrollmentCapacity", row.Max_Enrollment);
        setFloat("Units__c", row.Units);
        setFloat("Tuition_Amount__c", row.Tuition);
        setFloat("Additional_Fee__c", row.Additional_Fee);
        const droppedSpecialPct = parseFloatVal(row.Dropped_Special_Percent);
        if (droppedSpecialPct !== null && droppedSpecialPct <= 100)
          co.Dropped_Special_Percent__c = droppedSpecialPct;
        setFloat("Global_Eval__c", row.Global_Eval);
        setFloat("Return_Rate__c", row.Return_Rate);
        const fmt =
          normaliseFormat(row.Format, undefined) ??
          formatFromSuffix(sectionSuffix);
        if (fmt) co.Format__c = fmt;

        const r = await sfUpsert(
          sfBase,
          sfToken,
          "CourseOffering",
          "External_ID_4D__c",
          sourceId,
          co,
        );
        counts.courseOffering.ok++;
        ok("CourseOffering", r.id, r.created, {
          External_ID_4D__c: sourceId,
          ...co,
          ...resultCols(),
        });
      } catch (err) {
        counts.courseOffering.err++;
        const msg = sfErrMsg(err);
        logger.error(
          `[Course22] Row ${startRow + i} (${sourceId}) CourseOffering: ${msg}`,
        );
        fail("CourseOffering", msg, {
          External_ID_4D__c: sourceId,
          ...co,
          ...resultCols(),
        });
      }
    }

    // ── Results sheet ─────────────────────────────────────────────────────────
    const RESULT_OBJECTS = [
      "Learning",
      "LearningCourse",
      "CourseOffering",
    ] as const;

    let nextSheetId = courseSheetId;
    if (successRows.length > 0 || errorRows.length > 0) {
      try {
        const objectData = RESULT_OBJECTS.map((objName) => {
          const sRows = successRows
            .filter((r) => r.Object === objName)
            .map(
              ({
                Source_ID,
                Code,
                Title,
                Quarter,
                fields,
                sf__Id,
                sf__Created,
              }) => ({
                Source_ID,
                Code,
                Title,
                Quarter,
                ...fields,
                sf__Id,
                sf__Created,
              }),
            );
          const eRows = errorRows
            .filter((r) => r.Object === objName)
            .map(({ Source_ID, Code, Title, Quarter, fields, sf__Error }) => ({
              Source_ID,
              Code,
              Title,
              Quarter,
              ...fields,
              sf__Error,
            }));
          return {
            objectName: objName,
            successfulCsv:
              sRows.length > 0
                ? papaUnparse(sRows as unknown as Record<string, unknown>[], {
                    newline: "\n",
                  })
                : "",
            failedCsv:
              eRows.length > 0
                ? papaUnparse(eRows as unknown as Record<string, unknown>[], {
                    newline: "\n",
                  })
                : "",
          };
        });

        const sheet = await createPerObjectResultsSheet({
          flowName: "Course Import - All",
          objects: objectData,
          accessToken: gdToken,
          folderId: failedFolderId,
          spreadsheetId: courseSheetId,
        });
        nextSheetId = sheet.spreadsheetId;
        logger.info(`[Course22] Results sheet: ${sheet.url}`);
      } catch (err) {
        logger.warn(
          `[Course22] Could not update results sheet: ${String(err)}`,
        );
      }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    logger.info(
      `[Course22] Window summary (rows ${startRow}–${nextStartRow - 1}):` +
        `\n  Learning:       ${counts.learning.ok} ok, ${counts.learning.skipped} skip (exists), ${counts.learning.err} err` +
        `\n  LearningCourse: ${counts.learningCourse.ok} ok, ${counts.learningCourse.skipped} skip (exists), ${counts.learningCourse.err} err` +
        `\n  CourseOffering: ${counts.courseOffering.ok} ok, ${counts.courseOffering.err} err` +
        (correctionEnabled
          ? `, ${counts.courseOffering.corrected} date-corrected`
          : ""),
    );

    // ── Correction mode: report IDs never found in the file ──────────────────
    const correctionDone =
      correctionEnabled && (allCorrectionRecordsFound || !hasMore);
    if (correctionEnabled && correctionIds && foundIds) {
      logger.info(
        `[Course22] Correction IDs found so far: ${foundIds.size} of ${correctionIds.size}`,
      );
      if (allCorrectionRecordsFound) {
        logger.info(
          `[Course22] All ${correctionIds.size} correction records found — stopping early.`,
        );
      } else if (correctionDone) {
        const missing = [...correctionIds].filter((cid) => !foundIds.has(cid));
        logger.warn(
          `[Course22] ${missing.length} correction ID(s) never matched a Tier 3 row in the course file ` +
            `(check spelling/spaces, or the quarter is not Tier 3): ${missing.map((m) => `"${m}"`).join(", ")}`,
        );
      }
    }

    // ── Recurse ───────────────────────────────────────────────────────────────
    if (hasMore && (!TEST_MODE || nextStartRow < TEST_MAX_ROWS)) {
      logger.info(
        `[Course22] Invoking next iteration at startRow=${nextStartRow}`,
      );
      await (
        context as unknown as {
          invokeFlow(name: string, payload: unknown): Promise<void>;
        }
      ).invokeFlow("Course Import - All", {
        startRow: nextStartRow,
        courseSheetId: nextSheetId,
        ...(foundIds ? { correctionFoundIds: [...foundIds] } : {}),
      });
    } else {
      logger.info("[Course22] All rows processed — import complete.");
    }

    return { data: { startRow, rowsProcessed: rows.length, hasMore, counts } };
  },
});

export default [coursesImportAllTime];
