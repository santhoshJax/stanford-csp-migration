/**
 * PricebookEntry step for course Products (Course Import - All / 2 Year /
 * 5 Year). Pure helpers are tested directly; the Salesforce calls are mocked
 * with axios so no org is needed.
 * Assumes: Course.ID is the "<quarter>_<code>" text key, e.g. "20241_POL 68 H".
 */
/* eslint-disable @typescript-eslint/unbound-method -- jest mock assertions */
import axios from "axios";
import {
  parsePriceBookNames,
  resolvePriceBooks,
  parseListPrice,
  pricebookEntryKey,
  type PricebookRecord,
  type ResolvedPriceBooks,
} from "./courseUtils";
import {
  loadPriceBooks,
  saveCoursePricebookEntries,
  summarisePricebookEntries,
} from "./coursePricebook";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const STD: PricebookRecord = {
  Id: "01sSTD",
  Name: "Standard Price Book",
  IsStandard: true,
  IsActive: true,
};
const SCS: PricebookRecord = {
  Id: "01sSCS",
  Name: "StanfordContinuingStudies Price Book",
  IsStandard: false,
  IsActive: true,
};
const OTHER: PricebookRecord = {
  Id: "01sOTH",
  Name: "Other Book",
  IsStandard: false,
  IsActive: true,
};
const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

describe("parsePriceBookNames", () => {
  it("splits, trims and drops blanks and case-insensitive repeats", () => {
    expect(
      parsePriceBookNames(
        " Standard Price Book , StanfordContinuingStudies Price Book,,standard price book",
      ),
    ).toEqual(["Standard Price Book", "StanfordContinuingStudies Price Book"]);
    expect(parsePriceBookNames("")).toEqual([]);
    expect(parsePriceBookNames(undefined)).toEqual([]);
  });
});

describe("resolvePriceBooks", () => {
  it("returns Standard and the one custom book", () => {
    const r = resolvePriceBooks(
      ["Standard Price Book", "StanfordContinuingStudies Price Book"],
      [STD, SCS],
    );
    expect(r.standard.Id).toBe("01sSTD");
    expect(r.custom?.Id).toBe("01sSCS");
    expect(r.standardAdded).toBe(false);
    expect(r.warnings).toEqual([]);
  });

  it("adds Standard when it is not listed, with a warning", () => {
    const r = resolvePriceBooks(
      ["stanfordcontinuingstudies price book"],
      [STD, SCS],
    );
    expect(r.standard.Id).toBe("01sSTD");
    expect(r.custom?.Id).toBe("01sSCS");
    expect(r.standardAdded).toBe(true);
    expect(r.warnings[0]).toMatch(/added anyway/);
  });

  it("treats an empty config var as Standard only", () => {
    const r = resolvePriceBooks([], [STD]);
    expect(r.custom).toBeNull();
    expect(r.standardAdded).toBe(true);
  });

  it("stops when a listed book is missing", () => {
    expect(() => resolvePriceBooks(["Typo Book"], [STD])).toThrow(
      /Not found in Salesforce: "Typo Book"/,
    );
  });

  it("stops when a listed book is inactive", () => {
    expect(() =>
      resolvePriceBooks([SCS.Name], [STD, { ...SCS, IsActive: false }]),
    ).toThrow(/Inactive in Salesforce/);
  });

  it("stops when more than one custom book is listed", () => {
    expect(() =>
      resolvePriceBooks([SCS.Name, OTHER.Name], [STD, SCS, OTHER]),
    ).toThrow(/Only one custom price book is supported/);
  });

  it("stops when the org has no Standard Price Book", () => {
    expect(() => resolvePriceBooks([SCS.Name], [SCS])).toThrow(
      /No Standard Price Book/,
    );
  });
});

describe("parseListPrice", () => {
  it("keeps 0 and turns blank or unreadable tuition into 0", () => {
    expect(parseListPrice("0")).toBe(0);
    expect(parseListPrice("0.0")).toBe(0);
    expect(parseListPrice("")).toBe(0);
    expect(parseListPrice(undefined)).toBe(0);
    expect(parseListPrice("n/a")).toBe(0);
  });
  it("reads plain and formatted amounts", () => {
    expect(parseListPrice("495")).toBe(495);
    expect(parseListPrice("1250.50")).toBe(1250.5);
    expect(parseListPrice(" $1,250.00 ")).toBe(1250);
  });
});

