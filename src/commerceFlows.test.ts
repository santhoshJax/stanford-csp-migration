/**
 * Unit tests for the pure mapping functions of the commerce flows
 * (Purchase Inventory, Purchase, Purchase Item, Payments). No network.
 */
import {
  parseDateTime4D,
  parseExpiry,
  mapCardType,
  COMMERCE_TWO_YEAR_CUTOFF,
  pricebooksInLoadOrder,
  orderPricebook,
  registrationExtId,
  paymentToRefund,
  ORDER_FLOWS_CREATE_PAYMENTS,
} from "./commerceShared";
import {
  mapToCardPaymentMethod as mapRegistrationCpm,
  mapToOrder as mapRegistrationOrder,
  mapToRegistrationFeeItem,
  mapToPayment as mapRegistrationPayment,
} from "./registrationFlow";
import { parsePriceBookNames, resolvePriceBooks } from "./courseUtils";
import { mapToProduct2 } from "./purchaseInventoryFlow";
import {
  mapToOrder,
  mapToPayment as mapPurchasePayment,
  mapToCardPaymentMethod,
  planOrderActivation,
} from "./purchaseFlow";
import { mapToOrderItem, newSkips } from "./purchaseItemFlow";
import {
  mapToPayment,
  newPaymentSkips,
  mapToRefund,
  mapToRefundLinePayment,
} from "./paymentsFlow";

const logger = { warn: jest.fn() };

describe("commerceShared", () => {
  it("unpacks CC_Exp_Date", () => {
    expect(parseExpiry("610")).toEqual({ month: 6, year: 2010 });
    expect(parseExpiry("1020")).toEqual({ month: 10, year: 2020 });
    // Sample registration 592436117: "0330" → March 2030, not year 30.
    expect(parseExpiry("0330")).toEqual({ month: 3, year: 2030 });
    expect(parseExpiry("1")).toBeUndefined();
    expect(parseExpiry("1320")).toBeUndefined();
  });
  it("translates CC_Card_Type to the CardType picklist", () => {
    expect(mapCardType("Visa")).toBe("Visa");
    expect(mapCardType("MC")).toBe("Master Card");
    expect(mapCardType("MasterCard")).toBe("Master Card");
    expect(mapCardType("AmEx")).toBe("American Express");
    expect(mapCardType("AMEX")).toBe("American Express");
    expect(mapCardType("American Express")).toBe("American Express");
    expect(mapCardType("Discover")).toBeUndefined();
    expect(mapCardType("")).toBeUndefined();
  });
  it("parses 4D YYYYMMDDHHMMSS", () => {
    expect(parseDateTime4D("20250102030405")).toBe("2025-01-02T03:04:05.000Z");
    expect(parseDateTime4D("2.01E+13")).toBeNull();
    expect(parseDateTime4D("")).toBeNull();
  });
});

