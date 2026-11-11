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
**Status:** at risk — Workbook updated with prefixes & mappings; 6 code changes + TEST_MODE switch still pending Build

**Done this session**
- Updated Purchase tab: External_ID_4D__c field API with PUR- prefix note
- Updated Purchase Item tab: External_ID_4D__c with PIT- prefix note, Type default to Order Product, Item_Type case-insensitive match
- Updated Purchase Inventory tab: External_ID_4D__c raw 4D ID, added PricebookEntry rows with STD-/no-prefix logic
- Verified all workbook edits saved by read-back

**Open items**
- Code: Map Check_Amt to Check_Amount__c in mapToOrder
- Code: Set OrderItem.Type to 'Order Product' default
- Code: Apply case-insensitive product name match and IsActive=true filter to PricebookEntry query
- Code: Upsert PricebookEntry on External_ID_4D__c with success/failure tabs
- Code: Switch TEST_MODE off in Purchase and Purchase Item flows
- Verify: Registration flow OrderItem prefix to confirm PIT- collision avoidance
- Decide: PricebookEntry external ID key format ({ID}-STD / {ID}-CSP) — blocks upsert refactor
- Decide: Six workbook-flow decisions from prior session (Order Status, Subtotal, Check_Amt, Reconciliation_ID, Student_Country, OrderItem.Type, Ref_Table_Number, Payment_Type, Payment_Sub_Type, Freeze, negative Sales_Amount)

**Decisions**
- Keep site API names (StanfordContinuingStudies); change display name and URL path only
- Move hardcoded portal URLs to CSP_Storefront_Base_URL label
- Split ParticipantId into ParticipantContactId and ParticipantAccountId columns
- Use real API names from org describe; ParticipationStatus replaces placeholder Status
- CSV uses real 003 Contact IDs and 001 Account IDs (no fallback needed)
- Update existing records in org rather than insert new ones (keep Id column in CSV)
- Jason's hours consolidated to single workstream record per week
- File prices will overwrite hand-edited prices in Salesforce (no hand-edit protection)

**Blockers**
- PricebookEntry external ID key format undecided; blocks upsert refactor
- Six workbook-flow decisions unmade; blocks accurate Build requirements
- Workbook external ID format now documented but code changes still pending

**Next**
- Build session: apply 6 code changes (Check_Amt, OrderItem.Type, name-match, PricebookEntry upsert, success/failure tabs, TEST_MODE off)
- Verify Registration flow OrderItem prefix before full load
- Test UAT with Product2Id and Pricebook2Id on existing entries
- Confirm PricebookEntry key format decision with stakeholder

**Checked live on 2026-11-11:** Google Workspace
### Last session — 2026-11-11
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Inventory |
| Session | `37d53c41-f101-4747-94db-b73400d5256e` |
**In its own words (excerpt):**
I wrote the workbook edits to the three tabs and read every changed cell back to confirm it saved. I changed no code, because this is a Review session. I did not touch the index tab or the Payments tab.

## What changed in the workbook

| Tab | Row | Change |
|---|---|---|
| Purchase | 5, ID | Field API is now `External_ID_4D__c`, with the note that it loads as `PUR-<ID>`. |
| Purchase | 8, Status | Map Type is now "Default Value": Draft, same as Registration. |
| Purchase | 26, Subtotal | Map Type is now "Do Not Map", because TotalAmount is read-only and calculated from the Order Items. |
| Purchase Item | 5, ID | Added the note that it loads as `PIT-<ID>`. |
| Purchase Item | 7, Item_Type | Note now says it matches the product name, ignoring capitals, against active price entries in the StanfordContinuingStudies Price Book. OrderItem stores the PricebookEntryId. |
| Purchase Item | 8, Type | Map Type is now "Default Value": Order Product, same as Registration. |
| Purchase Item | 11, Extended_Amount | Map Type is now "Do Not Map", because TotalPrice is read-only and calculated. |
| Purchase Inventory | 5, ID | Field API is now `External_ID_4D__c`, with the note that it uses the r

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
