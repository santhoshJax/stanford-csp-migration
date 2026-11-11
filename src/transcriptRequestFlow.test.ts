/**
 * Unit tests — Transcript Request flow: Student__c / Contact__c mapping.
 *
 * Covers the mapping-doc change: the source Student_ID is matched to a Person
 * Account (Student_ID_4D__c) and the record gets Student__c = Account Id and
 * Contact__c = PersonContactId. Unmatched rows are still sent, with the raw
 * Student_ID in Student__c, so Salesforce rejects them. The deleted
 * Account__c and Student_ID__c fields must no longer be sent.
 */
import { buildRecords, mapToTranscriptRecord } from "./transcriptRequestFlow";

const ACCOUNT = {
  accountId: "001000000000001AAA",
  contactId: "003000000000001AAA",
  firstName: "Ada",
  lastName: "Lovelace",
};

describe("Transcript Request — Student__c / Contact__c", () => {
  it("maps matched Person Account Id and PersonContactId", () => {
    const rec = mapToTranscriptRecord(
      { Student_ID_Longint: "12345.0" }, "7", "12345", "2025-01-02", undefined, ACCOUNT,
    );
    expect(rec.Student__c).toBe(ACCOUNT.accountId);
    expect(rec.Contact__c).toBe(ACCOUNT.contactId);
    expect(rec.First_Name__c).toBe("Ada");
    expect(rec.Student_ID_Longint__c).toBe("12345");
  });

  it("no longer sends the deleted Account__c / Student_ID__c fields", () => {
    const rec = mapToTranscriptRecord({}, "7", "12345", "2025-01-02", undefined, ACCOUNT);
    expect(Object.keys(rec).some((k) => k.startsWith("Account__"))).toBe(false);
    expect(rec).not.toHaveProperty("Student_ID__c");
  });

  it("sends unmatched rows with the raw Student_ID so Salesforce rejects them", () => {
    const rec = mapToTranscriptRecord({}, "8", "99999", "2025-01-02", undefined, undefined);
    expect(rec.Student__c).toBe("99999");
    expect(rec).not.toHaveProperty("Contact__c");
  });

  it("omits Contact__c when the account has no PersonContactId", () => {
    const rec = mapToTranscriptRecord(
      {}, "9", "12345", "2025-01-02", undefined, { ...ACCOUNT, contactId: "" },
    );
    expect(rec.Student__c).toBe(ACCOUNT.accountId);
    expect(rec).not.toHaveProperty("Contact__c");
  });

  it("buildRecords submits every row, matched or not (25 rows)", () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      raw: { Transcript_Format: "Paper", Entry_1: "Addr" },
      parentId: String(i),
      studentId: i % 2 === 0 ? "12345" : `NOMATCH${i}`,
      requestDate: "2025-01-02",
      sentDate: undefined,
      qtyTotal: undefined,
    }));
    const map = new Map([["12345", ACCOUNT]]);
    const { sfRecords, itemRecords } = buildRecords(rows, map);
    expect(sfRecords).toHaveLength(25);
    expect(itemRecords).toHaveLength(25);
    expect(sfRecords.filter((r) => r.Contact__c === ACCOUNT.contactId)).toHaveLength(13);
    expect(sfRecords[1].Student__c).toBe("NOMATCH1");
  });
});
