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
**Status:** on track — Code committed & pushed (eaf36e5). PR auto-added. Architect decisions & UAT verification pending.

**Done this session**
- Analyzed prefix strategy; confirmed REG- not needed, PUR- kept as Order marker until type decision

**Open items**
- Architect confirms: UnitPrice = Tuition, INCLUDE_DROP_ROWS = false, INCLUDE_ADJUSTMENT_ROWS = false
- Architect confirms: negative UnitPrice handling in org
- Architect confirms: ATE population decision (Sep 28 decision vs. mapping doc)
- Decide: use standard Order.Type field or record types to mark Registration vs. Purchase orders
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP before full run
- Verify Student__r.Student_ID_4D__c and Course_Offering__r.External_ID_4D__c field names in UAT org
- Check Payments, Enrollment, Purchase Item ID ranges to confirm PAY-, ENR-, PIT- prefixes needed
- Open/refresh PR #1, review, merge to main

**Decisions**
- Registration flow two-round: Draft load, then OrderItem load, then Activation
- OrderItem key: ENR-{Enrollment.ID} for registration; PIT-{Purchase_Item.ID} for purchase
- Order external ID: raw Registration ID for registration orders; PUR-{Purchase.ID} for purchase orders
- TotalAmount unmapped; Salesforce calculates from line items
- Skip Drop, AJST, New, DupEnrollment rows in OrderItem load
- Blank Status counts as New in enrollment rule
- Index version incremented to 2
- Product2 upsert keyed on External_ID_4D__c = Course.ID

**Blockers**
- Architect confirmation needed on 3 defaults and ATE decision
- Order.Type marking decision needed before full run
- PricebookEntry.External_ID_4D__c field must exist in UAT org
- Both price books must be active in UAT org

**Next**
- Post Slack message to architect with 3 defaults + ATE decision request
- Decide Order.Type marking approach (standard field vs. record types) and communicate
- Verify UAT org: price books active, PricebookEntry.External_ID_4D__c field exists, field names correct
- Check Payments, Enrollment, Purchase Item ID ranges in source data
- Open/refresh PR #1 on GitHub, review, and merge to main
- Run Deploy session to ship committed code to target org

**Checked live on 2026-11-02:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-02
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
You're right. With those ranges, Registration and Purchase IDs can't collide, so `REG-` isn't needed. I recommend we drop it and change nothing, which is how the code works today. `PUR-` isn't needed to prevent collisions either, but it does a second job I'd keep it for until the Order type question is settled.

## Why the prefixes were added

The code comment in `purchaseFlow.ts` gives the original reason: *"Purchase.ID values overlap (both start at 1). Without a prefix, a Purchase upsert would silently OVERWRITE the Registration record with the same number."*

Your numbers show that premise was wrong. Registration IDs run 20044 → 592436118 and Purchase IDs are 1 → under 500. The gap is huge. A clash only matters because an upsert on a shared key overwrites the existing record without any error. With these ranges, that can't happen.

## Prefix by prefix

| Prefix | Needed to avoid a clash? | Recommendation |
|---|---|---|
| `REG-` (Registration Orders, card records, payment groups, payments) | No. It was never built. | **Drop it.** Payments Import keeps finding the payment group by the raw Registration ID, as it does now. Nothing to change. |
| `PUR-` (Purchase Orders etc.) | No, 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