describe("Price Books config var (shared with the course flows)", () => {
  // Pricebook2 rows as the SOQL query in resolveConfiguredPricebooks returns them.
  const standard = {
    Id: "01sSTD",
    Name: "Standard Price Book",
    IsStandard: true,
    IsActive: true,
  };
  const scs = {
    Id: "01sSCS",
    Name: "StanfordContinuingStudies Price Book",
    IsStandard: false,
    IsActive: true,
  };
  const load = (names: string[], found: (typeof standard)[]) =>
    pricebooksInLoadOrder(resolvePriceBooks(names, found));

  it("loads Standard first, then the custom book, matching names case-insensitively", () => {
    const books = load(
      parsePriceBookNames(
        " stanfordcontinuingstudies price book , Standard Price Book,,standard price book ",
      ),
      [scs, standard],
    );
    expect(books.map((b) => b.id)).toEqual(["01sSTD", "01sSCS"]);
    expect(books[0].isStandard).toBe(true);
    expect(books[1].isStandard).toBe(false);
  });
  it("adds the Standard Price Book even when the config leaves it out", () => {
    const books = load(
      ["StanfordContinuingStudies Price Book"],
      [standard, scs],
    );
    expect(books.map((b) => b.name)).toEqual([
      "Standard Price Book",
      "StanfordContinuingStudies Price Book",
    ]);
  });
  it("loads only the Standard Price Book when the config is blank", () => {
    const books = load(parsePriceBookNames(""), [standard]);
    expect(books.map((b) => b.id)).toEqual(["01sSTD"]);
  });
  it("stops on a name that matches no price book", () => {
    expect(() =>
      load(["Standard Price Book", "Typo Book"], [standard]),
    ).toThrow(/Not found in Salesforce: "Typo Book"/);
  });
  it("stops on an inactive price book", () => {
    expect(() =>
      load(
        ["StanfordContinuingStudies Price Book"],
        [standard, { ...scs, IsActive: false }],
      ),
    ).toThrow(/Inactive in Salesforce: "StanfordContinuingStudies Price Book"/);
  });
  it("puts Orders in the custom book, or Standard when there is none", () => {
    expect(
      orderPricebook(
        load(
          ["Standard Price Book", "StanfordContinuingStudies Price Book"],
          [standard, scs],
        ),
      ).id,
    ).toBe("01sSCS");
    expect(orderPricebook(load(["Standard Price Book"], [standard])).id).toBe(
      "01sSTD",
    );
  });
});

describe("Purchase Inventory → Product2", () => {
  it("maps name/code/active and gates the unit picklist", () => {
    const p = mapToProduct2(
      {
        ID: "1",
        Item_Type: "Manuscript_Surcharge",
        Description: "Surcharge",
        Unit_Description: "per 1,000 words",
        Active: "TRUE",
      },
      logger,
    );
    expect(p).toMatchObject({
      External_ID_4D__c: "1",
      Name: "Manuscript_Surcharge",
      ProductCode: "Manuscript_Surcharge",
      IsActive: true,
      QuantityUnitOfMeasure: "per 1,000 words",
    });
  });
  it.each([
    "Each",
    "per 1,000 words",
    "per application cycle",
    "First one is free, $10 charged for each additional",
    "per course",
  ])("writes the source unit %p", (unit) => {
    const p = mapToProduct2(
      { ID: "3", Item_Type: "X", Unit_Description: unit },
      logger,
    );
    expect(p?.QuantityUnitOfMeasure).toBe(unit);
  });
  it("leaves an unknown unit blank", () => {
    const p = mapToProduct2(
      { ID: "4", Item_Type: "X", Unit_Description: "per page" },
      logger,
    );
    expect(p).not.toHaveProperty("QuantityUnitOfMeasure");
  });
  it("skips a row with no Item_Type", () => {
    expect(mapToProduct2({ ID: "2" }, logger)).toBeNull();
  });
});

describe("Purchase → Order / Payment / CardPaymentMethod", () => {
  const row = {
    ID: "2",
    Student_ID: "90475274",
    Purchase_Date: "6/6/2026",
    Status: "Paid",
    Notes: "n",
    Message: "m",
    CC_Last_Four: "224",
    CC_Exp_Date: "1020",
    CC_Card_Type: "MC",
    CC_Amt: "200",
    CC_Transaction_ID: "36100405",
    Balance_Due: "0",
  };
  it("prefixes ext ids, forces Draft, joins Notes+Message, sets the pricebook", () => {
    const o = mapToOrder(row, "01s000000000001");
    expect(o).toMatchObject({
      External_ID_4D__c: "PUR-2",
      Status: "Draft",
      EffectiveDate: "2026-06-06",
      Pricebook2Id: "01s000000000001",
      Description: "n\n\nm",
      BalanceDue__c: 0,
      "Account.Student_ID_4D__c": "90475274",
    });
    expect(o).not.toHaveProperty("TotalAmount");
  });
  it("does not write the old Balance_Due__c field", () => {
    expect(mapToOrder(row, "x")).not.toHaveProperty("Balance_Due__c");
  });
  it("skips an Order with no Purchase_Date", () => {
    expect(mapToOrder({ ...row, Purchase_Date: "" }, "x")).toBeNull();
  });
  it("maps the card and a Capture payment", () => {
    expect(mapToCardPaymentMethod(row)).toMatchObject({
      External_ID_4D__c: "PUR-2",
      ExpiryMonth: 10,
      ExpiryYear: 2020,
      CardLastFour: 224,
    });
    expect(mapPurchasePayment(row, logger)).toMatchObject({
      External_ID_4D__c: "PUR-2",
      Type: "Capture",
      Amount: 200,
    });
    expect(mapPurchasePayment({ ...row, CC_Amt: "0" }, logger)).toBeNull();
  });
  it("translates MC and leaves an unknown card brand blank, counting it", () => {
    expect(
      mapToCardPaymentMethod({ ...row, CC_Card_Type: "MC" }),
    ).toMatchObject({
      CardType: "Master Card",
    });
    const unknown = new Map<string, number>();
    const cpm = mapToCardPaymentMethod(
      { ...row, CC_Card_Type: "Discover" },
      unknown,
    );
    expect(cpm).not.toHaveProperty("CardType");
    expect(unknown.get("Discover")).toBe(1);
  });
});

