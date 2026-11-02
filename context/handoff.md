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
### Engagement state — 2026-11-02
**Status:** at risk — Registration flow matches mapping doc except OrderItems (not built); test flags still on. Architect decisions needed on pricing, payment de…

**Done this session**
- Verified registration flow against live mapping doc (rows 5–69)
- Identified 10 differences: 1 not built (OrderItems), 3 intentional, 6 need architect input

**Open items**
- Create PricebookEntry.External_ID_4D__c field in UAT org
- Verify both price books active in UAT org
- Architect decides: Registration Orders field name (Balance_Due__c vs BalanceDue__c)
- Architect decides: OrderItem pricing (price book entry price, Tuition vs Extension, dropped/adjusted rows)
- Architect decides: Payment dedup (Registration flow CC_Amt vs Payments flow PAY- key)
- Architect decides: CardPaymentMethod skip rules for cash, check, refund rows
- Turn off test flags (TEST_MODE, TEST_LIMIT, TEST_SKIP) before full run
- Build OrderItem phase and Pricebook step in registrationFlow.ts

**Decisions**
- Blank Status counts as New in enrollment rule
- Index version incremented to 2
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID, PUR- for Purchase orders
- TEST_MODE=false for next full run
- Three purchase flows, four runs (no split)

**Blockers**
- PricebookEntry.External_ID_4D__c field must be created in UAT org
- Both price books must be active in UAT org before purchase load run
- Architect decision on OrderItem pricing (price book entry price, Tuition vs Extension handling)
- Architect decision on Payment dedup strategy (CC_Amt vs PAY- key conflict)
- Architect decision on CardPaymentMethod skip rules for non-card payment types

**Next**
- Get architect decisions on: OrderItem pricing, Payment dedup, CardPaymentMethod skip rules, cash/check handling
- Update mapping workbook with stale rows (Order.Status, TotalAmount, Pricebook, OrderItem, required fields, discount alias, date filter)
- Build OrderItem phase and Pricebook step in registrationFlow.ts
- Turn off test flags (TEST_MODE, TEST_LIMIT, TEST_SKIP)
- Create PricebookEntry.External_ID_4D__c field in UAT org
- Verify both price books active in UAT org
- Run purchase load sequence in UAT

**Checked live on 2026-11-02:** Google Workspace, the repository
### Last session — 2026-11-02
| | |
|---|---|
| Type | GENERAL |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements |
| Session | `51a1a748-4e1f-426c-9437-2dafc7a5da2b` |
**In its own words (excerpt):**
# Registration flow vs. the mapping doc

**Short answer:** the flow matches the Registration tab for everything except the OrderItem block, which isn't built at all. It also differs on Order status and TotalAmount, and has a few small extras.

I read the live Registration tab (rows 5–69) and `src/registrationFlow.ts` (all 1,457 lines) on `stanford-csp-orchestrate`. I didn't run the flow or check the org, so the org-behaviour notes come from the code's own comments.

## 1. What matches

| Workbook row(s) | Code | Status |
|---|---|---|
| `ID` → `Order.External_ID_4D__c` (Upsert) | Raw `Registration.ID` is the key on all four objects, no prefix | ✅ |
| `Student_ID` → `AccountId` on CardPaymentMethod, Order, Payment | Resolved through `Account.Student_ID_4D__c` in the bulk job | ✅ |
| `Order.BillToContact` | `BillToContact.Student_ID_4D__c` | ✅ |
| Billing address → CardPaymentMethod and Order | Uses `PaymentMethodStreet/City/StateCode/PostalCode/CountryCode`. Order uses `Billing*`. Country and state are converted to codes. | ✅ |
| Card type, expiry month and year, last four, cardholder names | All mapped. Expiry is parsed from the packed `610` form. | ✅ |
| Order fields: `Adjustment_

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
