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
**Status:** at risk — REG- prefix implemented & pushed; awaiting architect decisions on Order marking, payment source, historical status before full run

**Done this session**
- Implemented REG- prefix across all registration flows (commerceShared, registrationFlow, registrationItemFlow, Payments)
- Updated tests: 146 pass, prefix keys verified, PaymentGroup old-key rejection confirmed
- Fixed ARCHITECTURE.md: corrected ID overlap claim, documented prefix purpose, set ATE to 'not set'
- Committed to stanford-csp-orchestrate (2f98740) and pushed; PR #1 auto-updated

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

I've added the `REG-` prefix and pushed it to `stanford-csp-orchestrate` as commit `2f98740`. The remote branch head matches. I didn't create a new PR, but PR #1 is open from this branch, so it picks up the commit automatically.

## What changed
- **Shared rule:** a new `registrationExtId()` function in `commerceShared.ts` turns `560585` into `REG-560585`. All three flows use it.
- **Registration Import:** the Order, card and Payment records are now keyed `REG-{ID}`. The PaymentGroup reuses the Order's key, so it gets `REG-` too, and the round-2 activation lookup works without changes.
- **Registration Item Import:** each line item now finds its Order by `REG-{Registration_ID}`.
- **Payments Import:** find

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
