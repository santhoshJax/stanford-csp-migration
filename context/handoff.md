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
**Status:** blocked — I re-read the Purchase, Purchase Item and Purchase Inventory tabs.

**Done this session**
- I re-read the Purchase, Purchase Item and Purchase Inventory tabs. The Purchase tab and the Purchase Inventory tab match the settled decisions, and so does most of the Purchase Item tab. I changed nothing. Four rows still don't match what…

**Open items**
- Code: Map Check_Amt to Check_Amount__c in mapToOrder
- Code: Set OrderItem.Type to 'Order Product' default
- Code: Apply case-insensitive product name match and IsActive=true filter to PricebookEntry query
- Code: Upsert PricebookEntry on External_ID_4D__c with success/failure tabs
- Code: Switch TEST_MODE off in Purchase and Purchase Item flows
- Org check: Confirm existing PricebookEntry records carry External_ID_4D__c field
- Org check: Verify no duplicate product names between nine inventory items and course products
- Org check: Test upsert behavior sending Product2Id and Pricebook2Id on existing entries

**Decisions**
- PricebookEntry external ID key format: STD-{ID} for Standard, {ID} for StanfordContinuingStudies
- Keep site API names (StanfordContinuingStudies); change display name and URL path only
- Move hardcoded portal URLs to CSP_Storefront_Base_URL label
- Split ParticipantId into ParticipantContactId and ParticipantAccountId columns
- Use real API names from org describe; ParticipationStatus replaces placeholder Status
- CSV uses real 003 Contact IDs and 001 Account IDs; update existing records, keep Id column
- File prices overwrite hand-edited prices in Salesforce (no hand-edit protection)

**Blockers**
- Org access needed to verify existing PricebookEntry records have External_ID_4D__c populated
- Org access needed to confirm no duplicate product names between inventory and course products
- UAT org must be attached to Build session for five pre-build checks to run

**Next**
- Start Build session with UAT org attached
- Apply 9 code changes (Check_Amt mapping, OrderItem.Type default, case-insensitive name match, PricebookEntry upsert, success/failure tabs, TEST_MODE off)
- Run 5 pre-build checks in org (price entry fields, ID overlap, upsert behavior, duplicate names, Price Books setting)
- Obtain client decision on Check_No → Check_Number__c mapping
- Test UAT with real data files; check for scientific notation in large IDs and unexpected Item_Type values
- Document in runbook: Purchase Item cannot add lines to Orders already activated by Purchase round 2

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
I re-read the Purchase, Purchase Item and Purchase Inventory tabs. The Purchase tab and the Purchase Inventory tab match the settled decisions, and so does most of the Purchase Item tab. I changed nothing. Four rows still don't match what the flows actually do, and the SA Reviewed By column is still empty.

## Rows that now match the decisions

| Tab | Row | Current value |
|---|---|---|
| Purchase | ID | `External_ID_4D__c`, loaded as `PUR-<ID>` |
| Purchase | Status | Default Value, Draft, 4D value not loaded |
| Purchase | Subtotal | Do Not Map, TotalAmount is read-only |
| Purchase | Check_Amt | Direct Map to `Check_Amount__c` (Currency) |
| Purchase | Reconciliation_ID, Student_Country | Do Not Map |
| Purchase Item | ID | Loaded as `PIT-<ID>` |
| Purchase Item | Item_Type | Matched on product name, ignoring capitals, against active price entries in the StanfordContinuingStudies Price Book. OrderItem stores the PricebookEntryId. |
| Purchase Item | Type | Default Value, Order Product |
| Purchase Item | Extended_Amount | Do Not Map |
| Purchase Item | Ref_Table_Number | Do Not Map |
| Purchase Inventory | ID | Raw 4D ID, no prefix |
| Purchase Inventory | PricebookEntry `Price

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
