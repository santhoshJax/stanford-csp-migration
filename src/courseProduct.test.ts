/**
 * Product2 per CourseOffering (mapping workbook, Course tab rows 127-131,
 * Oct 2026). The same payload builder is used by all three course flows:
 * Course Import - All (Tier 3), 2 Year (Tier 1) and 5 Year (Tier 2).
 * Assumes: Course.ID is the "<quarter>_<code>" text key, e.g. "20081_WSP 138".
 */
import {
  buildCourseProductPayload,
  capForSalesforceText,
  htmlToPlainText,
  salesforceTextLength,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_NAME_MAX,
} from "./courseUtils";

const base = {
  sourceId: "20081_WSP 138",
  code: "WSP 138",
  title: "Creative Nonfiction",
  description: "Line one_4DNL_Line two",
  courseOfferingId: "0ZAxx0000000001",
};

describe("buildCourseProductPayload", () => {
  it("maps Title, Code, Description, IsActive and the CourseOffering lookup", () => {
    expect(buildCourseProductPayload(base)).toEqual({
      Name: "Creative Nonfiction",
      ProductCode: "WSP 138",
      Description: "Line one\nLine two",
      IsActive: false,
      Course_Offering__c: "0ZAxx0000000001",
    });
  });

  it("keeps the full code as-is for ProductCode, section suffix included", () => {
    const p = buildCourseProductPayload({ ...base, code: " OWC 303 A " });
    expect(p.ProductCode).toBe("OWC 303 A");
  });

  it("strips HTML from the title and caps Name at 255 characters", () => {
    const html = buildCourseProductPayload({
      ...base,
      title: '<span style="font-style:italic">Moby</span> Dick',
    });
    expect(html.Name).toBe("Moby Dick");
    const long = buildCourseProductPayload({ ...base, title: "x".repeat(300) });
    expect((long.Name as string).length).toBe(PRODUCT_NAME_MAX);
  });

  it("falls back to Code, then ID, when the title is blank", () => {
    expect(buildCourseProductPayload({ ...base, title: "" }).Name).toBe(
      "WSP 138",
    );
    expect(
      buildCourseProductPayload({ ...base, title: "", code: "" }).Name,
    ).toBe("20081_WSP 138");
  });

  it("omits blank Code and Description instead of sending empty values", () => {
    const p = buildCourseProductPayload({
      ...base,
      code: "  ",
      description: "   ",
    });
    expect(p).not.toHaveProperty("ProductCode");
    expect(p).not.toHaveProperty("Description");
  });

  it("caps Description at the 4,000-character Product2 limit", () => {
    const p = buildCourseProductPayload({
      ...base,
      description: "d".repeat(5000),
    });
    expect((p.Description as string).length).toBe(PRODUCT_DESCRIPTION_MAX);
  });

  it("builds the same payload for 20 rows without sharing state", () => {
    const payloads = Array.from({ length: 20 }, (_, n) =>
      buildCourseProductPayload({
        ...base,
        sourceId: `20081_BUS ${n}`,
        code: `BUS ${n}`,
        courseOfferingId: `0ZA${n}`,
      }),
    );
    expect(new Set(payloads.map((p) => p.Course_Offering__c)).size).toBe(20);
    expect(payloads.every((p) => p.IsActive === false)).toBe(true);
  });
});

// Product2.Description is plain text: 4D HTML must be converted, and the
// 4,000 cap must use Salesforce's own character count (2-Year run 2026-10-27
// rejected rows 75, 80, 81 and 91 with STRING_TOO_LONG).
describe("Product2 Description plain text", () => {
  it("strips tags, keeps line breaks and bullets, decodes entities once", () => {
    const html =
      "<span>Team&#39;s debut&nbsp;&amp; more</span><br/><br/>" +
      '<span style="font-weight:bold">Dave</span>, <a href="https://x">Section Z</a>' +
      "<ul><li>One</li><li>Two</li></ul>Q&amp;amp;A &#x2019;80s_4DNL_End";
    expect(htmlToPlainText(html)).toBe(
      "Team's debut & more\n\nDave, Section Z\n• One\n• Two\nQ&amp;A \u201980s\nEnd",
    );
  });

  it("returns an empty string for blank or tag-only input", () => {
    expect(htmlToPlainText(null)).toBe("");
    expect(htmlToPlainText("<span> </span><br/>")).toBe("");
  });

  it("counts escaped characters and line breaks the way Salesforce does", () => {
    expect(salesforceTextLength("ab")).toBe(2);
    expect(salesforceTextLength("a&b")).toBe(7);
    expect(salesforceTextLength("it's")).toBe(9);
    expect(salesforceTextLength("a\nb")).toBe(4);
  });

  it("keeps a long apostrophe-heavy description within 4,000 as Salesforce counts it", () => {
    const html = "<span>" + "the team&#39;s history, ".repeat(400) + "</span>";
    const p = buildCourseProductPayload({ ...base, description: html });
    const d = p.Description as string;
    expect(d).not.toContain("<");
    expect(d.length).toBeLessThan(PRODUCT_DESCRIPTION_MAX);
    expect(salesforceTextLength(d)).toBeLessThanOrEqual(
      PRODUCT_DESCRIPTION_MAX,
    );
  });

  it("leaves a value that already fits unchanged", () => {
    expect(capForSalesforceText("short & sweet", 4000)).toBe("short & sweet");
  });

  it("omits Description when the source is only markup", () => {
    const p = buildCourseProductPayload({
      ...base,
      description: "<br/><span></span>",
    });
    expect(p).not.toHaveProperty("Description");
  });
});
