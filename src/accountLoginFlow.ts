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
 *   4. Student is not enrolled → skip (decision 2026-10-21). Only students
 *      who have at least one row in the Enrollment source file (the
 *      "Enrollment File ID" config var) with Status = "Enrolled" get a User.
 *      The check reads the source file, not Salesforce, so it does not
 *      depend on the Enrollment Import having run. Applied after the
 *      Student_ID de-duplication and before the Contact lookup.
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
import { Transform, type Readable } from "stream";
import {
  str,
  toBool,
  cleanEmail,
  getAccessToken,
  getSfInstanceUrl,
  runBulkJob,
  SF_API_VERSION,
} from "./utils";
import { createResultsSheetFromContacts } from "./reportResults";
import {
  sfQueryAll,
  insertViaComposite,
  parseSuccessfulSfIds,
} from "./commerceShared";

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_ROWS = 2000; // rows per execution window

// Sandbox testing only. When TEST_MODE is true, the flow processes at most
// TEST_RECORD_LIMIT records total and stops — no recursion through the rest
// of the file. Set TEST_MODE back to false before running the full file.
const TEST_MODE = true;
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
// Enrollment Status value that qualifies a student for a User (decision
// 2026-10-21). Compared case-insensitively after trimming.
const ENROLLED_STATUS = "enrolled";
const DEFAULT_LOCALE_SID_KEY = "en_US";
const DEFAULT_LANGUAGE_LOCALE_KEY = "en_US";
const DEFAULT_TIME_ZONE_SID_KEY = "America/Los_Angeles";
const DEFAULT_EMAIL_ENCODING_KEY = "UTF-8";

// ── Raw TSV shape ──────────────────────────────────────────────────────────────

interface RawAccountLoginRecord {
  // Username is intentionally unused — per mapping doc, User.Username is
  // always derived from the matched Contact's email, not this column.
  Username?: string;
  Student_ID?: string;
  Inactive?: string;
  [key: string]: string | undefined;
}

// ── Intermediate row shape (pre Contact-lookup enrichment) ───────────────────

interface PendingLoginRow {
  studentId: string;
  isActive: boolean;
}

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
  parsedHeaders: string[];
  firstId: string;
  lastId: string;
  skippedCount: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

/** True when an Enrollment Status value counts as enrolled. */
export function isEnrolledStatus(status: string | undefined): boolean {
  return str(status).trim().toLowerCase() === ENROLLED_STATUS;
}

/** Enrollment TSV stores some IDs as "12345.0" — normalise to "12345". */
function normaliseStudentId(value: string | undefined): string {
  return str(value).trim().replace(/\.0$/, "");
}

/**
 * Reads an Enrollment TSV stream and returns the subset of `wantedStudentIds`
 * that have at least one row with Status = "Enrolled". Stops reading as soon
 * as every wanted ID has been found, so a window whose students all enrolled
 * early in the file does not read the whole file.
 */
