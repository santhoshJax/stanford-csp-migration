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
**Status:** at risk — Purchase cutoff date confirmed as fixed 2024-10-06, not rolling 2yr. Awaiting client decision on exact cutoff.

**Done this session**
- Confirmed Purchase flow uses fixed cutoff date 2024-10-06, not rolling two-year window
- Verified cutoff is shared with Registration and Payments flows
- Identified assumption: Purchase_Date used without architect confirmation of no cutoff column

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
- Client decision required: confirm 2024-10-06 cutoff or provide exact date (affects Purchase, Registration, Payments)

**Next**
- Obtain client decision on whether 2024-10-06 is correct cutoff or if exact two-year rolling window is required
- If cutoff changes, update COMMERCE_TWO_YEAR_CUTOFF constant in commerceShared.ts (one-line change)
- Add confirmed cutoff rule to Purchase_Date Conversion Logic cell on sheet
- Verify CC_Transaction_ID mapping against Registration flow
- Start Build session with UAT org attached for five pre-build checks

**Checked live on 2026-11-11:** the repository
### Last session — 2026-11-11
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Inventory |
| Session | `37d53c41-f101-4747-94db-b73400d5256e` |
**In its own words (excerpt):**
Yes. The Purchase flow cuts on `Purchase_Date`, but the cutoff is a fixed date, not a rolling two years. I read `purchaseFlow.ts` and `commerceShared.ts` on `stanford-csp-orchestrate` to confirm. I changed nothing.

## The rule in the code

- **Cutoff date:** `COMMERCE_TWO_YEAR_CUTOFF = "2024-10-06"`. A row is loaded only if `Purchase_Date` is on or after that date.
- **Rows dropped:** a row with no parseable `Purchase_Date`, or one before the cutoff, is counted as `filteredOut(2yr scope)` in the log. It is not loaded.
- **Source of the date:** it is the same fixed date Registration uses, from an architect decision on 2026-10-06. So Purchase and Registration are cut at the same point.
- **Assumption in the code:** the code comment says the Purchase tab has no cutoff column. Using `Purchase_Date` is an assumption that was never confirmed with the architect.

## What this means

- **Not a rolling window:** today is 2026-11-11, so a true two-year window would start about 2024-11-11. This cutoff is about five weeks earlier. If the client wants exactly two years back from the load date, the constant needs changing.
- **Purchase Item:** it has no date filter of its own. It looks up the O

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
