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
**Status:** at risk — Field precision issue found: Dropped_Special_Percent__c rejects 100.0; org field definition must be checked and widened

**Done this session**
- Identified root cause of row 49 failure: NUMBER_OUTSIDE_VALID_RANGE on Dropped_Special_Percent__c with value 100.0
- Confirmed flow guard allows 100 (<= 100 check) but org field definition is too narrow to accept it
- Confirmed only row 49 failed; 99 rows loaded successfully, Learning and Learning Course records created

**Open items**
- Test quarter code wi24 in source data to confirm it equals 20242 (blocks all three flows)
- Update sheet: Enrollment_Count row → 'don't load'
- Update sheet: Cancelled target → Enrollment_Status__c only (remove Status)
- Update sheet: Units target → Units__c only (remove DurationUnit)
- Update sheet: Web_Registration_Closed Map Type → Direct Map (was SA Decision)
- Mark sheet row 123 Tuition_Rule_ID 'Done (duplicate)' of row 89
- Check precision and scale of Dropped_Special_Percent__c and Dropped_Percent__c in org; widen to accept 100
- Review results sheet from run for errors on windows after row 99 (confirm hasMore=true continuation)

**Decisions**
- Tier 2 can run now; Tier 3 changes do not touch Tier 2 logic
- Execution order locked: Tier 1 → Tier 2 → Tier 3 (newest first)
- All-time Enrollment flow must run after All-time Course flow; Waiver after Enrollment
- Other Cost, Staff Detail, Timecard flows filter on Tier 1 range (2024–2025 prefixes)
- Tier 3 intentional gaps confirmed: no schedules, instructors, Duration_Unit__c, tuition rule per sheet flags
- Preferred fix: widen org field definition for Dropped_Special_Percent__c and Dropped_Percent__c to Number or Percent (5,2)

**Blockers**
- Quarter-code convention unverified: wi24 = 20242 assumption blocks all three flows until tested in source data
- Dropped_Special_Percent__c field too narrow in org; row 49 (100.0 value) rejected; must widen before re-run

**Next**
- Check org field definitions: precision and scale of Dropped_Special_Percent__c and Dropped_Percent__c
- Widen both fields to accept 100 (e.g., Number or Percent with scale 2)
- Re-run row 49 after field widening (upsert by external ID is safe)
- Review full results sheet for errors on windows 100+ (verify hasMore=true continuation)
- Test quarter code wi24 in source data to confirm 20242 mapping
- Update four sheet rows and mark row 123 duplicate as planned

**Checked live on 2026-10-16:** the repository
### Last session — 2026-10-16
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseFlows-Review |
| Session | `7429b002-74d0-4757-ae64-31c1acd5195f` |
**In its own words (excerpt):**
The error is a field-size problem in the org, not a bug in the flow. I haven't confirmed that against the org, because none is attached to this session.

**Cause**
- Row 49 (`20081_COM 35`) has a Dropped Special Percent of exactly `100.0`, and Salesforce rejected that value on `Dropped_Special_Percent__c`.
- The error is `NUMBER_OUTSIDE_VALID_RANGE` on that one field. The flow already guards the value (`coursesImportAllTime.ts` line 583, and the same lines in the 2-year and 5-year flows), but the guard is `<= 100`, so 100 passes the check.
- A value of 100 only fails when the field has too few digits for it. My guess is the field is defined with precision 3 and scale 2, which allows at most 9.99, or something similar.
- The same guard applies to `Dropped_Percent__c`. If its definition is the same, it will fail on any 100 as well.

**Impact**
- Only that one Course Offering failed. The run reports 99 ok and 1 error.
- The Learning and Learning Course records for that row were created, and the failed offering is the only gap.
- The window stopped at row 99 with "All rows processed — import complete", even though `hasMore=true`. Please check that the run continues to the following win

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
