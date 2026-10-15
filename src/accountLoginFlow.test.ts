/**
 * Unit tests for the Account Login permission-set helpers. They cover config
 * parsing and the Name-then-Label matching rules; no Salesforce calls are made.
 */
import {
  DEFAULT_PERMISSION_SETS,
  matchPermissionSets,
  parsePermissionSetNames,
} from "./accountLoginFlow";

const AVAILABLE = [
  { Id: "0PS000000000001", Name: "Buyer", Label: "Buyer" },
  {
    Id: "0PS000000000002",
    Name: "CSP_Stap_API_Access",
    Label: "CSP Stap API Access",
  },
  {
    Id: "0PS000000000003",
    Name: "CSP_Student_Education_Cloud_PS",
    Label: "CSP Student Education Cloud PS",
  },
];

describe("parsePermissionSetNames", () => {
  it("falls back to the three default permission sets when blank", () => {
    expect(parsePermissionSetNames(undefined)).toEqual(DEFAULT_PERMISSION_SETS);
    expect(parsePermissionSetNames("   ")).toEqual(DEFAULT_PERMISSION_SETS);
  });

  it("trims, drops empties and de-duplicates", () => {
    expect(
      parsePermissionSetNames(" Buyer, ,Buyer,CSP Stap API Access "),
    ).toEqual(["Buyer", "CSP Stap API Access"]);
  });
});

describe("matchPermissionSets", () => {
  it("matches every default by Label", () => {
    const result = matchPermissionSets(DEFAULT_PERMISSION_SETS, AVAILABLE);
    expect(result.missing).toEqual([]);
    expect(result.ambiguous).toEqual([]);
    expect([...result.matched.values()].map((p) => p.Id)).toEqual([
      "0PS000000000001",
      "0PS000000000002",
      "0PS000000000003",
    ]);
  });

  it("prefers an exact API Name match over a Label match", () => {
    const rows = [
      { Id: "A", Name: "Buyer", Label: "Commerce Buyer" },
      { Id: "B", Name: "Other_Buyer", Label: "Buyer" },
    ];
    expect(matchPermissionSets(["Buyer"], rows).matched.get("Buyer")?.Id).toBe(
      "A",
    );
  });

  it("reports a Label shared by two permission sets as ambiguous", () => {
    const rows = [
      { Id: "A", Name: "Buyer_One", Label: "Buyer" },
      { Id: "B", Name: "Buyer_Two", Label: "Buyer" },
    ];
    const result = matchPermissionSets(["Buyer"], rows);
    expect(result.matched.size).toBe(0);
    expect(result.ambiguous[0]).toContain("Buyer_One, Buyer_Two");
  });

  it("reports names that match nothing as missing", () => {
    const result = matchPermissionSets(["Does Not Exist"], AVAILABLE);
    expect(result.missing).toEqual(['"Does Not Exist"']);
  });
});
