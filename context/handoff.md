# Handoff — current state

> **Rewritten at the end of every session.** This file is *now*; [`gotchas.md`](gotchas.md) is *forever*.
> If this file and [`../CONTEXT.md`](../CONTEXT.md) disagree, this one is newer.

**Last updated:** 2026-10-16 · **By:** <session or person>

---

## Where things stand

> **Not yet filled in.** — Where is the work right now, in two or three sentences? Someone picking
> this up cold reads this first.

## In progress

| What | State | Where it lives | Blocked on |
|---|---|---|---|
| | | | |

## Next steps

<!-- Ordered. The top item should be the one to do next, not the most interesting one. -->

1.

## Waiting on someone else

| What | Who | Since | Chased? |
|---|---|---|---|
| | | | |

## Things the next session should know

<!-- Anything true right now that is not obvious from the code: a half-finished refactor, a
     deliberately disabled test, a workaround that needs removing, a deploy that is half-applied.
     If you leave something in a strange state, this is where you say so. -->

-

<!-- orchestrate:session-state:start -->
<!-- Written by Orchestrate at the end of each session. Edits inside this block are
     replaced next session; anything OUTSIDE it is yours and is never touched. -->
### Engagement state — 2026-11-11
**Status:** blocked — The flows mostly match the two tabs, and where they don't, the code usually follows a later decision that the workbook hasn't been updated…

**Done this session**
- The flows mostly match the two tabs, and where they don't, the code usually follows a later decision that the workbook hasn't been updated for. Checked against real rows, the amounts add up for 98% of registrations. The gaps are registrati…

**Open items**
- Decide: Order Status and Subtotal — update workbook or add custom fields to hold 4D values
- Decide: Check_Amt, Reconciliation_ID, Student_Country — pick target field or mark Do Not Map
- Decide: OrderItem.Type — drop it or store classification in custom field
- Decide: Ref_Table_Number — keep it or drop it (ambiguous without table number)
- Decide: Payment_Type, Payment_Sub_Type, Freeze — confirm real field API names or mark Do Not Map
- Decide: negative Sales_Amount — convert to refund as Purchase does, or skip
- Verify in UAT: Payment_Type API name, Transcript_Request__c field existence, picklist values for Payment_Source
- Update workbook index tab and all four tabs to match actual flow behavior and external ID naming

**Decisions**
- Keep site API names (StanfordContinuingStudies); change display name and URL path only
- Move hardcoded portal URLs to CSP_Storefront_Base_URL label
- Split ParticipantId into ParticipantContactId and ParticipantAccountId columns
- Use real API names from org describe; ParticipationStatus replaces placeholder Status
- CSV uses real 003 Contact IDs and 001 Account IDs (no fallback needed)
- Update existing records in org rather than insert new ones (keep Id column in CSV)
- Jason's hours consolidated to single workstream record per week (not split evenly)
- File prices will overwrite hand-edited prices in Salesforce (no hand-edit protection)

**Blockers**
- PricebookEntry key format undecided; blocks upsert refactor
- Product2.Name case sensitivity and IsActive filter undecided; blocks code change
- Six workbook-flow decisions unmade; blocks accurate requirements for Build session
- External ID naming inconsistent between workbook (External_Id_4D) and flows (External_ID_4D__c with prefixes PUR-, PIT-, PAY-)

**Next**
- Resolve six decisions above and confirm with stakeholder
- Verify Payment_Type, Payment_Sub_Type, Freeze field names and picklist values in UAT org
- Update workbook index and all four tabs to reflect actual flow mappings and external ID format
- Provide corrected workbook and six decisions to Build session before refactoring flows

**Checked live on 2026-11-11:** Google Workspace
### Last session — 2026-11-11
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
The flows mostly match the two tabs, and where they don't, the code usually follows a later decision that the workbook hasn't been updated for. Checked against real rows, the amounts add up for 98% of registrations. The gaps are registration-level adjustments, 9 discount types that load blank, and course fees being labelled as discounts. I changed no code.

I checked every row of the Registration and Enrollment tabs against the code on `stanford-csp-orchestrate` (code last changed at `4612381`). For real data I used the Google Sheet copies of the source files (April 1 extract): 1,997 Registration rows dated Sep 2025 – Feb 2026, and 1,497 Enrollment rows. The .txt files are still too big for me to open.

## Registration tab vs the code

**Matches:** the card record fields (CC_ address, card type, expiry, last four, holder name) and the Order fields (address, `Adjustment__c`, `Check_Amount__c`, `Check_Number__c`, `Courses_Subtotal__c`, `Discount_Amount__c`, `Description`, `Registration_Fee__c`, `Registration_Date__c`, `OrderReferenceNumber`, `PoDate`). The 2-year cutoff on `Registration_Date` also matches. The "Do Not Map" columns are left out. The card values in the data all convert

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