describe("Purchase Item → OrderItem", () => {
  const caches = {
    pricebookEntryByProductName: new Map([["Transcript", "01u000000000001"]]),
    existingOrderExtIds: new Set(["PUR-68"]),
  };
  const row = {
    ID: "101",
    Purchase_ID: "68",
    Item_Type: "Transcript",
    Unit_Price: "10",
    Quantity: "2",
    Extended_Amount: "20",
    Description: "Transcript fee",
    Unit_Description: "each",
    Ref_Record_ID: "15182",
  };
  it("maps a line and never writes TotalAmount/TotalPrice", () => {
    const skips = newSkips();
    const i = mapToOrderItem(row, caches, skips, logger);
    expect(i).toMatchObject({
      External_ID_4D__c: "PIT-101",
      "Order.External_ID_4D__c": "PUR-68",
      PricebookEntryId: "01u000000000001",
      UnitPrice: 10,
      Quantity: 2,
      Unit_Description__c: "each",
      Ref_Record_ID__c: "15182",
    });
    expect(i).not.toHaveProperty("TotalPrice");
  });
  it("skips lines whose Order or product is missing", () => {
    const skips = newSkips();
    expect(
      mapToOrderItem({ ...row, Purchase_ID: "999" }, caches, skips, logger),
    ).toBeNull();
    expect(
      mapToOrderItem({ ...row, Item_Type: "Nope" }, caches, skips, logger),
    ).toBeNull();
    expect(skips.orderNotLoaded).toBe(1);
    expect(skips.unmatchedProducts.get("Nope")).toBe(1);
  });
  it("records each skipped row with its reason for the Skipped tab", () => {
    const skips = newSkips();
    const run = (o: Record<string, string>) =>
      mapToOrderItem({ ...row, ...o }, caches, skips, logger);
    run({ ID: "" });
    run({ Purchase_ID: "0" });
    run({ Purchase_ID: "999" });
    run({ Item_Type: "Nope" });
    run({ Quantity: "0" });
    run({ Unit_Price: "abc" });
    run({}); // sent — not recorded
    expect(skips.records).toHaveLength(6);
    expect(skips.records.map((r) => r.reason)).toEqual([
      "No Purchase Item ID",
      "No Purchase_ID",
      expect.stringContaining("PUR-999"),
      expect.stringContaining('"Nope"'),
      expect.stringContaining("Quantity"),
      expect.stringContaining("Unit_Price"),
    ]);
    expect(skips.records[2].row.Purchase_ID).toBe("999");
    expect(skips).toMatchObject({ noId: 1, badQuantity: 1, badUnitPrice: 1 });
  });
});

