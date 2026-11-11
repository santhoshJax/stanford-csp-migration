/**
 * Unit tests for the Purchase Build Brief (D01, 2026-11-11) changes:
 *   C1 Check_Amt → Order.Check_Amount__c
 *   C2 OrderItem.Type = "Order Product"
 *   C3 case-insensitive product match + active-entry filter
 *   C4 PricebookEntry upsert keys (STD-{ID} / {ID}), file prices overwrite
 *   C5 one results tab pair per price book (+ CSV merge, key backfill)
 *   C6 TEST_MODE off in Purchase + Purchase Item
 * No network — axios is mocked where a helper calls Salesforce.
 */
import axios from "axios";
import {
  mapToCardPaymentMethod,
  mapToOrder,
  TEST_MODE as PURCHASE_TEST_MODE,
} from "./purchaseFlow";
import {
  buildPricebookEntryNameMap,
  DEFAULT_ORDER_ITEM_TYPE,
  mapToOrderItem,
  newSkips,
  normalizeProductName,
  pricebookEntryCacheSoql,
  TEST_MODE as PURCHASE_ITEM_TEST_MODE,
} from "./purchaseItemFlow";
import {
  applyBackfillFailures,
  assertSupportedPricebooks,
  planPricebookEntries,
  pricebookEntryExtId,
  pricebookResultObjectName,
  type ExistingPricebookEntry,
  type InventoryPriceInput,
} from "./purchaseInventoryFlow";
import { mergeResultCsvs, updateViaComposite } from "./commerceShared";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const STD = { id: "01sSTD", name: "Standard Price Book", isStandard: true };
const CSP = {
  id: "01sCSP",
  name: "StanfordContinuingStudies Price Book",
  isStandard: false,
};

// ── C1 ───────────────────────────────────────────────────────────────────────
describe("C1 — Check_Amt → Order.Check_Amount__c", () => {
  const row = { ID: "5", Purchase_Date: "6/6/2026" };
  it("writes a parsed Check_Amt", () => {
    expect(mapToOrder({ ...row, Check_Amt: "125.50" }, "01s")).toMatchObject({
      Check_Amount__c: 125.5,
    });
  });
  it("writes a zero Check_Amt (0 is a value, not blank)", () => {
    expect(mapToOrder({ ...row, Check_Amt: "0" }, "01s")).toMatchObject({
      Check_Amount__c: 0,
    });
  });
  it.each(["", "   ", "n/a", undefined])(
    "leaves Check_Amount__c unset for %p",
    (v) => {
      expect(mapToOrder({ ...row, Check_Amt: v }, "01s")).not.toHaveProperty(
        "Check_Amount__c",
      );
    },
  );
});

// ── C2 + C3 ──────────────────────────────────────────────────────────────────
describe("C2 — OrderItem.Type", () => {
  const caches = {
    pricebookEntryByProductName: buildPricebookEntryNameMap([
      { Id: "01uT", Product2: { Name: "Transcript" } },
    ]).map,
    existingOrderExtIds: new Set(["PUR-1"]),
  };
  const row = {
    ID: "9",
    Purchase_ID: "1",
    Item_Type: "Transcript",
    "Item_Type (classification)": "Transcript",
    Unit_Price: "10",
    Quantity: "1",
  };
  it('writes Type "Order Product" on every line', () => {
    expect(DEFAULT_ORDER_ITEM_TYPE).toBe("Order Product");
    expect(mapToOrderItem(row, caches, newSkips(), logger)).toMatchObject({
      Type: "Order Product",
    });
  });
  it("never writes the source classification into Type", () => {
    const item = mapToOrderItem(
      { ...row, "Item_Type (classification)": "Manuscript" },
      caches,
      newSkips(),
      logger,
    );
    expect(item?.Type).toBe("Order Product");
  });
});

