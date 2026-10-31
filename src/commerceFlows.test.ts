/**
 * Unit tests for the pure mapping functions of the commerce flows
 * (Purchase Inventory, Purchase, Purchase Item, Payments). No network.
 */
import {
  parseDateTime4D,
  parseExpiry,
  COMMERCE_TWO_YEAR_CUTOFF,
} from "./commerceShared";
import { mapToProduct2 } from "./purchaseInventoryFlow";
import {
  mapToOrder,
  mapToPayment as mapPurchasePayment,
  mapToCardPaymentMethod,
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
    expect(parseExpiry("610")).toEqual({ month: 6, year: 10 });
    expect(parseExpiry("1020")).toEqual({ month: 10, year: 20 });
    expect(parseExpiry("1")).toBeUndefined();
    expect(parseExpiry("1320")).toBeUndefined();
  });
  it("parses 4D YYYYMMDDHHMMSS", () => {
    expect(parseDateTime4D("20250102030405")).toBe("2025-01-02T03:04:05.000Z");
    expect(parseDateTime4D("2.01E+13")).toBeNull();
    expect(parseDateTime4D("")).toBeNull();
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
    });
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
      Balance_Due__c: 0,
      "Account.Student_ID_4D__c": "90475274",
    });
    expect(o).not.toHaveProperty("TotalAmount");
  });
  it("skips an Order with no Purchase_Date", () => {
    expect(mapToOrder({ ...row, Purchase_Date: "" }, "x")).toBeNull();
  });
  it("maps the card and a Capture payment", () => {
    expect(mapToCardPaymentMethod(row)).toMatchObject({
      External_ID_4D__c: "PUR-2",
      ExpiryMonth: 10,
      ExpiryYear: 20,
      CardLastFour: 224,
    });
    expect(mapPurchasePayment(row, logger)).toMatchObject({
      External_ID_4D__c: "PUR-2",
      Type: "Capture",
      Amount: 200,
    });
    expect(mapPurchasePayment({ ...row, CC_Amt: "0" }, logger)).toBeNull();
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
      External_ID_4D__c: "PI-101",
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
});

describe("Payments → Payment / Refund", () => {
  const groups = new Set(["560585"]);
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
      "PaymentGroup.External_ID_4D__c": "560585",
      STAP_Amount__c: 510,
      Payment_Source__c: "HOP",
      Amount: 510,
    });
    expect(m?.payment).not.toHaveProperty(
      "Transcript_Request__r.External_ID_4D__c",
    );
    expect(m?.refundAmount).toBe(25);
    expect(mapToRefund(m!.payment, 25)).toMatchObject({
      "PaymentGroup.External_ID_4D__c": "560585",
    });
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
    expect(
      mapToPayment(
        { ...row, Registration_ID: "1" },
        groups,
        s2,
        logger,
        "load",
      ),
    ).toBeNull();
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