export function collectEnrolledStudentIds(
  stream: Readable | NodeJS.ReadableStream,
  wantedStudentIds: Set<string>,
): Promise<{ enrolled: Set<string>; rowsRead: number }> {
  const enrolled = new Set<string>();
  let rowsRead = 0;

  return new Promise((resolve, reject) => {
    if (wantedStudentIds.size === 0) {
      (stream as Readable).destroy?.();
      resolve({ enrolled, rowsRead });
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
      resolve({ enrolled, rowsRead });
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
        if (!isEnrolledStatus(row[statusIndex]?.replace(/\r/g, ""))) return;

        const studentId = normaliseStudentId(
          row[studentIdIndex]?.replace(/\r/g, ""),
        );
        if (!wantedStudentIds.has(studentId)) return;

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
): Promise<{ enrolled: Set<string>; rowsRead: number }> {
  if (wantedStudentIds.size === 0) return { enrolled: new Set(), rowsRead: 0 };
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

async function streamAndParseTsv(
  fileId: string,
  accessToken: string,
  byteOffset: number,
  maxRows: number,
  knownHeaders: string[],
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
    let parsedHeaders: string[] =
      knownHeaders.length > 0 ? [...knownHeaders] : [];
    const rows: PendingLoginRow[] = [];
    let aborted = false;
    let firstId = "";
    let lastId = "";
    let skippedCount = 0;
    let lastCompletedCursor = byteOffset;
    let stepCount = 0;

    parse(byteTracker as unknown as NodeJS.ReadableStream, {
      delimiter: "\t",
      header: false,
      skipEmptyLines: false,
      quoteChar: "\x00",

      step: (result: ParseResult<string[]>, parser: Parser) => {
        if (aborted) return;

        const row = result.data as unknown as string[];
        const rowEndByte =
          lineEndBytes[stepCount] ?? byteOffset + totalBytesReceived;
        stepCount++;

        if (row.length === 0 || row.every((c) => c.replace(/\r/g, "") === "")) {
          lastCompletedCursor = rowEndByte;
          return;
        }

        if (parsedHeaders.length === 0) {
          parsedHeaders = row.map((h) => h.replace(/\r/g, "").trim());
          lastCompletedCursor = rowEndByte;
          return;
        }

        if (rows.length >= maxRows) {
          aborted = true;
          parser.abort();
          return;
        }

        if (row.length !== parsedHeaders.length) {
          skippedCount++;
          lastCompletedCursor = rowEndByte;
          return;
        }

        const record: RawAccountLoginRecord = {};
        parsedHeaders.forEach((header, i) => {
          record[header] = row[i] ?? "";
        });

        // Skip rule #1 (mapping doc): no Student_ID, or Student_ID = 0.
        // /^[1-9]\d*$/ rejects blank, non-numeric, and "0"/"00" style values.
        const studentId = str(record.Student_ID);
        if (!/^[1-9]\d*$/.test(studentId)) {
          skippedCount++;
          lastCompletedCursor = rowEndByte;
          return;
        }

        // Inverted — see "NOTE — Active/Inactive" in the file header comment.
        const isActive = !toBool(record.Inactive);

        if (!firstId) firstId = studentId;
        lastId = studentId;
        rows.push({ studentId, isActive });
        lastCompletedCursor = rowEndByte;
      },

      complete: () =>
        resolve({
          rows,
          hasMore: aborted,
          nextByteOffset: lastCompletedCursor,
          parsedHeaders,
          firstId,
          lastId,
          skippedCount,
        }),
      error: (err: Error) => reject(err),
    });
  });
}

// ── Flow ───────────────────────────────────────────────────────────────────────

export const accountLoginImport = flow({
  name: "Account Login Import",
  stableKey: "7c1d9e2a-4b3f-4a6c-9d1e-2f3a4b5c6d7e",
  description:
    "Streams the Account Login TSV from Google Drive, keeps only students with an " +
    "Enrolled row in the Enrollment TSV, resolves each Student_ID " +
    "against the Account created by Student Import, and upserts Salesforce User " +
    "records (Federation_Identifier__c as the upsert key) via Bulk API 2.0. Must run " +
    "after Student Import. Recurses until the full file is processed.",

  onTrigger: async (_context, payload) => {
    await Promise.resolve();
    return { payload };
  },

  onExecution: async (context, params) => {
    const { logger, configVars } = context;

    // ── 1. Read cursor (byteOffset) from trigger payload ──────────────────────
    const triggerBody = (
      params.onTrigger.results as unknown as
        { body?: { data?: unknown } } | undefined
    )?.body?.data as Record<string, unknown> | undefined;
    const byteOffset =
      typeof triggerBody?.byteOffset === "number" ? triggerBody.byteOffset : 0;
    const knownHeaders = Array.isArray(triggerBody?.headers)
      ? (triggerBody.headers as string[])
      : [];
    const windowNumber =
      typeof triggerBody?.windowNumber === "number"
        ? triggerBody.windowNumber
        : 1;
    const sheetId =
      typeof triggerBody?.sheetId === "string"
        ? triggerBody.sheetId
        : undefined;

    logger.info(`[Account Login Import] Starting at byte offset ${byteOffset}`);

    // ── 2. Resolve connections and file ID ─────────────────────────────────────
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
          "check which students are enrolled (only enrolled students get a User).",
      );
    }

    const gdToken = getAccessToken(gdConn);
    const sfToken = getAccessToken(sfConn);
    const sfInstanceUrl = getSfInstanceUrl(sfConn);

    // ── 3. Stream & parse the TSV window from Google Drive ─────────────────────
    logger.info(
      `[Account Login Import] Streaming from byte ${byteOffset} of Drive file ${fileId}…`,
    );
    const parsed = await streamAndParseTsv(
      fileId,
      gdToken,
      byteOffset,
      MAX_ROWS,
      knownHeaders,
    );
    const { nextByteOffset, parsedHeaders, firstId, lastId, skippedCount } =
      parsed;
    let rows = parsed.rows;
    let hasMore = parsed.hasMore;

    if (TEST_MODE && rows.length > TEST_RECORD_LIMIT) {
      logger.info(
        `[Account Login Import] TEST MODE — TEST_RECORD_LIMIT is ${TEST_RECORD_LIMIT}; ` +
          `trimming ${rows.length} parsed rows down to the first ${TEST_RECORD_LIMIT} and skipping recursion.`,
      );
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
      `[Account Login Import] Parsed ${rows.length} rows` +
        ` (hasMore=${hasMore}, nextByte=${nextByteOffset}, skipped=${skippedCount},` +
        ` firstId=${firstId}, lastId=${lastId})`,
    );

    let nextSheetId = sheetId;

    if (rows.length > 0) {
      // ── 4. Resolve the Profile once per window ────────────────────────────
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

      // ── 4b. Resolve the permission sets once per window ───────────────────
      // Done before the upsert so a wrong name stops the run before any User
      // is created without its permission sets.
      const permissionSets = await resolvePermissionSets(
        sfInstanceUrl,
        sfToken,
        permissionSetNames,
      );
      logger.info(
        `[Account Login Import] Permission sets to assign: ` +
          (permissionSets.map((p) => `${p.Label} (${p.Name})`).join(", ") ||
            "(none)"),
      );

      // ── 5. Collapse duplicate Student_ID rows within this window ───────────
      // The source table can carry more than one Account Login row per
      // Student_ID (e.g. a stale row plus the live one). Username/Email/
      // FirstName/LastName/Alias all come from the matched Contact — identical
      // regardless of which row triggered the lookup — so IsActive is the only
      // field that actually varies between duplicate rows. Rule (confirmed
      // against real data, 2026-10-13): if ANY row for a Student_ID has
      // Inactive = FALSE, the person is active — that's the one live record;
      // Inactive = TRUE rows are the stale duplicates. Collapsing here also
      // avoids sending more than one row per external ID in the same Bulk API
      // batch, which Salesforce doesn't guarantee a deterministic result for.
      const isActiveByStudentId = new Map<string, boolean>();
      for (const row of rows) {
        isActiveByStudentId.set(
          row.studentId,
          (isActiveByStudentId.get(row.studentId) ?? false) || row.isActive,
        );
      }
      const uniqueStudentIds = [...isActiveByStudentId.keys()];
      const duplicateRowCount = rows.length - uniqueStudentIds.length;
      if (duplicateRowCount > 0) {
        logger.info(
          `[Account Login Import] ${duplicateRowCount} duplicate Student_ID row(s) collapsed in this window.`,
        );
      }

      // ── 5b. Keep only students enrolled in at least one course ─────────────
      // Decision 2026-10-21: a User is created only when the Enrollment
      // source file has a row for this Student_ID with Status = "Enrolled".
      const { enrolled, rowsRead } = await resolveEnrolledStudentIds(
        enrollmentFileId,
        gdToken,
        new Set(uniqueStudentIds),
      );
      const dedupedStudentIds = uniqueStudentIds.filter((id) =>
        enrolled.has(id),
      );
      const droppedNotEnrolled =
        uniqueStudentIds.length - dedupedStudentIds.length;
      logger.info(
        `[Account Login Import] Enrollment check — read ${rowsRead} Enrollment row(s); ` +
          `${dedupedStudentIds.length} of ${uniqueStudentIds.length} student(s) in this window are Enrolled.`,
      );
      if (droppedNotEnrolled > 0) {
        logger.info(
          `[Account Login Import] ${droppedNotEnrolled} student(s) have no Enrollment row with Status = "Enrolled" — skipped.`,
        );
      }

      // ── 6. Resolve Student_ID → Contact/Email/Name via the migrated Account ─
      const contactsByStudentId = await resolveContactsByStudentId(
        sfInstanceUrl,
        sfToken,
        dedupedStudentIds,
      );

      let droppedNoContact = 0;
      let droppedNoEmail = 0;
      const records: SalesforceUserRecord[] = [];

      for (const studentId of dedupedStudentIds) {
        const contact = contactsByStudentId.get(studentId);
        if (!contact) {
          droppedNoContact++;
          continue;
        }

        const email = cleanEmail(contact.email);
        if (!email) {
          droppedNoEmail++;
          continue;
        }

        records.push({
          Federation_Identifier__c: studentId,
          ContactId: contact.contactId,
          IsActive: isActiveByStudentId.get(studentId) ?? false,
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

      // ── 6. Upsert to Salesforce Bulk API 2.0 ──────────────────────────────
      if (records.length > 0) {
        const jobResult = await runBulkJob(
          sfInstanceUrl,
          sfToken,
          "User",
          "Federation_Identifier__c",
          records as unknown as Record<string, unknown>[],
          logger,
          "[Account Login Import]",
        );

        // ── 7. Assign permission sets to every User the upsert accepted ──────
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

        try {
          const sheet = await createResultsSheetFromContacts({
            flowName: "Account Login Import",
            objectName: "User",
            contacts: records as unknown as Record<string, unknown>[],
            externalIdField: "Federation_Identifier__c",
            failedExternalIds: jobResult.failedExternalIds,
            successfulCsv: jobResult.successfulCsv,
            failedCsv: jobResult.failedCsv,
            accessToken: gdToken,
            folderId: failedFolderId,
            spreadsheetId: sheetId,
          });
          nextSheetId = sheet.spreadsheetId;
          logger.info(`[Account Login Import] Results sheet: ${sheet.url}`);
        } catch (err: unknown) {
          logger.warn(
            `[Account Login Import] Could not update results sheet: ${String(err)}`,
          );
        }
      } else {
        logger.info(
          "[Account Login Import] Window contained no upsertable records after the enrollment check and Contact resolution.",
        );
      }
    } else {
      logger.info(
        "[Account Login Import] Window contained no records; skipping upload.",
      );
    }

    // ── 8. Recurse if more rows remain ─────────────────────────────────────────
    if (hasMore) {
      logger.info(
        `[Account Login Import] More rows remain — invoking next iteration at byte ${nextByteOffset}`,
      );
      await (
        context as unknown as {
          invokeFlow(name: string, payload: unknown): Promise<void>;
        }
      ).invokeFlow("Account Login Import", {
        byteOffset: nextByteOffset,
        headers: parsedHeaders,
        windowNumber: windowNumber + 1,
        sheetId: nextSheetId,
      });
    } else {
      logger.info(
        "[Account Login Import] All rows processed — import complete.",
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
