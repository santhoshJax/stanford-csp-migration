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
**Status:** at risk — Build complete & pushed; awaiting UAT setup, schema validation & 3 confirmations before test

**Done this session**
- Confirmed line item pricing logic: each line takes price from its own registration row (Reg_Fee, Discount_Amt, Courses_Subtotal, Tuition)

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

**Next**
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
Yes, that's right. None of the three amounts is fixed in the code. Each line takes its price from that registration's own row in the file. I checked this in `registrationFlow.ts` at commit `4612381`.

| Line | Where its price comes from | Example from your samples |
|---|---|---|
| Registration fee (`FEE-{id}`) | `Reg_Fee` on the registration row | $35 on 592434586. A blank or $0 fee gets no line, and a negative fee loads as it is. |
| STAP (`STAP-{id}`) | `Discount_Amt` on the registration row, with its sign | −$415 on 592436117, −$645 on 592434586, +$610 on the drop 592436118 |
| Course drop (`DROP-{id}`) | `Courses_Subtotal` on the registration row | −$610 on 592436118 |
| Course (`ENR-{id}`) | `Tuition` on the enrollment row | $610 on 592434586 |

**How this works with the products:**
- The Registration Fee, STAP and Course Drop products only label what kind of line it is. Salesforce needs a product with a price book entry for every line item.
- Each line item sets its own `UnitPrice` from the file. That overrides the price on the product's price book entry, so the product's price is never used.
- So when the admin creates these 3 products in UAT, the price they enter doesn't m

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
