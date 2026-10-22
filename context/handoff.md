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
**Status:** at risk — Account Login timeout fix + TEST_MODE off committed; awaiting deployment & verification before 85-batch re-run

**Done this session**
- Reviewed commits 6ac96a7 (TEST_MODE=false), 67e10fd (timeout fix: 500-row batches, 10-min wait, hand-off logic), f70a14f (docs)
- Confirmed all 14 Account Login tests pass; no lint issues; hand-off logic & result CSV parsing in place

**Open items**
- Merge PR #1 (Course Correction Sheet ID config) to main
- Deploy Account Login timeout fix (branch stanford-csp-orchestrate) to org
- Deploy PR #1 changes to org
- Check job 750WH00000ga5nNYAQ status in Salesforce; verify Users exist & permission sets pending
- Re-run Account Login from batch byte 317,780 with deployed timeout fix
- Run npm run import to activate Course Correction Sheet ID config
- Set Course Correction Sheet ID & turn on Course Correction Enabled; run Course Import - All
- Monitor logs for 'Handing off job' lines during full 85-batch import (~340 runs, ~30 min overhead)

**Decisions**
- MAX_ROWS reduced to 500 per run (from 2,000) to keep Salesforce jobs within single run window
- POLL_BUDGET_MS = 10 min; MAX_JOB_HANDOFFS = 6 (~1 hour total per job)
- Hand-off passes pendingJobId & file position; recordsFromResultCsvs rebuilds results from Salesforce CSVs
- TEST_MODE now false; next run is full import, not 2-row test
- All previous execution order & correction logic decisions remain unchanged

**Blockers**
- Account Login timeout fix not yet deployed; full 85-batch import blocked until deployed & re-run from job 750WH00000ga5nNYAQ
- PR #1 not yet merged to main; Course Correction changes not live

**Next**
- Deploy Account Login timeout fix (stanford-csp-orchestrate branch) to org
- Check job 750WH00000ga5nNYAQ in Salesforce; verify Users created & permission sets pending
- Re-run Account Login from batch byte 317,780 with deployed fix; monitor for hand-off lines in logs
- Merge PR #1 to main & deploy Course Correction config
- Run npm run import; set Course Correction Sheet ID & enable; run Course Import - All

**Checked live on 2026-10-22:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-10-22
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
Since your last run, two commits change the Account Login code on `stanford-csp-orchestrate` (head `f70a14f`). I read both diffs on GitHub just now.

## 1. `6ac96a7`: test mode off (pushed by someone else)
- In `src/accountLoginFlow.ts`, `TEST_MODE` is now `false`. The next run is a full import, not a 2-row test, and it moves on to the next batch by itself.

## 2. `67e10fd`: timeout fix (my commit, 4 files, +385 / −70)

**`src/accountLoginFlow.ts`**
- **Smaller batches:** `MAX_ROWS` went from 2,000 to **500** rows per run. Creating these Users is slow, so a smaller batch keeps each Salesforce job well inside one run. I didn't mention this in my last summary, sorry.
- **Wait limit:** `POLL_BUDGET_MS` = 10 minutes. A run waits at most that long for the User job, which leaves about 5 minutes for permission sets, the results sheet and starting the next batch.
- **Hand-off:** if the job is still running after 10 minutes, the run passes `pendingJobId` and its file position to the next run. That run carries on waiting for the same job and doesn't upload the Users again.
- **Hand-off limit:** `MAX_JOB_HANDOFFS` = 6, so a job gets about an hour in total. After that the run stops with an err

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
