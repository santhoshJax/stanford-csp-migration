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
**Status:** at risk — Build complete; code traced on samples. STAP double-discount & QA org confirmation still block final validation.

**Done this session**
- Traced all 4 registration flows (round 1, item import, round 2, payments) against code on sample rows
- Confirmed run order and record structure for each scenario
- Identified STAP double-discount risk: STAP line + enrollment adjustment both apply
- Documented exact field mappings and product line creation logic

**Open items**
- Admin: create STAP and Course Drop products in UAT with $0 price, active status
- Admin: add 5 discount values to Order.TA_Discount_Type__c in UAT
- Architect: confirm 592436118 has STAP discount type set in real data
- Architect: confirm Prior_Registration__c lookup field exists on Order in UAT
- Confirm 2-year cutoff date (2024-10-06) with Julia or Trevor
- Confirm if cash/check/SNAP registrations should skip card payment record creation
- Run sf deploy validate against UAT org schema before PR merge
- Export sample STAP rows (592434586, 592436117, 592436118) under 10 MB to confirm double-discount on real data

**Decisions**
- STAP line uses Discount_Amt value as-is (negative on add, positive on drop)
- Drop line added only to Draft drop Orders with no enrollment row
- Drop line product sourced from prior registration; falls back to Course Drop product if ambiguous
- Prior_Registration__c link filled in round 1 if prior Order exists; round 2 backfills missing links
- BalanceDue__c is correct unified balance field across Registration and Purchase
- Payments Import is sole payment source; Registration/Purchase no longer create Payment/Refund
- Product price book entries use $0 price; UnitPrice overridden by file data on each line
- Refund only created from Refund_Amount column, not from negative Sales_Amount

**Blockers**
- STAP and Course Drop products not yet created in UAT
- sf deploy validate not yet run against UAT org schema
- TEST_MODE still on in commerce flows
- 592436118 discount type unconfirmed in real data
- STAP double-discount risk unconfirmed on real data — both STAP line and enrollment adjustment apply
- QA org STAP line structure unconfirmed

**Next**
- Export sample STAP registration rows (592434586, 592436117, 592436118) from both files under 10 MB; rerun trace on real data to confirm double-discount
- Open General session with QA org attached; run STAP line query to confirm structure
- Admin: create STAP and Course Drop products in UAT with $0 price, active status
- Admin: add 5 discount picklist values to Order.TA_Discount_Type__c in UAT
- Verify Prior_Registration__c lookup field exists on Order in UAT
- Run sf deploy validate against UAT org schema
- Turn off TEST_MODE in all commerce flows
- Open/refresh PR #1 → review → merge to main → run Deploy session to ship to UAT

**Checked live on 2026-11-09:** the repository
### Last session — 2026-11-09
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
Below, each scenario uses one sample row. You'll see the source fields that matter and the exact Salesforce records the code builds from them. I got these by running the mapping code on branch `stanford-csp-orchestrate` (commit `4612381`) against each row, so these are actual outputs, not a description.

The Drive files are still too big for me to open (136 MB and 129 MB; my limit is 10 MB). So the rows come from samples the team pasted earlier. Wherever I had to fill in a value, the scenario says so. Salesforce IDs such as `01uFEE` are placeholders for IDs that would be looked up in the org.

## Registration file: round 1

### Scenario 1: Normal paid registration with a card
**Source row 592436117:** Student_ID 91055730 · Registration_Date 04/01/2026 · CC_Card_Type Visa · CC_Exp_Date 0330 · CC_Last_Four 6346 · Courses_Subtotal 415 · Reg_Fee 35 · Discount_Type STAP · Discount_Amt −415 · Balance_Due 0

| Record created | Key fields |
|---|---|
| Card record `REG-592436117` | CardType Visa, ExpiryMonth 3, ExpiryYear 2030, CardLastFour 6346, Status Active, linked to student 91055730 |
| Order `REG-592436117` | Status **Draft**, order price book, EffectiveDate and Registration_Date__c 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
