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
**Status:** at risk — Course correction mode committed & PR open; awaiting merge, config deploy, and live test run

**Done this session**
- Completed file reader change to filter and track correction IDs
- Connected correction mode to main flow with ID tracking across runs
- Added logging for each correction and unmatched IDs
- All course import tests pass (16/16); type check clean
- Committed to stanford-csp-orchestrate and opened PR #1

**Open items**
- Review and merge PR #1 to main
- Run npm run import to deploy Course Correction Enabled setting
- Verify 8 correction rows on 'Course' tab in Correction Sheet ID
- Turn on Course Correction Enabled and run Course Import - All; verify logs show 8 corrections applied
- Add correction column to results sheet
- Re-run Enrollment import after Course import succeeds
- Remove TEST_MODE=true from src/accountLoginFlow.ts (line 109) before full 85-batch import

**Decisions**
- Option A: embedded correction table with conditional date override; all other fields from source TSV unchanged
- Correction table pattern matches Student, Instructor, Associate flows for consistency
- Tier 2 can run now; Tier 3 changes do not touch Tier 2 logic
- Execution order locked: Tier 1 → Tier 2 → Tier 3 (newest first)
- All-time Enrollment flow must run after All-time Course flow; Waiver after Enrollment

**Blockers**
- PR #1 not yet merged to main; change not live in org
- TEST_MODE=true still in src/accountLoginFlow.ts blocks full 85-batch import

**Next**
- Review and merge PR #1
- Run npm run import to activate Course Correction Enabled in config
- Enable correction mode and run Course Import - All; verify 8 offerings load with corrections applied
- Disable correction mode and re-run Enrollment import if it ran before

**Checked live on 2026-10-22:** the repository
### Last session — 2026-10-22
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseAllImport-StartEndDateIssueFix-Build |
| Session | `248ba686-4c07-4923-9742-10be97b27c14` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes
• Pushed to GitHub: no
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The Course correction-mode change is committed, pushed to `stanford-csp-orchestrate`, and open as a pull request to `main`: [PR #1](https://github.com/santhoshJax/stanford-csp-migration/pull/1). It can be merged cleanly.

**What I checked before pushing:**
- Commit `024a249` is now the head of the remote branch.
- The type check is clean and the build compiles.
- The course import tests all pass: 16 of 16, 12 of them new.
- 5 tests fail in `flows.test.ts`. I ran them without this change and they fail the same way, so they don't come from it. They're for a different flow.

**Steps for you:**
1. Review and merge the pull request.
2. Run `npm run import` so the new `Course Correction Enabled` setting appears in your integration.
3. Put the 8 r

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
