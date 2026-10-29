/**
 * Stanford CSP Migration – Account Login Student index (added 2026-10-28).
 *
 * Why: the Account Login file (~160,000 rows) is imported in 500-row windows.
 * A Student_ID can appear in more than one window. Before this index, each
 * window de-duplicated only its own rows, so a student in two windows was
 * sent to Salesforce twice and the LAST window decided IsActive — an old
 * Inactive=TRUE row could switch off a User an earlier window had made
 * active. The Enrollment file (~586,000 rows) was also read again in every
 * window.
 *
 * How: before window 1, one pass over the whole Account Login file builds an
 * index with one entry per Student_ID:
 *   - the student's FIRST valid row (the "owner" row): its start byte, line
 *     number and the window it falls in. Only that row is sent to Salesforce.
 *   - whether ANY of the student's rows is active (rule confirmed 2026-10-13).
 *   - how many rows the student has, and its Enrollment state (the
 *     Enrollment file is read once here instead of once per window).
 * The index also records the file's header row and the start byte of every
 * window, so a run restarted by hand at a byte offset gets the right headers
 * and window numbers.
 *
 * The index is saved as a JSON file in Google Drive and reused while both
 * source files are unchanged (same size and modified time). It holds only
 * IDs, flags and positions — no names or email addresses.
 */

import axios from "axios";
import { parse, type ParseResult, type Parser } from "papaparse";
import { Transform, type Readable } from "stream";
import { str, toBool } from "./utils";

// ── Constants ──────────────────────────────────────────────────────────────────

/** Bump when the index layout or the rules that build it change. */
export const STUDENT_INDEX_VERSION = 2;

const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const INDEX_MIME_TYPE = "application/json";

// Reasons written to the "Skipped" tab — one per row-skip rule.
export const SKIP_REASON = {
  COLUMN_MISMATCH: "Column count does not match header",
  INVALID_STUDENT_ID: "Invalid Student_ID",
  DUPLICATE_STUDENT_ID: "Duplicate Student_ID (merged)",
  ONLY_NEW_ENROLLMENTS: "Only New enrollments",
  NO_ENROLLMENT_ROWS: "No enrollment rows",
  NO_MATCHING_ACCOUNT: "No matching Account",
  NO_USABLE_EMAIL: "No usable email",
} as const;

// Raw source text copied into "Detail" is cut to this length so one bad row
// (e.g. a line with an embedded break) cannot blow past the Sheets cell limit.
const MAX_DETAIL_CHARS = 500;

// ── Types ──────────────────────────────────────────────────────────────────────

/** A source row that never became a User. Written to the "Skipped" tab. */
export interface SkippedLoginRow {
  studentId: string;
  reason: string;
  detail: string;
}

/** A source row with a usable Student_ID. */
export interface PendingLoginRow {
  studentId: string;
  isActive: boolean;
  /** Byte where this row starts in the file — identifies the row uniquely. */
  lineStartByte: number;
}

/** Result of checking one non-blank data line against the header. */
export type ClassifiedLine =
  | { kind: "valid"; studentId: string; isActive: boolean }
  | { kind: "skipped"; skipped: SkippedLoginRow };

/** What the index knows about one Student_ID. */
export interface StudentIndexEntry {
  /** Start byte of the student's first valid row — the only row sent. */
  ownerByte: number;
  /** 1-based line number of that row in the file (header is line 1). */
  ownerLine: number;
  /** Window that row falls in when the file is run from byte 0. */
  ownerWindow: number;
  /** True when any of the student's rows has Inactive = FALSE. */
  anyActive: boolean;
  /** Valid rows for this Student_ID in the whole file. */
  rowCount: number;
  /** What the Enrollment file says about this student (see EnrollmentState). */
  enrollment: EnrollmentState;
}

/**
 * The student's Enrollment rows, all of them (rule confirmed 2026-10-29):
 *   - "qualified": at least one row has a Status other than New → gets a User
 *   - "onlyNew":   every row is New (a blank Status counts as New) → skipped
 *   - "none":      no rows at all in the Enrollment file → skipped
 */
export type EnrollmentState = "qualified" | "onlyNew" | "none";

const ENROLLMENT_CODE: Record<EnrollmentState, 0 | 1 | 2> = {
  none: 0,
  qualified: 1,
  onlyNew: 2,
};
const ENROLLMENT_FROM_CODE: EnrollmentState[] = [
  "none",
  "qualified",
  "onlyNew",
];

