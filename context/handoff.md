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
**Status:** at risk — Workbook-flow mismatch found: 14 columns unmapped, 6 decisions needed before build. External ID naming inconsistent.

**Done this session**
- Compared all four purchase/payment tabs against flows on stanford-csp-orchestrate
- Identified 14 source columns not loaded; mapped status of each
- Found workbook index errors: nonexistent combined tab, wrong external ID name, undocumented prefixes
- Flagged six decisions needed: Order Status/Subtotal, Check_Amt/Reconciliation_ID/Student_Country, OrderItem.Type, Ref_Table_Number, Payment_Type/Sub_Type/Freeze, negative Sales_Amount handling

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

**Checked live on 2026-11-11:** the Salesforce org, the repository, Google Workspace
### Last session — 2026-11-11
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Inventory |
| Session | `37d53c41-f101-4747-94db-b73400d5256e` |
**In its own words (excerpt):**
I changed nothing. I checked the four purchase-related tabs (Purchase, Purchase Item, Purchase Inventory, Payments) against `purchaseFlow.ts`, `purchaseItemFlow.ts`, `purchaseInventoryFlow.ts` and `paymentsFlow.ts` on `stanford-csp-orchestrate`.

Most rows are handled. About 14 source columns are not loaded as the workbook says, and several of them have no sign-off. The "Script Status" and "SA Reviewed By" columns are empty on all four tabs.

## Workbook-level issues
- The index tab says Purchase, Purchase Item and Payment are "handled via 'Purchase & Payments' combined mapping tab". No such tab exists. The workbook has four separate tabs.
- The index lists `OrderPaymentSummary` as a Purchase target. No flow creates it.
- The workbook names the external ID `External_Id_4D`. The flows write `External_ID_4D__c`.
- The flows add prefixes to external IDs that the workbook doesn't show: `PUR-`, `PIT-` and `PAY-`. Inventory IDs have no prefix.

## Purchase → `purchaseFlow.ts`

| Source column | Workbook target | In the flow |
|---|---|---|
| ID | Order external ID | Mapped, with the `PUR-` prefix |
| Student_ID | Order.AccountId | Mapped through `Account.Student_ID_4D__c` |
| Purchase_Da

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
