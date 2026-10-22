/**
 * Tier 3 quarter filter — covers the two-digit year pivot (50-99 => 19xx,
 * 00-49 => 20xx) so pre-2000 quarters are kept and Tier 1/2 years are not.
 */
import {
  isTier3Quarter,
  parseCorrectionDate,
  buildCourseCorrectionMap,
  applyCourseCorrection,
} from "./coursesImportAllTime";

describe("isTier3Quarter", () => {
  it("keeps 1900s quarters (fa88, wi95, su99)", () => {
    expect(isTier3Quarter("fa88")).toBe(true);
    expect(isTier3Quarter("wi95")).toBe(true);
    expect(isTier3Quarter("su99")).toBe(true);
  });

  it("keeps 2000-2020 quarters (fa08, sp12, su20) and is case-insensitive", () => {
    expect(isTier3Quarter("fa08")).toBe(true);
    expect(isTier3Quarter("SP12")).toBe(true);
    expect(isTier3Quarter(" su20 ")).toBe(true);
  });

  it("drops Tier 1 / Tier 2 years (fa21, wi23, fa25)", () => {
    expect(isTier3Quarter("fa21")).toBe(false);
    expect(isTier3Quarter("wi23")).toBe(false);
    expect(isTier3Quarter("fa25")).toBe(false);
  });

  it("drops malformed codes", () => {
    expect(isTier3Quarter("")).toBe(false);
    expect(isTier3Quarter("xx08")).toBe(false);
    expect(isTier3Quarter("fa2008")).toBe(false);
  });
});

// ── Correction mode (Oct 2026) ────────────────────────────────────────────────
// The 8 CourseOfferings that failed "End Date cannot be before Start Date" get
// their dates from the 'Course' tab of the Correction Sheet.

describe("parseCorrectionDate", () => {
  it("reads M/D/YYYY (source TSV format)", () => {
    expect(parseCorrectionDate("9/27/1999")).toBe("1999-09-27T00:00:00.000Z");
    expect(parseCorrectionDate(" 11/29/1999 ")).toBe(
      "1999-11-29T00:00:00.000Z",
    );
  });

  it("reads YYYY-MM-DD (client sheet / Google Sheets format)", () => {
    expect(parseCorrectionDate("2007-07-17")).toBe("2007-07-17T00:00:00.000Z");
    expect(parseCorrectionDate("2008-6-8")).toBe("2008-06-08T00:00:00.000Z");
  });

  it("returns null for blank, malformed and impossible dates", () => {
    expect(parseCorrectionDate("")).toBeNull();
    expect(parseCorrectionDate(undefined)).toBeNull();
    expect(parseCorrectionDate("June 8 2008")).toBeNull();
    expect(parseCorrectionDate("2/30/2008")).toBeNull();
    expect(parseCorrectionDate("2008-13-01")).toBeNull();
  });
});

describe("buildCourseCorrectionMap", () => {
  it("reads the client's columns as pasted (Start_Date / End_Date) and keeps IDs with spaces", () => {
    const map = buildCourseCorrectionMap([
      ["ID", "Code", "Title", "Quarter", "Start_Date", "End_Date"],
      [
        "19991_GER 01",
        "GER 01",
        "Beginning German I",
        "fa99",
        "9/27/1999",
        "11/29/1999",
      ],
      [
        "20073_EGL 256 W",
        "EGL 256 W",
        "Crafting",
        "sp07",
        "3/31/2008",
        "6/8/2008",
      ],
    ]);
    expect(map.size).toBe(2);
    expect(map.get("19991_GER 01")).toEqual({
      StartDate: "9/27/1999",
      EndDate: "11/29/1999",
    });
    expect(map.get("20073_EGL 256 W")).toEqual({
      StartDate: "3/31/2008",
      EndDate: "6/8/2008",
    });
  });

  it("accepts Salesforce field names (StartDate / EndDate) and skips blank cells and IDs", () => {
    const map = buildCourseCorrectionMap([
      ["ID", "StartDate", "EndDate"],
      [" 20052_EVT 120 ", "2/23/2006", ""],
      ["", "1/1/2000", "1/2/2000"],
    ]);
    expect(map.size).toBe(1);
    expect(map.get("20052_EVT 120")).toEqual({ StartDate: "2/23/2006" });
  });

  it("returns an empty map when there is no ID column or no data rows", () => {
    expect(buildCourseCorrectionMap([]).size).toBe(0);
    expect(buildCourseCorrectionMap([["ID", "Start_Date"]]).size).toBe(0);
    expect(buildCourseCorrectionMap([["Code"], ["GER 01"]]).size).toBe(0);
  });
});

describe("applyCourseCorrection", () => {
  it("replaces both dates and leaves every other field from the TSV untouched", () => {
    const co: Record<string, unknown> = {
      Name: "DRA 02",
      StartDate: "2001-01-11T00:00:00.000Z",
      EndDate: "2000-03-15T00:00:00.000Z", // bad source date — before start
      Units__c: 3,
    };
    const r = applyCourseCorrection(co, {
      StartDate: "1/11/2001",
      EndDate: "3/15/2001",
    });
    expect(r.error).toBeUndefined();
    expect(r.applied).toEqual(["StartDate", "EndDate"]);
    expect(co.StartDate).toBe("2001-01-11T00:00:00.000Z");
    expect(co.EndDate).toBe("2001-03-15T00:00:00.000Z");
    expect(co.Name).toBe("DRA 02");
    expect(co.Units__c).toBe(3);
  });

  it("allows a single-day course (start = end)", () => {
    const co: Record<string, unknown> = {};
    const r = applyCourseCorrection(co, {
      StartDate: "2006-02-23",
      EndDate: "2/23/2006",
    });
    expect(r.error).toBeUndefined();
    expect(co.StartDate).toBe(co.EndDate);
  });

  it("overrides only the supplied date and checks it against the TSV date", () => {
    const co: Record<string, unknown> = {
      StartDate: "2007-06-26T00:00:00.000Z",
    };
    const r = applyCourseCorrection(co, { EndDate: "7/17/2007" });
    expect(r.applied).toEqual(["EndDate"]);
    expect(co.StartDate).toBe("2007-06-26T00:00:00.000Z");
    expect(co.EndDate).toBe("2007-07-17T00:00:00.000Z");
  });

  it("returns an error and changes nothing when the corrected end is before the start", () => {
    const co: Record<string, unknown> = { StartDate: "x", EndDate: "y" };
    const r = applyCourseCorrection(co, {
      StartDate: "6/8/2008",
      EndDate: "3/31/2008",
    });
    expect(r.error).toMatch(/before Start Date/);
    expect(r.applied).toEqual([]);
    expect(co).toEqual({ StartDate: "x", EndDate: "y" });
  });

  it("returns an error for an unreadable date instead of dropping it", () => {
    const co: Record<string, unknown> = {
      StartDate: "2005-09-28T00:00:00.000Z",
    };
    const r = applyCourseCorrection(co, { EndDate: "30/11/2005" });
    expect(r.error).toMatch(/not a valid date/);
    expect(co.EndDate).toBeUndefined();
  });

  it("does nothing for an empty correction (tab row with no dates)", () => {
    const co: Record<string, unknown> = { StartDate: "a" };
    const r = applyCourseCorrection(co, {});
    expect(r).toEqual({ applied: [] });
    expect(co).toEqual({ StartDate: "a" });
  });
});
