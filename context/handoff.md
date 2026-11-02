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
**Status:** at risk — Purchase Item prefix changed to PIT-; code committed & pushed. Awaiting architect on registration defaults, Order.Type decision, and UAT or…

**Done this session**
- Changed purchase line item prefix from PI- to PIT- in purchaseItemFlow.ts, tests, and ARCHITECTURE.md
- Committed 3 files (b48b665) and pushed to stanford-csp-orchestrate branch
- Verified project compiles with no errors; all 48 tests pass

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
- OrderItem key: ENR-{Enrollment.ID} for registration; PIT-{Purchase_Item.ID} for purchase
- Order external ID: raw Registration ID for registration orders; PUR-{Purchase.ID} for purchase orders
- TotalAmount unmapped; Salesforce calculates from line items
- Skip Drop, AJST, New, DupEnrollment rows in OrderItem load
- Blank Status counts as New in enrollment rule
- Index version incremented to 2
- Product2 upsert keyed on External_ID_4D__c = Course.ID

**Blockers**
- Registration patch not yet applied (requires Build session)
- Order.Type marking decision needed before full run
- Architect confirmation needed on 3 defaults and ATE decision
- PricebookEntry.External_ID_4D__c field must exist in UAT org
- Both price books must be active in UAT org

**Next**
- Open PR on GitHub for stanford-csp-orchestrate → review → merge to main
- Schedule Deploy session to ship merged code to Salesforce
- Post Slack message to architect with 3 defaults + ATE decision request
- Decide Order.Type marking approach (standard field vs. record types) and communicate
- Verify UAT org: price books active, PricebookEntry.External_ID_4D__c field exists, field names correct
- Apply registration-orderitems-draft-activate.patch in next Build session
- Turn off test flags and run purchase load sequence in UAT

**Checked live on 2026-11-02:** the repository
### Last session — 2026-11-02
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Orders |
| Session | `f4cdddc2-dc81-4ddd-82f3-28dc8071f9d4` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch stanford-csp-orchestrate)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The `PIT-` change is committed and pushed to `stanford-csp-orchestrate` as commit `b48b665`. The GitHub branch now points to that commit, and `purchaseItemFlow.ts` on GitHub shows `ORDER_ITEM_EXT_PREFIX = "PIT-"`. Nothing went to `main` or Salesforce.

**What's in the commit (3 files, 5 lines):**
- `src/purchaseItemFlow.ts`: purchase line items are now keyed `PIT-` + Purchase_Item ID, e.g. `PIT-101`.
- `src/commerceFlows.test.ts`: the test now expects `PIT-101`.
- `ARCHITECTURE.md`: both tables that listed the prefix now say `PIT-{id}`.

**Checks before committing:** the project compiles with no errors, and all 48 purchase and course price book tests pass. I didn't re-run the full suite this time.

**Uncha

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
