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
**Status:** at risk — Build complete; code traced on samples. STAP double-discount risk found. UAT setup & QA org confirmation still blocking.

**Done this session**
- Traced registration, enrollment, and payments flows against code on samples
- Confirmed run order: Registration round 1 → Registration Item → Registration round 2 → Payments
- Identified STAP double-discount scenario: STAP line + enrollment discount adjustment both apply

**Open items**
- Admin: create STAP and Course Drop products in UAT with $0 price, active status
- Admin: add 5 discount values to Order.TA_Discount_Type__c in UAT
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
- QA org STAP line structure unconfirmed — blocks final validation
- STAP double-discount risk: STAP line + enrollment adjustment both apply to same registration

**Next**
- Resolve STAP double-discount: export sample STAP registration rows (592434586, 592436117, 592436118) under 10 MB; rerun trace on real data to confirm if both discounts apply
- Open General session with QA org attached; run STAP line query to confirm structure
- Admin: create STAP and Course Drop products in UAT with $0 price, active status
- Admin: add 5 discount picklist values to Order.TA_Discount_Type__c in UAT
- Verify Prior_Registration__c lookup field exists on Order in UAT
- Run sf deploy validate against UAT org schema
- Turn off TEST_MODE in all commerce flows
- Open/refresh PR #1 → review → merge to main → run Deploy session to ship to UAT

**Checked live on 2026-11-09:** the repository, Google Workspace
### Last session — 2026-11-09
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
To answer your follow-up first: yes, the walkthrough below gives a sample record for each scenario the imports handle.

I couldn't open the two Drive files. Registration.txt is 136 MB and Enrollment.txt is 129 MB, and my Drive tools can read at most 10 MB and download at most 100 MB. So every example below is a row the team already pasted into this session, saved in the repository tests. I traced each one through the code on `stanford-csp-orchestrate` at `4612381`. Nothing was run against an org.

## The run order

| Step | Flow | What it creates |
|---|---|---|
| 1 | Registration Import, round 1 | Card record, Order (Draft), $35 fee line, STAP line, payment group, prior-registration link |
| 2 | Registration Item Import | One course line per enrollment row, plus a discount adjustment where `Extension` ≠ `Tuition` |
| 3 | Registration Import, round 2 ("Activate Registration Orders" = true) | Drop line where needed, missing prior links filled in, Orders activated |
| 4 | Payments Import | Payments and refunds (Registration and Purchase no longer create these) |

## Registration file, round 1

| Scenario | Sample | What happens |
|---|---|---|
| Normal registration | **592436117**: V

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
