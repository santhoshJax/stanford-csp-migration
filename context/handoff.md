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
**Status:** at risk — Course flows validated; 4 architect decisions + 1 data test remain before Tier 2 run

**Done this session**
- Validated all three course tiers cover 20211–20254 with no gaps or overlaps
- Confirmed Enrollment_Count is read-only; sheet row needs 'don't load'
- Confirmed Cancelled maps only to Enrollment_Status__c; Status field doesn't exist
- Confirmed Units/DurationUnit: only Units__c correct; Tier 3 lacks Duration_Unit__c write
- Confirmed Tuition_Rule_ID lookup by External_ID_4D__c is correct
- Closed Web_Registration_Closed, Do_Not_Show_On_Web, Reg_Open_Date as no-change

**Open items**
- Test one quarter code to confirm wi24 = 20242 (all flows depend on this)
- Course_RecID: confirm it equals CourseOffering.External_ID_4D__c or provide crosswalk
- Contract_Template: business must supply decode mapping for Tier 1
- Tier 3 gaps: confirm no schedules, instructors, Duration_Unit__c, tuition rule is intended
- Resolve EnrolleeCount sheet row: change to 'don't load'
- Resolve Cancelled sheet row: change from Status to Enrollment_Status__c only
- Update Tier 2 header comment (still says Tier 3 'not built yet')
- Fix Tier 1 anchor comment (wi25 should clarify it means AY 2024-25)

**Decisions**
- Tier 2 can run now; Tier 3 changes do not touch Tier 2 logic
- Execution order locked: Tier 1 → Tier 2 → Tier 3 (newest first)
- All-time Enrollment flow must run after All-time Course flow; Waiver after Enrollment
- Other Cost, Staff Detail, Timecard flows filter on Tier 1 range (2024–2025 prefixes)

**Blockers**
- Quarter-code convention unverified: wi24 = 20242 assumption blocks all three flows until tested

**Next**
- Test one quarter code (e.g., wi24) in source data to confirm it maps to 20242
- Architect decision: Tier 3 intentional gaps (no schedules, instructors, Duration_Unit__c, tuition rule)?
- Business supplies Contract_Template decode mapping
- Confirm Course_RecID = External_ID_4D__c or provide RecID-to-CourseID crosswalk
- Update sheet rows: Enrollment_Count → 'don't load', Cancelled → Enrollment_Status__c only
- Fix Tier 2 header and Tier 1 anchor comments in flows

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
I checked the three flows against your answers. They cover all your quarter ranges, and one thing in the Tier 3 flow is worth a look.

## Your answers

| Item | Result |
|---|---|
| Enrollment_Count | Agreed. It's a read-only rollup, so all three flows rightly skip it. The sheet should say "don't load". |
| Cancelled / Status | There is no `Status` field on Course Offering, so only `Enrollment_Status__c` is right. The sheet row needs updating, and the flow stays as is. |
| Units / DurationUnit | `DurationUnit` doesn't exist on Course Offering, so only `Units__c` is correct. Tier 1 and Tier 2 also write `Duration_Unit__c` from the Duration value. Tier 3 doesn't (see Coverage below). |
| Web_Registration_Closed, Do_Not_Show_On_Web, Reg_Open_Date | Keep them as they are. I'll treat these rows as closed. |
| Tuition_Rule_ID | Done in Tier 1. The flow looks it up by `External_ID_4D__c` on the tuition rule, and the tuition rule flow upserts on that same key. Because you've already imported the tuition rules, the lookup should resolve. |

## Other-cost items
These belong to the Course Other Cost tab, not the course flows. Two things are open:
- **Course_RecID crosswalk.** The other-cost f

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