describe("Registration Import — REG- external ids", () => {
  const row = {
    ID: "560585",
    CC_Card_Type: "Visa",
    CC_Last_Four: "1111",
    CC_Exp_Date: "12/27",
    CC_Amt: "510",
  };
  it("builds REG-{id}", () => {
    expect(registrationExtId("560585")).toBe("REG-560585");
  });
  it("writes REG-{Registration.ID} on CardPaymentMethod, Order and Payment", () => {
    expect(mapRegistrationCpm(row)?.External_ID_4D__c).toBe("REG-560585");
    expect(
      mapRegistrationOrder(row, logger, "01s000000000001")?.External_ID_4D__c,
    ).toBe("REG-560585");
    expect(mapRegistrationPayment(row, logger)?.External_ID_4D__c).toBe(
      "REG-560585",
    );
  });
});

describe("Payments → Payment / Refund", () => {
  // PaymentGroups in the org carry the REG- key; the Payments row has the raw id.
  const groups = new Set(["REG-560585"]);
  const row = {
    ID: "1",
    Student_ID: "90471855",
    Registration_ID: "560585",
    Transcript_Request_ID: "0",
    Payment_Sub_Type: "STAP",
    Payment_Source: "HOP",
    Transaction_No: "3872081732170178147362",
    Sales_Amount: "510",
    Date_Time_New: "20260102030405",
    Refund_Amount: "25",
  };
  it("maps through the PaymentGroup, sets STAP_Amount__c and a refund amount", () => {
    const skips = newPaymentSkips();
    const m = mapToPayment(row, groups, skips, logger, "load");
    expect(m?.payment).toMatchObject({
      External_ID_4D__c: "PAY-1",
      "PaymentGroup.External_ID_4D__c": "REG-560585",
      STAP_Amount__c: 510,
      Payment_Source__c: "HOP",
      Amount: 510,
    });
    expect(m?.payment).not.toHaveProperty(
      "Transcript_Request__r.External_ID_4D__c",
    );
    expect(m?.refundAmount).toBe(25);
    expect(mapToRefund(m!.payment, 25)).toMatchObject({
      "PaymentGroup.External_ID_4D__c": "REG-560585",
    });
  });
  it("does not match a PaymentGroup keyed with the raw (unprefixed) Registration id", () => {
    const s = newPaymentSkips();
    const m = mapToPayment(row, new Set(["560585"]), s, logger, "load");
    expect(m?.payment).not.toHaveProperty("PaymentGroup.External_ID_4D__c");
    expect(s.registrationPaymentGroupMissing).toBe(1);
  });
  it("applies scope, missing-group, and skip-mode rules", () => {
    const s1 = newPaymentSkips();
    expect(
      mapToPayment(
        { ...row, Date_Time_New: "20200101000000" },
        groups,
        s1,
        logger,
        "load",
      ),
    ).toBeNull();
    expect(s1.outOfScope).toBe(1);
    const s2 = newPaymentSkips();
    const unlinked = mapToPayment(
      { ...row, Registration_ID: "1" },
      groups,
      s2,
      logger,
      "load",
    );
    // Registration not in Salesforce: payment still loads, without the link.
    expect(unlinked?.payment).toMatchObject({
      External_ID_4D__c: "PAY-1",
      Amount: 510,
      "Account.Student_ID_4D__c": "90471855",
    });
    expect(unlinked?.payment).not.toHaveProperty(
      "PaymentGroup.External_ID_4D__c",
    );
    expect(s2.registrationPaymentGroupMissing).toBe(1);
    const s3 = newPaymentSkips();
    expect(mapToPayment(row, groups, s3, logger, "skip")).toBeNull();
    expect(s3.skippedRegistrationLinked).toBe(1);
  });
  it("loads a non-registration payment in skip mode and builds a Referenced refund", () => {
    const s = newPaymentSkips();
    const m = mapToPayment(
      { ...row, Registration_ID: "0" },
      groups,
      s,
      logger,
      "skip",
    );
    expect(m?.payment).not.toHaveProperty("PaymentGroup.External_ID_4D__c");
    const refund = mapToRefund(m!.payment, 25);
    expect(refund).toMatchObject({
      External_ID_4D__c: "PAY-1",
      Type: "Referenced",
      Status: "Processed",
      ProcessingMode: "External",
      Amount: 25,
      "Account.Student_ID_4D__c": "90471855",
      Date: "2026-01-02T03:04:05.000Z",
    });
    // Refund has no PaymentId — the link is a RefundLinePayment.
    expect(refund).not.toHaveProperty("PaymentId");
    expect(refund).not.toHaveProperty("PaymentGroup.External_ID_4D__c");
    expect(
      mapToRefundLinePayment("0nr000000000001", "0pa000000000001", 25),
    ).toEqual({
      attributes: { type: "RefundLinePayment" },
      RefundId: "0nr000000000001",
      PaymentId: "0pa000000000001",
      Amount: 25,
      Type: "Applied",
    });
    expect(COMMERCE_TWO_YEAR_CUTOFF).toBe("2024-10-06");
  });
});