describe("C3 — case-insensitive product match, active entries only", () => {
  it("normalises names: trim + lower case", () => {
    expect(normalizeProductName("  Manuscript_Surcharge ")).toBe(
      "manuscript_surcharge",
    );
    expect(normalizeProductName(undefined)).toBe("");
    expect(normalizeProductName(null)).toBe("");
  });
  it("builds the cache with normalised keys, first entry wins, clash reported", () => {
    const { map, duplicates } = buildPricebookEntryNameMap([
      { Id: "01u1", Product2: { Name: "Transcript" } },
      { Id: "01u2", Product2: { Name: "TRANSCRIPT" } },
      { Id: "01u3", Product2: null },
      { Id: "01u4", Product2: { Name: "Course Drop" } },
    ]);
    expect(map.get("transcript")).toBe("01u1");
    expect(map.get("course drop")).toBe("01u4");
    expect(map.size).toBe(2);
    expect(duplicates).toEqual(["TRANSCRIPT"]);
  });
  it.each(["Transcript", "transcript", "  TRANSCRIPT  ", "TrAnScRiPt"])(
    "matches Item_Type %p to the Transcript entry",
    (itemType) => {
      const caches = {
        pricebookEntryByProductName: buildPricebookEntryNameMap([
          { Id: "01uT", Product2: { Name: "Transcript" } },
        ]).map,
        existingOrderExtIds: new Set(["PUR-1"]),
      };
      const item = mapToOrderItem(
        {
          ID: "1",
          Purchase_ID: "1",
          Item_Type: itemType,
          Unit_Price: "5",
          Quantity: "1",
        },
        caches,
        newSkips(),
        logger,
      );
      expect(item?.PricebookEntryId).toBe("01uT");
    },
  );
  it("still skips a name that does not exist in any case", () => {
    const skips = newSkips();
    const caches = {
      pricebookEntryByProductName: buildPricebookEntryNameMap([
        { Id: "01uT", Product2: { Name: "Transcript" } },
      ]).map,
      existingOrderExtIds: new Set(["PUR-1"]),
    };
    expect(
      mapToOrderItem(
        {
          ID: "1",
          Purchase_ID: "1",
          Item_Type: "Nope",
          Unit_Price: "5",
          Quantity: "1",
        },
        caches,
        skips,
        logger,
      ),
    ).toBeNull();
    expect(skips.records[0].reason).toContain("case-insensitive");
  });
  it("queries active entries on migrated products in the order price book", () => {
    const soql = pricebookEntryCacheSoql("01sCSP");
    expect(soql).toContain("Pricebook2Id = '01sCSP'");
    expect(soql).toContain("IsActive = true");
    expect(soql).toContain("Product2.External_ID_4D__c != null");
  });
});

