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
**Status:** at risk — Build complete, API names documented. STAP double-discount & QA org confirmation still block final validation.

**Done this session**
- Updated walkthrough with Salesforce object and field API names from code at commit 4612381
- Documented all objects, fields, and external IDs each import writes
- Documented all lookups resolved by external ID
- Documented all 5 registration scenarios with exact field mappings

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

**Checked live on 2026-11-09:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-09
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
I've updated the walkthrough with the Salesforce object and field API names. I took every name from the record-building code on `stanford-csp-orchestrate` at commit `4612381`. No org is attached to this session, so I couldn't check them against a live describe. The sample rows and amounts are the same as last time, and I didn't change any code.

## Objects each import writes

| Import | Object (API name) | External ID (`External_ID_4D__c`) |
|---|---|---|
| Registration, round 1 | `CardPaymentMethod` | `REG-{Registration.ID}` |
| | `Order` | `REG-{Registration.ID}` |
| | `OrderItem` (fee line) | `FEE-{Registration.ID}` |
| | `OrderItem` (STAP line) | `STAP-{Registration.ID}` |
| | `PaymentGroup` | `REG-{Registration.ID}` |
| Registration Item | `OrderItem` (course line) | `ENR-{Enrollment.ID}` |
| | `OrderItemAdjustmentLineItem` | `ADJ-{Enrollment.ID}` |
| Registration, round 2 | `OrderItem` (drop line) | `DROP-{Registration.ID}` |
| | `Order` (Status update, `Prior_Registration__c` backfill) | `REG-{Registration.ID}` |
| Payments | `Payment` | `PAY-{Payments.ID}` |
| | `Refund` | `PAY-{Payments.ID}` |
| | `RefundLinePayment` | none (insert only) |

Lookups the code resolves by ext

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