/** Identifies one version of a Drive file. */
export interface FileFingerprint {
  id: string;
  size: string;
  modifiedTime: string;
}

export interface StudentIndexTotals {
  /** Every physical line, including the header and blank lines. */
  lines: number;
  blankLines: number;
  /** Non-blank lines after the header — each one is a source row. */
  dataLines: number;
  validRows: number;
  columnMismatchRows: number;
  invalidStudentIdRows: number;
  uniqueStudents: number;
  /** Students with at least one Enrollment row whose Status is not New. */
  enrolledStudents: number;
  /** Students whose Enrollment rows are all New (or blank). */
  onlyNewStudents: number;
  /** Students with no row at all in the Enrollment file. */
  noEnrollmentStudents: number;
  windows: number;
}

export interface StudentIndex {
  version: number;
  maxRows: number;
  builtAt: string;
  accountLoginFile: FileFingerprint;
  enrollmentFile: FileFingerprint;
  headers: string[];
  /** windowStartBytes[n - 1] is where window n starts. */
  windowStartBytes: number[];
  totals: StudentIndexTotals;
  students: Map<string, StudentIndexEntry>;
}

/**
 * On-disk shape: students as id → [ownerByte, ownerLine, ownerWindow, anyActive, rowCount, enrollment],
 * where enrollment is 0 = none, 1 = qualified, 2 = onlyNew.
 */
interface SerializedStudentIndex extends Omit<StudentIndex, "students"> {
  students: Record<string, [number, number, number, 0 | 1, number, 0 | 1 | 2]>;
}

// ── Line classification (shared by the pre-pass and every window) ─────────────

/** Cut source text copied into the Skipped tab to MAX_DETAIL_CHARS. */
export function truncateDetail(text: string): string {
  return text.length > MAX_DETAIL_CHARS
    ? `${text.slice(0, MAX_DETAIL_CHARS)}…`
    : text;
}

/** Header cell → column name: drop a byte-order mark, \r and spaces. */
export function normaliseHeaderRow(row: string[]): string[] {
  return row.map((h) =>
    (h.charCodeAt(0) === 0xfeff ? h.slice(1) : h).replace(/\r/g, "").trim(),
  );
}

/** True for a line with no content (only empty cells or \r). */
export function isBlankLine(row: string[]): boolean {
  return row.length === 0 || row.every((c) => c.replace(/\r/g, "") === "");
}

/**
 * Builds the Skipped entry for a source line whose column count does not match
 * the header. The Student_ID is taken from its column when the line is long
 * enough to have one, so the row can still be traced.
 */
export function describeColumnMismatch(
  row: string[],
  headers: string[],
): SkippedLoginRow {
  const idIndex = headers.indexOf("Student_ID");
  const studentId =
    idIndex >= 0 && idIndex < row.length ? str(row[idIndex]) : "";
  const rawLine = row.join("\t").replace(/\r/g, "");
  return {
    studentId,
    reason: SKIP_REASON.COLUMN_MISMATCH,
    detail: truncateDetail(
      `Expected ${headers.length} columns, found ${row.length}. Line: ${rawLine}`,
    ),
  };
}

/**
 * Applies the parse-time skip rules to one non-blank data line. The pre-pass
 * and the windows both call this, so they always agree on which rows count.
 */
export function classifyDataLine(
  row: string[],
  headers: string[],
): ClassifiedLine {
  if (row.length !== headers.length) {
    return { kind: "skipped", skipped: describeColumnMismatch(row, headers) };
  }
  const studentIdIndex = headers.indexOf("Student_ID");
  const inactiveIndex = headers.indexOf("Inactive");
  const studentId = str(studentIdIndex >= 0 ? row[studentIdIndex] : "");

  // Skip rule #1 (mapping doc): no Student_ID, or Student_ID = 0.
  // /^[1-9]\d*$/ rejects blank, non-numeric, and "0"/"00" style values.
  if (!/^[1-9]\d*$/.test(studentId)) {
    return {
      kind: "skipped",
      skipped: {
        studentId,
        reason: SKIP_REASON.INVALID_STUDENT_ID,
        detail: truncateDetail(
          `Student_ID "${studentId}" is blank, 0 or not a whole number.`,
        ),
      },
    };
  }

  // Inverted — the source "Inactive" flag marks duplicates (see the flow header).
  const isActive = !toBool(inactiveIndex >= 0 ? row[inactiveIndex] : "");
  return { kind: "valid", studentId, isActive };
}

