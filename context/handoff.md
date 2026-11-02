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
**Status:** on track — Patch committed & pushed to stanford-csp-orchestrate (eaf36e5). PR auto-added. Awaiting architect decisions & UAT field verification.

**Done this session**
- Patch committed to stanford-csp-orchestrate branch (eaf36e5)
- Pushed to GitHub remote
- Skipped tab completed for both Registration Item and Purchase Item flows
- Type check & 143 tests passing (5 known Student-flow tests ignored)

**Open items**
- Architect confirms: UnitPrice = Tuition, INCLUDE_DROP_ROWS = false, INCLUDE_ADJUSTMENT_ROWS = false
- Architect confirms: negative UnitPrice handling in org
- Architect confirms: ATE population decision (Sep 28 decision vs. mapping doc)
- Decide: use standard Order.Type field or record types to mark Registration vs. Purchase orders
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP before full run
- Verify Student__r.Student_ID_4D__c and Course_Offering__r.External_ID_4D__c field names in UAT org
- Open/refresh PR #1, review, merge to main
- Run Deploy session to ship code to target org

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
- Open/refresh PR #1 on GitHub, review, and merge to main
- Run Deploy session to ship committed code to target org

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

The commit is pushed to `stanford-csp-orchestrate`. The remote branch head is now `eaf36e5`, which matches my local commit. As you asked, I didn't create a PR or post a comment. PR #1 is still open from this branch, though, so GitHub has added this commit to it automatically.

**Commit `eaf36e5`:** "Add Registration Item OrderItem load and Draft-then-Activate orders" (10 files, +1066 / −25). The message covers:
- **Registration Import:** Orders now load as Draft with the price book set. A new "Activate Registration Orders" setting runs the second round that activates them. TotalAmount stays unmapped.
- **New Registration Item Import:** one OrderItem per enrollment, keyed `ENR-{Enrollment.ID}`, with the def

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
