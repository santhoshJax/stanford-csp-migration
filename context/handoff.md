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
**Status:** blocked — The review isn't finished yet.

**Done this session**
- The review isn't finished yet. This session hit its size guide, so I stopped at a checkpoint. I haven't compared the code against the mapping yet and I've changed no code. **What I've done so far:** - **Mapping workbook:** I exported the […

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

**Checked live on 2026-11-11:** Google Workspace, the repository
### Last session — 2026-11-11
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
The review isn't finished yet. This session hit its size guide, so I stopped at a checkpoint. I haven't compared the code against the mapping yet and I've changed no code.

**What I've done so far:**
- **Mapping workbook:** I exported the [CSP Data Migration Mapping Workbook](https://docs.google.com/spreadsheets/d/1VddUqjvnXZr4BHHwiwSV44X1FO2ZuJH67YznOb1dhjA/edit) and pulled out the Registration and Enrollment tabs.
  - Since my last copy, the Payment rows have been removed from the Registration tab. That fits Payments Import now being the only source of payments.
  - The tab still says **Order Status "Default to Activated"**, still has Prior_Registration_ID as **"Do Not Map"**, and still says `Balance_Due__c`. The code doesn't match any of these three: Orders load as Draft and are activated in round 2, `Prior_Registration__c` is filled in, and it writes `BalanceDue__c`.
  - The Enrollment tab maps to Course Offering Participant, which the Enrollment flow loads. The course lines (Order Items) are mapped on the Registration tab.
- **Source data:** the two .txt files are still too big for me to open. I found Google Sheet copies I can read: [Registration](https://docs.google.com/sprea

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