describe("Purchase → Order activation (2 rounds)", () => {
  const order = (n: string) => ({
    External_ID_4D__c: `PUR-${n}`,
    Status: "Draft",
    Pricebook2Id: "01s",
  });
  const existing = new Map([
    [
      "PUR-2",
      { id: "801A", status: "Draft", hasItems: true, discountType: null },
    ],
    [
      "PUR-3",
      { id: "801B", status: "Draft", hasItems: false, discountType: null },
    ],
    [
      "PUR-4",
      { id: "801C", status: "Activated", hasItems: true, discountType: null },
    ],
  ]);
  const orders = ["1", "2", "3", "4"].map(order);

  it("round 1: new + Draft orders sent as Draft, Activated skipped", () => {
    const plan = planOrderActivation(orders, existing, false);
    expect(plan.toUpsert.map((o) => o.External_ID_4D__c)).toEqual([
      "PUR-1",
      "PUR-2",
      "PUR-3",
    ]);
    expect(plan.toUpsert.every((o) => o.Status === "Draft")).toBe(true);
    expect(plan.activating).toBe(0);
    expect([...plan.alreadyActivated.keys()]).toEqual(["PUR-4"]);
  });

  it("round 2: Draft with items → Activated only; Draft without items left; new created Draft", () => {
    const plan = planOrderActivation(orders, existing, true);
    expect(plan.toUpsert).toEqual([
      order("1"),
      { External_ID_4D__c: "PUR-2", Status: "Activated" },
    ]);
    expect(plan.activating).toBe(1);
    expect(plan.draftWithoutItems).toEqual(["PUR-3"]);
    expect(plan.alreadyActivated.get("PUR-4")).toBe("801C");
  });
});

describe("Card last four (Number(4,0) in the org, 2026-11-04)", () => {
  it("is sent as a number, so a leading zero is not kept", () => {
    expect(
      mapRegistrationCpm({ ID: "592436050", CC_Last_Four: "0418" }),
    ).toMatchObject({ CardLastFour: 418 });
  });
});

describe("Card brand + expiry year (UAT picklist, 2026-11-05)", () => {
  it("maps sample registration 592436117 (Visa, 0330)", () => {
    expect(
      mapRegistrationCpm({
        ID: "592436117",
        CC_Card_Type: "Visa",
        CC_Exp_Date: "0330",
        CC_Last_Four: "6346",
      }),
    ).toMatchObject({
      CardType: "Visa",
      ExpiryMonth: 3,
      ExpiryYear: 2030,
      CardLastFour: 6346,
    });
  });
  it("translates AmEx and counts an unknown brand", () => {
    expect(
      mapRegistrationCpm({ ID: "1", CC_Card_Type: "AmEx", CC_Last_Four: "1" }),
    ).toMatchObject({ CardType: "American Express" });
    const unknown = new Map<string, number>();
    const cpm = mapRegistrationCpm(
      { ID: "2", CC_Card_Type: "Discover", CC_Last_Four: "1" },
      unknown,
    );
    expect(cpm).not.toHaveProperty("CardType");
    expect(unknown.get("Discover")).toBe(1);
  });
});