// ── C4 ───────────────────────────────────────────────────────────────────────
describe("C4 — PricebookEntry keys and upsert plan", () => {
  it("keys Standard entries STD-{ID} and custom entries {ID}", () => {
    expect(pricebookEntryExtId(STD, "3")).toBe("STD-3");
    expect(pricebookEntryExtId(CSP, "3")).toBe("3");
  });
  it("allows Standard + one custom book, refuses two custom books", () => {
    expect(() => assertSupportedPricebooks([STD])).not.toThrow();
    expect(() => assertSupportedPricebooks([STD, CSP])).not.toThrow();
    expect(() =>
      assertSupportedPricebooks([
        STD,
        CSP,
        { name: "Other", isStandard: false },
      ]),
    ).toThrow(/one custom price book/);
  });

  const input = (
    extId: string,
    over: Partial<InventoryPriceInput> = {},
  ): InventoryPriceInput => ({
    extId,
    product2Id: `01t${extId}`,
    unitPrice: 10,
    isActive: true,
    ...over,
  });
  const entry = (
    over: Partial<ExistingPricebookEntry>,
  ): ExistingPricebookEntry => ({
    Id: "01uX",
    Pricebook2Id: STD.id,
    Product2Id: "01t1",
    External_ID_4D__c: null,
    ...over,
  });

  it("creates a new entry with all fields, keyed for the book", () => {
    const plan = planPricebookEntries(STD, [input("1")], []);
    expect(plan.toCreate).toEqual([
      {
        External_ID_4D__c: "STD-1",
        Pricebook2Id: STD.id,
        Product2Id: "01t1",
        UnitPrice: 10,
        IsActive: true,
      },
    ]);
    expect(plan.toUpdate).toHaveLength(0);
    const custom = planPricebookEntries(CSP, [input("1")], []);
    expect(custom.toCreate[0]).toMatchObject({
      External_ID_4D__c: "1",
      Pricebook2Id: CSP.id,
    });
  });

  it("updates an existing keyed entry with the FILE price — never Pricebook2Id/Product2Id", () => {
    const plan = planPricebookEntries(
      STD,
      [input("1", { unitPrice: 42, isActive: false })],
      [entry({ External_ID_4D__c: "STD-1" })],
    );
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate).toEqual([
      { External_ID_4D__c: "STD-1", UnitPrice: 42, IsActive: false },
    ]);
    expect(plan.toUpdate[0]).not.toHaveProperty("Pricebook2Id");
    expect(plan.toUpdate[0]).not.toHaveProperty("Product2Id");
  });

  it("backfills the key on a pre-D01 entry, then updates it", () => {
    const plan = planPricebookEntries(STD, [input("1")], [entry({})]);
    expect(plan.toBackfill).toEqual([
      {
        attributes: { type: "PricebookEntry" },
        Id: "01uX",
        External_ID_4D__c: "STD-1",
      },
    ]);
    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.toCreate).toHaveLength(0);
  });

  it("does not overwrite an existing entry that carries a different key", () => {
    const plan = planPricebookEntries(
      STD,
      [input("1")],
      [entry({ External_ID_4D__c: "SOMETHING-ELSE" })],
    );
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.toBackfill).toHaveLength(0);
    expect(plan.skipped[0].reason).toContain("SOMETHING-ELSE");
  });

  it("skips a create whose key is already on another entry", () => {
    const plan = planPricebookEntries(
      CSP,
      [input("1")],
      [
        entry({
          Id: "01uOther",
          Pricebook2Id: "01sElse",
          Product2Id: "01tCourse",
          External_ID_4D__c: "1",
        }),
      ],
    );
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.skipped[0].reason).toContain("01uOther");
  });

  it("skips a backfill when the key is already held by another entry", () => {
    const plan = planPricebookEntries(
      STD,
      [input("1")],
      [
        entry({}),
        entry({
          Id: "01uHolder",
          Product2Id: "01t999",
          External_ID_4D__c: "STD-1",
        }),
      ],
    );
    expect(plan.toBackfill).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.skipped[0].reason).toContain("01uHolder");
  });

  it("skips an item with no parseable Unit_Price", () => {
    const plan = planPricebookEntries(
      STD,
      [input("1", { unitPrice: undefined })],
      [],
    );
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.skipped[0].reason).toContain("Unit_Price");
  });

  it("ignores entries for the same product in OTHER price books", () => {
    const plan = planPricebookEntries(
      CSP,
      [input("1")],
      [entry({ Pricebook2Id: STD.id, External_ID_4D__c: "STD-1" })],
    );
    expect(plan.toCreate).toHaveLength(1);
  });

  it("drops updates whose key backfill failed and reports them", () => {
    const plan = planPricebookEntries(
      STD,
      [input("1"), input("2")],
      [
        entry({ Id: "01uA", Product2Id: "01t1" }),
        entry({ Id: "01uB", Product2Id: "01t2" }),
      ],
    );
    applyBackfillFailures(plan, new Map([["01uB", "FIELD_INTEGRITY"]]));
    expect(plan.toUpdate.map((u) => u.External_ID_4D__c)).toEqual(["STD-1"]);
    expect(plan.skipped).toEqual([
      expect.objectContaining({
        extId: "2",
        reason: expect.stringContaining("FIELD_INTEGRITY"),
      }),
    ]);
  });
});

