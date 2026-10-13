/**
 * Stanford CSP Migration – Enrollment Import (All Time) flow.
 *
 * A reduced-scope sibling of enrollmentFlow.ts ("Enrollment Import"), which
 * only migrates enrollments for courses within the 2-year window
 * (ANCHOR_QUARTER = "wi25"). This flow instead streams the SAME Enrollment
 * TSV with NO date/window restriction at all — every quarter in the file,
 * not just the last 2 years — but writes only 7 fields per record, per
 * Santhosh's explicit scope cut for the all-time pass:
 *
 *   External_ID_4D__c | ParticipantContactId | CourseOfferingId
 *   Grade_Option__c   | ParticipationStatus  | ParticipantAffiliation
 *   ParticipantAccountId
 *
 * Everything else the 2-year flow maps (Grade__c, all currency fields,
 * Enrollment_Date__c, CreatedDate/LastModifiedDate, Notes, Survey fields,
 * STAP fields, Add_Drop__c, and the CourseOfferingPtcpResult Phase 2 step)
 * is deliberately OUT of scope here — not omitted by accident.
 *
 * ⚠ DEPENDS ON "Course Import - All" HAVING ACTUALLY RUN: the regular Course
 * Flow only ever loads CourseOffering for the 2-year window; this project
 * also has a separate "Course Import - All" flow (coursesImportAllTime.ts,
 * no window restriction) for exactly this reason. Any enrollment here for a
 * course whose CourseOffering hasn't been loaded by one of the course flows
 * will not find a match, so CourseOfferingId is omitted for that row (same
 * "log and omit" behavior the 2-year Enrollment flow uses for any missed
 * lookup — see mapToEnrollmentCopAllTime). If CourseOfferingId turns out to
 * be required at the schema level, every such row fails outright with
 * REQUIRED_FIELD_MISSING. Confirm "Course Import - All" has actually been
 * run (built ≠ run) before trusting full-scale numbers from this flow —
 * a small TEST_MODE run is the fastest way to check either way.
 *
 * Dedup and Status/Grade_Option mapping logic is identical to the 2-year
 * flow (same source of truth, just copied here since this is a separate
 * flow file) — see enrollmentFlow.ts for the full decision history behind
 * these rules (architect, Sep 18).
 *
 * PREREQUISITES (must run before this flow):
 *   1. Student flow — loads Person Account / Contact (Student_ID_4D__c)
 *   2. Course Import - All (coursesImportAllTime.ts) — loads CourseOffering
 *      for every year, not just the 2-year window. Running this Enrollment
 *      flow against only the regular 2-year Course Flow's data will hit the
 *      risk above for most rows.
 *
 * External ID: "ENR-{Enrollment.ID}" — same pattern and same namespace as
 * the 2-year Enrollment flow. Re-running either flow safely upserts the
 * same records (no duplicates); running this flow will re-touch the same
 * ~54K records the 2-year flow already created, updating them to this
 * flow's smaller field set, plus attempt every previously-out-of-window row.
 */

import { flow, type Connection } from "@prismatic-io/spectral";
import axios from "axios";
import Papa, { parse as papaParse } from "papaparse";
import { str, getAccessToken, getSfInstanceUrl, runBulkJob } from "./utils";
import { createPerObjectResultsSheet } from "./reportResults";

// ── Constants ─────────────────────────────────────────────────────────────────
const SF_API = "v68.0";
const BULK_BATCH_SIZE = 20_000;
const SF_OBJECT = "CourseOfferingParticipant";
const EXT_ID_FIELD = "External_ID_4D__c";
// Brand new, never-run-at-scale flow — default to a safe small test first.
// Flip to false only after confirming the CourseOfferingId risk above.
const TEST_MODE = true;
const TEST_LIMIT = 1000;

// ── Raw row type ──────────────────────────────────────────────────────────────
// Only the 6 source columns this reduced flow actually reads.
interface RawEnrollmentRow {
  ID?: string;
  Registration_ID?: string;
  Student_ID?: string;
  Course_ID?: string;
  Grade_Option?: string;
  Status?: string;
}

const NEEDED_COLUMNS: (keyof RawEnrollmentRow)[] = [
  "ID",
  "Registration_ID",
  "Student_ID",
  "Course_ID",
  "Grade_Option",
  "Status",
];

// ── Dedup helpers (identical to enrollmentFlow.ts — see that file for the
// full architect-decision history behind this ranking) ───────────────────────

