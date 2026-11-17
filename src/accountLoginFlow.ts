/**
 * Stanford CSP Migration – Account Login Import flow.
 *
 * Source: Account Login TSV (4D) — one row per portal login credential.
 * Target: Salesforce User records for the Student community/portal profile.
 *
 * MUST run after Student Import — every row is resolved against an existing
 * Account (Student_ID_4D__c) to obtain the Contact, Email, First/Last Name
 * that the User record is built from. See "CSP Data Migration Mapping
 * Workbook - Account Login.pdf" for the field-by-field mapping this file
 * implements.
 *
 * Field mapping (source → target):
 *   Student_ID  → User.Federation_Identifier__c (Direct Map — custom field per
 *                                               updated mapping doc; NOT the
 *                                               standard User.FederationIdentifier)
 *   Student_ID  → User.ContactId              (Conversion — lookup Contact via
 *                                               the Account matching Student_ID_4D__c)
 *   Inactive    → User.IsActive               (see note below)
 *   —           → User.Username               (Conversion — Email on the matched Contact)
 *   —           → User.Email                  (Conversion — Email on the matched Contact)
 *   —           → User.FirstName / LastName   (Conversion — from the matched Contact)
 *   —           → User.Alias                  (Conversion — LOWER(LEFT(First,1) & LEFT(Last,7)))
 *   —           → User.ProfileId              (Direct Map — default "Student_Profile")
 *   —           → User.LocaleSidKey           (Direct Map — default "en_US")
 *   —           → User.LanguageLocaleKey      (Direct Map — default "en_US")
 *   —           → User.TimeZoneSidKey         (Direct Map — default "America/Los_Angeles")
 *   —           → User.EmailEncodingKey       (Direct Map — default "UTF-8")
 *   —           → PermissionSetAssignment     (decision 2026-10-15 — every
 *                                               successfully upserted User gets
 *                                               Buyer, CSP Stap API Access and
 *                                               CSP Student Education Cloud PS;
 *                                               configurable via "Account Login
 *                                               Permission Sets". Existing
 *                                               assignments are skipped.)
 *
 * Do Not Map (per mapping doc): Instructor_ID, Associate_ID, ID, Last_Login_Date,
 * Password_Hash_Char, Created_Date/Time/By, Last_Modified_Date/Time/By,
 * Student_ID_Previous, Override_Hash_Storage/Start_Date/Start_Time/History,
 * Previous_Hash_Chars.
 *
 * Row-skip rules:
 *   1. No Student_ID, or Student_ID = 0 → skip (per mapping doc).
 *   2. Student_ID doesn't match any existing Account (Student_ID_4D__c) → skip
 *      (Student Import must run first; not explicitly called out in the doc
 *      but every other target field on this object depends on the match).
 *   3. Matched Contact has no email → skip (Username/Email are required,
 *      unique-format fields on User; can't create the record without one).
 *   4. Student has no qualifying enrollment → skip. Only students who have
 *      at least one row in the Enrollment source file (the "Enrollment File
 *      ID" config var) with a Status OTHER than "New" get a User (rule
 *      changed 2026-10-29; before that only Status = "Enrolled" counted).
 *      Students whose rows are all New (a blank Status counts as New) are
 *      skipped as "Only New enrollments"; students with no rows at all are
 *      skipped as "No enrollment rows".
 *      The check reads the source file, not Salesforce, so it does not
 *      depend on the Enrollment Import having run. The Enrollment file is
 *      read once per run, when the Student index is built.
 *   5. Not the student's first row in the file → skip as a duplicate
 *      (2026-10-28). One User is sent per Student_ID across the whole file,
 *      from its first row, with IsActive = true if ANY of its rows is active.
 *      See src/accountLoginIndex.ts.
 *
 * Skipped tab (added 2026-10-26): every row dropped by a rule above — and
 * every row whose column count does not match the header — is written to a
 * "Skipped" tab in the results spreadsheet with its Student_ID and reason.
 * The tab is written BEFORE the User upload.
 *
 * Row accounting (added 2026-10-28): every window checks that the rows it
 * read equal Skipped + Success + Errors + Not Processed, writes one row to a
 * "Window Log" tab, and STOPS the run — naming the byte offset to restart
 * from — when the counts do not add up or a Skipped / results write still
 * fails after retries. Success, Errors and Not Processed rows carry a
 * "Window #" column. A run restarted by hand can keep writing to the same
 * spreadsheet by passing its ID as "sheetId" in the trigger payload.
 *
 * NOTE — Active/Inactive (confirmed with architect): the source "Inactive"
 * flag IS the duplicate marker — 4D only ever sets it true when a row was
 * identified as a duplicate. So the field names being opposites is expected:
 * this flow inverts the value (IsActive = !Inactive) rather than copying it
 * literally. No separate duplicate-detection logic is needed — the source
 * flag already encodes it.
 *
 * PREREQUISITES (Salesforce setup, not covered by this flow):
 *   - A custom field User.Federation_Identifier__c must exist and be marked
 *     as an External ID in Salesforce Setup, so Bulk API 2.0 can upsert on it
 *     (same convention as Student_ID_4D__c / Instructor_ID_4D__c / Associate_ID_4D__c
 *     elsewhere in this project). This is NOT the standard User.FederationIdentifier
 *     field — the mapping doc was corrected to point at the custom field instead.
 *   - The Profile named in the "Account Login Profile Name" config var
 *     (default "Student_Profile" — DEFAULT_PROFILE_NAME below) must exist
 *     in this org under that exact name. Confirmed failing in the "Student_Profile"
 *     org run on 2026-10-05 — set the config var to the real Profile Name before re-running.
 *   - The "Enrollment File ID" config var (Enrollment Configuration page)
 *     must point at the Enrollment TSV. The flow throws if it is empty,
 *     because without it every row would be skipped as not enrolled.
 *   - Every permission set in "Account Login Permission Sets" must exist (by
 *     API Name, or by a Label that is unique) and be assignable to the
 *     Experience Cloud license on that Profile. The flow throws before the
 *     upsert if a name is missing or ambiguous.
 */

import { flow } from "@prismatic-io/spectral";
import axios from "axios";
import { parse, type ParseResult, type Parser } from "papaparse";
import { type Readable } from "stream";
import {
  str,
  cleanEmail,
  describeHttpError,
  withTransientRetry,
  getAccessToken,
  getSfInstanceUrl,
  submitBulkJob,
  collectBulkJobResults,
  SF_API_VERSION,
  type BulkJobResult,
} from "./utils";
import {
  appendSkippedRecords,
  createResultsSheetFromContacts,
  createResultsSpreadsheetWithTab,
  type ResultTabCounts,
} from "./reportResults";
import {
  SKIP_REASON,
  applyStudentIndex,
  classifyDataLine,
  isBlankLine,
  loadOrBuildStudentIndex,
  scanTsvLines,
  truncateDetail,
  windowNumberForByte,
  type PendingLoginRow,
  type SkippedLoginRow,
} from "./accountLoginIndex";
import {
  sfQueryAll,
  insertViaComposite,
  parseSuccessfulSfIds,
} from "./commerceShared";

