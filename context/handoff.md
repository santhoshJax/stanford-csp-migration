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
**Status:** at risk — Transcript Request flow code committed & pushed (3bfbfd7); not yet validated or deployed. Blocker: ATE/Order.Status/OrderItem architect dec…

**Done this session**
- Transcript Request flow refactored: Student__c now resolves Person Account by Student_ID_4D__c match
- Contact__c populated from PersonContactId; deleted Account__c and Student_ID__c fields
- Unmatched Student IDs logged as warnings, sent to error CSV for visibility
- 5 new unit tests added (bulk case + edge cases); all pass
- Code committed to branch 3bfbfd7 and pushed to GitHub; typecheck clean

**Open items**
- Validate code deploy (sf deploy validate) before PR merge
- Open PR on stanford-csp-orchestrate, review, merge to main
- Run Deploy session to ship to org (not live yet)
- Architect confirm: ATE population for past data (Sep 28 decision vs workbook)
- Confirm Order.Status: Draft on load then activate, or Activated (FAILED_ACTIVATION risk)
- Define external ID prefixes for Order, OrderItem, Product; confirm Registration prefix & Product Name source
- Fix ATE lookup key to include term (registration-plus-term) for multi-term checkouts
- Decide: Adjustment records get OrderItem? Dropped enrollments charged? UnitPrice = Tuition or Extension?

**Decisions**
- MAX_ROWS = 500 per run; POLL_BUDGET_MS = 10 min; MAX_JOB_HANDOFFS = 6
- Skipped tab rolls over same as Success/Errors tabs when full
- Account Login retry: up to 5 attempts, exponential backoff 2s–30s; non-retryable errors fail immediately
- TEST_MODE = false for next full run
- ENR- prefix for Enrollment ID (existing, confirmed in workbook)
- Transcript Request: unmatched Student IDs sent to error CSV with warning log; no blocking

**Blockers**
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- Code–workbook sync broken on ATE, Order.Status, OrderItem, and multi-term key—blocks Registration flow update
- Transcript Request flow not yet validated or deployed; first org run will reveal unmatched Student ID volume

**Next**
- Run sf deploy validate on commit 3bfbfd7 to confirm no org conflicts
- Open PR on GitHub, request review, merge to main once approved
- Schedule Deploy session to push to Salesforce org
- Architect decision meeting: confirm ATE past-data strategy and Order.Status approach
- Once architect decisions made, update Registration tab workbook and draft delta sheet for team review

**Checked live on 2026-10-27:** the repository
### Last session — 2026-10-27
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-TranscriptRequestUpdates |
| Session | `142b7fd5-2422-4c75-8ca4-5c332d6519db` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch 3bfbfd7)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I pushed the change to `stanford-csp-orchestrate` as commit `3bfbfd7`, and the remote branch now points at it. No PR was opened, as you asked.

**What the Transcript Request flow does now:**
- **`Student__c`** gets the Id of the Person Account whose `Student_ID_4D__c` matches the source Student_ID.
- **`Contact__c`** gets that Person Account's `PersonContactId`.
- **The deleted fields** `Account__c` and `Student_ID__c` are no longer sent.
- **Rows with no matching Person Account** are still sent, as you decided. The raw Student_ID goes into `Student__c`, so Salesforce rejects the record and it shows up in the results-sheet error CSV. The flow also logs a warning listing the unmatched Student IDs.

**The commit has 3 files:

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