function statusRank(status: string): number {
  const s = status.trim();
  if (
    s === "Drop w/Refund" ||
    s === "Drop w/ refund" ||
    s === "Drop w/refund" ||
    s === "Drop 1/2 refund" ||
    s === "Drop w/ r"
  )
    return 10;
  if (s === "Drop no refund" || s === "Drop No Refund") return 9;
  if (s === "Drop - Pending") return 8;
  if (s === "Drop Transferred") return 7;
  if (
    s === "Course cancel" ||
    s === "Cancelled - Refunded" ||
    s === "Cancelled - Pending"
  )
    return 6;
  if (s === "Drop") return 5;
  if (s === "UnEnrolled") return 4;
  if (s === "DupEnrollment") return 2;
  if (s === "Enrolled" || s === "Wait List") return 1;
  return 0; // "New" (excluded earlier), blank, unknown
}

function mapParticipationStatus(raw: string | undefined): string | null {
  const s = str(raw).trim();
  if (s === "Enrolled") return "Enrolled";
  if (s === "Wait List") return "Waitlisted";
  if (s === "UnEnrolled") return "Dropped";
  if (
    s === "Drop w/Refund" ||
    s === "Drop w/ refund" ||
    s === "Drop w/refund" ||
    s === "Drop 1/2 refund" ||
    s === "Drop w/ r" ||
    s === "Drop no refund" ||
    s === "Drop No Refund" ||
    s === "Drop Transferred" ||
    s === "Drop - Pending" ||
    s === "Drop"
  )
    return "Dropped";
  if (
    s === "Course cancel" ||
    s === "Cancelled - Refunded" ||
    s === "Cancelled - Pending"
  )
    return "Cancelled";
  if (s === "Adjustment") return "Adjustment";
  if (s === "DupEnrollment") return "DupEnrollment";
  return null; // blank or unrecognized — caller logs and skips
}

function mapGradeOption(raw: string | undefined): string | undefined {
  const s = str(raw).trim();
  if (!s) return undefined;
  switch (s) {
    case "NGR":
      return "NGR";
    case "CR/NC":
      return "Credit/No Credit";
    case "CR/NCR":
      return "Credit/No Credit"; // junk cleanup
    case "Letter":
      return "Letter Grade";
    case "Audit":
    case "Audit'":
    case "Audit\\":
      return "NGR"; // Audit = NGR per Amy, Jul 2
    case "Inst S/NC":
      return "Inst S/NC";
    case "Inst CR/N":
      return "Inst S/NC"; // junk cleanup
    default:
      return undefined;
  }
}

// Strips trailing ".0" (4D Longint-to-Text export artifact).
function stripDotZero(v: string | undefined): string {
  return str(v).trim().replace(/\.0$/, "");
}

// ── Salesforce query helper ───────────────────────────────────────────────────

async function sfQueryAll<T>(
  base: string,
  token: string,
  soql: string,
): Promise<T[]> {
  const headers = { Authorization: `Bearer ${token}` };
  const all: T[] = [];
  let nextUrl: string | null = null;
  let done = false;

  const fetch = async (url: string | null) => {
    const { data } = await axios.get<{
      records: T[];
      done: boolean;
      nextRecordsUrl?: string;
    }>(
      url ?? `${base}/services/data/${SF_API}/query`,
      url ? { headers } : { params: { q: soql }, headers },
    );
    all.push(...data.records);
    done = data.done;
    nextUrl = data.nextRecordsUrl ? `${base}${data.nextRecordsUrl}` : null;
  };

  await fetch(null);
  while (!done && nextUrl) await fetch(nextUrl);
  return all;
}

// ── Student / Person Account cache ────────────────────────────────────────────

interface StudentCacheEntry {
  contactId: string; // PersonContactId → ParticipantContactId
  accountId: string; // Id             → ParticipantAccountId
}

async function buildStudentCache(
  base: string,
  token: string,
): Promise<Map<string, StudentCacheEntry>> {
  const records = await sfQueryAll<{
    Id: string;
    PersonContactId: string;
    Student_ID_4D__c: string;
  }>(
    base,
    token,
    "SELECT Id, PersonContactId, Student_ID_4D__c FROM Account WHERE IsPersonAccount = true AND Student_ID_4D__c != null",
  );
  const map = new Map<string, StudentCacheEntry>();
  for (const r of records) {
    if (r.Student_ID_4D__c) {
      map.set(r.Student_ID_4D__c, {
        contactId: r.PersonContactId,
        accountId: r.Id,
      });
    }
  }
  return map;
}