// Re-exported so existing imports from this module keep working.
export {
  SKIP_REASON,
  describeColumnMismatch,
  type PendingLoginRow,
  type SkippedLoginRow,
} from "./accountLoginIndex";

// ── Constants ──────────────────────────────────────────────────────────────────

// Rows per execution window. Lowered from 2000 on 2026-10-22: window 2 of the
// full run (2000 rows → 1664 Users) was still waiting on its User Bulk job when
// the 15-minute execution limit ended it (E100). Creating Experience Cloud
// Users is much slower per record than other objects, so a smaller window
// keeps each job well inside one execution.
const MAX_ROWS = 500;

// How long one execution waits for the User Bulk job before handing off.
// The platform ends an execution at 15 minutes; this leaves ~5 minutes for
// the permission set assignments, the results sheet and the next invocation.
// If the job is still running at this point, the flow re-invokes itself with
// the job Id and the next execution carries on waiting for the same job — it
// does not upload the records again.
const POLL_BUDGET_MS = 10 * 60 * 1000;
// Hand-offs allowed for one job (about 10 minutes each) before the run stops
// with an error, so a job stuck in Salesforce cannot loop forever.
const MAX_JOB_HANDOFFS = 6;

// Sandbox testing only. When TEST_MODE is true, the flow processes at most
// TEST_RECORD_LIMIT records total and stops — no recursion through the rest
// of the file. Full run (2026-10-22): TEST_MODE off after the sandbox
// 2-record validation passed.
const TEST_MODE = false;
const TEST_RECORD_LIMIT = 2;

const DEFAULT_PROFILE_NAME = "Student_Profile";
// Permission sets assigned to every imported User (decision 2026-10-15).
// Each entry may be a Permission Set API Name or its Label. Overridable via
// the "Account Login Permission Sets" config var (comma-separated).
export const DEFAULT_PERMISSION_SETS = [
  "Buyer",
  "CSP Stap API Access",
  "CSP Student Education Cloud PS",
];
// Enrollment Status that does NOT qualify a student for a User (rule confirmed
// 2026-10-29): a student gets a User if any of their rows has another status.
// Compared case-insensitively after trimming; a blank Status counts as New.
const NEW_STATUS = "new";
const DEFAULT_LOCALE_SID_KEY = "en_US";
const DEFAULT_LANGUAGE_LOCALE_KEY = "en_US";
const DEFAULT_TIME_ZONE_SID_KEY = "America/Los_Angeles";
const DEFAULT_EMAIL_ENCODING_KEY = "UTF-8";

export const SKIPPED_TAB_HEADERS = [
  "Student_ID",
  "Reason",
  "Detail",
  "Window #",
  "Window Start Byte",
];
// One row per window in the "Window Log" tab (added 2026-10-28). "Rows Read"
// should equal Skipped + Success + Errors + Not Processed; "Check" says so.
export const WINDOW_LOG_TAB = "Window Log";
export const WINDOW_LOG_HEADERS = [
  "Window #",
  "Start Byte",
  "End Byte",
  "Rows Read",
  "Blank Lines",
  "Skipped",
  "Sent to Salesforce",
  "Success",
  "Errors",
  "Not Processed",
  "Check",
  "Finished At",
];
// Column added in front of every Success / Errors / Not Processed row.
const WINDOW_NUMBER_COLUMN = "Window #";

// ── Salesforce User shape ─────────────────────────────────────────────────────

interface SalesforceUserRecord {
  Federation_Identifier__c: string;
  ContactId: string;
  IsActive: boolean;
  FirstName?: string;
  LastName: string;
  Alias: string;
  Username: string;
  Email: string;
  ProfileId: string;
  LocaleSidKey: string;
  LanguageLocaleKey: string;
  TimeZoneSidKey: string;
  EmailEncodingKey: string;
}

interface StreamResult {
  rows: PendingLoginRow[];
  hasMore: boolean;
  nextByteOffset: number;
  firstId: string;
  lastId: string;
  /** Non-blank data lines read — every one must end up in a tab. */
  dataLines: number;
  blankLines: number;
  skippedRows: SkippedLoginRow[];
}

/**
 * One window's bookkeeping. Carried in the hand-off payload when the User job
 * outlasts an execution, so the execution that finishes the window can run
 * the count check and write the Window Log row.
 */
export interface WindowState {
  windowNumber: number;
  startByte: number;
  endByte: number;
  dataLines: number;
  blankLines: number;
  skippedCount: number;
  /** Student_IDs sent to Salesforce; null when not known (older hand-off). */
  sentStudentIds: string[] | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns a description of the problem when a window's rows do not add up,
 * or null when every row read is either skipped or sent to Salesforce.
 */
export function checkWindowCounts(
  dataLines: number,
  skipped: number,
  sent: number,
): string | null {
  if (skipped + sent === dataLines) return null;
  return (
    `read ${dataLines} row(s) but recorded ${skipped} skipped + ${sent} sent = ` +
    `${skipped + sent}`
  );
}

/** Builds the Window Log row (columns of WINDOW_LOG_HEADERS). */
export function toWindowLogRow(
  window: WindowState,
  counts: ResultTabCounts,
  finishedAt: string,
): string[] {
  const placed =
    window.skippedCount + counts.success + counts.errors + counts.notProcessed;
  const check =
    window.sentStudentIds === null
      ? ""
      : placed === window.dataLines
        ? "OK"
        : `MISMATCH (${placed} placed)`;
  return [
    String(window.windowNumber),
    String(window.startByte),
    String(window.endByte),
    String(window.dataLines),
    String(window.blankLines),
    String(window.skippedCount),
    window.sentStudentIds === null ? "" : String(window.sentStudentIds.length),
    String(counts.success),
    String(counts.errors),
    String(counts.notProcessed),
    check,
    finishedAt,
  ];
}

/**
 * Rows for the results sheet: each record with "Window #" in front, plus a
 * bare row for every sent Student_ID Salesforce returned in neither result
 * file, so it lands on the Not Processed tab instead of disappearing.
 */
export function toResultSheetRecords(
  records: Record<string, unknown>[],
  sentStudentIds: string[] | null,
  windowNumber: number,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = records.map((r) => ({
    [WINDOW_NUMBER_COLUMN]: String(windowNumber),
    ...r,
  }));
  if (sentStudentIds === null) return rows;
  const present = new Set(
    records.map((r) => String(r.Federation_Identifier__c ?? "")),
  );
  for (const id of sentStudentIds) {
    if (!present.has(id)) {
      rows.push({
        [WINDOW_NUMBER_COLUMN]: String(windowNumber),
        Federation_Identifier__c: id,
      });
    }
  }
  return rows;
}

/** Reads the WindowState passed in a hand-off payload, if any. */
function parseWindowState(value: unknown): WindowState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  const num = (x: unknown) => (typeof x === "number" ? x : 0);
  return {
    windowNumber: num(v.windowNumber) || 1,
    startByte: num(v.startByte),
    endByte: num(v.endByte),
    dataLines: num(v.dataLines),
    blankLines: num(v.blankLines),
    skippedCount: num(v.skippedCount),
    sentStudentIds: Array.isArray(v.sentStudentIds)
      ? (v.sentStudentIds as unknown[]).map(String)
      : null,
  };
}

