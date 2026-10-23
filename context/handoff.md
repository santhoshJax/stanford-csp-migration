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
### Engagement state — 2026-10-23
**Status:** at risk — Batching & retry fixes ready; performance review complete. Job 750WH00000gdMIFYA2 status & org limits still unknown.

**Done this session**
- Reviewed Account Login flow performance; identified 5 causes of slow windows (User automation, Enrollment file re-read, results sheet row count, permission set batching, fixed costs)

**Open items**
- Check job 750WH00000gdMIFYA2 in Bulk Data Load Jobs; confirm 360 Users created or identify LIMIT_EXCEEDED failures
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
- Redeploy Account Login integration from stanford-csp-orchestrate (head 9562b28)
- Check Setup → Bulk Data Load Jobs for job 750WH00000gdMIFYA2 final status and record counts
- Check Setup → Object Manager → User for triggers, flows, and Experience Cloud welcome email settings
- Resume import from byte 18,468,950; check first batch log for LIMIT_EXCEEDED or success
- If LIMIT_EXCEEDED persists, check Setup → Company Information for Student_Profile licences & storage usage

**Checked live on 2026-10-23:** the repository
### Last session — 2026-10-23
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
I reviewed the code only and changed nothing. Most of each window's time is Salesforce creating the Users. On top of that, two parts of the flow repeat work every window, and one of them gets slower as the import goes on.

## Where the time goes in one window

These timings come from your 08:22 log, a 500-row window that took 53 seconds in total:

| Step | Time | Same every window? |
|---|---|---|
| Platform start | 1–4 s | Yes |
| Read 500 Account Login rows from Drive | ~1 s | Yes, cheap |
| Profile and permission set lookups | <1 s | Yes |
| **Read the whole Enrollment file** | **~7 s** | **Yes, the same file every time** |
| Account/Contact lookup (3 queries of 200) | <1 s | Yes |
| **Salesforce Bulk job for the Users** | **~39 s** (426 rows) | **No: depends on the org** |
| Permission sets, results sheet, next run | a few s | **Grows over the run** (see 3) |

For comparison, the 2,000-row window on 22 Oct waited more than 14 minutes on its job.

## The causes, biggest first

**1. Salesforce is slow to create Users (most of the time).**
- The flow only waits in this step. It checks the job every 2 seconds and does nothing else, so the time is spent inside Salesforce.
- User rec

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
