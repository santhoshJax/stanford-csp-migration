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
**Status:** at risk — Registration patch ready; Order type marking decision needed. Awaiting architect on 3 defaults + ATE, and org confirmation on fields & pric…

**Done this session**
- Confirmed Order external ID prefixes: Registration uses raw ID, Purchase uses PUR- prefix
- Confirmed line item external ID prefix is PI- for purchase items, ENR- for registration (no collision)
- Identified gap: no Order.Type or record type marking the two order types; recommended standard Order.Type field

**Open items**
- Apply registration-orderitems-draft-activate.patch via Build session
- Architect confirms: UnitPrice = Tuition (not Extension), INCLUDE_DROP_ROWS = false, INCLUDE_ADJUSTMENT_ROWS = false
- Architect confirms: negative UnitPrice handling in org
- Architect confirms: ATE population decision (Sep 28 decision vs. mapping doc)
- Decide: use standard Order.Type field or record types to mark Registration vs. Purchase orders
- Add Skipped tab to reportResults.ts for both Registration and Purchase Item flows
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP before full run
- Verify Student__r.Student_ID_4D__c and Course_Offering__r.External_ID_4D__c field names in UAT org

**Decisions**
- Registration flow two-round: Draft load, then OrderItem load, then Activation
- OrderItem key: ENR-{Enrollment.ID} for registration; PI-{Purchase_Item.ID} for purchase
- Order external ID: raw Registration ID for registration orders; PUR-{Purchase.ID} for purchase orders
- TotalAmount unmapped; Salesforce calculates from line items
- Skip Drop, AJST, New, DupEnrollment rows in OrderItem load
- Blank Status counts as New in enrollment rule
- Index version incremented to 2
- Product2 upsert keyed on External_ID_4D__c = Course.ID

**Blockers**
- Patch must be applied via Build session (General session cannot push code)
- Order.Type marking decision needed before full run (standard field vs. record types)
- Architect confirmation needed on 3 defaults and ATE decision
- PricebookEntry.External_ID_4D__c field must be created in UAT org
- Both price books must be active in UAT org before purchase load run

**Next**
- Decide Order.Type marking approach and communicate choice
- Post Slack message to architect with 3 defaults + ATE decision request
- Start Build session to apply registration-orderitems-draft-activate.patch
- If Order.Type chosen: add one-line constant to both flows; update existing registration orders in UAT
- Extend patch or follow-up to add Skipped tab in reportResults.ts
- Verify field names and price book status in UAT org
- Turn off test flags in both flows
- Run purchase load sequence in UAT

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
I checked the code on `stanford-csp-orchestrate` (commit `89984d6`) and changed nothing. Short answers: yes to 1, no to 2 (the prefix is `PI-`, not `PIT-`), and nothing marks the two Order types yet.

## 1. Order external IDs: yes, purchase orders use `PUR-`

| Order source | `Order.External_ID_4D__c` |
|---|---|
| Registration | The raw Registration ID, e.g. `1234` |
| Purchase | `PUR-` + Purchase ID, e.g. `PUR-1234` |

Both ID ranges start at 1, so without the prefix a purchase would overwrite the registration order with the same number. Registration keeps raw IDs because they're already loaded in UAT. The same `PUR-` prefix goes on the purchase CardPaymentMethod, PaymentGroup and Payment records.

## 2. Line item external IDs: the prefix is `PI-`, not `PIT-`

- **Purchase line items** use `PI-` + Purchase_Item ID, e.g. `PI-5678`.
- **Registration line items** don't exist on the branch yet. The registration flow says it creates no OrderItems. The registration line item change from the other session is still an unapplied patch, and its notes say it would key them as `ENR-` + Enrollment ID.

So the two kinds of line item can't collide: one starts `PI-` and the other `ENR-`. Student

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
