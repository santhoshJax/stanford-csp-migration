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
**Status:** at risk — Sheet updated with conversion logic; four mapping rows still unresolved, org checks still blocked

**Done this session**
- Updated Purchase, Purchase Item, Purchase Inventory tabs with conversion logic notes (13 writes, 17 cells)
- Clarified Product2Id lookup uses External_ID_4D__c on Product2
- Confirmed 'per 1,000 words' is valid picklist value
- Documented Purchase Item run order: Purchase round 1 → Purchase Item → Purchase round 2

**Open items**
- Code: Map Check_Amt to Check_Amount__c in mapToOrder
- Code: Set OrderItem.Type to 'Order Product' default
- Code: Apply case-insensitive product name match and IsActive=true filter to PricebookEntry query
- Code: Upsert PricebookEntry on External_ID_4D__c with success/failure tabs
- Code: Switch TEST_MODE off in Purchase and Purchase Item flows
- Org check: Confirm existing PricebookEntry records carry External_ID_4D__c field
- Org check: Verify no duplicate product names between nine inventory items and course products
- Sheet: Fill SA Reviewed By and Script Status columns on all three tabs

**Decisions**
- PricebookEntry external ID key format: STD-{ID} for Standard, {ID} for StanfordContinuingStudies
- Keep site API names (StanfordContinuingStudies); change display name and URL path only
- Move hardcoded portal URLs to CSP_Storefront_Base_URL label
- Split ParticipantId into ParticipantContactId and ParticipantAccountId columns
- Use real API names from org describe; ParticipationStatus replaces placeholder Status
- CSV uses real 003 Contact IDs and 001 Account IDs; update existing records, keep Id column
- File prices overwrite hand-edited prices in Salesforce (no hand-edit protection)
- Check_Number__c is not loaded (no Check_No column in source)

**Blockers**
- Org access needed to verify existing PricebookEntry records have External_ID_4D__c populated
- Org access needed to confirm no duplicate product names between inventory and course products
- UAT org must be attached to Build session for five pre-build checks to run

**Next**
- Obtain client decision on exact 2-year date cutoff rule for Purchase tab
- Verify CC_Transaction_ID mapping against Registration flow
- Start Build session with UAT org attached
- Apply 9 code changes (Check_Amt mapping, OrderItem.Type default, case-insensitive name match, PricebookEntry upsert, success/failure tabs, TEST_MODE off)
- Run 5 pre-build checks in org (price entry fields, ID overlap, upsert behavior, duplicate names, Price Books setting)
- Test UAT with real data files; check for scientific notation in large IDs and unexpected Item_Type values

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
I updated the sheet. The code is untouched, and I didn't read the cells back this turn. Each write returned a success count (13 writes, 17 cells), so it's worth a quick look at the sheet.

## The Product2Id row, in plain words

This is the Purchase Inventory row where the target is `PricebookEntry.Product2Id`. A price entry is a product's price in one price book, so it has to point at its product.

The sheet's old note said the entry "will need a lookup to the newly created Product". It didn't say how the flow finds that product. The flow finds it by the 4D inventory ID, which is stored in `Product2.External_ID_4D__c`.

I changed the note to say that. The row's label and type stay as they were.

## What I wrote

Everything below is in the Conversion Logic column unless I say otherwise.

| Tab | Row | Edit |
|---|---|---|
| Purchase | Purchase_Date | Source has no blank dates, and the flow skips a row without one. |
| Purchase | Notes and Message | Both rows now say they are joined into one Description. |
| Purchase | CC_Last_Four | The target is a Number field, so leading zeros are not kept. |
| Purchase | CC_Exp_Date (both rows) | Map Type is now "Conversion". The note says the so

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