// ── Byte-accurate TSV line scanner ─────────────────────────────────────────────

/** Return "stop" to end the scan before this line is consumed. */
export type LineHandler = (
  row: string[],
  lineStartByte: number,
  lineEndByte: number,
) => "continue" | "stop";

/**
 * Streams a TSV and calls onLine for every physical line with the byte range
 * it occupies in the file. startByte is where the stream begins (the Range
 * offset). Resolves with stoppedAtByte = start of the line that returned
 * "stop" (null when the file ended) and endByte = end of the last line read.
 */
export function scanTsvLines(
  source: NodeJS.ReadableStream,
  startByte: number,
  onLine: LineHandler,
): Promise<{ stoppedAtByte: number | null; endByte: number }> {
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
          lineEndBytes.push(startByte + totalBytesReceived + i + 1);
        }
      }
      totalBytesReceived += chunk.length;
      callback(null, chunk);
    },
  });
  source.pipe(byteTracker);

  return new Promise((resolve, reject) => {
    let stepCount = 0;
    let cursor = startByte;
    let stoppedAtByte: number | null = null;

    parse(byteTracker as unknown as NodeJS.ReadableStream, {
      delimiter: "\t",
      header: false,
      skipEmptyLines: false,
      quoteChar: "\x00",

      step: (result: ParseResult<string[]>, parser: Parser) => {
        if (stoppedAtByte !== null) return;
        const row = result.data as unknown as string[];
        // The last line may have no trailing newline; it then ends at the
        // last byte received.
        const lineEndByte =
          lineEndBytes[stepCount] ?? startByte + totalBytesReceived;
        stepCount++;

        if (onLine(row, cursor, lineEndByte) === "stop") {
          stoppedAtByte = cursor;
          parser.abort();
          // Stop downloading the rest of the file. The no-op listener keeps
          // the "aborted" error a destroyed HTTP stream can emit from
          // ending the execution.
          const readable = source as unknown as Readable;
          readable.on?.("error", () => undefined);
          readable.unpipe?.(byteTracker);
          readable.destroy?.();
          return;
        }
        cursor = lineEndByte;
      },

      complete: () => resolve({ stoppedAtByte, endByte: cursor }),
      error: (err: Error) => reject(err),
    });
  });
}

// ── Pre-pass ───────────────────────────────────────────────────────────────────

/** Index contents built from the Account Login file, before enrollment. */
export interface ScannedAccountLoginFile {
  headers: string[];
  windowStartBytes: number[];
  totals: Omit<
    StudentIndexTotals,
    "enrolledStudents" | "onlyNewStudents" | "noEnrollmentStudents"
  >;
  students: Map<string, StudentIndexEntry>;
}

/**
 * Reads the whole Account Login file once. Windows are simulated with the
 * same rule the import uses: a window ends at the first non-blank line after
 * its maxRows-th valid row, and the next window starts at that line.
 */
export async function scanAccountLoginFile(
  source: NodeJS.ReadableStream,
  maxRows: number,
): Promise<ScannedAccountLoginFile> {
  let headers: string[] = [];
  const windowStartBytes = [0];
  const students = new Map<string, StudentIndexEntry>();
  let lineNumber = 0;
  let validInWindow = 0;
  const totals = {
    lines: 0,
    blankLines: 0,
    dataLines: 0,
    validRows: 0,
    columnMismatchRows: 0,
    invalidStudentIdRows: 0,
    uniqueStudents: 0,
    windows: 1,
  };

  await scanTsvLines(source, 0, (row, lineStartByte) => {
    lineNumber++;
    totals.lines++;
    if (isBlankLine(row)) {
      totals.blankLines++;
      return "continue";
    }
    if (headers.length === 0) {
      headers = normaliseHeaderRow(row);
      return "continue";
    }

    // Same boundary rule as the window parser.
    if (validInWindow >= maxRows) {
      windowStartBytes.push(lineStartByte);
      validInWindow = 0;
    }

    totals.dataLines++;
    const line = classifyDataLine(row, headers);
    if (line.kind === "skipped") {
      if (line.skipped.reason === SKIP_REASON.COLUMN_MISMATCH) {
        totals.columnMismatchRows++;
      } else {
        totals.invalidStudentIdRows++;
      }
      return "continue";
    }

    validInWindow++;
    totals.validRows++;
    const existing = students.get(line.studentId);
    if (existing) {
      existing.anyActive = existing.anyActive || line.isActive;
      existing.rowCount++;
    } else {
      students.set(line.studentId, {
        ownerByte: lineStartByte,
        ownerLine: lineNumber,
        ownerWindow: windowStartBytes.length,
        anyActive: line.isActive,
        rowCount: 1,
        enrollment: "none",
      });
    }
    return "continue";
  });

  if (!headers.includes("Student_ID")) {
    throw new Error(
      `[Account Login Import] The Account Login file has no "Student_ID" column. ` +
        `Check the "Account Login File ID" config var.`,
    );
  }

  totals.uniqueStudents = students.size;
  totals.windows = windowStartBytes.length;
  return { headers, windowStartBytes, totals, students };
}

