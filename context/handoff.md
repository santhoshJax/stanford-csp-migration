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
**Status:** blocked — Account Login paused: all 426 Users rejected with LIMIT_EXCEEDED. Likely org licence exhaustion; awaiting org check.

**Done this session**
- Reviewed timeout fix commits (6ac96a7, 67e10fd, f70a14f); confirmed 14 tests pass
- Identified batch failure root cause: LIMIT_EXCEEDED on all 426 Users at byte 18,551,476
- Confirmed flow logic correct; Salesforce org rejected entire batch, not mapping issue

**Open items**
- Check Salesforce org: user licences (Student_Profile), Experience Cloud limits, storage usage
- Identify first failed batch byte offset in Salesforce job 750WH00000gbOj9YAE
- Confirm with client: total Users needed vs. available licences
- Deploy Account Login timeout fix (stanford-csp-orchestrate) once org issue resolved
- Re-run Account Login from first failed batch byte offset with deployed fix
- Merge PR #1 (Course Correction Sheet ID config) to main & deploy
- Run npm run import; set Course Correction Sheet ID & enable; run Course Import - All

**Decisions**
- MAX_ROWS = 500 per run; POLL_BUDGET_MS = 10 min; MAX_JOB_HANDOFFS = 6
- Hand-off passes pendingJobId & file position; recordsFromResultCsvs rebuilds from Salesforce CSVs
- TEST_MODE = false; next run is full import
- Pause integration until org licence/limit issue confirmed & resolved

**Blockers**
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- Account Login timeout fix not yet deployed
- PR #1 not yet merged to main

**Next**
- Check Salesforce Setup: user licences on Student_Profile, Experience Cloud limits, storage usage
- Review job 750WH00000gbOj9YAE & prior jobs to find first failed batch byte offset
- Confirm with client: total enrolled Users in file vs. available licences
- Once org issue resolved, deploy timeout fix & re-run from first failed batch byte offset

**Checked live on 2026-10-23:** Google Workspace
### Last session — 2026-10-23
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
**Please pause the Account Login integration now.** Every User in this batch failed, and the flow still went on to the next batch at byte 18,551,476. If the cause is an org-level limit, every batch after this one will fail the same way. There are about 50 batches left in the file, so leaving it running only produces more failed rows.

## What the log shows
- **The flow worked:** it read 500 rows, the Enrollment filter skipped 74, it sent 426 Users, and the Salesforce job finished in about 40 seconds.
- **Salesforce rejected all 426** with `LIMIT_EXCEEDED:limit exceeded:--`. The rows themselves look fine: every one has a Contact, an email, the Student_Profile Id `00eWH000001djuLYAQ` and a valid alias. So this isn't a mapping problem with a few bad rows. The org refused the whole batch.
- **No permission sets were assigned**, because no User was written. That part behaved correctly.

## Likely cause (I couldn't check it)
When every row fails with the same `LIMIT_EXCEEDED` partway through a large User load, it usually means an org-level limit has been reached, and the most common one is **user licences**. About 18.5 MB of the 27 MB file was processed before this batch, so thousands of

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
