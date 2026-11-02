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
**Status:** at risk — Code complete with REG- prefixes; architect decision on Order marking still blocks full run

**Done this session**
- Verified all four places now use REG- prefix for registration orders/cards/payments
- Confirmed no raw registration keys remain in source code
- Validated 146 tests pass, code compiles cleanly

**Open items**
- Architect decision: Order.Type__c field vs. record type to mark Registration vs. Purchase orders
- Architect decision: Payments table as sole payment source or other sources exist
- Architect decision: historical Orders end state (Draft or Activated)
- Verify UAT org: Student__r.Student_ID_4D__c, Course_Offering__r.External_ID_4D__c field names, price books active
- Review and merge PR #1 to main
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP before full run
- Run sf deploy validate against target org
- Run Deploy session to ship code to target org

**Decisions**
- REG- prefix applied to registration orders, cards, payment groups, payments
- ENR- prefix for registration line items; PIT- for purchase line items
- registrationExtId() shared function ensures consistent key generation
- Registration flow two-round: Draft load, then OrderItem load, then Activation
- Skip Drop, AJST, New, DupEnrollment rows in OrderItem load
- Product2 upsert keyed on External_ID_4D__c = Course.ID
- Index version incremented to 2
- UAT has no registration orders yet—no re-keying needed

**Blockers**
- Order marking strategy (Order.Type__c vs. record type) blocks full run—REG-/PUR- prefix currently the only differentiator
- Architect confirmation needed on payment source scope and historical order end state

**Next**
- Architect confirms Order marking decision (field vs. record type), payment source scope, historical order status
- Verify UAT org: price books active, External_ID_4D__c field exists on PricebookEntry
- Review and merge PR #1 to main
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP in code
- Run Deploy session: validate then deploy to target org

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
The other session's change is on the branch, so there's nothing left for me to change on the purchase side.

**What's on `stanford-csp-orchestrate` now (head `c40191e`, my local copy is updated to match):**
- Commit `2f98740`, "Prefix Registration external IDs with REG-", covers all four places I listed:
  - `commerceShared.ts` now has the shared `REG-` prefix and the `registrationExtId()` helper that builds the key.
  - `registrationFlow.ts` uses `REG-` for card, Order and Payment. PaymentGroup reuses the Order's key, so it gets `REG-` too.
  - `registrationItemFlow.ts` finds each line item's Order by `REG-` + Registration ID.
  - `paymentsFlow.ts` finds and checks PaymentGroups by `REG-` + Registration ID.
- I searched the source and found nowhere that still builds or looks up a raw registration key.

**External ID prefixes in the code now:**

| Records | Prefix |
|---|---|
| Registration orders, cards, payment groups, payments | `REG-` |
| Purchase orders, cards, payment groups, payments | `PUR-` |
| Registration line items | `ENR-` |
| Purchase line items | `PIT-` |
| Payments flow records | `PAY-` |

**A correction:** last turn I said registration orders were already loaded in

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
