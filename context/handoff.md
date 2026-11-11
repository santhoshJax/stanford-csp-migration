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
**Status:** blocked — These four items need a decision or a code fix before the full load.

**Done this session**
- These four items need a decision or a code fix before the full load. Each example below is a real row from the source data samples (the April 1 extract). I didn't change any code. ## 1. The registration `Adjustment` is left out of the Orde…

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
- Purchase cutoff is fixed 2024-10-06, not rolling two-year window; shared with Registration and Payments
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
- Client decision required: confirm 2024-10-06 cutoff is correct or provide exact date if rolling two-year window needed

**Next**
- Obtain final client decision on 2024-10-06 cutoff (if rolling window required, note exact start date)
- Start Build session: select Build type, repo santhoshJax/stanford-csp-migration, branch stanford-csp-orchestrate, attach UAT org
- In Build session, paste Purchase Build Brief (D01) goal and request five pre-build org checks
- Fill SA Reviewed By and Script Status columns on all three sheet tabs
- Verify CC_Transaction_ID mapping against Registration flow before Build runs

**Checked live on 2026-11-11:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-11
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
These four items need a decision or a code fix before the full load. Each example below is a real row from the source data samples (the April 1 extract). I didn't change any code.

## 1. The registration `Adjustment` is left out of the Order total

**What happens:** a registration can have an `Adjustment` amount, usually a staff write-off or a no-fee waiver. The code saves it in `Order.Adjustment__c`, but no line is created for it. The Order total is just the sum of its lines, so the adjustment never counts.

**Real example: registration 592420813**

| Source column | Value |
|---|---|
| Courses_Subtotal | 540 (one course, BUS 187) |
| Reg_Fee | 35 |
| Adjustment | −575 |
| Paid (CC_Amt) | 0 · transaction "NOFEE" |

- What the student owed: 540 + 35 − 575 = **$0**
- What the Order totals in Salesforce: course line $540 + fee line $35 = **$575**

So Salesforce shows $575 owed on a registration that was waived. In the sample, 27 Orders come out wrong this way.

**Fix:** add an "Adjustment" line at −$575, the same way the fee and STAP lines work. That needs one more product, "Adjustment", with a $0 price. **Decision:** add the line, or accept that these Orders won't add up.

## 2. Nin

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