/** Window number (1-based) of the window that contains byteOffset. */
export function windowNumberForByte(
  windowStartBytes: number[],
  byteOffset: number,
): number {
  let low = 0;
  let high = windowStartBytes.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (windowStartBytes[mid] <= byteOffset) low = mid;
    else high = mid - 1;
  }
  return low + 1;
}

// ── Applying the index to one window ───────────────────────────────────────────

/**
 * Splits a window's valid rows into the rows to send (one per student, its
 * owner row, with the file-wide IsActive) and the duplicate rows for the
 * Skipped tab. Throws when a row is not in the index — that means the file
 * changed after the index was built.
 */
export function applyStudentIndex(
  rows: PendingLoginRow[],
  index: Pick<StudentIndex, "students">,
): {
  owners: {
    studentId: string;
    isActive: boolean;
    enrollment: EnrollmentState;
  }[];
  duplicates: SkippedLoginRow[];
} {
  const owners: {
    studentId: string;
    isActive: boolean;
    enrollment: EnrollmentState;
  }[] = [];
  const duplicates: SkippedLoginRow[] = [];

  for (const row of rows) {
    const entry = index.students.get(row.studentId);
    if (!entry) {
      throw new Error(
        `[Account Login Import] Student_ID ${row.studentId} (byte ${row.lineStartByte}) is not ` +
          `in the Student index. The Account Login file changed after the index was built; ` +
          `start the run again from byte 0 so the index is rebuilt.`,
      );
    }
    if (entry.ownerByte === row.lineStartByte) {
      owners.push({
        studentId: row.studentId,
        isActive: entry.anyActive,
        enrollment: entry.enrollment,
      });
      continue;
    }
    duplicates.push({
      studentId: row.studentId,
      reason: SKIP_REASON.DUPLICATE_STUDENT_ID,
      detail:
        `Merged into this student's first row: line ${entry.ownerLine}, window ` +
        `${entry.ownerWindow}. The User is sent once, from that row, with ` +
        `IsActive = ${String(entry.anyActive).toUpperCase()} (active if any of the ` +
        `student's ${entry.rowCount} rows is active). This row: ` +
        `Inactive=${String(!row.isActive).toUpperCase()}.`,
    });
  }
  return { owners, duplicates };
}

// ── Serialisation ──────────────────────────────────────────────────────────────

export function serializeStudentIndex(index: StudentIndex): string {
  const students: SerializedStudentIndex["students"] = {};
  for (const [id, e] of index.students) {
    students[id] = [
      e.ownerByte,
      e.ownerLine,
      e.ownerWindow,
      e.anyActive ? 1 : 0,
      e.rowCount,
      ENROLLMENT_CODE[e.enrollment],
    ];
  }
  const serialized: SerializedStudentIndex = { ...index, students };
  return JSON.stringify(serialized);
}

export function deserializeStudentIndex(json: string): StudentIndex {
  const parsed = JSON.parse(json) as SerializedStudentIndex;
  const students = new Map<string, StudentIndexEntry>();
  for (const [id, v] of Object.entries(parsed.students ?? {})) {
    students.set(id, {
      ownerByte: v[0],
      ownerLine: v[1],
      ownerWindow: v[2],
      anyActive: v[3] === 1,
      rowCount: v[4],
      enrollment: ENROLLMENT_FROM_CODE[v[5]] ?? "none",
    });
  }
  return { ...parsed, students };
}

