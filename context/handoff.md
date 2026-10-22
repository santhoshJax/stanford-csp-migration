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
**Status:** blocked — I've finished the review.

**Done this session**
- I've finished the review. Yes, correction mode inside `coursesImportAllTime` is the better option. It works the same way as the Student, Instructor and Associate flows, so there's one pattern to maintain and no new flow to deploy. I haven'…

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
I've finished the review. Yes, correction mode inside `coursesImportAllTime` is the better option. It works the same way as the Student, Instructor and Associate flows, so there's one pattern to maintain and no new flow to deploy. I haven't changed any code.

## What the other flows do

I read `studentFlow.ts`, `instructorFlow.ts`, `associateFlow.ts` and `configPages.ts`. All three work the same way:

- **On/off switch:** a setting per flow (`Student Correction Enabled`, `Instructor…`, `Associate…`), off by default.
- **One shared sheet:** they all read the `Correction Sheet ID` sheet, each from its own tab (`Student`, `Instructor`, `Associate`). Each tab has an `ID` column plus one column per corrected field, named with the Salesforce field name.
- **When on:**
  - the flow loads that tab when it starts;
  - it skips any file row whose ID isn't in the tab;
  - it uses the tab's values for the listed fields only, and takes everything else from the TSV;
  - it stops reading the file once every ID in the tab has been found.
- **When off:** the flow behaves exactly as before.

## The Course version

| Piece | Proposal |
|---|---|
| Switch | New `Course Correction Enabled` setting, off

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