describe("pricebookEntryKey", () => {
  it("prefixes STD- for Standard and uses Course.ID for the custom book", () => {
    expect(pricebookEntryKey("20241_POL 68 H", true)).toBe(
      "STD-20241_POL 68 H",
    );
    expect(pricebookEntryKey(" 20241_POL 68 H ", false)).toBe("20241_POL 68 H");
  });
});

describe("loadPriceBooks", () => {
  beforeEach(() => jest.resetAllMocks());

  it("queries Standard plus the listed names once, escaping quotes", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { records: [STD, SCS], done: true },
    });
    const books = await loadPriceBooks(
      "https://sf",
      "tok",
      "Standard Price Book, StanfordContinuingStudies Price Book",
      logger,
      "[Test]",
    );
    expect(books.custom?.Id).toBe("01sSCS");
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    const soql = (mockedAxios.get.mock.calls[0][1] as { params: { q: string } })
      .params.q;
    expect(soql).toBe(
      "SELECT Id, Name, IsStandard, IsActive FROM Pricebook2 WHERE IsStandard = true " +
        "OR Name IN ('Standard Price Book','StanfordContinuingStudies Price Book')",
    );
  });

  it("escapes a quote in a book name", async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        records: [STD, { ...SCS, Name: "O'Neil Book" }],
        done: true,
      },
    });
    await loadPriceBooks("https://sf", "tok", "O'Neil Book", logger, "[Test]");
    const soql = (mockedAxios.get.mock.calls[0][1] as { params: { q: string } })
      .params.q;
    expect(soql).toContain("Name IN ('O\\'Neil Book')");
  });
});

