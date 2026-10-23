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
**Status:** at risk — Course 5-Year flow committed; Account Login blocked on org limits; PR #1 awaiting merge

**Done this session**
- Committed Course 5-Year flow (9ed44a4) mapping Total Hours & Tuition Adjustment fields to GitHub

**Open items**
- Check Salesforce org: user licences (Student_Profile), Experience Cloud limits, storage usage
- Identify first failed batch byte offset in Salesforce job 750WH00000gbOj9YAE
- Confirm with client: total Users needed vs. available licences
- Verify three target fields (Total_Hours__c, Tuition_Adjustment__c, Tuition_Adjustment_Note__c) exist on CourseOffering
- Deploy Course 5-Year flow & run test; confirm values appear on CourseOffering records
- Deploy Account Login timeout fix (stanford-csp-orchestrate) once org issue resolved
- Re-run Account Login from first failed batch byte offset with deployed fix
- Merge PR #1 (Course Correction Sheet ID config) to main & deploy

**Decisions**
- MAX_ROWS = 500 per run; POLL_BUDGET_MS = 10 min; MAX_JOB_HANDOFFS = 6
- Hand-off passes pendingJobId & file position; recordsFromResultCsvs rebuilds from Salesforce CSVs
- TEST_MODE = false; next run is full import
- Pause Account Login integration until org licence/limit issue confirmed & resolved
- Course 5-Year flow uses same file ID setting as 2-year flow; All Courses flow unchanged

**Blockers**
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- Account Login timeout fix not yet deployed
- PR #1 not yet merged to main
- Course 5-Year target fields not yet verified in org

**Next**
- Check Salesforce Setup: user licences on Student_Profile, Experience Cloud limits, storage usage
- Verify Total_Hours__c, Tuition_Adjustment__c, Tuition_Adjustment_Note__c exist on CourseOffering
- Deploy Course 5-Year flow & run test run; confirm values on CourseOffering records
- Once org limits issue resolved, deploy Account Login timeout fix & re-run from first failed batch byte offset

**Checked live on 2026-10-23:** the repository
### Last session — 2026-10-23
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Course5YearFlowUpdate |
| Session | `4274774a-2d22-4be3-934e-9ea6d4a5a871` |
**In its own words (excerpt):**
The commit is pushed. `stanford-csp-orchestrate` on GitHub now points at `9ed44a4` ("Course 5-Year: map Total Hours and Tuition Adjustment fields"), and I checked that against the remote. No other commits went with it.

**What's in it:** the Course Import - 5 Year flow now reads the Course Submission file. It uses the same file ID setting as the 2-year flow and matches rows the same way, on Code + Quarter. From that file it writes `Total_Hours__c`, `Tuition_Adjustment__c` and `Tuition_Adjustment_Note__c`. If the file is missing or won't load, the flow logs a warning and carries on without those three fields. As you decided, the All Courses flow is unchanged.

**Where it stands:**
- **Done:** committed and pushed to `stanford-csp-orchestrate`.
- **Not deployed:** no org is attached to this session, so I haven't run the flow or confirmed the three target fields exist on CourseOffering in the org.

**Still to do:**
1. Check the three fields exist in the target org.
2. Deploy, then do one 5-year test run and confirm the values appear on a few CourseOffering records.
3. Merge to `main` the usual way. PR #1 is still open on this branch.

Sources: checked live: GitHub branch `stanford-csp

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