// ── C5 ───────────────────────────────────────────────────────────────────────
describe("C5 — results tabs per price book", () => {
  it("names one object (tab pair) per book, tab-safe", () => {
    expect(pricebookResultObjectName(STD)).toBe(
      "PricebookEntry Standard Price Book",
    );
    expect(pricebookResultObjectName(CSP)).toBe(
      "PricebookEntry StanfordContinuingStudies Price Book",
    );
    expect(pricebookResultObjectName({ name: "Fees: 2026 (CSP)!" })).toBe(
      "PricebookEntry Fees 2026 CSP",
    );
    expect(pricebookResultObjectName({ name: "!!!" })).toBe(
      "PricebookEntry Price Book",
    );
  });
  it("merges create + update result CSVs over the union of columns", () => {
    const created =
      "sf__Id,sf__Created,External_ID_4D__c,Pricebook2Id,Product2Id,UnitPrice\n" +
      "01u1,true,STD-1,01sSTD,01t1,10";
    const updated =
      "sf__Id,sf__Created,External_ID_4D__c,UnitPrice,IsActive\n" +
      "01u2,false,STD-2,20,true";
    const merged = mergeResultCsvs(created, updated).split(/\r?\n/);
    expect(merged[0]).toBe(
      "sf__Id,sf__Created,External_ID_4D__c,Pricebook2Id,Product2Id,UnitPrice,IsActive",
    );
    expect(merged[1]).toBe("01u1,true,STD-1,01sSTD,01t1,10,");
    expect(merged[2]).toBe("01u2,false,STD-2,,,20,true");
  });
  it("returns blank or the single non-blank CSV unchanged", () => {
    expect(mergeResultCsvs("", "  ")).toBe("");
    expect(mergeResultCsvs("", "a,b\n1,2")).toBe("a,b\n1,2");
  });
  it("updateViaComposite PATCHes by Id and reports each outcome", async () => {
    mockedAxios.patch.mockResolvedValueOnce({
      data: [
        { id: "01uA", success: true },
        { success: false, errors: [{ message: "DUPLICATE_VALUE" }] },
      ],
    });
    const outcomes = await updateViaComposite(
      [
        { attributes: { type: "PricebookEntry" }, Id: "01uA" },
        { attributes: { type: "PricebookEntry" }, Id: "01uB" },
      ],
      "https://x.my.salesforce.com",
      "tok",
      logger,
      "[t]",
    );
    const [url, body] = mockedAxios.patch.mock.calls[0];
    expect(url).toContain("/composite/sobjects");
    expect(body).toMatchObject({ allOrNone: false });
    expect(outcomes).toEqual([
      { id: "01uA", success: true },
      { id: "01uB", success: false, error: "DUPLICATE_VALUE" },
    ]);
  });
});

// ── C6 ───────────────────────────────────────────────────────────────────────
describe("C6 — TEST_MODE off", () => {
  it("Purchase Import processes the full file", () => {
    expect(PURCHASE_TEST_MODE).toBe(false);
  });
  it("Purchase Item Import processes the full file", () => {
    expect(PURCHASE_ITEM_TEST_MODE).toBe(false);
  });
});

// ── CardPaymentMethod.GatewayDate is DateTime ────────────────────────────────
describe("CardPaymentMethod.GatewayDate", () => {
  const card = { ID: "9001", CC_Card_Type: "Visa", CC_Last_Four: "1234" };

  it("sends a full ISO DateTime, not a bare date (UAT xsd:dateTime error)", () => {
    const rec = mapToCardPaymentMethod({
      ...card,
      CC_Transaction_ID_Date_Entered: "10/14/2024",
    } as never);
    expect(rec?.GatewayDate).toBe("2024-10-14T00:00:00.000Z");
  });

  it("leaves GatewayDate unset when the source date is blank", () => {
    const rec = mapToCardPaymentMethod({
      ...card,
      CC_Transaction_ID_Date_Entered: "",
    } as never);
    expect(rec).not.toBeNull();
    expect(rec).not.toHaveProperty("GatewayDate");
  });
});
