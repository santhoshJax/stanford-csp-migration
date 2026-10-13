/**
 * Stanford CSP Migration – Course 22-Field Import flow (Tier 3).
 *
 * Same processing style as coursesImport2Year.ts (Tier 1) and coursesImport5Year.ts
 * (Tier 2), but maps only the 22 Tier 3 fields confirmed checked in the
 * "Field for All Courses Import" column of the architect's mapping sheet
 * (Oct 2026), and covers every academic year older than Tier 2.
 *
 * Course data tiers (Julia / architect, Sep–Oct 2026):
 *   Tier 1 – all fields      – AY 2024-25, 2025-26 (coursesImport2Year.ts)
 *   Tier 2 – 32 fields       – AY 2021-22, 2022-23, 2023-24 (coursesImport5Year.ts)
 *   Tier 3 – 22 fields       – AY 2020-21 and older (this flow)
 * The number in a 4D quarter code is the academic year (starts in Fall), so
 * Tier 3 = any quarter whose 2-digit year is 20 or lower (fa08…su20, wi20, etc).
 *
 * All 22 checked fields come from the Course source table only — nothing is
 * checked under Course_Department, Room_AV_Request, or Course_Submission for
 * this tier, so none of those joins/objects are touched here.
 *
 * Confirmed fields (user-provided list, Oct 2026):
 *   ID, Code, Title, Quarter, Start_Date, End_Date, Enrollment_Count,
 *   Max_Enrollment, Catalog_Notes, Description, Units, Tuition, Drop_By_Date,
 *   Additional_Fee, Enrollment_Status, Cancelled, Dropped_Percent,
 *   Dropped_Special_Percent, Global_Eval, Return_Rate, Format, Course_Summary
 *
 * Three fields are intentionally NOT written, matching decisions already
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
 * RecID, Tuition_Rule_ID) are in the checked 22.
 *
 * Learning / LearningCourse are shared with Tier 1 and Tier 2 by base course
 * code. If one already exists in Salesforce it is left untouched, so older
 * Tier 3 title/description data never overwrites newer catalog data.
 *
 * AcademicSession lookup remaps pre-2013 quarters to their 2013 equivalent
 * (fa08 → fa13, wi11 → wi13, etc.), same as Tier 1 — carried over here
 * specifically because Tier 3 is where most pre-2013 rows actually live.
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
const TEST_MODE = true; // set true to limit a run while testing
const TEST_MAX_ROWS = 100;
const SF_API = "v60.0";

// ── Quarter filter ────────────────────────────────────────────────────────────
// Tier 3 = everything NOT already owned by Tier 1 (24-25) or Tier 2 (21-23) —
// i.e. any quarter whose 2-digit year is 20 or lower. Open-ended on the old
// end (earliest source data seen so far is fa08).
const MAX_TIER3_YEAR = 20;

function isTier3Quarter(quarter: string): boolean {
  const m = /^([a-z]+)(\d{2})$/.exec(quarter.trim().toLowerCase());
  if (!m) return false;
  const seasons = ["wi", "sp", "su", "fa"];
  if (!seasons.includes(m[1])) return false;
  return parseInt(m[2], 10) <= MAX_TIER3_YEAR;
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
  Drop_By_Date?: string;
  Additional_Fee?: string;
  Enrollment_Status?: string;
  Cancelled?: string;
  Dropped_Percent?: string;
  Dropped_Special_Percent?: string;
  Global_Eval?: string;
  Return_Rate?: string;
  Format?: string;
  Course_Summary?: string;
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
}

async function streamAndParseTsv(
  fileId: string,
  accessToken: string,
  startRow: number,
  maxRows: number,
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

        rows.push(record);
        dataRowIndex++;
      },

      complete: () =>
        resolve({
          rows,
          hasMore: aborted,
          nextStartRow: dataRowIndex,
          skippedByQuarter,
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

    logger.info(`[Course22] Starting at row ${startRow}`);

    // ── Connections ───────────────────────────────────────────────────────────
    const gdConn = configVars[
      "Google Drive Connection"
    ] as unknown as Connection;
    const sfConn = configVars["Salesforce Connection"] as unknown as Connection;
    const fileId = configVars["Course File ID"] as unknown as string;
    const failedFolderId = configVars["Failed Records Folder ID"] as
      string | undefined;

    if (!fileId) throw new Error("Course File ID config var is empty.");

    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfBase = getSfInstanceUrl(sfConn);

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
    const { rows, hasMore, nextStartRow, skippedByQuarter } =
      await streamAndParseTsv(fileId, gdToken, startRow, MAX_ROWS);
    logger.info(
      `[Course22] Parsed ${rows.length} rows, skipped ${skippedByQuarter} (outside Tier 3 quarters) (hasMore=${hasMore})`,
    );

    // ── Counters ──────────────────────────────────────────────────────────────
    const counts = {
      learning: { ok: 0, skipped: 0, err: 0 },
      learningCourse: { ok: 0, skipped: 0, err: 0 },
      courseOffering: { ok: 0, err: 0 },
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
      // Remap pre-2013 quarters to their 2013 equivalent (fa08 → fa13, wi11 →
      // wi13, etc.) — same as Tier 1, carried over here since Tier 3 is where
      // most pre-2013 rows actually live.
      const effectiveQuarter = (() => {
        const m = /^([a-z]+)(\d+)$/i.exec(quarter);
        if (m && parseInt(m[2], 10) < 13) return `${m[1].toLowerCase()}13`;
        return quarter;
      })();
      const co: Record<string, unknown> = {
        Name: code || sourceId,
        ...(sectionSuffix ? { SectionNumber: sectionSuffix } : {}),
        Enrollment_Status__c: normaliseEnrollmentStatus(
          row.Enrollment_Status,
          isCancelled,
        ),
      };
      co.LearningCourse = { External_ID_4D__c: baseCode };
      if (effectiveQuarter)
        co.AcademicSession = { Abbreviation__c: effectiveQuarter };
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
        const setStr = (field: string, v: string | undefined) => {
          const s = str(v);
          if (s) co[field] = s;
        };

        setDate("StartDate", row.Start_Date);
        setDate("EndDate", row.End_Date);
        // EnrolleeCount is system-calculated (read-only) — cannot be written
        // via API, same as Tier 1 and Tier 2.
        setInt("EnrollmentCapacity", row.Max_Enrollment);
        setFloat("Units__c", row.Units);
        setFloat("Tuition_Amount__c", row.Tuition);
        setDate("Drop_By_Date__c", row.Drop_By_Date);
        setFloat("Additional_Fee__c", row.Additional_Fee);
        const droppedPct = parseFloatVal(row.Dropped_Percent);
        if (droppedPct !== null && droppedPct <= 100)
          co.Dropped_Percent__c = droppedPct;
        const droppedSpecialPct = parseFloatVal(row.Dropped_Special_Percent);
        if (droppedSpecialPct !== null && droppedSpecialPct <= 100)
          co.Dropped_Special_Percent__c = droppedSpecialPct;
        setFloat("Global_Eval__c", row.Global_Eval);
        setFloat("Return_Rate__c", row.Return_Rate);
        const fmt =
          normaliseFormat(row.Format, undefined) ??
          formatFromSuffix(sectionSuffix);
        if (fmt) co.Format__c = fmt;
        setStr("Course_Summary__c", row.Course_Summary);

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
        });
      } catch (err) {
        counts.courseOffering.err++;
        const msg = sfErrMsg(err);
        logger.error(
          `[Course22] Row ${startRow + i} (${sourceId}) CourseOffering: ${msg}`,
        );
        fail("CourseOffering", msg, { External_ID_4D__c: sourceId, ...co });
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
        `\n  CourseOffering: ${counts.courseOffering.ok} ok, ${counts.courseOffering.err} err`,
    );

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
      });
    } else {
      logger.info("[Course22] All rows processed — import complete.");
    }

    return { data: { startRow, rowsProcessed: rows.length, hasMore, counts } };
  },
});

export default [coursesImportAllTime];
