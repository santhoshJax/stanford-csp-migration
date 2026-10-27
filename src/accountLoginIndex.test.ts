/**
 * Unit tests for the Account Login Student index and the per-window row
 * accounting. They build small TSV files in memory and run them through the
 * same parser the flow uses; no Google or Salesforce calls are made.
 *
 * What they prove:
 *   - a student who appears in several windows is sent once, from their first
 *     row, with IsActive = true if any row is active;
 *   - every other row for that student lands on Skipped, naming the row it
 *     was merged into;
 *   - across a whole run every data line is accounted for exactly once;
 *   - a run restarted at a byte offset reads the columns correctly.
 */
import { Readable } from "stream";
import {
  SKIP_REASON,
  applyStudentIndex,
  deserializeStudentIndex,
  isIndexCurrent,
  scanAccountLoginFile,
  serializeStudentIndex,
  windowNumberForByte,
  STUDENT_INDEX_VERSION,
  type StudentIndex,
} from "./accountLoginIndex";
import {
  checkWindowCounts,
  parseWindowFromStream,
  toResultSheetRecords,
  toWindowLogRow,
  WINDOW_LOG_HEADERS,
  type WindowState,
} from "./accountLoginFlow";

const HEADER = "ID\tStudent_ID\tInactive";

/** TSV text from data lines, with a header row and \r\n line endings. */
function tsv(lines: string[]): string {
  return [HEADER, ...lines].join("\r\n") + "\r\n";
}

/** Stream of the file's bytes starting at byteOffset (like a Range request). */
function streamFrom(content: string, byteOffset = 0): Readable {
  return Readable.from([Buffer.from(content, "utf8").subarray(byteOffset)]);
}

async function buildIndex(content: string, maxRows: number) {
  const scanned = await scanAccountLoginFile(streamFrom(content), maxRows);
  return scanned;
}

// Window size 2 keeps the files small. Student 100 appears in windows 1 and 3;
// its first row is inactive and a later row is active.
const MAX_ROWS = 2;
const FILE = tsv([
  "1\t100\tTRUE", // window 1 — owner row of 100 (inactive)
  "2\t200\tFALSE", // window 1
  "", // blank line
  "3\t300\tFALSE", // window 2
  "4\tabc\tFALSE", // window 2 — invalid Student_ID
  "5\t400\tFALSE", // window 2
  "6\t100\tFALSE", // window 3 — duplicate of 100, active
  "7\t500", // window 3 — column count mismatch
  "8\t200\tTRUE", // window 3 — duplicate of 200
]);

describe("scanAccountLoginFile", () => {
  it("records the first row of each student and whether any row is active", async () => {
    const scanned = await buildIndex(FILE, MAX_ROWS);
    const s100 = scanned.students.get("100");
    expect(s100).toMatchObject({
      ownerLine: 2,
      ownerWindow: 1,
      anyActive: true,
      rowCount: 2,
    });
    expect(scanned.students.get("200")).toMatchObject({
      ownerWindow: 1,
      anyActive: true,
      rowCount: 2,
    });
    // 500 has only a column-mismatch row, so it is not a student here.
    expect(scanned.students.size).toBe(4);
  });

  it("counts every line and splits windows like the import does", async () => {
    const scanned = await buildIndex(FILE, MAX_ROWS);
    expect(scanned.totals).toMatchObject({
      lines: 10,
      blankLines: 1,
      dataLines: 8,
      validRows: 6,
      columnMismatchRows: 1,
      invalidStudentIdRows: 1,
      uniqueStudents: 4,
      windows: 3,
    });
    expect(scanned.windowStartBytes).toHaveLength(3);
    expect(scanned.headers).toEqual(["ID", "Student_ID", "Inactive"]);
  });

  it("drops a byte-order mark from the header row", async () => {
    const scanned = await buildIndex(`\ufeff${tsv(["1\t100\tFALSE"])}`, 10);
    expect(scanned.headers[0]).toBe("ID");
  });

  it("stops with a clear error when there is no Student_ID column", async () => {
    await expect(
      scanAccountLoginFile(streamFrom("A\tB\r\n1\t2\r\n"), 10),
    ).rejects.toThrow(/no "Student_ID" column/);
  });
});

