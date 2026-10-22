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
### Engagement state — 2026-10-22
**Status:** at risk — Course corrections config merged; Account Login timeout fix pushed. Both await deployment & verification.

**Done this session**
- Pushed Account Login timeout fix (commit 67e10fd) to stanford-csp-orchestrate branch
- Type check clean; all 14 Account Login tests pass; no new lint findings
- Confirmed batch hand-off logic: job waits max 10 min, passes to next run if still running (up to 6 hand-offs)

**Open items**
- Merge PR #1 (Course Correction Sheet ID config) to main
- Deploy both changes (PR #1 + Account Login timeout fix) to org
- Run npm run import to activate new config fields
- Verify Student/Instructor/Associate Correction Sheet ID retained old value after import
- Set Course Correction Sheet ID to client's converted sheet; turn on Course Correction Enabled
- Run Course Import - All; verify 8 corrections applied in logs
- Check job 750WH00000ga5nNYAQ status in Salesforce; re-run Account Login from batch byte 317,780
- Remove TEST_MODE=true from src/accountLoginFlow.ts (line 109) before full 85-batch import

**Decisions**
- Option A: embedded correction table with conditional date override; all other fields from source TSV unchanged
- Correction table pattern matches Student, Instructor, Associate flows for consistency
- Tier 2 can run now; Tier 3 changes do not touch Tier 2 logic
- Execution order locked: Tier 1 → Tier 2 → Tier 3 (newest first)
- All-time Enrollment flow must run after All-time Course flow; Waiver after Enrollment
- Course corrections read only from Course Correction Sheet ID; Student/Instructor/Associate read from shared setting
- Account Login batch waits max 10 min for User job; hands off job ID to next run if still running (max 6 hand-offs)

**Blockers**
- PR #1 not yet merged to main; changes not live in org
- Account Login timeout fix not yet deployed; full 85-batch import blocked until deployed and re-run from job 750WH00000ga5nNYAQ

**Next**
- Merge PR #1 to main
- Deploy both branches (PR #1 + Account Login timeout fix) to org
- Check job 750WH00000ga5nNYAQ in Salesforce; verify Users exist and permission sets pending
- Re-run Account Login from batch byte 317,780 with deployed timeout fix
- Run npm run import to activate Course Correction Sheet ID config
- Set Course Correction Sheet ID and turn on Course Correction Enabled; run Course Import - All

**Checked live on 2026-10-22:** the repository
### Last session — 2026-10-22
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch origin)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I've pushed the timeout fix to `stanford-csp-orchestrate` as commit `67e10fd`. I checked GitHub afterwards and the branch points to that commit. It hasn't been redeployed or run yet.

**Why your second batch failed:** it uploaded 1,664 Users, then waited for Salesforce to finish that job (`750WH00000ga5nNYAQ`). It was still waiting when it hit the 15-minute run limit (E100). The run was cut off before it could write results or start the next batch, so the import stopped there.

**What the fix does (4 files, +385 / −70)**
- **Wait limit:** a batch now waits at most 10 minutes for the User job.
- **Hand-off:** if the job is still running after 10 minutes, the batch passes the job Id to the next run, which picks up the wait. I

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