// ── CourseOffering cache ──────────────────────────────────────────────────────
// NOTE: this will only ever contain the 2-year window's ~1,148 offerings —
// Course Flow has never loaded anything outside that range. See the risk
// note at the top of this file.

async function buildCourseOfferingCache(
  base: string,
  token: string,
): Promise<Map<string, string>> {
  const records = await sfQueryAll<{
    Id: string;
    External_ID_4D__c: string;
  }>(
    base,
    token,
    "SELECT Id, External_ID_4D__c FROM CourseOffering WHERE External_ID_4D__c != null",
  );
  const map = new Map<string, string>();
  for (const r of records) {
    if (r.External_ID_4D__c) map.set(r.External_ID_4D__c, r.Id);
  }
  return map;
}

// ── Streaming dedup builder ───────────────────────────────────────────────────
// Same dedup rule as the 2-year flow, minus the 2-year window filter itself.
// Memory per row is much smaller here (6 columns vs. 22), which is what makes
// streaming the FULL file — not just a 2-year slice — safe to hold in memory.

async function buildDedupMap(
  fileId: string,
  accessToken: string,
): Promise<{
  winners: Map<string, RawEnrollmentRow>;
  totalRows: number;
  excludedNew: number;
  adjustmentCount: number;
}> {
  const response = await axios.get(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      params: { alt: "media", supportsAllDrives: "true" },
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: "stream",
    },
  );

  return new Promise((resolve, reject) => {
    const winners = new Map<string, RawEnrollmentRow>();
    const winnerRank = new Map<string, number>();
    const columnIndex: Partial<Record<keyof RawEnrollmentRow, number>> = {};
    let headersSeen = false;
    let totalRows = 0;
    let excludedNew = 0;
    let adjustmentCount = 0;
    let settled = false;
    const finish = (result: {
      winners: Map<string, RawEnrollmentRow>;
      totalRows: number;
      excludedNew: number;
      adjustmentCount: number;
    }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    papaParse(response.data as unknown as NodeJS.ReadableStream, {
      delimiter: "\t",
      quoteChar: "\0",
      header: false,
      skipEmptyLines: true,

      step: (
        result: Papa.ParseResult<string[]>,
        parser: { abort: () => void },
      ) => {
        const raw = result.data as unknown as string[];

        if (!headersSeen) {
          headersSeen = true;
          const headers = raw.map((h) =>
            h
              .replace(/^﻿/, "")
              .replace(/\r/g, "")
              .trim(),
          );
          for (const col of NEEDED_COLUMNS) {
            const idx = headers.indexOf(col);
            if (idx !== -1) columnIndex[col] = idx;
          }
          return;
        }

        const get = (col: keyof RawEnrollmentRow): string => {
          const idx = columnIndex[col];
          return idx === undefined ? "" : (raw[idx] ?? "").replace(/\r/g, "");
        };
        const record: RawEnrollmentRow = {
          ID: get("ID"),
          Registration_ID: get("Registration_ID"),
          Student_ID: get("Student_ID"),
          Course_ID: get("Course_ID"),
          Grade_Option: get("Grade_Option"),
          Status: get("Status"),
        };

        if (!str(record.ID).trim()) return;
        totalRows++;

        if (TEST_MODE && totalRows >= TEST_LIMIT) {
          parser.abort();
          finish({ winners, totalRows, excludedNew, adjustmentCount });
          return;
        }

        const status = str(record.Status).trim();

        if (status === "New") {
          excludedNew++;
          return;
        }

        // Architect, Sep 18 (same rule as the 2-year flow): Adjustment rows
        // always survive as their own record, never folded into dedup.
        if (status === "Adjustment") {
          adjustmentCount++;
          winners.set(`adj:${str(record.ID).trim()}`, record);
          return;
        }

        const rank = statusRank(status);
        const regId = stripDotZero(record.Registration_ID);
        const studId = stripDotZero(record.Student_ID);
        const courseId = str(record.Course_ID).trim();
        const groupKey = `${regId}|${studId}|${courseId}`;

        const existingRank = winnerRank.get(groupKey) ?? -1;
        if (rank > existingRank) {
          winners.set(groupKey, record);
          winnerRank.set(groupKey, rank);
        }
      },

      complete: () =>
        finish({ winners, totalRows, excludedNew, adjustmentCount }),
      error: (err: Error) => {
        if (!settled) reject(err);
      },
    });
  });
}

