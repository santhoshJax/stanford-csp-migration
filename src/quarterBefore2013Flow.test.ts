/**
 * Unit tests for the Quarter Import Before 2013 flow.
 *
 * The fixture reproduces "Quarters Table - Mock fa88-su12.xlsx" Sheet1:
 * 100 rows fa88..su12 with the fixed mock month/day pattern. Drive and
 * Bulk API calls are mocked, so no live credentials are needed.
 */
import { invokeFlow } from "@prismatic-io/spectral/dist/testing";
import axios from "axios";
import { Workbook } from "exceljs";
import {
  quarterImportBefore2013,
  buildQuarterRecords,
  parseWorkbook,
  parseIsoDate,
  toFourDigitYear,
} from "./quarterBefore2013Flow";
import { runBulkJob } from "./utils";
import { createResultsSheet } from "./reportResults";

jest.mock("axios");
jest.mock("./utils", () => ({
  ...jest.requireActual("./utils"),
  runBulkJob: jest.fn(),
}));
jest.mock("./reportResults", () => ({
  createResultsSheet: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedRunBulkJob = runBulkJob as jest.MockedFunction<typeof runBulkJob>;
const mockedCreateResultsSheet = createResultsSheet as jest.MockedFunction<
  typeof createResultsSheet
>;

const silentLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

// ── Fixture: same rows as the Stanford mock workbook ──────────────────────────

const SEASON_DATES: [string, boolean, string, string][] = [
  // [season, inNextCalendarYear, start MM-DD, end MM-DD]
  ["fa", false, "09-22", "12-06"],
  ["wi", true, "01-12", "03-20"],
  ["sp", true, "03-30", "06-06"],
  ["su", true, "06-22", "08-28"],
];

function workbookRows(): string[][] {
  const rows: string[][] = [];
  for (let codeYear = 1988; codeYear <= 2012; codeYear++) {
    const yy = String(codeYear % 100).padStart(2, "0");
    for (const [season, nextYear, start, end] of SEASON_DATES) {
      const calYear = nextYear ? codeYear + 1 : codeYear;
      rows.push([`${season}${yy}`, `${calYear}-${start}`, `${calYear}-${end}`]);
    }
  }
  return rows; // 100 rows, fa88..su12
}

async function buildXlsx(useDateCells: boolean): Promise<Buffer> {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.addRow(["Abbreviation", "Class Start Date", "Class End Date"]);
  for (const [abbr, start, end] of workbookRows()) {
    sheet.addRow(
      useDateCells
        ? [
            abbr,
            new Date(`${start}T00:00:00.000Z`),
            new Date(`${end}T00:00:00.000Z`),
          ]
        : [abbr, start, end],
    );
  }
  workbook.addWorksheet("Notes").addRow(["Mock Quarters: fa88 through sp12"]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

describe("helpers", () => {
  it("pivots two-digit years: 88-99 => 19xx, 00-12 => 20xx", () => {
    expect(toFourDigitYear("88")).toBe(1988);
    expect(toFourDigitYear("99")).toBe(1999);
    expect(toFourDigitYear("00")).toBe(2000);
    expect(toFourDigitYear("12")).toBe(2012);
  });

  it("parses ISO dates and rejects invalid ones", () => {
    expect(parseIsoDate("1988-09-22")).toBe("1988-09-22T00:00:00.000Z");
    expect(parseIsoDate("1988-09-22T00:00:00.000Z")).toBe(
      "1988-09-22T00:00:00.000Z",
    );
    expect(parseIsoDate("09/22/88")).toBeUndefined();
    expect(parseIsoDate("2001-02-30")).toBeUndefined();
    expect(parseIsoDate("")).toBeUndefined();
  });
});

describe("buildQuarterRecords", () => {
  const records = buildQuarterRecords(workbookRows(), silentLogger);

  it("produces 99 sessions, 99 terms, 25 years and skips su12", () => {
    expect(records.sessions).toHaveLength(99);
    expect(records.terms).toHaveLength(99);
    expect(records.years).toHaveLength(25);
    expect(records.skipped).toEqual(["su12"]);
    expect(records.sessions.find((s) => s.Code__c === "20124")).toBeUndefined();
    expect(records.years.map((y) => y.External_ID__c)[0]).toBe("1988");
    expect(records.years.map((y) => y.External_ID__c)[24]).toBe("2012");
  });

  it("maps fa88 / wi88 / sp12 correctly", () => {
    const fa88 = records.sessions.find((s) => s.Abbreviation__c === "fa88");
    expect(fa88).toEqual({
      Name: "Fall 1988",
      "AcademicTerm.Code__c": "19881",
      Code__c: "19881",
      IsActive: true,
      Season: "Fall",
      Abbreviation__c: "fa88",
      ClassStartDate: "1988-09-22T00:00:00.000Z",
      ClassEndDate: "1988-12-06T00:00:00.000Z",
    });

    const wi88Term = records.terms.find((t) => t.Abbreviation__c === "wi88");
    expect(wi88Term).toEqual({
      Name: "Winter 1989",
      IsActive: true,
      "AcademicYear.External_ID_4D__c": "1988",
      Season: "Winter",
      Code__c: "19882",
      Abbreviation__c: "wi88",
    });

    const sp12 = records.sessions.find((s) => s.Abbreviation__c === "sp12");
    expect(sp12?.Code__c).toBe("20123");
    expect(sp12?.Name).toBe("Spring 2013");
    expect(sp12?.ClassStartDate).toBe("2013-03-30T00:00:00.000Z");

    expect(records.years[0]).toEqual({
      Name: "1988-1989",
      Year: "1988",
      External_ID_4D__c: "1988",
      External_ID__c: "1988",
    });
  });

  it("never sets External_ID_4D__c, Web_Launch_Date__c or RegistrationOpenDate on Term/Session", () => {
    for (const rec of [...records.terms, ...records.sessions]) {
      expect(rec).not.toHaveProperty("External_ID_4D__c");
      expect(rec).not.toHaveProperty("Web_Launch_Date__c");
      expect(rec).not.toHaveProperty("RegistrationOpenDate");
    }
  });

  it("skips invalid abbreviations and blank rows", () => {
    const result = buildQuarterRecords(
      [
        ["xx99", "1999-01-01", "1999-02-01"],
        ["", "", ""],
        ["FA90", "1990-09-22", "1990-12-06"],
      ],
      silentLogger,
    );
    expect(result.skipped).toEqual(["xx99"]);
    expect(result.sessions.map((s) => s.Code__c)).toEqual(["19901"]);
  });
});

describe("parseWorkbook", () => {
  it.each([
    ["text date cells", false],
    ["Excel date cells", true],
  ])("reads Sheet1 with %s", async (_label, useDateCells) => {
    const rows = await parseWorkbook(await buildXlsx(useDateCells));
    expect(rows).toHaveLength(101); // header + 100
    expect(rows[0]).toEqual([
      "Abbreviation",
      "Class Start Date",
      "Class End Date",
    ]);
    const records = buildQuarterRecords(rows.slice(1), silentLogger);
    expect(records.sessions).toHaveLength(99);
    expect(records.sessions[0].ClassStartDate).toBe("1988-09-22T00:00:00.000Z");
  });
});

// ── Flow-level ────────────────────────────────────────────────────────────────

const gdConnection = {
  key: "Google Drive Connection",
  token: { access_token: "gd-test-token" },
  fields: {},
};
const sfConnection = {
  key: "Salesforce Connection",
  token: {
    access_token: "sf-test-token",
    instance_url: "https://test.my.salesforce.com",
  },
  fields: {},
};

describe("quarterImportBefore2013 flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRunBulkJob.mockImplementation((_u, _t, _o, _k, records) =>
      Promise.resolve({
        jobId: "job",
        state: "JobComplete",
        numberRecordsProcessed: records.length,
        numberRecordsFailed: 0,
        failedExternalIds: new Set<string>(),
        failedCsv: "",
        successfulCsv: "",
      }),
    );
    mockedCreateResultsSheet.mockResolvedValue({
      url: "https://sheet",
      spreadsheetId: "s",
    });
  });

  it.each([
    [
      "uploaded .xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      false,
    ],
    ["native Google Sheet", "application/vnd.google-apps.spreadsheet", true],
  ])(
    "imports from an %s in dependency order",
    async (_label, mimeType, isNative) => {
      const xlsx = await buildXlsx(false);
      mockedAxios.get
        .mockResolvedValueOnce({ data: { mimeType } }) // metadata lookup
        .mockResolvedValue({ data: xlsx }); // download or export

      const { result } = await invokeFlow(quarterImportBefore2013, {
        configVars: {
          "Google Drive Connection": gdConnection,
          "Salesforce Connection": sfConnection,
          "Quarter Before 2013 File ID": "file-123",
        },
      });

      // Native Sheets go through /export; uploaded files through alt=media.
      const secondUrl = mockedAxios.get.mock.calls[1][0];
      expect(secondUrl.endsWith("/export")).toBe(isNative);

      expect(
        mockedRunBulkJob.mock.calls.map((c) => [c[2], c[3], c[4].length]),
      ).toEqual([
        ["AcademicYear", "External_ID__c", 25],
        ["AcademicTerm", "Code__c", 99],
        ["AcademicSession", "Code__c", 99],
      ]);
      expect(result?.data).toMatchObject({
        academicYears: 25,
        academicTerms: 99,
        academicSessions: 99,
        skipped: 1,
      });
    },
  );

  it("throws when the file ID config var is empty", async () => {
    await expect(
      invokeFlow(quarterImportBefore2013, {
        configVars: {
          "Google Drive Connection": gdConnection,
          "Salesforce Connection": sfConnection,
          "Quarter Before 2013 File ID": "",
        },
      }),
    ).rejects.toThrow("Quarter Before 2013 File ID config var is empty.");
  });
});
