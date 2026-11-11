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
**Status:** at risk — Build brief complete; 9 code changes + 5 UAT checks ready; org access needed for pre-build verification

**Done this session**
- Build brief written with settled decisions, 9 code changes, 5 UAT checks, and runbook notes
- PIT- prefix collision risk closed; confirmed no overlap with Registration prefixes (ENR-, ADJ-, FEE-, STAP-, DROP-)
- Check_Amt mapping pattern confirmed from Registration flow (Check_Amt → Check_Amount__c)

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

**Checked live on 2026-11-11:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-11
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Inventory |
| Session | `37d53c41-f101-4747-94db-b73400d5256e` |
**In its own words (excerpt):**
The Build brief is written, and the deliverable has been attached to this session as **D01 – Purchase Build Brief**. I changed no code, the repository, or the org.

The brief contains:
- The settled decisions, including the price-entry key format (`STD-{ID}` for Standard, `{ID}` for StanfordContinuingStudies).
- Nine code changes across the Purchase Inventory, Purchase and Purchase Item flows, plus the tests for them.
- Five checks to run in UAT before the build.
- Run notes for the runbook.
- The workbook items still open and the acceptance criteria.

Two things need your input:
- **Check_No:** Registration also loads `Check_No` into `Check_Number__c`. The workbook doesn't say whether Purchase should. I flagged it in the brief as a question for the client.
- **Org for the Build session:** Attach the UAT org when you start it, or the five pre-build checks can't run.

Sources: engagement context (`context/handoff.md`, session records) · checked live: nothing this turn · not checked: repository, org, workbook.
<!-- orchestrate:session-state:end -->