describe("Negative CC_Amt → Refund (2026-11-04)", () => {
  it("turns a negative Registration payment into an Unreferenced Refund", () => {
    const payment = mapRegistrationPayment(
      {
        ID: "592436039",
        Student_ID: "90962958",
        CC_Amt: "-165",
        CC_Transaction_ID_Date_Entered: "3/30/2026",
      },
      logger,
    );
    expect(payment?.Amount).toBe(-165);
    expect(paymentToRefund(payment!)).toEqual({
      External_ID_4D__c: "REG-592436039",
      Type: "Unreferenced",
      Status: "Processed",
      ProcessingMode: "External",
      Amount: 165,
      "Account.Student_ID_4D__c": "90962958",
      EffectiveDate: "2026-03-30",
    });
  });
  it("does the same for a negative Purchase payment", () => {
    const payment = mapPurchasePayment({ ID: "7", CC_Amt: "-20" }, logger);
    expect(paymentToRefund(payment!)).toMatchObject({
      External_ID_4D__c: "PUR-7",
      Type: "Unreferenced",
      Amount: 20,
    });
  });
});

describe("Registration Import — registration fee OrderItem", () => {
  const log = { warn: jest.fn() };
  const reg = (o: Record<string, string>) =>
    mapRegistrationOrder(
      {
        Student_ID: "91062806",
        Registration_Date: "3/16/2026",
        ...o,
      },
      log,
      "01sORDERBOOK",
    )!;

  it("adds a $35 fee line to registration 592434586 (610 course + 35 fee = 645)", () => {
    const order = reg({
      ID: "592434586",
      Reg_Fee: "35",
      Courses_Subtotal: "610",
    });
    expect(mapToRegistrationFeeItem(order, "01uFEE")).toEqual({
      External_ID_4D__c: "FEE-592434586",
      "Order.External_ID_4D__c": "REG-592434586",
      PricebookEntryId: "01uFEE",
      UnitPrice: 35,
      Quantity: 1,
      Type: "Order Product",
      "Student__r.Student_ID_4D__c": "91062806",
    });
  });

  it("creates no fee line when Reg_Fee is 0 or blank (drop 592436118)", () => {
    expect(
      mapToRegistrationFeeItem(
        reg({ ID: "592436118", Reg_Fee: "0" }),
        "01uFEE",
      ),
    ).toBeNull();
    expect(
      mapToRegistrationFeeItem(reg({ ID: "592436119", Reg_Fee: "" }), "01uFEE"),
    ).toBeNull();
  });

  it("keeps a negative fee as-is", () => {
    const item = mapToRegistrationFeeItem(
      reg({ ID: "7", Reg_Fee: "-35" }),
      "01uFEE",
    );
    expect(item?.UnitPrice).toBe(-35);
  });
});