/** Converts Skipped entries to sheet rows matching SKIPPED_TAB_HEADERS. */
export function toSkippedSheetRows(
  rows: SkippedLoginRow[],
  windowNumber: number,
  windowStartByte: number,
): string[][] {
  return rows.map((r) => [
    r.studentId,
    r.reason,
    r.detail,
    String(windowNumber),
    String(windowStartByte),
  ]);
}

/** "Only New enrollments: 74, No usable email: 2" — for the log line. */
export function summariseSkipReasons(rows: SkippedLoginRow[]): string {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
  return [...counts.entries()].map(([k, v]) => `${k}: ${v}`).join(", ");
}

/** Alias formula from the mapping doc: LOWER(LEFT(FirstName,1) & LEFT(LastName,7)) */
function buildAlias(firstName: string, lastName: string): string {
  const first = firstName.trim().slice(0, 1);
  const last = lastName.trim().slice(0, 7);
  return (first + last).toLowerCase();
}

/** Resolves the Id of a Profile by name. Returns null if not found. */
async function resolveProfileId(
  instanceUrl: string,
  accessToken: string,
  profileName: string,
): Promise<string | null> {
  const soql = `SELECT Id FROM Profile WHERE Name = '${profileName.replace(/'/g, "\\'")}' LIMIT 1`;
  const { data } = await axios.get(
    `${instanceUrl}/services/data/${SF_API_VERSION}/query`,
    {
      params: { q: soql },
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const records = data.records as { Id: string }[];
  return records[0]?.Id ?? null;
}

/** Splits the comma-separated config var into trimmed, de-duplicated names. */
export function parsePermissionSetNames(raw: string | undefined): string[] {
  const source = raw?.trim() ? raw.split(",") : DEFAULT_PERMISSION_SETS;
  return [...new Set(source.map((n) => n.trim()).filter((n) => n.length > 0))];
}

interface PermissionSetRow {
  Id: string;
  Name: string;
  Label: string;
}

/**
 * Picks one permission set per configured name. An exact API Name match wins;
 * otherwise a single Label match is used. Returns the unmatched and ambiguous
 * names so the caller can fail with a clear message.
 */
export function matchPermissionSets(
  configuredNames: string[],
  available: PermissionSetRow[],
): {
  matched: Map<string, PermissionSetRow>;
  missing: string[];
  ambiguous: string[];
} {
  const matched = new Map<string, PermissionSetRow>();
  const missing: string[] = [];
  const ambiguous: string[] = [];

  for (const configuredName of configuredNames) {
    const wanted = configuredName.toLowerCase();
    const byName = available.filter((p) => p.Name.toLowerCase() === wanted);

    if (byName.length === 1) {
      matched.set(configuredName, byName[0]);
      continue;
    }

    const byLabel = available.filter((p) => p.Label.toLowerCase() === wanted);

    if (byLabel.length === 1) {
      matched.set(configuredName, byLabel[0]);
    } else if (byLabel.length > 1) {
      ambiguous.push(
        `"${configuredName}" (API Names: ${byLabel.map((p) => p.Name).join(", ")})`,
      );
    } else {
      missing.push(`"${configuredName}"`);
    }
  }

  return { matched, missing, ambiguous };
}

/**
 * Resolves every configured permission set to its Id. Throws before any User
 * is written if a name is missing or matches more than one permission set.
 */
async function resolvePermissionSets(
  instanceUrl: string,
  accessToken: string,
  configuredNames: string[],
): Promise<PermissionSetRow[]> {
  if (configuredNames.length === 0) return [];

  const inClause = configuredNames
    .map((n) => `'${n.replace(/'/g, "\\'")}'`)
    .join(",");
  const soql =
    `SELECT Id, Name, Label FROM PermissionSet ` +
    `WHERE IsOwnedByProfile = false AND (Name IN (${inClause}) OR Label IN (${inClause}))`;
  const available = await sfQueryAll<PermissionSetRow>(
    instanceUrl,
    accessToken,
    soql,
  );

  const { matched, missing, ambiguous } = matchPermissionSets(
    configuredNames,
    available,
  );

  if (missing.length > 0 || ambiguous.length > 0) {
    const problems: string[] = [];
    if (missing.length > 0) {
      problems.push(`not found: ${missing.join(", ")}`);
    }
    if (ambiguous.length > 0) {
      problems.push(
        `label matches more than one permission set (use the API Name instead): ${ambiguous.join("; ")}`,
      );
    }
    throw new Error(
      `[Account Login Import] Permission set lookup failed — ${problems.join(" | ")}. ` +
        `Fix the "Account Login Permission Sets" config var.`,
    );
  }

  // De-duplicate in case a Name and a Label pointed at the same permission set.
  return [...new Map([...matched.values()].map((p) => [p.Id, p])).values()];
}

/**
 * Assigns each permission set to each User, skipping assignments that already
 * exist so a re-run (or re-upsert of an existing User) is safe.
 */
async function assignPermissionSets(
  instanceUrl: string,
  accessToken: string,
  userIds: string[],
  permissionSets: PermissionSetRow[],
  logger: {
    info: (m: string) => void;
    warn: (m: string) => void;
    error: (m: string) => void;
  },
): Promise<{ created: number; alreadyAssigned: number; failed: number }> {
  if (userIds.length === 0 || permissionSets.length === 0) {
    return { created: 0, alreadyAssigned: 0, failed: 0 };
  }

  const permissionSetIdList = permissionSets.map((p) => `'${p.Id}'`).join(",");
  const existing = new Set<string>();
  const CHUNK_SIZE = 200;

  for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
    const userIdList = userIds
      .slice(i, i + CHUNK_SIZE)
      .map((id) => `'${id}'`)
      .join(",");
    const rows = await sfQueryAll<{
      AssigneeId: string;
      PermissionSetId: string;
    }>(
      instanceUrl,
      accessToken,
      `SELECT AssigneeId, PermissionSetId FROM PermissionSetAssignment ` +
        `WHERE AssigneeId IN (${userIdList}) AND PermissionSetId IN (${permissionSetIdList})`,
    );
    for (const row of rows) {
      existing.add(`${row.AssigneeId}:${row.PermissionSetId}`);
    }
  }

  const toInsert: Record<string, unknown>[] = [];
  for (const userId of userIds) {
    for (const permissionSet of permissionSets) {
      if (existing.has(`${userId}:${permissionSet.Id}`)) continue;
      toInsert.push({
        attributes: { type: "PermissionSetAssignment" },
        AssigneeId: userId,
        PermissionSetId: permissionSet.Id,
      });
    }
  }

  const { created, failed } = await insertViaComposite(
    toInsert,
    instanceUrl,
    accessToken,
    logger,
    "[Account Login Import] PermissionSetAssignment",
  );

  return { created, alreadyAssigned: existing.size, failed };
}

interface StudentContactInfo {
  contactId: string;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Given a list of Student_ID values, returns { studentId → matched Contact info }
 * resolved from the person Account created by Student Import.
 */
/**
 * Rebuilds the uploaded User rows from a finished Bulk job's result CSVs.
 * Used when a job is resumed in a later execution, where the original
 * records are no longer in memory. Both CSVs repeat every uploaded column;
 * the sf__ columns Salesforce adds are dropped, and empty cells are omitted
 * (the upload left unset fields out the same way).
 */
export function recordsFromResultCsvs(
  successfulCsv: string,
  failedCsv: string,
): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  for (const csv of [successfulCsv, failedCsv]) {
    if (!csv.trim()) continue;
    const result: ParseResult<Record<string, string>> = parse(csv, {
      header: true,
      skipEmptyLines: true,
    });
    for (const row of result.data) {
      const record: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (key.startsWith("sf__") || value === "" || value === undefined) {
          continue;
        }
        record[key] = value;
      }
      if (record.Federation_Identifier__c) records.push(record);
    }
  }
  return records;
}