// ── SF record mapper ──────────────────────────────────────────────────────────

type EnrollmentCopRecord = Record<string, unknown>;

function mapToEnrollmentCopAllTime(
  raw: RawEnrollmentRow,
  studentCache: Map<string, StudentCacheEntry>,
  coCache: Map<string, string>,
  logger: { warn: (m: string) => void },
): EnrollmentCopRecord | null {
  const id = str(raw.ID).trim();
  if (!id) return null;

  const status = str(raw.Status).trim();
  const participationStatus = mapParticipationStatus(status);
  if (!participationStatus) {
    logger.warn(
      `[Enrollment Import All Time] Unknown status "${status}" for ENR-${id} — skipped`,
    );
    return null;
  }

  // Only the 7 fields Santhosh confirmed for this reduced, all-time pass.
  const record: EnrollmentCopRecord = {
    External_ID_4D__c: `ENR-${id}`,
    ParticipantAffiliation: "Student",
    ParticipationStatus: participationStatus,
  };

  const studentId = stripDotZero(raw.Student_ID);
  if (studentId && studentId !== "0") {
    const entry = studentCache.get(studentId);
    if (entry) {
      record.ParticipantContactId = entry.contactId;
      record.ParticipantAccountId = entry.accountId;
    } else {
      logger.warn(
        `[Enrollment Import All Time] Student_ID "${studentId}" not found in SF — ENR-${id} will be missing contact/account`,
      );
    }
  }

  const courseId = str(raw.Course_ID).trim();
  if (courseId) {
    const coId = coCache.get(courseId);
    if (coId) {
      record.CourseOfferingId = coId;
    } else {
      // Expected to be common here — see the risk note at the top of this
      // file. Course Flow has only ever loaded the 2-year window's offerings.
      logger.warn(
        `[Enrollment Import All Time] Course_ID "${courseId}" not found in SF (outside 2-year window?) — ENR-${id} will be missing offering`,
      );
    }
  }

  const gradeOption = mapGradeOption(raw.Grade_Option);
  if (gradeOption) record.Grade_Option__c = gradeOption;

  return record;
}

// ── Flow ──────────────────────────────────────────────────────────────────────

