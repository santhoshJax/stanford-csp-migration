/**
 * Unit tests for the Account Login "Skipped" tab helpers. They check that
 * every dropped row gets a Student_ID and a reason; no Google or Salesforce
 * calls are made.
 */
import {
  describeColumnMismatch,
  SKIP_REASON,
  SKIPPED_TAB_HEADERS,
  summariseSkipReasons,
  toSkippedSheetRows,
} from "./accountLoginFlow";

describe("describeColumnMismatch", () => {
  const headers = ["ID", "Student_ID", "Inactive"];

  it("takes the Student_ID from its column and states both column counts", () => {
    const entry = describeColumnMismatch(
      ["7", "91013416", "FALSE", "extra"],
      headers,
    );
    expect(entry.studentId).toBe("91013416");
    expect(entry.reason).toBe(SKIP_REASON.COLUMN_MISMATCH);
    expect(entry.detail).toContain("Expected 3 columns, found 4");
  });

  it("leaves the Student_ID blank when the line is too short to have one", () => {
    expect(describeColumnMismatch(["7"], headers).studentId).toBe("");
  });

  it("cuts very long lines so they fit in one sheet cell", () => {
    const entry = describeColumnMismatch(["x".repeat(5000)], headers);
    expect(entry.detail.length).toBeLessThanOrEqual(501);
  });
});

describe("toSkippedSheetRows", () => {
  it("writes one row per entry in header order", () => {
    const rows = toSkippedSheetRows(
      [
        {
          studentId: "5",
          reason: SKIP_REASON.NOT_ENROLLED,
          detail: "no Enrolled row",
        },
      ],
      3,
      18468950,
    );
    expect(rows).toEqual([
      ["5", SKIP_REASON.NOT_ENROLLED, "no Enrolled row", "3", "18468950"],
    ]);
    expect(rows[0]).toHaveLength(SKIPPED_TAB_HEADERS.length);
  });
});

describe("summariseSkipReasons", () => {
  it("counts entries per reason", () => {
    const summary = summariseSkipReasons([
      { studentId: "1", reason: SKIP_REASON.NOT_ENROLLED, detail: "" },
      { studentId: "2", reason: SKIP_REASON.NOT_ENROLLED, detail: "" },
      { studentId: "3", reason: SKIP_REASON.NO_USABLE_EMAIL, detail: "" },
    ]);
    expect(summary).toBe("Not enrolled: 2, No usable email: 1");
  });
});