/** True when a saved index still matches both source files and this code. */
export function isIndexCurrent(
  index: Pick<
    StudentIndex,
    "version" | "maxRows" | "accountLoginFile" | "enrollmentFile"
  >,
  accountLoginFile: FileFingerprint,
  enrollmentFile: FileFingerprint,
  maxRows: number,
): boolean {
  const same = (a: FileFingerprint, b: FileFingerprint) =>
    a.id === b.id && a.size === b.size && a.modifiedTime === b.modifiedTime;
  return (
    index.version === STUDENT_INDEX_VERSION &&
    index.maxRows === maxRows &&
    same(index.accountLoginFile, accountLoginFile) &&
    same(index.enrollmentFile, enrollmentFile)
  );
}

// ── Google Drive I/O ───────────────────────────────────────────────────────────

/** Index file name — one per Account Login source file. */
export function studentIndexFileName(accountLoginFileId: string): string {
  return `Stanford CSP - Account Login Import - Student Index - ${accountLoginFileId}.json`;
}

async function getFileFingerprint(
  fileId: string,
  accessToken: string,
): Promise<FileFingerprint> {
  const { data } = await axios.get<{ size?: string; modifiedTime?: string }>(
    `${DRIVE_FILES}/${encodeURIComponent(fileId)}`,
    {
      params: { fields: "size,modifiedTime", supportsAllDrives: "true" },
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return {
    id: fileId,
    size: String(data.size ?? ""),
    modifiedTime: String(data.modifiedTime ?? ""),
  };
}

async function findIndexFile(
  accountLoginFileId: string,
  folderId: string | undefined,
  accessToken: string,
): Promise<string | undefined> {
  const name = studentIndexFileName(accountLoginFileId).replace(/'/g, "\\'");
  const q =
    `name = '${name}' and trashed = false` +
    (folderId ? ` and '${folderId.replace(/'/g, "\\'")}' in parents` : "");
  const { data } = await axios.get<{ files?: { id: string }[] }>(DRIVE_FILES, {
    params: {
      q,
      fields: "files(id)",
      orderBy: "modifiedTime desc",
      pageSize: 1,
      corpora: "allDrives",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true",
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data.files?.[0]?.id;
}

async function downloadIndex(
  indexFileId: string,
  accessToken: string,
): Promise<StudentIndex> {
  const { data } = await axios.get<string>(
    `${DRIVE_FILES}/${encodeURIComponent(indexFileId)}`,
    {
      params: { alt: "media", supportsAllDrives: "true" },
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: "text",
      transformResponse: (raw: string) => raw,
      maxContentLength: Infinity,
    },
  );
  return deserializeStudentIndex(data);
}

/** Creates the index file, or writes a new version of an existing one. */
async function saveIndex(
  index: StudentIndex,
  existingFileId: string | undefined,
  folderId: string | undefined,
  accessToken: string,
): Promise<string> {
  const content = serializeStudentIndex(index);
  const auth = { Authorization: `Bearer ${accessToken}` };

  if (existingFileId) {
    await axios.patch(
      `${DRIVE_UPLOAD}/${encodeURIComponent(existingFileId)}`,
      content,
      {
        params: { uploadType: "media", supportsAllDrives: "true" },
        headers: { ...auth, "Content-Type": INDEX_MIME_TYPE },
        maxBodyLength: Infinity,
      },
    );
    return existingFileId;
  }

  const metadata = JSON.stringify({
    name: studentIndexFileName(index.accountLoginFile.id),
    mimeType: INDEX_MIME_TYPE,
    ...(folderId ? { parents: [folderId] } : {}),
  });
  const boundary = "account_login_index_boundary";
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${INDEX_MIME_TYPE}\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;
  const { data } = await axios.post<{ id: string }>(DRIVE_UPLOAD, body, {
    params: { uploadType: "multipart", supportsAllDrives: "true" },
    headers: {
      ...auth,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    maxBodyLength: Infinity,
  });
  return data.id;
}

async function openDriveStream(
  fileId: string,
  accessToken: string,
): Promise<NodeJS.ReadableStream> {
  const response = await axios.get(
    `${DRIVE_FILES}/${encodeURIComponent(fileId)}`,
    {
      params: { alt: "media", supportsAllDrives: "true" },
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: "stream",
    },
  );
  return response.data as NodeJS.ReadableStream;
}

export interface LoadStudentIndexParams {
  accountLoginFileId: string;
  enrollmentFileId: string;
  /** Folder for a new index file (the Failed Records folder). */
  folderId?: string;
  /** Index file Id passed on by the previous window, if any. */
  indexFileId?: string;
  maxRows: number;
  accessToken: string;
  /**
   * Reads the Enrollment file for these studentIds. `qualified` = has a row
   * whose Status is not New; `seen` = has any row at all.
   */
  resolveEnrolled: (
    studentIds: Set<string>,
  ) => Promise<{ qualified: Set<string>; seen: Set<string> }>;
  logger: { info: (m: string) => void; warn: (m: string) => void };
}

/**
 * Returns the Student index for the current source files, building and
 * saving it when there is none yet or the saved one is out of date.
 */
export async function loadOrBuildStudentIndex(
  params: LoadStudentIndexParams,
): Promise<{ index: StudentIndex; indexFileId: string; built: boolean }> {
  const { accessToken, logger, maxRows } = params;
  const [accountLoginFile, enrollmentFile] = await Promise.all([
    getFileFingerprint(params.accountLoginFileId, accessToken),
    getFileFingerprint(params.enrollmentFileId, accessToken),
  ]);

  const existingFileId =
    params.indexFileId ??
    (await findIndexFile(
      params.accountLoginFileId,
      params.folderId,
      accessToken,
    ));

  if (existingFileId) {
    try {
      const saved = await downloadIndex(existingFileId, accessToken);
      if (isIndexCurrent(saved, accountLoginFile, enrollmentFile, maxRows)) {
        return { index: saved, indexFileId: existingFileId, built: false };
      }
      logger.warn(
        `[Account Login Import] Student index ${existingFileId} is out of date ` +
          `(a source file or the window size changed). Rebuilding it.`,
      );
    } catch (err: unknown) {
      logger.warn(
        `[Account Login Import] Could not read Student index ${existingFileId}: ` +
          `${String(err)}. Rebuilding it.`,
      );
    }
  }

  const startedAt = Date.now();
  logger.info(
    `[Account Login Import] Building the Student index: reading the whole Account Login file once…`,
  );
  const scanned = await scanAccountLoginFile(
    await openDriveStream(params.accountLoginFileId, accessToken),
    maxRows,
  );
  logger.info(
    `[Account Login Import] Account Login file: ${scanned.totals.dataLines} row(s), ` +
      `${scanned.totals.uniqueStudents} unique Student_ID(s), ${scanned.totals.windows} window(s). ` +
      `Reading the Enrollment file once…`,
  );

  const { qualified, seen } = await params.resolveEnrolled(
    new Set(scanned.students.keys()),
  );
  let onlyNewStudents = 0;
  let noEnrollmentStudents = 0;
  for (const [id, entry] of scanned.students) {
    if (qualified.has(id)) {
      entry.enrollment = "qualified";
    } else if (seen.has(id)) {
      entry.enrollment = "onlyNew";
      onlyNewStudents++;
    } else {
      entry.enrollment = "none";
      noEnrollmentStudents++;
    }
  }

  const index: StudentIndex = {
    version: STUDENT_INDEX_VERSION,
    maxRows,
    builtAt: new Date().toISOString(),
    accountLoginFile,
    enrollmentFile,
    headers: scanned.headers,
    windowStartBytes: scanned.windowStartBytes,
    totals: {
      ...scanned.totals,
      enrolledStudents:
        scanned.students.size - onlyNewStudents - noEnrollmentStudents,
      onlyNewStudents,
      noEnrollmentStudents,
    },
    students: scanned.students,
  };
  const indexFileId = await saveIndex(
    index,
    existingFileId,
    params.folderId,
    accessToken,
  );

  const t = index.totals;
  logger.info(
    `[Account Login Import] Student index saved to Drive file ${indexFileId} in ` +
      `${Math.round((Date.now() - startedAt) / 1000)}s — ${t.lines} line(s): ` +
      `${t.blankLines} blank, 1 header, ${t.dataLines} data row(s) ` +
      `(${t.validRows} valid, ${t.columnMismatchRows} column mismatch, ` +
      `${t.invalidStudentIdRows} invalid Student_ID); ${t.uniqueStudents} unique student(s), ` +
      `${t.enrolledStudents} with a non-New enrollment, ${t.onlyNewStudents} with only New ` +
      `enrollments, ${t.noEnrollmentStudents} with no enrollment rows; ` +
      `${t.validRows - t.uniqueStudents} duplicate row(s).`,
  );
  return { index, indexFileId, built: true };
}
