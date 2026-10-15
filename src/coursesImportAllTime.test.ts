/**
 * Tier 3 quarter filter — covers the two-digit year pivot (50-99 => 19xx,
 * 00-49 => 20xx) so pre-2000 quarters are kept and Tier 1/2 years are not.
 */
import { isTier3Quarter } from "./coursesImportAllTime";

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
