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
**Status:** at risk — Code ready for REG- prefix; UAT data migration risk blocks full run

**Done this session**
- Mapped all code changes needed to add REG- prefix (4 files, ~10 lines)
- Identified test updates required (registrationItemFlow.test.ts, commerceFlows.test.ts)
- Documented data risk: existing UAT records keyed on raw IDs will duplicate if prefix applied

**Open items**
- Architect confirms: UnitPrice = Tuition, INCLUDE_DROP_ROWS = false, INCLUDE_ADJUSTMENT_ROWS = false
- Architect confirms: negative UnitPrice handling in org
- Architect confirms: ATE population decision (Sep 28 decision vs. mapping doc)
- Decide: use standard Order.Type field or record types to mark Registration vs. Purchase orders
- Decide: apply REG- prefix to registration orders or keep raw IDs (impacts UAT data already loaded)
- If applying REG- prefix: re-key or delete/reload existing registration records in UAT org
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP before full run
- Verify Student__r.Student_ID_4D__c and Course_Offering__r.External_ID_4D__c field names in UAT org

**Decisions**
- Registration flow two-round: Draft load, then OrderItem load, then Activation
- OrderItem key: ENR-{Enrollment.ID} for registration; PIT-{Purchase_Item.ID} for purchase
- Order external ID: raw Registration ID for registration orders; PUR-{Purchase.ID} for purchase orders (pending prefix decision)
- TotalAmount unmapped; Salesforce calculates from line items
- Skip Drop, AJST, New, DupEnrollment rows in OrderItem load
- Blank Status counts as New in enrollment rule
- Index version incremented to 2
- Product2 upsert keyed on External_ID_4D__c = Course.ID

**Blockers**
- REG- prefix decision: code changes ready but UAT has existing records on raw IDs—applying prefix will create duplicates unless records are re-keyed or deleted first
- Architect confirmation needed on 3 defaults and ATE decision
- Order.Type marking decision needed before full run

**Next**
- Decide: apply REG- prefix and handle UAT data (re-key or delete/reload), or keep raw IDs for registration orders
- If REG- approved: implement 4 code changes + test updates, verify UAT data migration plan
- Post Slack message to architect with 3 defaults + ATE decision request + prefix/UAT data decision
- Decide Order.Type marking approach (standard field vs. record types) and communicate
- Verify UAT org: price books active, PricebookEntry.External_ID_4D__c field exists, field names correct
- Open/refresh PR #1 on GitHub, review, and merge to main
- Run Deploy session to ship code to target org

**Checked live on 2026-11-02:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-02
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Orders |
| Session | `f4cdddc2-dc81-4ddd-82f3-28dc8071f9d4` |
**In its own words (excerpt):**
I've finished checking the code and nothing has changed. If you keep both prefixes, **the purchase side is already done**: `PUR-` and `PIT-` are in place, and none of the purchase flows need changes. All the work is in adding `REG-` to the registration side. Three flows and their tests need updating, plus one data step in UAT.

I checked the latest `stanford-csp-orchestrate` (`1bdc854`). It now includes the Registration Item flow from commit `eaf36e5`.

## Code that has to change

| # | File | What changes |
|---|---|---|
| 1 | `commerceShared.ts` | Add one shared constant `REGISTRATION_EXT_PREFIX = "REG-"` and a small helper (for example `registrationKey(id)`), so all three flows build the key the same way. |
| 2 | `registrationFlow.ts` | Use `REG-` + Registration ID when building the **CardPaymentMethod, Order and Payment** records (3 places). PaymentGroup and the Payment-to-PaymentGroup link then pick up `REG-` automatically, because they reuse the Order's key. The activation round (Order lookup and activate) also follows without changes. |
| 3 | `registrationItemFlow.ts` | It finds each line item's Order by the raw Registration_ID in 2 places: the Order lookup (`loadOrderStates

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
