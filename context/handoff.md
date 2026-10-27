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
### Engagement state — 2026-10-27
**Status:** at risk — Transcript Request & Product2 flows built & committed; Product2 prefix clash still blocks production—PR pending, deploy validate skipped

**Done this session**
- Transcript Request flow: row filters validated (Missing ID silent skip, 2-year scope 2024-07-07 fixed cutoff, empty entries dropped)
- Product2 step built into all three course flows, committed to stanford-csp-orchestrate (commit 8e29ccc)
- Product2 mapping: Name (255 char), Description (4000 char), ProductCode, IsActive=FALSE, Course_Offering__c lookup confirmed
- Mapping sheet rows 127–131 ticked for All & 5-Year flows; ARCHITECTURE.md updated
- Type check clean, 7 new Product tests pass, code pushed to GitHub

**Open items**
- Architect decision: assign Product2 external ID prefix format (e.g. CRS-{CourseID}, keep numeric for Purchase Inventory)
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code to confirm no org conflicts
- Open PR, review, merge to main once approved
- Schedule Deploy session to push Transcript Request and prefix-corrected flows to org
- Architect confirm: ATE population for past data (Sep 28 decision vs workbook)
- Confirm Order.Status: Draft on load then activate, or Activated (FAILED_ACTIVATION risk)
- Verify Product2.Course_Offering__c and External_ID_4D__c live in org before first run

**Decisions**
- MAX_ROWS = 500 per run; POLL_BUDGET_MS = 10 min; MAX_JOB_HANDOFFS = 6
- Skipped tab rolls over same as Success/Errors tabs when full
- Account Login retry: up to 5 attempts, exponential backoff 2s–30s; non-retryable errors fail immediately
- TEST_MODE = false for next full run
- ENR- prefix for Enrollment ID (existing, confirmed in workbook)
- Transcript Request: unmatched Student IDs sent to error CSV with warning log; no blocking
- Product2 step: IsActive=FALSE, no price book entries created yet

**Blockers**
- Product2.External_ID_4D__c clash: Purchase Inventory (ID 1,2,3…) and Course flows (ID 1,2,3…) both upsert same field—silent overwrites break downstream lookups; requires prefix assignment before either flow runs in production
- Code–workbook sync broken on ATE, Order.Status, OrderItem, and multi-term key—blocks Registration flow update
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED

**Next**
- Architect decision: assign Product2 external ID prefix format (e.g. CRS-{CourseID}, keep numeric for Purchase Inventory)
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code to confirm no org conflicts
- Open PR to main, review, merge once approved
- Schedule Deploy session to push both Transcript Request and prefix-corrected flows to org

**Checked live on 2026-10-27:** the repository
### Last session — 2026-10-27
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseEnhancement-Products |
| Session | `fb62e2a5-4dd6-4b7d-bb02-3ebab9e5ae57` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch stanford-csp-orchestrate)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The Product step is built into all three course flows and pushed to `stanford-csp-orchestrate` as commit `8e29ccc`. I checked that the remote branch now points at that commit and that nothing is left uncommitted.

**What it does**
- After each Course Offering is saved, the flow upserts a Product2 keyed on `External_ID_4D__c` = Course.ID (for example `20081_WSP 138`).
- The Product's `Course_Offering__c` lookup points at that Course Offering.
- Field values:
  - `Name` is the cleaned-up Title, up to 255 characters.
  - `Description` is cut to 4,000 characters.
  - `ProductCode` is the full code as it is (for example `OWC 303 A`).
  - `IsActive` is FALSE.
- If the Course Offering fails, no Product is created

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
