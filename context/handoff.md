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
**Status:** at risk — Account Login retry fix pushed (5f2be48); LIMIT_EXCEEDED & job 750WH00000gdMIFYA2 status still open

**Done this session**
- Pushed Account Login timeout retry fix to stanford-csp-orchestrate (5f2be48); 21 tests pass, type check clean
- Implemented exponential backoff (2s–30s) for Salesforce 429/5xx/socket errors on job status & file downloads

**Open items**
- Check Salesforce Setup: user licences on Student_Profile, Experience Cloud limits, storage usage
- Check job 750WH00000gdMIFYA2 in Bulk Data Load Jobs; confirm 360 Users created or identify LIMIT_EXCEEDED failures
- Verify Total_Hours__c, Tuition_Adjustment__c, Tuition_Adjustment_Note__c exist on CourseOffering
- Deploy Course 5-Year flow & run test; confirm values appear on CourseOffering records
- Deploy Account Login retry fix from stanford-csp-orchestrate & re-run from byte 20,375,310
- Merge PR #1 (Course Correction Sheet ID config) to main & deploy

**Decisions**
- MAX_ROWS = 500 per run; POLL_BUDGET_MS = 10 min; MAX_JOB_HANDOFFS = 6
- Hand-off passes pendingJobId & file position; recordsFromResultCsvs rebuilds from Salesforce CSVs
- TEST_MODE = false; next run is full import
- Pause Account Login integration until org licence/limit issue confirmed & resolved
- Course 5-Year flow uses same file ID setting as 2-year flow; All Courses flow unchanged
- Account Login retry: up to 5 attempts, exponential backoff 2s–30s; non-retryable errors (401/404) fail immediately

**Blockers**
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- Job 750WH00000gdMIFYA2 status unknown after socket hang up; may have finished or failed
- PR #1 not yet merged to main
- Course 5-Year target fields not yet verified in org

**Next**
- Check Salesforce Setup → Company Information for user licences (Student_Profile) and storage usage
- Check Setup → Bulk Data Load Jobs for job 750WH00000gdMIFYA2 final status and record counts
- Verify three CourseOffering fields exist in target org
- Deploy Course 5-Year flow & run test; confirm values on CourseOffering records
- Once org limits confirmed OK, deploy Account Login fix & re-run from byte 20,375,310

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
I pushed the fix to `stanford-csp-orchestrate` as commit `5f2be48`, and the branch on GitHub now points to it. It changes 2 files (+187 / −17). It isn't deployed and hasn't been run yet.

**Why the last run stopped:** one status check on job `750WH00000gdMIFYA2` lost its connection ("socket hang up"). The flow treated that as fatal and ended the run, even though the job was still running in Salesforce.

**What the fix does (`src/utils.ts`)**
- **Retries:** if Salesforce doesn't answer at all, or returns 429 or 5xx, the flow tries again up to 5 times, waiting 2s, 4s, 8s and so on, up to 30s between tries. Errors like 401 or 404 aren't retried.
- **Where it applies:** the job status checks, and downloading the success and failure files.
- **If Salesforce still can't be reached:** the flow treats the job as not finished yet. The existing hand-off then passes the job Id to the next run instead of failing. You'll see "Status check … retry N" warnings in the log when this happens.
- **Tests:** `src/utils.retry.test.ts` is new. All 21 retry and Account Login tests pass and the type check is clean.

**Before you re-run**
1. **The `LIMIT_EXCEEDED` problem from earlier is still open.** This 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