async function resolveContactsByStudentId(
  instanceUrl: string,
  accessToken: string,
  studentIds: string[],
): Promise<Map<string, StudentContactInfo>> {
  if (studentIds.length === 0) return new Map();

  const CHUNK_SIZE = 200;
  const map = new Map<string, StudentContactInfo>();
  const headers = { Authorization: `Bearer ${accessToken}` };

  for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
    const chunk = studentIds.slice(i, i + CHUNK_SIZE);
    const inClause = chunk
      .map((id) => `'${id.replace(/'/g, "\\'")}'`)
      .join(",");
    const soql =
      `SELECT Student_ID_4D__c, PersonContactId, FirstName, LastName, PersonEmail ` +
      `FROM Account WHERE IsPersonAccount = true AND Student_ID_4D__c IN (${inClause})`;
    const { data } = await axios.get(
      `${instanceUrl}/services/data/${SF_API_VERSION}/query`,
      { params: { q: soql }, headers },
    );
    for (const rec of data.records as {
      Student_ID_4D__c: string;
      PersonContactId: string;
      FirstName: string;
      LastName: string;
      PersonEmail: string;
    }[]) {
      if (rec.Student_ID_4D__c && rec.PersonContactId) {
        map.set(rec.Student_ID_4D__c, {
          contactId: rec.PersonContactId,
          firstName: rec.FirstName ?? "",
          lastName: rec.LastName ?? "",
          email: rec.PersonEmail ?? "",
        });
      }
    }
  }

  return map;
}

// ── Enrollment check (Enrollment source file) ──────────────────────────────────

/**
 * True when an Enrollment Status qualifies the student for a User: any status
 * except New. A blank Status counts as New (rule confirmed 2026-10-29).
 */
export function isQualifyingEnrollmentStatus(
  status: string | undefined,
): boolean {
  const value = str(status).trim().toLowerCase();
  return value !== "" && value !== NEW_STATUS;
}

/** Enrollment TSV stores some IDs as "12345.0" — normalise to "12345". */
function normaliseStudentId(value: string | undefined): string {
  return str(value).trim().replace(/\.0$/, "");
}

/**
 * Reads an Enrollment TSV stream and returns, for `wantedStudentIds`:
 *   - enrolled: students with at least one row whose Status is not New
 *   - seen: students with any row at all (so "only New" can be told apart
 *     from "no rows")
 * Stops reading as soon as every wanted ID is in `enrolled`, so it does not
 * read the whole file when every student qualifies early on.
 */
export function collectEnrolledStudentIds(
  stream: Readable | NodeJS.ReadableStream,
  wantedStudentIds: Set<string>,
): Promise<{ enrolled: Set<string>; seen: Set<string>; rowsRead: number }> {
  const enrolled = new Set<string>();
  const seen = new Set<string>();
  let rowsRead = 0;

  return new Promise((resolve, reject) => {
    if (wantedStudentIds.size === 0) {
      (stream as Readable).destroy?.();
      resolve({ enrolled, seen, rowsRead });
      return;
    }

    let studentIdIndex = -1;
    let statusIndex = -1;
    let headersSeen = false;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      (stream as Readable).destroy?.();
      resolve({ enrolled, seen, rowsRead });
    };

    parse(stream as unknown as NodeJS.ReadableStream, {
      delimiter: "\t",
      quoteChar: "\x00",
      header: false,
      skipEmptyLines: true,

      step: (result: ParseResult<string[]>, parser: Parser) => {
        if (settled) return;
        const row = result.data as unknown as string[];

        if (!headersSeen) {
          headersSeen = true;
          const headers = row.map((h) =>
            (h.charCodeAt(0) === 0xfeff ? h.slice(1) : h)
              .replace(/\r/g, "")
              .trim(),
          );
          studentIdIndex = headers.indexOf("Student_ID");
          statusIndex = headers.indexOf("Status");
          if (studentIdIndex === -1 || statusIndex === -1) {
            settled = true;
            parser.abort();
            (stream as Readable).destroy?.();
            reject(
              new Error(
                `[Account Login Import] The Enrollment file has no ` +
                  `${studentIdIndex === -1 ? '"Student_ID"' : '"Status"'} column. ` +
                  `Check the "Enrollment File ID" config var points at the Enrollment TSV.`,
              ),
            );
          }
          return;
        }

        rowsRead++;
        const studentId = normaliseStudentId(
          row[studentIdIndex]?.replace(/\r/g, ""),
        );
        if (!wantedStudentIds.has(studentId)) return;
        seen.add(studentId);
        if (
          !isQualifyingEnrollmentStatus(row[statusIndex]?.replace(/\r/g, ""))
        ) {
          return;
        }

        enrolled.add(studentId);
        if (enrolled.size === wantedStudentIds.size) {
          parser.abort();
          finish();
        }
      },

      complete: () => finish(),
      error: (err: Error) => {
        if (settled) return;
        settled = true;
        reject(err);
      },
    });
  });
}

