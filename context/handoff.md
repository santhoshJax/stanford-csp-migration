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
**Status:** at risk — Option A explained; awaiting confirmation to implement date-correction table and proceed with 8-row fix

**Done this session**
- Detailed Option A implementation logic: correction table lookup, conditional date override, logging for ID mismatches
- Clarified that all non-date fields still come from source TSV; correction table supplies only 3 values per row
- Explained 'run only these 8 IDs' variant: flow skips non-matching rows, logs warnings for unmatched correction IDs

**Open items**
- Confirm Option A approach and whether to include 'run only these 8 IDs' feature
- Implement date-correction table in src/coursesImportAllTime.ts with logging
- Add unit tests to src/coursesImportAllTime.test.ts
- Open pull request on stanford-csp-orchestrate
- Re-run Course import (full or 8-row subset) and verify all 8 offerings load
- Check if Enrollment import already ran; if so, re-run enrollments for these 8 offerings
- Change TEST_MODE to false in src/accountLoginFlow.ts and redeploy
- Run full 85-batch Enrollment import after TEST_MODE=false redeploy

**Decisions**
- Tier 2 can run now; Tier 3 changes do not touch Tier 2 logic
- Execution order locked: Tier 1 → Tier 2 → Tier 3 (newest first)
- All-time Enrollment flow must run after All-time Course flow; Waiver after Enrollment
- Other Cost, Staff Detail, Timecard flows filter on Tier 1 range (2024–2025 prefixes)
- Enrolled-only filter: Account Login User creation requires at least one Enrollment row with Status = 'Enrolled'
- Preferred fix for Dropped_Percent fields: widen org field definition to Number or Percent (5,2)
- Option A: embedded correction table with conditional date override; all other fields from source TSV unchanged

**Blockers**
- 8 CourseOffering records failed date validation; source file has incorrect dates for these offerings
- TEST_MODE=true still in src/accountLoginFlow.ts (line 109); blocks full 85-batch import
- Awaiting confirmation on Option A and run-subset feature before code implementation

**Next**
- Confirm Option A (embedded correction table) and run-subset feature preference
- Implement correction table and logging in src/coursesImportAllTime.ts
- Add unit tests and open pull request
- Re-run Course import and verify 8 offerings load successfully
- Verify Enrollment import status; re-run if it already executed
- Change TEST_MODE=false and redeploy Account Login flow
- Run full 85-batch Enrollment import

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
You don't need to. Under option A the correction file only replaces two fields. Every other field still comes from the source TSV.

## How it works

The flow already reads each of the 8 courses from the source course TSV, with all its fields. They failed at the last step only because of the dates. The correction table would hold just three values per course: the source ID, the start date and the end date.

For each row, the flow would:

1. **Read the row from the source TSV** as it does now. That gives Code, Title, Quarter, Max_Enrollment, Units, Tuition, Additional_Fee, Cancelled, Dropped_Special_Percent, Global_Eval, Return_Rate, Format, Catalog_Notes and Description.
2. **Check whether the source ID is in the correction table.**
   - If it is, set the offering's start and end dates from the table instead of the file's dates.
   - If it isn't, change nothing.
3. **Build and upsert the CourseOffering** using all the other fields from the TSV, exactly as now.

In the code, the only change is where the dates are set (`setDate("StartDate", row.Start_Date)` and `setDate("EndDate", row.End_Date)` in `src/coursesImportAllTime.ts`). Everything above and below that stays the same.

## If 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
