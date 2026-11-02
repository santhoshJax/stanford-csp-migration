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
**Status:** at risk — Code complete with Drop/AJST line items; architect decisions on Order marking & payment scope still block full run

**Done this session**
- Enabled Drop and AJST enrollment rows to generate line items (INCLUDE_DROP_ROWS, INCLUDE_ADJUSTMENT_ROWS = true)
- Added tests for Drop and AJST rows producing separate ENR- keyed line items with correct pricing
- Updated ARCHITECTURE.md and comments to record Trevor's decisions on line item generation and Tuition pricing
- Committed and pushed to stanford-csp-orchestrate (head 4632ca4), PR #1 updated automatically

**Open items**
- Architect decision: Order.Type__c field vs. record type to mark Registration vs. Purchase orders
- Architect decision: Payments table as sole payment source or other sources exist
- Architect decision: historical Orders end state (Draft or Activated)
- Confirm handling of New and DupEnrollment enrollment rows (currently skipped, awaiting decision)
- Verify Tuition sign on Drop/AJST rows in real Enrollment file (positive vs. negative)
- Verify UAT org: Student__r.Student_ID_4D__c, Course_Offering__r.External_ID_4D__c field names, price books active
- Review and merge PR #1 to main
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP before full run

**Decisions**
- REG- prefix applied to registration orders, cards, payment groups, payments
- ENR- prefix for registration line items; PIT- for purchase line items
- registrationExtId() shared function ensures consistent key generation
- Registration flow two-round: Draft load, then OrderItem load, then Activation
- Drop and AJST enrollment rows each generate separate line items (Trevor 2026-11-02)
- Line item price sourced from Tuition field, not Extension (Trevor 2026-11-02)
- Skip New and DupEnrollment rows in OrderItem load (default, awaiting confirmation)
- Product2 upsert keyed on External_ID_4D__c = Course.ID

**Blockers**
- Order marking strategy (Order.Type__c vs. record type) blocks full run—REG-/PUR- prefix currently the only differentiator
- Architect confirmation needed on payment source scope and historical order end state

**Next**
- Architect confirms Order marking decision (field vs. record type), payment source scope, historical order status
- Confirm handling of New and DupEnrollment enrollment rows
- Obtain real Drop/AJST Enrollment rows from 4D to verify Tuition sign (positive vs. negative)
- Verify UAT org: price books active, External_ID_4D__c field exists on PricebookEntry
- Review and merge PR #1 to main
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP in code
- Run Deploy session: validate then deploy to target org

**Checked live on 2026-11-02:** the repository
### Last session — 2026-11-02
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch stanford-csp-orchestrate)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I've made the change and pushed it. The new commit is `4632ca4` on `stanford-csp-orchestrate`, and the remote branch now points at it. PR #1 is open from this branch, so it includes the commit automatically.

## What changed
- **Line item rules:** `INCLUDE_DROP_ROWS` and `INCLUDE_ADJUSTMENT_ROWS` are now `true` in `registrationItemFlow.ts`. Every Add, Drop and AJST enrollment row now becomes its own line item. Each line is keyed `ENR-{Enrollment.ID}` and sits on the row's `REG-` Order.
- **Tests:** Drop and AJST rows are no longer expected to be skipped. I added a test that runs an Add, a Drop and an AJST row for the same registration and checks they produce three separate lines, each with its own key and 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
