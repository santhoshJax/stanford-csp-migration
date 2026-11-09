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
### Engagement state — 2026-11-09
**Status:** at risk — Build complete; awaiting UAT setup, schema validation & QA org confirmation on STAP line structure (one per registration vs. per course)

**Done this session**
- Validated build against Gemini 2026-11-05 standup notes — confirmed add/drop separation, STAP sign logic, Prior_Registration__c approach, and original Order preservation

**Open items**
- Admin: create STAP and Course Drop products in UAT with $0 price, active status, in order price book
- Admin: add 5 discount values to Order.TA_Discount_Type__c in UAT (MLA, SAA onetime, Teacher, Faculty, World Affairs Council)
- Architect: confirm 592436118 has STAP discount type set
- Architect: confirm Prior_Registration__c lookup field exists on Order
- Confirm 2-year cutoff date (2024-10-06) with Julia or Trevor
- Confirm if cash/check/SNAP registrations should skip card payment record creation
- Confirm EffectiveDate source (Registration_Date assumed)
- Run sf deploy validate against UAT org schema before PR merge

**Decisions**
- STAP line uses Discount_Amt value as-is (negative on add, positive on drop)
- Drop line added only to Draft drop Orders with no enrollment row
- Drop line product sourced from prior registration; falls back to Course Drop product if ambiguous
- Prior_Registration__c link filled in round 1 if prior Order exists; round 2 backfills missing links
- Balance field: BalanceDue__c is correct (unified across Registration and Purchase)
- Payments Import is sole payment source; Registration/Purchase no longer create Payment/Refund
- Product price book entries use $0 price; UnitPrice overridden by file data on each line

**Blockers**
- STAP and Course Drop products not yet created in UAT
- sf deploy validate not yet run against UAT org schema
- TEST_MODE still on in commerce flows
- 592436118 discount type unconfirmed
- QA org STAP line structure unconfirmed (one per registration vs. per course) — blocks final validation

**Next**
- Open General session with QA org attached; run STAP line query to confirm structure (one line per registration or spread across courses)
- Admin: create STAP and Course Drop products in UAT with $0 price, active status
- Admin: add 5 discount picklist values to Order.TA_Discount_Type__c in UAT
- Verify Prior_Registration__c lookup field exists on Order in UAT
- Run sf deploy validate against UAT org schema
- Turn off TEST_MODE in all commerce flows
- Open/refresh PR #1 → review → merge to main → run Deploy session to ship to UAT

**Checked live on 2026-11-09:** Google Workspace
### Last session — 2026-11-09
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
I re-read the [Gemini notes from the 2026-11-05 standup](https://docs.google.com/document/d/1_XefYVFvCIJbSPkOo-bJmYSw_NApHDLSlvnhdNyEWxg/edit). They back up the overall approach. But they can't confirm how the QA org is set up. They record what Trevor said and showed, not the org's products, price book entries or line prices. No Salesforce org is attached to this session, so I couldn't check QA directly either.

## What the notes do confirm

| Our build | What the notes say | Match? |
|---|---|---|
| The original Order keeps its full price when a course is dropped ($610 stays on 592434586) | Trevor showed in Salesforce that a drop marks the participant as dropped, creates a refund request, and leaves the Order "untouched without any adjustments or balance changes" | Yes |
| The add and the drop are separate Orders | "Two separate orders… one containing the add row line item and the other containing the drop row line item" | Yes |
| Drop Orders end up Activated | "Activating them as normal registrations rather than drafts" | Yes. Ours are Activated after round 2. |
| The STAP line is negative on an add | "Negative line item matching the granted benefit amount, such as negative $605 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
