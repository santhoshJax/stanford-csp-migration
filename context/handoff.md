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
### Engagement state — 2026-10-26
**Status:** at risk — Skipped-tab feature coded & pushed (6dd614b); awaiting deploy & validation. LIMIT_EXCEEDED blocker & job 750WH00000gdMIFYA2 status still un…

**Done this session**
- Skipped tab feature implemented: captures all filtered rows (column mismatch, invalid ID, duplicate, not enrolled, no Account, no email)
- 4 files changed (+451/−30); all 22 Account Login tests pass including new skipped.test.ts
- Commit 6dd614b pushed to stanford-csp-orchestrate branch on GitHub

**Open items**
- Open PR from stanford-csp-orchestrate to main; review & merge
- Deploy merged code to org via Deploy session
- Run one batch post-deploy; verify Skipped tab row count matches log (sum skipped=, collapsed, no Enrollment, no Account, no email)
- Confirm job 750WH00000gdMIFYA2 status & 360 User record count in Bulk Data Load Jobs
- Check Setup → Company Information: Student_Profile licences & storage (LIMIT_EXCEEDED persists)
- Resume full import from byte 18,468,950 once LIMIT_EXCEEDED resolved
- Redeploy Account Login integration with timeout & retry fixes

**Decisions**
- MAX_ROWS = 500 per run; POLL_BUDGET_MS = 10 min; MAX_JOB_HANDOFFS = 6
- Skipped tab rolls over same as Success/Errors tabs when full
- Account Login retry: up to 5 attempts, exponential backoff 2s–30s; non-retryable errors fail immediately
- TEST_MODE = false for next full run

**Blockers**
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- Job 750WH00000gdMIFYA2 final status unknown after socket hang up

**Next**
- Open pull request from stanford-csp-orchestrate to main
- Review & merge PR to main
- Schedule Deploy session to ship merged code to org
- Post-deploy: run one batch and validate Skipped tab row count vs. log
- Check Setup → Company Information for Student_Profile licence/storage limits
- Confirm job 750WH00000gdMIFYA2 status in Bulk Data Load Jobs

**Checked live on 2026-10-26:** the repository
### Last session — 2026-10-26
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch stanford-csp-orchestrate)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I pushed the Skipped-tab change to `stanford-csp-orchestrate` as commit `6dd614b`, and the branch on GitHub now points to it. It changes 4 files (+451 / −30). It isn't deployed or run yet.

**What changes**
- Each results spreadsheet now gets a **Skipped** tab, next to Success and Errors. It lists every row the flow drops before the Salesforce upload, with the Student_ID, the reason, and a short copy of the source line.
- Reasons used: column count mismatch, invalid Student_ID, duplicate Student_ID merged, not enrolled, no matching Account, no usable email.
- The Skipped tab rolls over the same way the other tabs do once it gets full.
- After this, every source row ends up in exactly one of Success, Errors

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