export const enrollmentsImportAllTime = flow({
  name: "Enrollment Import All Time",
  stableKey: "eat99887-7665-4c43-2211-aabbccddeeff",
  description:
    "Streams the full Enrollment TSV (no 2-year window restriction) and " +
    "bulk-upserts CourseOfferingParticipant records via Bulk API 2.0, " +
    "writing only External_ID_4D__c, ParticipantContactId, CourseOfferingId, " +
    "Grade_Option__c, ParticipationStatus, ParticipantAffiliation, and " +
    "ParticipantAccountId — a reduced field set for the all-time pass. " +
    "Must run after Student and Course flows.",

  onTrigger: (_context, payload) => Promise.resolve({ payload }),

  onExecution: async (context, _params) => {
    const { logger, configVars } = context;
    logger.info("[Enrollment Import All Time] Starting…");

    // ── Connections ───────────────────────────────────────────────────────────
    const gdConn = configVars[
      "Google Drive Connection"
    ] as unknown as Connection;
    const sfConn = configVars["Salesforce Connection"] as unknown as Connection;
    const fileId = configVars["Enrollment File ID"] as unknown as string;
    const failedFolderId = configVars["Failed Records Folder ID"] as
      | string
      | undefined;

    if (!fileId) throw new Error("Enrollment File ID config var is empty.");

    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfBase = getSfInstanceUrl(sfConn);

    // ── Build lookup caches ───────────────────────────────────────────────────
    logger.info(
      "[Enrollment Import All Time] Building Student and CourseOffering caches…",
    );
    const [studentCache, coCache] = await Promise.all([
      buildStudentCache(sfBase, sfToken),
      buildCourseOfferingCache(sfBase, sfToken),
    ]);
    logger.info(
      `[Enrollment Import All Time] Caches — students=${studentCache.size}, courseOfferings=${coCache.size}`,
    );

    // ── Stream + dedup ────────────────────────────────────────────────────────
    logger.info(
      "[Enrollment Import All Time] Streaming Enrollment TSV (no window filter) and building dedup map…",
    );
    const { winners, totalRows, excludedNew, adjustmentCount } =
      await buildDedupMap(fileId, gdToken);

    const uniqueGroups = winners.size;
    logger.info(
      `[Enrollment Import All Time] Dedup complete — total=${totalRows}, ` +
        `uniqueGroups=${uniqueGroups}, excludedNew=${excludedNew}, ` +
        `adjustmentRecordsKeptSeparately=${adjustmentCount}`,
    );

    // ── Map to SF records ─────────────────────────────────────────────────────
    const sfRecords: EnrollmentCopRecord[] = [];
    let skippedUnmappable = 0;

    for (const row of winners.values()) {
      const mapped = mapToEnrollmentCopAllTime(
        row,
        studentCache,
        coCache,
        logger,
      );
      if (!mapped) {
        skippedUnmappable++;
        continue;
      }
      sfRecords.push(mapped);
    }
    winners.clear();

    if (TEST_MODE && sfRecords.length > TEST_LIMIT) {
      sfRecords.splice(TEST_LIMIT);
      logger.info(
        `[Enrollment Import All Time] TEST MODE: limited to first ${TEST_LIMIT} records`,
      );
    }

    logger.info(
      `[Enrollment Import All Time] ${sfRecords.length} records ready to upsert ` +
        `(${skippedUnmappable} unmappable)`,
    );

    if (sfRecords.length === 0) {
      logger.info("[Enrollment Import All Time] No records to upsert — done.");
      return {
        data: { totalRows, uniqueGroups, sfRecords: 0 },
      };
    }

    // ── Bulk upsert in batches of BULK_BATCH_SIZE ─────────────────────────────
    const batches: EnrollmentCopRecord[][] = [];
    for (let i = 0; i < sfRecords.length; i += BULK_BATCH_SIZE) {
      batches.push(sfRecords.slice(i, i + BULK_BATCH_SIZE));
    }
    logger.info(
      `[Enrollment Import All Time] Submitting ${batches.length} bulk job(s) ` +
        `(up to ${BULK_BATCH_SIZE} records each)…`,
    );

    let totalProcessed = 0;
    let totalFailed = 0;
    let successfulCsv = "";
    let failedCsv = "";

    for (let b = 0; b < batches.length; b++) {
      logger.info(
        `[Enrollment Import All Time] Batch ${b + 1}/${batches.length} — ${batches[b].length} records`,
      );
      const result = await runBulkJob(
        sfBase,
        sfToken,
        SF_OBJECT,
        EXT_ID_FIELD,
        batches[b] as unknown as Record<string, unknown>[],
        logger,
        `[Enrollment Import All Time Batch ${b + 1}]`,
      );
      totalProcessed += result.numberRecordsProcessed;
      totalFailed += result.numberRecordsFailed;
      if (result.successfulCsv)
        successfulCsv += (successfulCsv ? "\n" : "") + result.successfulCsv;
      if (result.failedCsv)
        failedCsv += (failedCsv ? "\n" : "") + result.failedCsv;
    }

    // ── Results sheet ─────────────────────────────────────────────────────────
    try {
      const sheet = await createPerObjectResultsSheet({
        flowName: "Enrollment Import All Time",
        objects: [
          {
            objectName: SF_OBJECT,
            successfulCsv,
            failedCsv,
          },
        ],
        accessToken: gdToken,
        folderId: failedFolderId,
      });
      logger.info(`[Enrollment Import All Time] Results sheet: ${sheet.url}`);
    } catch (err) {
      logger.warn(
        `[Enrollment Import All Time] Could not write results sheet: ${String(err)}`,
      );
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    logger.info(
      `[Enrollment Import All Time] Complete —` +
        `\n  Source rows:      ${totalRows}` +
        `\n  Excluded (New):   ${excludedNew}` +
        `\n  Dedup groups:     ${uniqueGroups}` +
        `\n  Adjustment (kept separately): ${adjustmentCount}` +
        `\n  Unmappable status: ${skippedUnmappable}` +
        `\n  COP submitted:    ${sfRecords.length}` +
        `\n  COP processed:    ${totalProcessed}` +
        `\n  COP failed:       ${totalFailed}`,
    );

    return {
      data: {
        totalRows,
        uniqueGroups,
        adjustmentCount,
        skippedUnmappable,
        sfRecords: sfRecords.length,
        processed: totalProcessed,
        failed: totalFailed,
      },
    };
  },
});

export default [enrollmentsImportAllTime];
