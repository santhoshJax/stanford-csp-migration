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
**Status:** blocked — Branch up to date at c40191e; PR #1 ready; architect decisions still needed on Order marking & payments

**Done this session**
- Verified branch is up to date with remote (c40191e)
- Confirmed no uncommitted changes since REG- prefix commit (2f98740)
- Confirmed PR #1 ready to merge once architect approves

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
Yes, the branch is up to date now. My local copy was one commit behind `stanford-csp-orchestrate` on GitHub. That commit was `c40191e`, the automatic handoff-notes update that ran when the last session ended, and it only changed `context/handoff.md`. I fast-forwarded the local copy to match it.

- **Against the remote branch:** they match exactly, at `c40191e`.
- **Against `main`:** nothing is missing from `main`, so no rebase is needed. The branch is 118 commits ahead, and PR #1 is still open for those commits.
- **Uncommitted changes:** none. No code has changed since the `REG-` prefix commit (`2f98740`), as you asked.

Sources: checked live: the repository (fetched from GitHub and compared with the remote branch and `main`) · not checked: the Salesforce org (none attached)
<!-- orchestrate:session-state:end -->
