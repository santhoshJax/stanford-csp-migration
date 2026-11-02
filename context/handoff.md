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
**Status:** blocked — I checked the sample (it's 99 rows, not 100) against the Registration Import code on the branch (`044eacc`).

**Done this session**
- I checked the sample (it's 99 rows, not 100) against the Registration Import code on the branch (`044eacc`). All 99 rows are dated 3/30–4/1/2026, so they're all inside the 2-year cutoff of `2024-10-06`. The money columns also add up on eve…

**Open items**
- Architect decision: Order.Type__c field vs. record type to mark Registration vs. Purchase orders
- Architect decision: Payments table as sole payment source or other sources exist
- Architect decision: historical Orders end state (Draft or Activated)
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP before full run
- Verify UAT org: Student__r.Student_ID_4D__c, Course_Offering__r.External_ID_4D__c field names, price books active
- Run sf deploy validate against target org
- Review and merge PR #1 to main
- Run Deploy session to ship code to target org

**Decisions**
- REG- prefix applied to registration orders; PUR- and PIT- already in place for purchase orders
- registrationExtId() shared function ensures consistent key generation across all flows
- Registration flow two-round: Draft load, then OrderItem load, then Activation
- OrderItem key: ENR-{Enrollment.ID} for registration; PIT-{Purchase_Item.ID} for purchase
- Skip Drop, AJST, New, DupEnrollment rows in OrderItem load
- Product2 upsert keyed on External_ID_4D__c = Course.ID
- Index version incremented to 2

**Blockers**
- Order marking strategy (Order.Type__c vs. record type) blocks full run—REG-/PUR- prefix currently the only differentiator
- Architect confirmation needed on payment source scope and historical order end state

**Next**
- Post Slack to architect: Order marking decision (field vs. record type), payment source scope, historical order status
- Review PR #1 on GitHub and merge to main once architect confirms decisions
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP in code before Deploy
- Run Deploy session: validate against target org, then deploy to ship code live
- Verify UAT org field names and price book setup before data load

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
I checked the sample (it's 99 rows, not 100) against the Registration Import code on the branch (`044eacc`). All 99 rows are dated 3/30–4/1/2026, so they're all inside the 2-year cutoff of `2024-10-06`. The money columns also add up on every row: Courses_Subtotal + Reg_Fee + Discount_Amt + Adjustment − CC_Amt − Check_Amt = Balance_Due. Most rows load as expected, but I found two likely bugs, two places where a value gets dropped, and one design gap.

## What gets created from these 99 rows

| Row type | Rows | Order | Card record | Payment group | Payment |
|---|---|---|---|---|---|
| Paid with a card (including 2 partly STAP-covered: $35 and $31) | 55 | 55 | 55 | 55 | 55 |
| Drop rows ("Drop-Reg for: …") | 38 | 38 | 0 (no card details) | 38 | 0 (CC_Amt is 0) |
| STAP drop rows (no billing at all) | 2 | 2 | 0 | 2 | 0 |
| NOFEE (STAP covers everything) | 3 | 3 | 0 | 3 | 0 |
| Adjustment (592436039, CC_Amt −165) | 1 | 1 | 0 | 1 | 1, a **negative** $165 "Capture" |
| **Total** | **99** | **99** | **55** | **99** | **56** |

Discount types map cleanly: `65+` → Senior 65+, `STAP` → STAP Benefit, `SAA` → SAA Member, and `Teacher` and `CSP Full` match as they are. `not` is treated as no d

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