describe("Payments source (decided 2026-11-08)", () => {
  const base = {
    ID: "77",
    Student_ID: "90471855",
    Registration_ID: "0",
    Sales_Amount: "20",
    Date_Time_New: "20260102030405",
  };
  it("Registration and Purchase do not create Payment or Refund records", () => {
    expect(ORDER_FLOWS_CREATE_PAYMENTS).toBe(false);
  });
  it("links a Purchase_ID payment to the PUR- PaymentGroup", () => {
    const s = newPaymentSkips();
    const m = mapToPayment(
      { ...base, Purchase_ID: "12" },
      new Set(["PUR-12"]),
      s,
      logger,
      "load",
    );
    expect(m?.payment).toMatchObject({
      External_ID_4D__c: "PAY-77",
      "PaymentGroup.External_ID_4D__c": "PUR-12",
      Amount: 20,
    });
  });
  it("loads a Purchase_ID payment without the link when its PUR- PaymentGroup is not in the org", () => {
    const s = newPaymentSkips();
    const m = mapToPayment(
      { ...base, Purchase_ID: "13" },
      new Set(["PUR-12"]),
      s,
      logger,
      "load",
    );
    expect(m?.payment).toMatchObject({ External_ID_4D__c: "PAY-77", Amount: 20 });
    expect(m?.payment).not.toHaveProperty("PaymentGroup.External_ID_4D__c");
    expect(s.purchasePaymentGroupMissing).toBe(1);
  });
  it("falls back to the Purchase when the Registration's group is missing", () => {
    const m = mapToPayment(
      { ...base, Registration_ID: "999", Purchase_ID: "12" },
      new Set(["PUR-12"]),
      newPaymentSkips(),
      logger,
      "load",
    );
    expect(m?.payment["PaymentGroup.External_ID_4D__c"]).toBe("PUR-12");
  });
  it("links a Transcript_Request_ID only when the request is in Salesforce", () => {
    const transcripts = new Set(["5001"]);
    const s = newPaymentSkips();
    const linked = mapToPayment(
      { ...base, Transcript_Request_ID: "5001" },
      new Set(),
      s,
      logger,
      "load",
      transcripts,
    );
    expect(linked?.payment["Transcript_Request__r.External_ID_4D__c"]).toBe(
      "5001",
    );
    const orphan = mapToPayment(
      { ...base, Transcript_Request_ID: "5002", Sales_Amount: "15" },
      new Set(),
      s,
      logger,
      "load",
      transcripts,
    );
    expect(orphan?.payment).toMatchObject({
      Amount: 15,
      "Account.Student_ID_4D__c": "90471855",
    });
    expect(orphan?.payment).not.toHaveProperty(
      "Transcript_Request__r.External_ID_4D__c",
    );
    expect(s.transcriptRequestMissing).toBe(1);
  });
  it("uses Registration_ID when a row has both ids", () => {
    const s = newPaymentSkips();
    const m = mapToPayment(
      { ...base, Registration_ID: "560585", Purchase_ID: "12" },
      new Set(["REG-560585", "PUR-12"]),
      s,
      logger,
      "load",
    );
    expect(m?.payment["PaymentGroup.External_ID_4D__c"]).toBe("REG-560585");
    expect(s.bothRegistrationAndPurchase).toBe(1);
  });
  it("loads a payment with no Registration or Purchase (e.g. transcript fee) on the Account only", () => {
    const m = mapToPayment(
      { ...base, Sales_Amount: "15" },
      new Set(),
      newPaymentSkips(),
      logger,
      "load",
    );
    expect(m?.payment).not.toHaveProperty("PaymentGroup.External_ID_4D__c");
    expect(m?.payment).toMatchObject({
      Amount: 15,
      "Account.Student_ID_4D__c": "90471855",
    });
  });
});

describe("Registration Import — Order balance and discount type (decided 2026-11-09)", () => {
  const log = { warn: jest.fn() };
  const order = (o: Record<string, string>) =>
    mapRegistrationOrder(
      { ID: "592436117", Student_ID: "91055730", Registration_Date: "04/01/2026", ...o },
      log,
      "01sORDERBOOK",
    )!;

  it("writes Balance_Due to BalanceDue__c, the same field Purchase uses", () => {
    const o = order({ Balance_Due: "0" });
    expect(o.BalanceDue__c).toBe(0);
    expect(o).not.toHaveProperty("Balance_Due__c");
  });

  it("maps Medical Center and Stanford Medical Center to Stanford Healthcare", () => {
    expect(order({ Discount_Type: "Medical Center" }).TA_Discount_Type__c).toBe(
      "Stanford Healthcare",
    );
    expect(
      order({ Discount_Type: "Stanford Medical Center" }).TA_Discount_Type__c,
    ).toBe("Stanford Healthcare");
  });

  it("still sends the 5 values the admin adds to the picklist", () => {
    for (const v of ["MLA", "SAA onetime", "Teacher", "Faculty", "World Affairs Council"]) {
      expect(order({ Discount_Type: v }).TA_Discount_Type__c).toBe(v);
    }
  });
});