describe("a full run across windows", () => {
  it("sends each student once and accounts for every data line", async () => {
    const scanned = await buildIndex(FILE, MAX_ROWS);
    const index = { students: scanned.students };
    const sent: { studentId: string; isActive: boolean }[] = [];
    const skipped: { studentId: string; reason: string; detail: string }[] = [];
    let dataLines = 0;
    let byteOffset = 0;
    let windows = 0;

    for (;;) {
      const parsed = await parseWindowFromStream(
        streamFrom(FILE, byteOffset),
        byteOffset,
        MAX_ROWS,
        scanned.headers,
      );
      windows++;
      // Each window starts exactly where the index says it does.
      expect(byteOffset).toBe(scanned.windowStartBytes[windows - 1]);
      const { owners, duplicates } = applyStudentIndex(parsed.rows, index);
      sent.push(...owners);
      skipped.push(...parsed.skippedRows, ...duplicates);
      dataLines += parsed.dataLines;
      expect(
        checkWindowCounts(
          parsed.dataLines,
          parsed.skippedRows.length + duplicates.length,
          owners.length,
        ),
      ).toBeNull();
      if (!parsed.hasMore) break;
      byteOffset = parsed.nextByteOffset;
    }

    expect(windows).toBe(3);
    expect(dataLines).toBe(scanned.totals.dataLines);
    expect(sent.length + skipped.length).toBe(scanned.totals.dataLines);
    expect(sent.map((s) => s.studentId).sort()).toEqual([
      "100",
      "200",
      "300",
      "400",
    ]);
    // Student 100's first row is inactive, but a later row is active.
    expect(sent.find((s) => s.studentId === "100")?.isActive).toBe(true);

    const dupes = skipped.filter(
      (s) => s.reason === SKIP_REASON.DUPLICATE_STUDENT_ID,
    );
    expect(dupes.map((d) => d.studentId).sort()).toEqual(["100", "200"]);
    expect(dupes[0].detail).toContain("window 1");
  });

  it("reads columns correctly when restarted at a byte offset", async () => {
    // Regression: a restart without headers used to take its first data line
    // as the header row and reject every later row as an invalid Student_ID.
    const scanned = await buildIndex(FILE, MAX_ROWS);
    const start = scanned.windowStartBytes[1];
    const parsed = await parseWindowFromStream(
      streamFrom(FILE, start),
      start,
      MAX_ROWS,
      scanned.headers,
    );
    expect(parsed.rows.map((r) => r.studentId)).toEqual(["300", "400"]);
    expect(parsed.skippedRows.map((r) => r.reason)).toEqual([
      SKIP_REASON.INVALID_STUDENT_ID,
    ]);
    expect(windowNumberForByte(scanned.windowStartBytes, start)).toBe(2);
  });
});

describe("applyStudentIndex", () => {
  it("throws when a row is not in the index (file changed)", () => {
    expect(() =>
      applyStudentIndex(
        [{ studentId: "9", isActive: true, lineStartByte: 0 }],
        {
          students: new Map(),
        },
      ),
    ).toThrow(/not in the Student index/);
  });
});

describe("windowNumberForByte", () => {
  it("returns the window that contains the byte", () => {
    const starts = [0, 100, 250];
    expect(windowNumberForByte(starts, 0)).toBe(1);
    expect(windowNumberForByte(starts, 99)).toBe(1);
    expect(windowNumberForByte(starts, 100)).toBe(2);
    expect(windowNumberForByte(starts, 9999)).toBe(3);
  });
});

describe("index file", () => {
  const fingerprint = { id: "f", size: "10", modifiedTime: "t1" };
  const enrollment = { id: "e", size: "20", modifiedTime: "t2" };

  async function fullIndex(): Promise<StudentIndex> {
    const scanned = await buildIndex(FILE, MAX_ROWS);
    scanned.students.get("100")!.enrolled = true;
    return {
      version: STUDENT_INDEX_VERSION,
      maxRows: MAX_ROWS,
      builtAt: "2026-10-28T00:00:00.000Z",
      accountLoginFile: fingerprint,
      enrollmentFile: enrollment,
      headers: scanned.headers,
      windowStartBytes: scanned.windowStartBytes,
      totals: { ...scanned.totals, enrolledStudents: 1 },
      students: scanned.students,
    };
  }

  it("survives a save and load unchanged", async () => {
    const index = await fullIndex();
    const loaded = deserializeStudentIndex(serializeStudentIndex(index));
    expect(loaded.students).toEqual(index.students);
    expect(loaded.windowStartBytes).toEqual(index.windowStartBytes);
    expect(loaded.headers).toEqual(index.headers);
  });

  it("is reused only while both files and the window size are unchanged", async () => {
    const index = await fullIndex();
    expect(isIndexCurrent(index, fingerprint, enrollment, MAX_ROWS)).toBe(true);
    expect(
      isIndexCurrent(
        index,
        { ...fingerprint, modifiedTime: "t9" },
        enrollment,
        MAX_ROWS,
      ),
    ).toBe(false);
    expect(
      isIndexCurrent(
        index,
        fingerprint,
        { ...enrollment, size: "21" },
        MAX_ROWS,
      ),
    ).toBe(false);
    expect(isIndexCurrent(index, fingerprint, enrollment, 500)).toBe(false);
  });
});

describe("window accounting", () => {
  const window: WindowState = {
    windowNumber: 4,
    startByte: 1000,
    endByte: 2000,
    dataLines: 10,
    blankLines: 1,
    skippedCount: 3,
    sentStudentIds: ["1", "2", "3", "4", "5", "6", "7"],
  };

  it("checkWindowCounts reports rows that are neither skipped nor sent", () => {
    expect(checkWindowCounts(10, 3, 7)).toBeNull();
    expect(checkWindowCounts(10, 3, 6)).toContain("read 10 row(s)");
  });

  it("Window Log row says OK when every row is placed", () => {
    const row = toWindowLogRow(
      window,
      { success: 5, errors: 1, notProcessed: 1 },
      "2026-10-28T00:00:00.000Z",
    );
    expect(row).toHaveLength(WINDOW_LOG_HEADERS.length);
    expect(row[10]).toBe("OK");
    expect(
      toWindowLogRow(
        window,
        { success: 5, errors: 1, notProcessed: 0 },
        "",
      )[10],
    ).toContain("MISMATCH");
  });

  it("adds Window # and a Not Processed row for a User Salesforce did not return", () => {
    const rows = toResultSheetRecords(
      [{ Federation_Identifier__c: "1", Email: "a@b.c" }],
      ["1", "2"],
      4,
    );
    expect(rows).toEqual([
      { "Window #": "4", Federation_Identifier__c: "1", Email: "a@b.c" },
      { "Window #": "4", Federation_Identifier__c: "2" },
    ]);
    expect(Object.keys(rows[0])[0]).toBe("Window #");
  });
});
