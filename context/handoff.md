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
**Status:** at risk — 15,000 missing rows traced to non-enrolled students (Rule 4) & incomplete runs. Job 750WH00000gdMIFYA2 status still unknown.

**Done this session**
- Root cause confirmed: ~15,000 rows filtered before sheet write (Rules 1–6, mostly Rule 4: not enrolled)
- Identified all six filtering rules and their log signatures
- Located two incomplete runs: 22 Oct job 750WH00000ga5nNYAQ (1,664 Users, timeout), 23 Oct job 750WH00000gdMIFYA2 (360 Users, socket hang up)
- Documented how to manually split 15,000 rows across logs and sheets

**Open items**
- Check job 750WH00000gdMIFYA2 in Bulk Data Load Jobs; confirm 360 Users created or identify failures
- Check Salesforce Setup: Student_Profile user licences and storage usage (org limit issue)
- Check Setup → Object Manager → User → Triggers and Flows; check Experience Cloud welcome email setting
- Verify Total_Hours__c, Tuition_Adjustment__c, Tuition_Adjustment_Note__c exist on CourseOffering
- Deploy Course 5-Year flow & run test; confirm values appear on CourseOffering records
- Redeploy Account Login integration from stanford-csp-orchestrate & resume from byte 18,468,950
- Merge PR #1 (Course Correction Sheet ID config) to main & deploy
- Open PR for Account Login batching & retry fixes to main

**Decisions**
- MAX_ROWS = 500 per run; POLL_BUDGET_MS = 10 min; MAX_JOB_HANDOFFS = 6
- Hand-off passes pendingJobId & file position; recordsFromResultCsvs rebuilds from Salesforce CSVs
- Account Login retry: up to 5 attempts, exponential backoff 2s–30s; non-retryable errors (401/404) fail immediately
- Course 5-Year flow uses same file ID setting as 2-year flow; All Courses flow unchanged
- TEST_MODE = false; next run is full import from byte 18,468,950

**Blockers**
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- Job 750WH00000gdMIFYA2 final status unknown after socket hang up; may have finished or failed

**Next**
- Manually count 15,000 rows: search logs for skipped=, collapsed, no Enrollment, no Account, no email, timeouts, socket hangs
- Check all Account Login sheets in Failed Records folder for Not Processed or (2) tabs
- Confirm job 750WH00000gdMIFYA2 status and 360 User record count in Bulk Data Load Jobs
- Check Setup → Company Information for Student_Profile licences & storage if LIMIT_EXCEEDED persists
- Decide: implement Skipped tab in Account Login flow or add to backlog
- Redeploy Account Login integration and resume from byte 18,468,950

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
I found the cause in the code; nothing was changed. **The results sheet only lists Users that were actually sent to Salesforce.** Every row the flow filters out before the upload is counted in the run log but never written to any tab. A few runs also ended before they reached the sheet step. That's where your ~15,000 rows are.

I couldn't count them by cause, because I can't see the run logs or the Drive files from this session. The steps at the end show how to split the 15,000.

## The rules the flow applies before creating a User
A row goes through these in order, and each one drops rows **without writing them to the sheet**:

| # | Rule | Where it shows | In the sheet? |
|---|---|---|---|
| 1 | Line has a different number of columns from the header (for example a tab or line break inside a field) | `skipped=` in the "Parsed 500 rows" line | No |
| 2 | Student_ID blank, `0`, not a number, or ending in `.0` | `skipped=` (same count as 1) | No |
| 3 | Same Student_ID more than once in a window: merged into one User | "N duplicate Student_ID row(s) collapsed" | Only 1 row per student |
| 4 | **Not enrolled:** no Enrollment row with Status = "Enrolled" | "N student(s) have no Enrollm

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
