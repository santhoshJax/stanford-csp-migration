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
### Engagement state — 2026-10-16
**Status:** at risk — Course flows: 4 sheet rows need updates, Tier 3 gaps confirmed intentional, quarter-code test still blocks Tier 2 run

**Done this session**
- Confirmed Contract_Template is on Course Associate/Instructor tab, not Course tab
- Closed Course_RecID: already imported, no action needed
- Confirmed Tier 3 intentional gaps match sheet flags (no schedules, instructors, Duration_Unit__c, tuition rule)
- Identified duplicate Tuition_Rule_ID row 123 to mark 'Done (duplicate)'

**Open items**
- Test quarter code wi24 in source data to confirm it equals 20242 (blocks all three flows)
- Update sheet: Enrollment_Count row → 'don't load'
- Update sheet: Cancelled target → Enrollment_Status__c only (remove Status)
- Update sheet: Units target → Units__c only (remove DurationUnit)
- Update sheet: Web_Registration_Closed Map Type → Direct Map (was SA Decision)
- Mark sheet row 123 Tuition_Rule_ID 'Done (duplicate)' of row 89
- Course Associate/Instructor Salary_Category mappings pending with Holly (instructor vendor, emeritus prof)
- Timecard University_ID and Employee_Name: Map Type and Conversion Logic contradict

**Decisions**
- Tier 2 can run now; Tier 3 changes do not touch Tier 2 logic
- Execution order locked: Tier 1 → Tier 2 → Tier 3 (newest first)
- All-time Enrollment flow must run after All-time Course flow; Waiver after Enrollment
- Other Cost, Staff Detail, Timecard flows filter on Tier 1 range (2024–2025 prefixes)
- Tier 3 intentional gaps confirmed: no schedules, instructors, Duration_Unit__c, tuition rule per sheet flags

**Blockers**
- Quarter-code convention unverified: wi24 = 20242 assumption blocks all three flows until tested in source data

**Next**
- Test one quarter code (e.g., wi24) in source data to confirm it maps to 20242
- Update four sheet rows: Enrollment_Count, Cancelled, Units, Web_Registration_Closed, mark row 123 duplicate
- Holly to supply Salary_Category mappings (instructor vendor, emeritus prof)
- Resolve Timecard University_ID and Employee_Name Map Type vs. Conversion Logic contradiction
- Confirm Enrollment Grade_Entered_Date field name: Grade_Entered_Date__c (Date) or IP_GradeEnteredDate__c (DateTime)

**Checked live on 2026-10-16:** Google Workspace
### Last session — 2026-10-16
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseFlows-Review |
| Session | `7429b002-74d0-4757-ae64-31c1acd5195f` |
**In its own words (excerpt):**
You're right on both points, and I got the first one wrong.

- **Contract_Template** isn't on the Course tab. It's on the **Course Associate/Course Instructor** tab, where its Map Type is "SA Decision", not Direct Map or Conversion. I wrongly listed it under Course, so please ignore it there.
- **Course_RecID** on Course Other Cost is closed, since you've already imported it.

Below are only the fields whose Map Type is Direct Map or Conversion. For the Course tab I re-read it this turn. The other tabs below are from my earlier review.

## Course tab (Tier 1, 2 and 3)

| Field | Map Type | Tiers flagged | What's pending |
|---|---|---|---|
| Enrollment_Count | Direct Map | 1, 2, 3 | It's a read-only rollup, so the flows skip it. Change the sheet row to "don't load". |
| Cancelled | Conversion | 1, 2, 3 | The sheet target `Status` doesn't exist. Change it to `Enrollment_Status__c` only, which is what the flows already write. |
| Units | Conversion | 1, 2, 3 | The sheet target says `DurationUnit / Units__c`. Change it to `Units__c` only. |
| Tuition_Rule_ID (row 123) | Conversion | none | This row is a duplicate of row 89 and still says "Not Started". Mark it "Done (duplicate)". |
| 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
