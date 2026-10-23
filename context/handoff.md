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
**Status:** at risk — Account Login retry & batching fixes pushed (67e10fd, 5f2be48); ready to redeploy. LIMIT_EXCEEDED & job 750WH00000gdMIFYA2 status still ope…

**Done this session**
- Reduced batch size to 500 rows; added 10-min wait limit per run with hand-off up to 6 times
- Implemented exponential backoff retry (2s–30s) for Salesforce 429/5xx/socket errors on job status & file downloads
- All 14 Account Login tests + 21 retry tests pass; type check clean

**Open items**
- Check job 750WH00000gdMIFYA2 in Bulk Data Load Jobs; confirm 360 Users created or identify LIMIT_EXCEEDED failures
- Check Salesforce Setup: Student_Profile user licences and storage usage (org limit issue)
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
- Resume import from byte 18,468,950; check first batch log for LIMIT_EXCEEDED or success
- If LIMIT_EXCEEDED persists, check Setup → Company Information for Student_Profile licences & storage usage
- Decide: open PR to main now, or add safeguard for org-level batch failures first

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
I made two code changes to the Account Login import in this session. Both are pushed to `stanford-csp-orchestrate`. Neither has been deployed or run yet. The branch head is now `9562b28`, but the only commit after my last code change just updates `context/handoff.md`.

## What I changed

**1. Batches no longer time out (commit `67e10fd`)**
- **Problem:** the second batch waited on Salesforce job `750WH00000ga5nNYAQ` until it hit the 15-minute run limit (E100), and the import stopped there.
- **Smaller batches:** each run now handles 500 rows instead of 2,000.
- **Wait limit:** a run now waits at most 10 minutes for the job. If the job is still running, the run passes the job Id and its place in the file to the next run, which carries on waiting. The Users aren't uploaded twice.
- **Hand-off limit:** a job can be handed on 6 times, about an hour in total, so a stuck job can't loop forever.
- **Finishing the batch:** the flow builds the results rows from Salesforce's success and failure files, then assigns the permission sets.
- **Files and tests:** this touched `src/accountLoginFlow.ts`, `src/utils.ts`, the tests and `ARCHITECTURE.md`. All 14 Account Login tests pass.

**2. A droppe

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