describe("saveCoursePricebookEntries", () => {
  const books: ResolvedPriceBooks = {
    standard: STD,
    custom: SCS,
    standardAdded: false,
    warnings: [],
  };
  const products = [
    { sourceId: "20241_POL 68 H", productId: "01tA", unitPrice: 495 },
    { sourceId: "20241_POL 68 Z", productId: "01tB", unitPrice: 0 },
  ];

  beforeEach(() => jest.resetAllMocks());

  /** Echoes success for every record sent; `fail` lists Product2Ids to reject. */
  function okCollections(fail: string[] = []) {
    const respond = (body: { records: Record<string, unknown>[] }) => ({
      data: body.records.map((rec, i) =>
        fail.includes(String(rec.Product2Id))
          ? {
              success: false,
              errors: [
                { statusCode: "FIELD_INTEGRITY_EXCEPTION", message: "bad" },
              ],
            }
          : { success: true, id: String(rec.Id ?? `01uNEW${i}`) },
      ),
    });
    mockedAxios.post.mockImplementation((_u, body) =>
      Promise.resolve(respond(body as { records: Record<string, unknown>[] })),
    );
    mockedAxios.patch.mockImplementation((_u, body) =>
      Promise.resolve(respond(body as { records: Record<string, unknown>[] })),
    );
  }

  it("creates Standard then custom entries with keys, price and IsActive", async () => {
    mockedAxios.get.mockResolvedValue({ data: { records: [], done: true } });
    okCollections();
    const results = await saveCoursePricebookEntries(
      "https://sf",
      "tok",
      books,
      products,
    );

    // Standard insert is sent before the custom insert.
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    const stdBody = mockedAxios.post.mock.calls[0][1] as {
      allOrNone: boolean;
      records: Record<string, unknown>[];
    };
    const scsBody = mockedAxios.post.mock.calls[1][1] as {
      records: Record<string, unknown>[];
    };
    expect(stdBody.allOrNone).toBe(false);
    expect(stdBody.records[0]).toEqual({
      attributes: { type: "PricebookEntry" },
      UnitPrice: 495,
      IsActive: true,
      External_ID_4D__c: "STD-20241_POL 68 H",
      Pricebook2Id: "01sSTD",
      Product2Id: "01tA",
    });
    expect(scsBody.records[1]).toEqual({
      attributes: { type: "PricebookEntry" },
      UnitPrice: 0,
      IsActive: true,
      External_ID_4D__c: "20241_POL 68 Z",
      Pricebook2Id: "01sSCS",
      Product2Id: "01tB",
      UseStandardPrice: false,
    });
    expect(results.map((r) => r.outcome)).toEqual([
      "created",
      "created",
      "created",
      "created",
    ]);
    expect(summarisePricebookEntries(results).text).toBe(
      "Standard 2 ok · Custom 2 ok · 0 skipped · 0 failed",
    );
  });

  it("updates existing entries by Id without sending Product2Id or Pricebook2Id", async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        records: [
          { Id: "01uSTDA", Product2Id: "01tA", Pricebook2Id: "01sSTD" },
          {
            Id: "01uSCSA",
            Product2Id: "01tA",
            Pricebook2Id: "01sSCS",
            External_ID_4D__c: "20241_POL 68 H",
          },
        ],
        done: true,
      },
    });
    okCollections();
    const results = await saveCoursePricebookEntries(
      "https://sf",
      "tok",
      books,
      [products[0]],
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(mockedAxios.patch).toHaveBeenCalledTimes(2);
    const stdUpdate = (
      mockedAxios.patch.mock.calls[0][1] as {
        records: Record<string, unknown>[];
      }
    ).records[0];
    expect(stdUpdate).toEqual({
      attributes: { type: "PricebookEntry" },
      UnitPrice: 495,
      IsActive: true,
      // Filled in on an entry that existed without a key.
      External_ID_4D__c: "STD-20241_POL 68 H",
      Id: "01uSTDA",
    });
    expect(results.map((r) => [r.book, r.outcome, r.sfId])).toEqual([
      ["Standard", "updated", "01uSTDA"],
      ["Custom", "updated", "01uSCSA"],
    ]);
  });

  it("skips the custom entry when the Standard insert fails", async () => {
    mockedAxios.get.mockResolvedValue({ data: { records: [], done: true } });
    okCollections(["01tB"]);
    const results = await saveCoursePricebookEntries(
      "https://sf",
      "tok",
      books,
      products,
    );
    const b = results.filter((r) => r.productId === "01tB");
    expect(b.map((r) => [r.book, r.outcome])).toEqual([
      ["Standard", "failed"],
      ["Custom", "skipped"],
    ]);
    expect(b[0].error).toBe("FIELD_INTEGRITY_EXCEPTION: bad");
    expect(b[1].error).toBe("Skipped – Standard entry failed");
    // Only product A was sent to the custom book.
    const scsBody = mockedAxios.post.mock.calls[1][1] as {
      records: Record<string, unknown>[];
    };
    expect(scsBody.records.map((r) => r.Product2Id)).toEqual(["01tA"]);
    expect(summarisePricebookEntries(results).text).toBe(
      "Standard 1 ok · Custom 1 ok · 1 skipped · 1 failed",
    );
  });

  it("still prices the custom book when a Standard update fails but the entry exists", async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        records: [
          { Id: "01uSTDA", Product2Id: "01tA", Pricebook2Id: "01sSTD" },
        ],
        done: true,
      },
    });
    mockedAxios.patch.mockResolvedValue({
      data: [{ success: false, errors: [{ message: "locked" }] }],
    });
    mockedAxios.post.mockResolvedValue({
      data: [{ success: true, id: "01uNEW" }],
    });
    const results = await saveCoursePricebookEntries(
      "https://sf",
      "tok",
      books,
      [products[0]],
    );
    expect(results.map((r) => [r.book, r.outcome])).toEqual([
      ["Standard", "failed"],
      ["Custom", "created"],
    ]);
  });

  it("only writes Standard entries when no custom book is configured", async () => {
    mockedAxios.get.mockResolvedValue({ data: { records: [], done: true } });
    okCollections();
    const results = await saveCoursePricebookEntries(
      "https://sf",
      "tok",
      { ...books, custom: null },
      products,
    );
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.book === "Standard")).toBe(true);
  });

  it("sends one entry per Product when a Course.ID repeats in the window", async () => {
    mockedAxios.get.mockResolvedValue({ data: { records: [], done: true } });
    okCollections();
    await saveCoursePricebookEntries("https://sf", "tok", books, [
      products[0],
      { ...products[0], unitPrice: 600 },
    ]);
    const stdBody = mockedAxios.post.mock.calls[0][1] as {
      records: Record<string, unknown>[];
    };
    expect(stdBody.records).toHaveLength(1);
    expect(stdBody.records[0].UnitPrice).toBe(600);
  });

  it("reports every entry as failed when the lookup query fails", async () => {
    mockedAxios.get.mockRejectedValue({
      response: { status: 400, data: [{ errorCode: "INVALID_FIELD" }] },
    });
    const results = await saveCoursePricebookEntries(
      "https://sf",
      "tok",
      books,
      products,
    );
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.outcome === "failed")).toBe(true);
    expect(results[0].error).toMatch(
      /Could not read existing PricebookEntry rows: HTTP 400/,
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("does nothing for an empty window", async () => {
    expect(
      await saveCoursePricebookEntries("https://sf", "tok", books, []),
    ).toEqual([]);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});
