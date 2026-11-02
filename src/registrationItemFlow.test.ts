/**
 * Unit tests for Registration Item Import mapping (Enrollment → OrderItem).
 * Rows are from the sample the team pasted on 2026-11-02. No network.
 */
import {
  INCLUDE_ADJUSTMENT_ROWS,
  INCLUDE_DROP_ROWS,
  mapToOrderItem,
  newSkips,
  normalizeAddDrop,
  type RawEnrollmentRow,
  type RegistrationItemCaches,
} from "./registrationItemFlow";
import { planOrderActivation } from "./purchaseFlow";
import { buildSkippedTab } from "./reportResults";

const logger = { warn: jest.fn() };

const caches = (): RegistrationItemCaches => ({
  pricebookEntryByCourseId: new Map([
    ["20081_DAR 200", "01uDAR"],
    ["20162_BUS 131", "01uBUS"],
  ]),
  orderStatusByRegistrationId: new Map([
    ["20046", "Draft"],
    ["592157410", "Draft"],
    ["20048", "Activated"],
  ]),
});

const row = (o: RawEnrollmentRow): RawEnrollmentRow => ({
  Status: "Enrolled",
  Add_Drop: "Add",
  Tuition: "200",
  ...o,
});

describe("Registration Item Import — mapToOrderItem", () => {
  it("maps a sample enrollment to the workbook's OrderItem fields", () => {
    const skips = newSkips();
    const rec = mapToOrderItem(
      row({
        ID: "200058",
        Registration_ID: "20046",
        Student_ID: "1360759",
        Course_ID: "20081_DAR 200",
      }),
      caches(),
      skips,
      logger,
    );
    expect(rec).toEqual({
      External_ID_4D__c: "ENR-200058",
      "Order.External_ID_4D__c": "REG-20046",
      PricebookEntryId: "01uDAR",
      UnitPrice: 200,
      Quantity: 1,
      Type: "Order Product",
      "Course_Offering__r.External_ID_4D__c": "20081_DAR 200",
      "Student__r.Student_ID_4D__c": "1360759",
    });
  });

  it("uses Tuition (480), not Extension (485), and accepts upper-case ADD", () => {
    const rec = mapToOrderItem(
      row({
        ID: "632968",
        Registration_ID: "592157410",
        Student_ID: "90968418",
        Course_ID: "20162_BUS 131",
        Add_Drop: "ADD",
        Tuition: "480",
        Extension: "485",
      }),
      caches(),
      newSkips(),
      logger,
    );
    expect(rec?.UnitPrice).toBe(480);
  });

  it("keeps a zero-tuition line", () => {
    const rec = mapToOrderItem(
      row({
        ID: "1",
        Registration_ID: "20046",
        Course_ID: "20081_DAR 200",
        Tuition: "0",
      }),
      caches(),
      newSkips(),
      logger,
    );
    expect(rec?.UnitPrice).toBe(0);
    expect(rec).not.toHaveProperty("Student__r.Student_ID_4D__c");
  });

  it("skips and counts each excluded case", () => {
    const skips = newSkips();
    const base = {
      ID: "9",
      Registration_ID: "20046",
      Course_ID: "20081_DAR 200",
    };
    const run = (o: RawEnrollmentRow) =>
      mapToOrderItem(row({ ...base, ...o }), caches(), skips, logger);
    expect(run({ Status: "New" })).toBeNull();
    expect(run({ Status: "DupEnrollment" })).toBeNull();
    expect(run({ Registration_ID: "0" })).toBeNull();
    expect(run({ Registration_ID: "999" })).toBeNull(); // Order not loaded
    expect(run({ Registration_ID: "20048" })).toBeNull(); // Order Activated
    expect(run({ Course_ID: "" })).toBeNull();
    expect(run({ Course_ID: "20081_ZZZ 1" })).toBeNull(); // no Product
    expect(run({ Tuition: "abc" })).toBeNull();
    expect(skips).toMatchObject({
      excludedStatus: 2,
      dropRows: 0,
      adjustmentRows: 0,
      noRegistrationId: 1,
      orderNotLoaded: 1,
      orderNotDraft: 1,
      noCourseId: 1,
      badTuition: 1,
    });
    expect(skips.unmatchedCourses.get("20081_ZZZ 1")).toBe(1);
  });

  it("records every skipped row with a reason; sent rows are not recorded", () => {
    const skips = newSkips();
    const base = {
      ID: "9",
      Registration_ID: "20046",
      Course_ID: "20081_DAR 200",
    };
    const run = (o: RawEnrollmentRow) =>
      mapToOrderItem(row({ ...base, ...o }), caches(), skips, logger);
    run({}); // sent
    run({ Status: "New" });
    run({ Add_Drop: "Drop" }); // sent (drop rows get a line)
    run({ Registration_ID: "999" });
    run({ Registration_ID: "20048" });
    run({ Course_ID: "20081_ZZZ 1" });
    expect(skips.records.map((r) => r.reason)).toEqual([
      'Status "New" is excluded (EXCLUDED_STATUSES)',
      expect.stringContaining("Order not loaded"),
      expect.stringContaining("is Activated"),
      expect.stringContaining("20081_ZZZ 1"),
    ]);
    expect(skips.records[0].row).toMatchObject({ ID: "9", Status: "New" });
  });

  it("gives Drop and Adjustment rows their own line (architect, 2026-11-02)", () => {
    expect(INCLUDE_DROP_ROWS).toBe(true);
    expect(INCLUDE_ADJUSTMENT_ROWS).toBe(true);
    const skips = newSkips();
    const base = {
      Registration_ID: "20046",
      Student_ID: "1360759",
      Course_ID: "20081_DAR 200",
    };
    const add = mapToOrderItem(
      row({ ...base, ID: "200058", Add_Drop: "Add", Tuition: "200" }),
      caches(),
      skips,
      logger,
    );
    const drop = mapToOrderItem(
      row({ ...base, ID: "200059", Add_Drop: "DROP", Tuition: "-200" }),
      caches(),
      skips,
      logger,
    );
    const adjustment = mapToOrderItem(
      row({ ...base, ID: "200060", Add_Drop: "AJST", Tuition: "-50" }),
      caches(),
      skips,
      logger,
    );
    // Three separate lines on the same Order, each keyed by its own Enrollment.ID.
    expect([add, drop, adjustment].map((r) => r?.External_ID_4D__c)).toEqual([
      "ENR-200058",
      "ENR-200059",
      "ENR-200060",
    ]);
    expect([add, drop, adjustment].map((r) => r?.UnitPrice)).toEqual([
      200, -200, -50,
    ]);
    expect(drop?.["Order.External_ID_4D__c"]).toBe("REG-20046");
    expect(skips.records).toHaveLength(0);
  });

  it("normalizes Add_Drop values", () => {
    expect(normalizeAddDrop("ADD")).toBe("add");
    expect(normalizeAddDrop("Drop")).toBe("drop");
    expect(normalizeAddDrop("AJST")).toBe("adjustment");
    expect(normalizeAddDrop("")).toBe("");
  });
});