/** Streams the Enrollment TSV from Google Drive and runs the check above. */
async function resolveEnrolledStudentIds(
  enrollmentFileId: string,
  accessToken: string,
  wantedStudentIds: Set<string>,
): Promise<{ enrolled: Set<string>; seen: Set<string>; rowsRead: number }> {
  if (wantedStudentIds.size === 0) {
    return { enrolled: new Set(), seen: new Set(), rowsRead: 0 };
  }
  const response = await axios.get(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(enrollmentFileId)}`,
    {
      params: { alt: "media", supportsAllDrives: "true" },
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: "stream",
    },
  );
  return collectEnrolledStudentIds(
    response.data as NodeJS.ReadableStream,
    wantedStudentIds,
  );
}

// ── Google Drive streaming + TSV parsing ───────────────────────────────────────

/**
 * Reads one window from a stream that starts at byteOffset. Uses the header
 * row from the Student index, so a run restarted by hand at any byte offset
 * reads the columns correctly. (Before 2026-10-28 a restart without headers
 * in the payload took its first data line as the header row and dropped every
 * later row as "Invalid Student_ID".) The window ends at the first non-blank
 * line after maxRows valid rows — the same rule the index uses.
 */
export async function parseWindowFromStream(
  source: NodeJS.ReadableStream,
  byteOffset: number,
  maxRows: number,
  headers: string[],
): Promise<StreamResult> {
  const rows: PendingLoginRow[] = [];
  const skippedRows: SkippedLoginRow[] = [];
  let dataLines = 0;
  let blankLines = 0;
  // At byte 0 the first non-blank line is the header row.
  let headerSeen = byteOffset > 0;

  const { stoppedAtByte, endByte } = await scanTsvLines(
    source,
    byteOffset,
    (row, lineStartByte) => {
      if (isBlankLine(row)) {
        blankLines++;
        return "continue";
      }
      if (!headerSeen) {
        headerSeen = true;
        return "continue";
      }
      if (rows.length >= maxRows) return "stop";

      dataLines++;
      const line = classifyDataLine(row, headers);
      if (line.kind === "skipped") {
        skippedRows.push(line.skipped);
        return "continue";
      }
      rows.push({
        studentId: line.studentId,
        isActive: line.isActive,
        lineStartByte,
      });
      return "continue";
    },
  );

  return {
    rows,
    hasMore: stoppedAtByte !== null,
    nextByteOffset: stoppedAtByte ?? endByte,
    firstId: rows[0]?.studentId ?? "",
    lastId: rows[rows.length - 1]?.studentId ?? "",
    dataLines,
    blankLines,
    skippedRows,
  };
}

async function streamAndParseTsv(
  fileId: string,
  accessToken: string,
  byteOffset: number,
  maxRows: number,
  headers: string[],
): Promise<StreamResult> {
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
  return parseWindowFromStream(
    response.data as NodeJS.ReadableStream,
    byteOffset,
    maxRows,
    headers,
  );
}

// ── Flow ───────────────────────────────────────────────────────────────────────

export const accountLoginImport = flow({
  name: "Account Login Import",
  stableKey: "7c1d9e2a-4b3f-4a6c-9d1e-2f3a4b5c6d7e",
  description:
    "Builds a Student index from the whole Account Login TSV once, then streams the " +
    "file in windows. Sends one User per Student_ID (its first row, active if any " +
    "row is active), only for students with an Enrollment row whose Status is not New, " +
    "resolves each Student_ID against the Account created by Student Import, and " +
    "upserts Salesforce User records (Federation_Identifier__c as the upsert key) " +
    "via Bulk API 2.0. Every row is written to Success, Errors, Not Processed or " +
    "Skipped. Must run after Student Import. Recurses until the full file is processed.",

  onTrigger: async (_context, payload) => {
    await Promise.resolve();
    return { payload };
  },

  onExecution: async (context, params) => {
    const { logger, configVars } = context;
    // Measured from the start of this execution so the Bulk job wait can stop
    // before the platform's 15-minute limit.
    const pollDeadlineMs = Date.now() + POLL_BUDGET_MS;

    // ── 1. Read cursor (byteOffset) and hand-off state from the payload ───────
    const triggerBody = (
      params.onTrigger.results as unknown as
        { body?: { data?: unknown } } | undefined
    )?.body?.data as Record<string, unknown> | undefined;
    const byteOffset =
      typeof triggerBody?.byteOffset === "number" ? triggerBody.byteOffset : 0;
    const payloadHeaders = Array.isArray(triggerBody?.headers)
      ? (triggerBody.headers as string[])
      : [];
    const payloadWindowNumber =
      typeof triggerBody?.windowNumber === "number"
        ? triggerBody.windowNumber
        : undefined;
    const payloadSheetId =
      typeof triggerBody?.sheetId === "string"
        ? triggerBody.sheetId
        : undefined;
    const payloadIndexFileId =
      typeof triggerBody?.indexFileId === "string"
        ? triggerBody.indexFileId
        : undefined;
    // Set when the previous execution handed off a User Bulk job that was
    // still running. byteOffset is then the start of the NEXT window, and
    // pendingHasMore says whether that next window exists.
    const pendingJobId =
      typeof triggerBody?.pendingJobId === "string"
        ? triggerBody.pendingJobId
        : undefined;
    const pendingHasMore = triggerBody?.pendingHasMore === true;
    const pendingWindow = parseWindowState(triggerBody?.pendingWindow);
    const handoffCount =
      typeof triggerBody?.handoffCount === "number"
        ? triggerBody.handoffCount
        : 0;

    logger.info(`[Account Login Import] Starting at byte offset ${byteOffset}`);

    // ── 2. Resolve connections and config vars ────────────────────────────────
    const gdConn = configVars["Google Drive Connection"];
    const sfConn = configVars["Salesforce Connection"];
    const fileId = configVars["Account Login File ID"] as string | undefined;
    const failedFolderId = configVars["Failed Records Folder ID"] as
      string | undefined;
    const enrollmentFileId = configVars["Enrollment File ID"] as
      string | undefined;
    const profileName =
      (configVars["Account Login Profile Name"] as string | undefined) ||
      DEFAULT_PROFILE_NAME;
    const permissionSetNames = parsePermissionSetNames(
      configVars["Account Login Permission Sets"] as string | undefined,
    );
    if (!fileId) throw new Error("Account Login File ID config var is empty.");
    if (!enrollmentFileId) {
      throw new Error(
        "[Account Login Import] Enrollment File ID config var is empty. It is needed to " +
          "check which students have an enrollment other than New (only they get a User).",
      );
    }

    // The results spreadsheet for this run: passed in the payload by the
    // previous window (or by hand on a restart); otherwise one is created on
    // first write.
    let currentSheetId = payloadSheetId?.trim() || undefined;

    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfInstanceUrl = getSfInstanceUrl(sfConn);

    // Re-invokes this flow. Used both to move to the next window and to hand
    // off a Bulk job that is still running.
    const invokeSelf = async (payload: Record<string, unknown>) => {
      await (
        context as unknown as {
          invokeFlow(name: string, payload: unknown): Promise<void>;
        }
      ).invokeFlow("Account Login Import", payload);
    };

    // Retries a Google Sheets write on dropped connections, 429 and 5xx.
    const withSheetRetry = <T>(what: string, fn: () => Promise<T>) =>
      withTransientRetry(fn, {
        onRetry: (attempt, err, delayMs) =>
          logger.warn(
            `[Account Login Import] ${what} failed (${describeHttpError(err)}); ` +
              `retry ${attempt} in ${delayMs / 1000}s.`,
          ),
      });

    // Stops the run when a window's rows could not be recorded. Carrying on
    // would leave those rows out of every tab without anyone noticing.
    const stopRun = (problem: string, resumeByte: number): never => {
      throw new Error(
        `[Account Login Import] ${problem} The run has stopped so that no rows go ` +
          `unrecorded. To continue, start the flow with byteOffset ${resumeByte}` +
          (currentSheetId
            ? ` and sheetId "${currentSheetId}" in the payload ` +
              `to keep writing to the same results sheet.`
            : "."),
      );
    };

    // Writes this window's dropped rows to the "Skipped" tab, creating the
    // results spreadsheet first when this run does not have one yet. Called
    // before the User upload. If the write still fails after retries, the run
    // stops (nothing has been uploaded for this window yet).
    const writeSkippedRows = async (
      skipped: SkippedLoginRow[],
      window: WindowState,
    ): Promise<void> => {
      if (skipped.length === 0) return;
      const sheetRows = toSkippedSheetRows(
        skipped,
        window.windowNumber,
        window.startByte,
      );
      try {
        if (!currentSheetId) {
          const created = await withSheetRetry(
            "Creating the results sheet",
            () =>
              createResultsSpreadsheetWithTab({
                flowName: "Account Login Import",
                objectName: "User",
                accessToken: gdToken,
                folderId: failedFolderId,
                tabName: "Skipped",
                headers: SKIPPED_TAB_HEADERS,
              }),
          );
          currentSheetId = created.spreadsheetId;
          logger.info(`[Account Login Import] Results sheet: ${created.url}`);
        }
        const sheetId = currentSheetId;
        await withSheetRetry('Writing the "Skipped" tab', () =>
          appendSkippedRecords(
            sheetId,
            gdToken,
            SKIPPED_TAB_HEADERS,
            sheetRows,
          ),
        );
        logger.info(
          `[Account Login Import] ${skipped.length} skipped row(s) written to the "Skipped" tab ` +
            `(${summariseSkipReasons(skipped)}).`,
        );
      } catch (err: unknown) {
        logger.error(
          `[Account Login Import] Could not write ${skipped.length} row(s) to the "Skipped" tab ` +
            `for window ${window.windowNumber}. Skipped Student_IDs: ` +
            JSON.stringify(skipped.map((r) => [r.studentId, r.reason])),
        );
        stopRun(
          `Writing the "Skipped" tab for window ${window.windowNumber} failed: ` +
            `${describeHttpError(err)}. No Users were sent for this window.`,
          window.startByte,
        );
      }
    };

    // One row per window on the "Window Log" tab. A failure here is only
    // logged: every row of the window is already on a tab by this point.
    const writeWindowLog = async (
      window: WindowState,
      counts: ResultTabCounts,
    ): Promise<void> => {
      if (!currentSheetId) return;
      const sheetId = currentSheetId;
      const row = toWindowLogRow(window, counts, new Date().toISOString());
      try {
        await withSheetRetry('Writing the "Window Log" tab', () =>
          appendSkippedRecords(
            sheetId,
            gdToken,
            WINDOW_LOG_HEADERS,
            [row],
            WINDOW_LOG_TAB,
          ),
        );
      } catch (err: unknown) {
        logger.warn(
          `[Account Login Import] Could not write the "Window Log" row for window ` +
            `${window.windowNumber}: ${describeHttpError(err)}. Row: ${JSON.stringify(row)}`,
        );
      }
    };

    // After the User upsert: assign permission sets, write the results
    // sheet, check the window's counts and write its Window Log row.
    const finishWindow = async (
      jobResult: BulkJobResult,
      records: Record<string, unknown>[],
      permissionSets: PermissionSetRow[],
      window: WindowState,
    ): Promise<void> => {
      // ── 7. Assign permission sets to every User the upsert accepted ────────
      // successfulResults covers both newly created and updated Users, so a
      // re-run also back-fills Users imported before this step existed.
      const userIds = [
        ...parseSuccessfulSfIds(
          jobResult.successfulCsv,
          "Federation_Identifier__c",
        ).values(),
      ];
      try {
        const assignment = await assignPermissionSets(
          sfInstanceUrl,
          sfToken,
          userIds,
          permissionSets,
          logger,
        );
        logger.info(
          `[Account Login Import] Permission sets — ${userIds.length} User(s): ` +
            `${assignment.created} assignment(s) created, ` +
            `${assignment.alreadyAssigned} already in place, ${assignment.failed} failed.`,
        );
        if (assignment.failed > 0) {
          logger.warn(
            `[Account Login Import] Some permission set assignments failed (see errors above). ` +
              `A common cause is a permission set whose license does not match the Users' ` +
              `Experience Cloud license. Re-running the flow retries only the missing ones.`,
          );
        }
      } catch (err: unknown) {
        const e = err as { response?: { status?: number; data?: unknown } };
        logger.error(
          `[Account Login Import] Permission set assignment failed.\n` +
            `  Status : ${e.response?.status ?? "unknown"}\n` +
            `  Details: ${JSON.stringify(e.response?.data ?? String(err), null, 2)}`,
        );
      }

      // ── 8. Results sheet ───────────────────────────────────────────────────
      const sheetRecords = toResultSheetRecords(
        records,
        window.sentStudentIds,
        window.windowNumber,
      );
      let counts: ResultTabCounts;
      try {
        const sheet = await withSheetRetry("Writing the results sheet", () =>
          createResultsSheetFromContacts({
            flowName: "Account Login Import",
            objectName: "User",
            contacts: sheetRecords,
            externalIdField: "Federation_Identifier__c",
            failedExternalIds: jobResult.failedExternalIds,
            successfulCsv: jobResult.successfulCsv,
            failedCsv: jobResult.failedCsv,
            accessToken: gdToken,
            folderId: failedFolderId,
            spreadsheetId: currentSheetId,
          }),
        );
        logger.info(`[Account Login Import] Results sheet: ${sheet.url}`);
        currentSheetId = sheet.spreadsheetId || currentSheetId;
        counts = sheet.counts;
      } catch (err: unknown) {
        return stopRun(
          `Writing the Success / Errors tabs for window ${window.windowNumber} failed: ` +
            `${describeHttpError(err)}. Salesforce job ${jobResult.jobId} has already ` +
            `processed this window's ${records.length} User(s); restarting at this window ` +
            `sends them again and they show as "Updated".`,
          window.startByte,
        );
      }

      logger.info(
        `[Account Login Import] Window ${window.windowNumber}: ${window.dataLines} row(s) read — ` +
          `${window.skippedCount} skipped, ${counts.success} success, ${counts.errors} errors, ` +
          `${counts.notProcessed} not processed.`,
      );
      await writeWindowLog(window, counts);

      // ── 8b. Count check — every row read is on exactly one tab ────────────
      const placed =
        window.skippedCount +
        counts.success +
        counts.errors +
        counts.notProcessed;
      if (window.sentStudentIds !== null && placed !== window.dataLines) {
        stopRun(
          `Count check failed for window ${window.windowNumber}: read ${window.dataLines} ` +
            `row(s) but placed ${placed} on the Skipped, Success, Errors and Not Processed ` +
            `tabs. Check that window's rows before carrying on; the next window starts at ` +
            `byte ${window.endByte}.`,
          window.endByte,
        );
      }
    };

    // ── 2b. Resume a User Bulk job handed off by the previous execution ───────
    // The records were already uploaded; Salesforce kept processing the job
    // while the flow handed off. This execution only waits for it, finishes
    // the window, and then moves on to the next window.
    if (pendingJobId) {
      // A hand-off from the previous code version has no window state; the
      // count check is then skipped for that one window.
      const window: WindowState = pendingWindow ?? {
        windowNumber: payloadWindowNumber ?? 1,
        startByte: byteOffset,
        endByte: byteOffset,
        dataLines: 0,
        blankLines: 0,
        skippedCount: 0,
        sentStudentIds: null,
      };
      logger.info(
        `[Account Login Import] Resuming window ${window.windowNumber}: waiting for User Bulk job ` +
          `${pendingJobId} (hand-off ${handoffCount} of ${MAX_JOB_HANDOFFS}).`,
      );
      const permissionSets = await resolvePermissionSets(
        sfInstanceUrl,
        sfToken,
        permissionSetNames,
      );
      const jobResult = await collectBulkJobResults(
        sfInstanceUrl,
        sfToken,
        pendingJobId,
        "Federation_Identifier__c",
        logger,
        "[Account Login Import]",
        pollDeadlineMs,
      );
      if (!jobResult) {
        if (handoffCount >= MAX_JOB_HANDOFFS) {
          throw new Error(
            `[Account Login Import] User Bulk job ${pendingJobId} has not finished after ` +
              `${MAX_JOB_HANDOFFS} hand-offs. Check it in Salesforce Setup → Bulk Data Load Jobs. ` +
              `To continue once it has finished, start the flow with byteOffset ${byteOffset}.`,
          );
        }
        logger.info(
          `[Account Login Import] Handing off job ${pendingJobId} to the next execution.`,
        );
        await invokeSelf({
          byteOffset,
          windowNumber: window.windowNumber,
          sheetId: currentSheetId,
          indexFileId: payloadIndexFileId,
          pendingJobId,
          pendingHasMore,
          pendingWindow: window,
          handoffCount: handoffCount + 1,
        });
        return { data: { byteOffset, rowsProcessed: 0, hasMore: true } };
      }

      // The result CSVs carry every column that was uploaded, so the rows
      // for the results sheet can be rebuilt from them.
      const records = recordsFromResultCsvs(
        jobResult.successfulCsv,
        jobResult.failedCsv,
      );
      await finishWindow(jobResult, records, permissionSets, window);

      if (pendingHasMore) {
        logger.info(
          `[Account Login Import] More rows remain — invoking next iteration at byte ${byteOffset}`,
        );
        await invokeSelf({
          byteOffset,
          windowNumber: window.windowNumber + 1,
          sheetId: currentSheetId,
          indexFileId: payloadIndexFileId,
        });
      } else {
        logger.info(
          `[Account Login Import] All rows processed — import complete. The "Window Log" tab ` +
            `has one row per window.`,
        );
      }
      return {
        data: { byteOffset, rowsProcessed: 0, hasMore: pendingHasMore },
      };
    }

    // ── 3. Student index (built once per source file, then reused) ────────────
    const { index, indexFileId, built } = await loadOrBuildStudentIndex({
      accountLoginFileId: fileId,
      enrollmentFileId,
      folderId: failedFolderId,
      indexFileId: payloadIndexFileId,
      maxRows: MAX_ROWS,
      accessToken: gdToken,
      resolveEnrolled: async (ids) => {
        const { enrolled, seen } = await resolveEnrolledStudentIds(
          enrollmentFileId,
          gdToken,
          ids,
        );
        return { qualified: enrolled, seen };
      },
      logger,
    });
    if (built && byteOffset > 0) {
      logger.warn(
        `[Account Login Import] The Student index was rebuilt part-way through the file ` +
          `(byte ${byteOffset}). If a source file was replaced, start again from byte 0.`,
      );
    }
    const windowNumber = windowNumberForByte(
      index.windowStartBytes,
      byteOffset,
    );
    if (!index.windowStartBytes.includes(byteOffset)) {
      logger.warn(
        `[Account Login Import] Byte ${byteOffset} is not where a window starts in a full run. ` +
          `Window numbers continue from window ${windowNumber}, the window that contains it.`,
      );
    }
    if (
      payloadWindowNumber !== undefined &&
      payloadWindowNumber !== windowNumber
    ) {
      logger.info(
        `[Account Login Import] Window number from the payload (${payloadWindowNumber}) ` +
          `differs from the index (${windowNumber}); using ${windowNumber}.`,
      );
    }
    if (
      payloadHeaders.length > 0 &&
      payloadHeaders.join("\t") !== index.headers.join("\t")
    ) {
      logger.warn(
        `[Account Login Import] The headers passed in the payload differ from the file's ` +
          `header row; using the file's header row.`,
      );
    }

    // ── 4. Stream & parse the TSV window from Google Drive ─────────────────────
    logger.info(
      `[Account Login Import] Window ${windowNumber} of ${index.totals.windows}: streaming ` +
        `from byte ${byteOffset} of Drive file ${fileId}…`,
    );
    const parsed = await streamAndParseTsv(
      fileId,
      gdToken,
      byteOffset,
      MAX_ROWS,
      index.headers,
    );
    const { nextByteOffset, firstId, lastId, blankLines } = parsed;
    let { rows, hasMore, dataLines } = parsed;

    if (TEST_MODE && rows.length > TEST_RECORD_LIMIT) {
      logger.info(
        `[Account Login Import] TEST MODE — TEST_RECORD_LIMIT is ${TEST_RECORD_LIMIT}; ` +
          `trimming ${rows.length} parsed rows down to the first ${TEST_RECORD_LIMIT} and skipping recursion.`,
      );
      // Trimmed rows are not processed, so they leave the count check too.
      dataLines -= rows.length - TEST_RECORD_LIMIT;
      rows = rows.slice(0, TEST_RECORD_LIMIT);
      hasMore = false;
    } else if (TEST_MODE) {
      logger.info(
        `[Account Login Import] TEST MODE — TEST_RECORD_LIMIT is ${TEST_RECORD_LIMIT}; ` +
          `this window parsed ${rows.length} row(s), at or under the limit, so no recursion either way.`,
      );
      hasMore = false;
    }

    logger.info(
      `[Account Login Import] Read ${dataLines} row(s): ${rows.length} with a usable Student_ID, ` +
        `${parsed.skippedRows.length} rejected by the parser, ${blankLines} blank line(s) ` +
        `(hasMore=${hasMore}, nextByte=${nextByteOffset}, firstId=${firstId}, lastId=${lastId})`,
    );

    // Every row dropped in this window, with its reason — see writeSkippedRows.
    const skippedRows: SkippedLoginRow[] = [...parsed.skippedRows];
    const records: SalesforceUserRecord[] = [];
    let permissionSets: PermissionSetRow[] = [];

    if (rows.length > 0) {
      // ── 5. Resolve the Profile once per window ────────────────────────────
      const profileId = await resolveProfileId(
        sfInstanceUrl,
        sfToken,
        profileName,
      );
      if (!profileId) {
        throw new Error(
          `[Account Login Import] No Profile named "${profileName}" was found in this org. ` +
            `Set the correct value in the "Account Login Profile Name" config var.`,
        );
      }

      // ── 5b. Resolve the permission sets once per window ───────────────────
      // Done before the upsert so a wrong name stops the run before any User
      // is created without its permission sets.
      permissionSets = await resolvePermissionSets(
        sfInstanceUrl,
        sfToken,
        permissionSetNames,
      );
      logger.info(
        `[Account Login Import] Permission sets to assign: ` +
          (permissionSets.map((p) => `${p.Label} (${p.Name})`).join(", ") ||
            "(none)"),
      );

      // ── 6. One User per student across the WHOLE file ─────────────────────
      // Only the student's first row in the file is sent, with IsActive = true
      // if ANY of their rows is active (rule confirmed 2026-10-13). Every other
      // row for that Student_ID, in this window or any other, goes to Skipped
      // naming the row it was merged into. Before 2026-10-28 this was done
      // per window only, so a student in two windows was sent twice and the
      // last window decided IsActive.
      const { owners, duplicates } = applyStudentIndex(rows, index);
      skippedRows.push(...duplicates);
      if (duplicates.length > 0) {
        logger.info(
          `[Account Login Import] ${duplicates.length} row(s) merged into their student's first row.`,
        );
      }

      // ── 6b. Keep only students with an enrollment other than New ───────────
      // Rule confirmed 2026-10-29 (before that only Status = "Enrolled"
      // counted). Taken from the index, which read the Enrollment file once.
      const enrolledOwners: { studentId: string; isActive: boolean }[] = [];
      for (const owner of owners) {
        if (owner.enrollment === "qualified") {
          enrolledOwners.push(owner);
        } else if (owner.enrollment === "onlyNew") {
          skippedRows.push({
            studentId: owner.studentId,
            reason: SKIP_REASON.ONLY_NEW_ENROLLMENTS,
            detail:
              "Every Enrollment row for this student has Status = New (or a blank Status).",
          });
        } else {
          skippedRows.push({
            studentId: owner.studentId,
            reason: SKIP_REASON.NO_ENROLLMENT_ROWS,
            detail: "This Student_ID has no rows in the Enrollment file.",
          });
        }
      }
      logger.info(
        `[Account Login Import] Enrollment check — ${enrolledOwners.length} of ${owners.length} ` +
          `student(s) sent from this window have an enrollment other than New.`,
      );

      // ── 7. Resolve Student_ID → Contact/Email/Name via the migrated Account ─
      const contactsByStudentId = await resolveContactsByStudentId(
        sfInstanceUrl,
        sfToken,
        enrolledOwners.map((o) => o.studentId),
      );

      let droppedNoContact = 0;
      let droppedNoEmail = 0;
      for (const { studentId, isActive } of enrolledOwners) {
        const contact = contactsByStudentId.get(studentId);
        if (!contact) {
          droppedNoContact++;
          skippedRows.push({
            studentId,
            reason: SKIP_REASON.NO_MATCHING_ACCOUNT,
            detail: `No Account with Student_ID_4D__c = ${studentId}. Run Student Import first.`,
          });
          continue;
        }

        const email = cleanEmail(contact.email);
        if (!email) {
          droppedNoEmail++;
          skippedRows.push({
            studentId,
            reason: SKIP_REASON.NO_USABLE_EMAIL,
            detail: truncateDetail(
              `Contact ${contact.contactId} has email "${contact.email}", ` +
                `which is blank or not a valid address.`,
            ),
          });
          continue;
        }

        records.push({
          Federation_Identifier__c: studentId,
          ContactId: contact.contactId,
          IsActive: isActive,
          FirstName: contact.firstName || undefined,
          LastName: contact.lastName,
          Alias: buildAlias(contact.firstName, contact.lastName),
          Username: email,
          Email: email,
          ProfileId: profileId,
          LocaleSidKey: DEFAULT_LOCALE_SID_KEY,
          LanguageLocaleKey: DEFAULT_LANGUAGE_LOCALE_KEY,
          TimeZoneSidKey: DEFAULT_TIME_ZONE_SID_KEY,
          EmailEncodingKey: DEFAULT_EMAIL_ENCODING_KEY,
        });
      }

      if (droppedNoContact > 0) {
        logger.warn(
          `[Account Login Import] ${droppedNoContact} row(s) had no matching Account for their Student_ID — skipped. Run Student Import first.`,
        );
      }
      if (droppedNoEmail > 0) {
        logger.warn(
          `[Account Login Import] ${droppedNoEmail} row(s) matched a Contact with no usable email — skipped (Username/Email are required).`,
        );
      }
    }

    const window: WindowState = {
      windowNumber,
      startByte: byteOffset,
      endByte: nextByteOffset,
      dataLines,
      blankLines,
      skippedCount: skippedRows.length,
      sentStudentIds: records.map((r) => r.Federation_Identifier__c),
    };

    // ── 7a. Count check before anything is written or sent ─────────────────
    const countProblem = checkWindowCounts(
      dataLines,
      skippedRows.length,
      records.length,
    );
    if (countProblem) {
      stopRun(
        `Count check failed for window ${windowNumber}: ${countProblem}. Nothing was sent ` +
          `for this window.`,
        byteOffset,
      );
    }

    // ── 7b. Record the dropped rows before the upload ────────────────────────
    await writeSkippedRows(skippedRows, window);

    // ── 7c. Upsert to Salesforce Bulk API 2.0 ────────────────────────────────
    if (records.length > 0) {
      const jobId = await submitBulkJob(
        sfInstanceUrl,
        sfToken,
        "User",
        "Federation_Identifier__c",
        records as unknown as Record<string, unknown>[],
        logger,
        "[Account Login Import]",
      );
      const jobResult = await collectBulkJobResults(
        sfInstanceUrl,
        sfToken,
        jobId,
        "Federation_Identifier__c",
        logger,
        "[Account Login Import]",
        pollDeadlineMs,
      );

      if (!jobResult) {
        // The job is still running in Salesforce. Hand it to a new
        // execution rather than letting this one hit the time limit; the
        // records are NOT uploaded again.
        logger.info(
          `[Account Login Import] Handing off job ${jobId} to the next execution ` +
            `(it will wait for the job, assign permission sets, then continue at byte ${nextByteOffset}).`,
        );
        await invokeSelf({
          byteOffset: nextByteOffset,
          windowNumber,
          sheetId: currentSheetId,
          indexFileId,
          pendingJobId: jobId,
          pendingHasMore: hasMore,
          pendingWindow: window,
          handoffCount: 1,
        });
        return { data: { byteOffset, rowsProcessed: rows.length, hasMore } };
      }

      await finishWindow(
        jobResult,
        records as unknown as Record<string, unknown>[],
        permissionSets,
        window,
      );
    } else {
      logger.info(
        `[Account Login Import] Window ${windowNumber}: ${dataLines} row(s) read, all skipped; ` +
          `nothing to send.`,
      );
      await writeWindowLog(window, { success: 0, errors: 0, notProcessed: 0 });
    }

    // ── 9. Recurse if more rows remain ─────────────────────────────────────────
    if (hasMore) {
      logger.info(
        `[Account Login Import] More rows remain — invoking next iteration at byte ${nextByteOffset}`,
      );
      await invokeSelf({
        byteOffset: nextByteOffset,
        windowNumber: windowNumber + 1,
        sheetId: currentSheetId,
        indexFileId,
      });
    } else {
      const t = index.totals;
      logger.info(
        `[Account Login Import] All rows processed — import complete. The file has ` +
          `${t.dataLines} row(s) (${t.uniqueStudents} unique Student_IDs); across every ` +
          `window, Success + Errors + Not Processed + Skipped should add up to ${t.dataLines}. ` +
          `The "Window Log" tab has one row per window.`,
      );
    }

    return {
      data: {
        byteOffset,
        rowsProcessed: rows.length,
        hasMore,
      },
    };
  },
});

export default [accountLoginImport];
