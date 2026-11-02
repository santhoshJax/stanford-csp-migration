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
**Status:** on track — Patch committed & pushed (eaf36e5). Awaiting architect decisions on defaults, ATE, Order.Type marking, and prefix strategy.

**Done this session**
- Verified external ID prefix usage in codebase (PUR-, PIT-, ENR-, PAY- confirmed)
- Analyzed prefix necessity given ID ranges and shared key fields
- Documented rationale for keeping PUR- prefix

**Open items**
- Architect confirms: UnitPrice = Tuition, INCLUDE_DROP_ROWS = false, INCLUDE_ADJUSTMENT_ROWS = false
- Architect confirms: negative UnitPrice handling in org
- Architect confirms: ATE population decision (Sep 28 decision vs. mapping doc)
- Decide: use standard Order.Type field or record types to mark Registration vs. Purchase orders
- Decide: keep PUR- prefix on purchase orders or drop it (impacts Order.External_ID_4D__c disambiguation)
- If dropping PUR-, verify Payments flow and other lookups don't rely on it
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
- Architect confirmation needed on 3 defaults and ATE decision
- Order.Type marking decision needed before full run
- Prefix strategy decision (PUR-, PIT-) needed before full run

**Next**
- Post Slack message to architect with 3 defaults + ATE decision request
- Decide Order.Type marking approach (standard field vs. record types) and communicate
- Decide external ID prefix strategy: keep PUR-/PIT- or drop; if dropping, verify Payments flow and other lookups
- Verify UAT org: price books active, PricebookEntry.External_ID_4D__c field exists, field names correct
- Open/refresh PR #1 on GitHub, review, and merge to main
- Run Deploy session to ship committed code to target org

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
You're right. With those ranges, the prefixes aren't needed to keep the records apart today. Registration IDs (20044 to 592436118) and purchase IDs (1 to under 500) don't overlap, so a raw purchase ID can't overwrite a registration order.

One correction first. **The code on this branch doesn't use a `REG-` prefix.** I checked `stanford-csp-orchestrate` (head `2bff428`), and registration orders are keyed on the raw Registration ID. If `REG-` is used, it's in a flow or patch that isn't on this branch. The prefixes in the code today are:

| Records | External ID |
|---|---|
| Registration orders and their card, payment group and payment records | raw Registration ID |
| Purchase orders and their card, payment group and payment records | `PUR-` + Purchase ID |
| Purchase line items | `PIT-` + Purchase_Item ID |
| Payments flow records | `PAY-` + Payment ID |
| Enrollments (CourseOfferingParticipant) | `ENR-` + Enrollment ID |

**Why I still lean towards keeping `PUR-`**
1. **The ranges come from the data, not from a rule.** Nothing in 4D stops the purchase and registration ID sequences from running into each other later, or a re-export from bringing in different numbers. The prefix st

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