describe("Registration order activation (shared with Purchase)", () => {
  const orders = [
    { External_ID_4D__c: "20046" },
    { External_ID_4D__c: "20047" },
  ];
  it("round 1 sends Draft orders; round 2 activates only those with items", () => {
    const existing = new Map([
      ["20046", { id: "801A", status: "Draft", hasItems: true }],
      ["20047", { id: "801B", status: "Draft", hasItems: false }],
    ]);
    expect(planOrderActivation(orders, existing, false).toUpsert).toHaveLength(
      2,
    );
    const r2 = planOrderActivation(orders, existing, true);
    expect(r2.toUpsert).toEqual([
      { External_ID_4D__c: "20046", Status: "Activated" },
    ]);
    expect(r2.draftWithoutItems).toEqual(["20047"]);
  });
});

describe("Skipped tab (reportResults.buildSkippedTab)", () => {
  it("keeps the source column order and appends Skip Reason", () => {
    const tab = buildSkippedTab(
      ["ID", "Registration_ID", "Status"],
      [{ row: { Status: "New", ID: "9", Extra: "x" }, reason: "excluded" }],
    );
    expect(tab.headers).toEqual([
      "ID",
      "Registration_ID",
      "Status",
      "Skip Reason",
    ]);
    expect(tab.rows).toEqual([["9", "", "New", "excluded"]]);
  });
  it("falls back to the row keys when no headers are known", () => {
    const tab = buildSkippedTab(
      [],
      [
        { row: { A: "1" }, reason: "r1" },
        { row: { A: "2", B: "3" }, reason: "r2" },
      ],
    );
    expect(tab.headers).toEqual(["A", "B", "Skip Reason"]);
    expect(tab.rows).toEqual([
      ["1", "", "r1"],
      ["2", "3", "r2"],
    ]);
  });
});
