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
**Status:** at risk — Results sheet field coverage reviewed; 5-Year missing fields root cause found. Job 750WH00000gdMIFYA2 status & org limits still unknown.

**Done this session**
- Code review: identified why Total_Hours__c, Tuition_Adjustment__c, Tuition_Adjustment_Note__c missing from 5-Year sheet (PapaParse drops columns absent in first row)
- Found shared sheet writer bug: reportResults.ts never reads existing header on append, misaligns values across windows
- Identified 50+ optional CourseOffering fields missing from 2-Year flow; lookup values show as [object Object]
- Confirmed 16 Bulk-API flows are fine (use Salesforce result files); identified 10 flows affected by shared writer bug

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
- Confirm today's 5-Year sheet to verify missing fields match root cause found
- Decide: create Jira backlog for results sheet fixes or hand to Build session
- Check job 750WH00000gdMIFYA2 status and record counts in Bulk Data Load Jobs
- Check Setup → Company Information for Student_Profile licences & storage usage if LIMIT_EXCEEDED persists
- Redeploy Account Login integration and resume import from byte 18,468,950

**Checked live on 2026-10-23:** the repository
### Last session — 2026-10-23
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-SuccessFailGoogleSheetColumn-Review |
| Session | `8bb34aed-4a66-4102-bb48-d51e190354df` |
**In its own words (excerpt):**
The sheets do not always include every field the flow sent to Salesforce, and I found the cause of your 5 Year problem. This is a code review only. I changed no code and did not open any past Drive sheets, so please check today's 5 Year sheet to confirm. The report has been attached to this session as **D01 – Results Sheet Field Coverage Review**.

**Why the three new fields are missing**
- The three Course Import flows (5 Year, 2 Year, All Time) build their sheet CSV with `papaUnparse(rows)` and no column list. PapaParse takes the columns from the first row only and drops any field that appears only in later rows. I confirmed this by running it.
- `Total_Hours__c`, `Tuition_Adjustment__c` and `Tuition_Adjustment_Note__c` are only set when the row matches a Course Submission record. If the first CourseOffering row in a window has no match, the columns never appear and the rest of that window loses them too.
- The same applies to about 50 other optional CourseOffering fields in the 2 Year flow.
- Lookup values in these flows (LearningCourse, AcademicSession, Learning and so on) show as `[object Object]` in the sheet.

**Other problems found**
- **Enrollment Waiver:** the sheet shows

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
