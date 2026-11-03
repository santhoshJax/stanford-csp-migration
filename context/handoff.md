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
### Engagement state — 2026-11-03
**Status:** blocked — I read the whole standup transcript (about 75 minutes, 61,645 characters) and checked it against the latest code on `stanford-csp-orchestra…

**Done this session**
- I read the whole standup transcript (about 75 minutes, 61,645 characters) and checked it against the latest code on `stanford-csp-orchestrate` (`0d9e218`). The newer commits on GitHub only touch the handoff notes and one small text-length…

**Open items**
- Architect decision: Registration Item lookup strategy (Course Offering vs. Product External_ID)
- Architect decision: keep or delete unused Product/PricebookEntry code after removal
- Architect decision: Order.Type__c field vs. record type to mark Registration vs. Purchase orders
- Architect decision: Payments table as sole payment source or other sources exist
- Architect decision: historical Orders end state (Draft or Activated)
- Verify Tuition sign on Drop/AJST rows in real Enrollment file (positive vs. negative)
- Verify UAT org: Student__r.Student_ID_4D__c, Course_Offering__r.External_ID_4D__c field names, price books active
- Review and merge PR #1 to main

**Decisions**
- REG- prefix applied to registration orders, cards, payment groups, payments
- ENR- prefix for registration line items; PIT- for purchase line items
- registrationExtId() shared function ensures consistent key generation
- Registration flow two-round: Draft load, then OrderItem load, then Activation
- Drop and AJST enrollment rows each generate separate line items
- Line item price sourced from Tuition field, not Extension
- All enrollment rows (Add, Drop, AJST, New, DupEnrollment, Course cancel) generate line items
- Product2 upsert keyed on External_ID_4D__c = Course.ID

**Blockers**
- Order marking strategy (Order.Type__c vs. record type) blocks full run
- Architect confirmation needed on payment source scope and historical order end state
- Registration Item course Product lookup strategy must be decided before course Product removal

**Next**
- Architect decides: Registration Item lookup on Course Offering or Product External_ID
- Architect decides: delete or keep unused Product/PricebookEntry code
- Architect decides: build with diff review or build and push directly
- Obtain real Drop/AJST Enrollment rows from 4D to verify Tuition sign
- Verify UAT org: price books active, External_ID_4D__c field exists on PricebookEntry

**Checked live on 2026-11-03:** meeting transcripts
### Last session — 2026-11-03
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
I read the whole standup transcript (about 75 minutes, 61,645 characters) and checked it against the latest code on `stanford-csp-orchestrate` (`0d9e218`). The newer commits on GitHub only touch the handoff notes and one small text-length helper, so none of the logic below is affected. I haven't changed any code.

## Decided in the meeting

| Topic | What Trevor said | Does the code match? |
|---|---|---|
| All enrollment rows | Bring in every status, including New and DupEnrollment. "If they tell us that's no good, we'll deal with it then." | Yes, done in `50546de` |
| Drops and adjustments | Positive and negative rows each get their own line item | Yes, done in `4632ca4` |
| Order type | Not needed: "an order is an order." The `REG-` / `PUR-` prefix is enough to tell them apart | Yes, nothing to build |
| Discount type | Stays at the Order level only, not on the line item or the adjustment | Yes, `TA_Discount_Type__c` is already on Order |
| Payment methods | Every card on Registration and Purchase gets its own record. No duplicate check, because the last four digits and expiry can't identify a card | Yes, card records are insert-per-row |
| Payments table | Never create card rec

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
