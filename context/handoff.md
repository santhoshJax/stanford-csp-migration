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
**Status:** on track — Tier 2 import order confirmed: run after Tier 1, before Tier 3. Tier 3 changes ready.

**Done this session**
- Verified Tier 2 and Tier 3 execution order: Tier 1 → Tier 2 → Tier 3 (newest first)
- Confirmed offerings don't overlap (Tier 2: 21–23, Tier 3: ≤20) and won't overwrite each other
- Documented why order matters: first tier to run sets course title/description via External_ID_4D__c match

**Open items**
- Run Tier 2 import and paste run summary here for validation
- Verify Tier 2 CourseOffering count matches query on AcademicSession.Code__c 20211–20234
- Confirm no CourseOffering records have null AcademicSession after Tier 2 run
- Review CourseOffering failed-records sheet for unexplained rows
- Spot check one 2022 offering: Session, Course, and instructor links
- Pull latest commit c908fa1 before rebuilding for Tier 3

**Decisions**
- Tier 2 can run now; Tier 3 changes do not touch Tier 2 logic
- Execution order locked: Tier 1 → Tier 2 → Tier 3

**Blockers**
- None

**Next**
- Execute Tier 2 import against target org
- Paste Tier 2 run summary (Learning, LearningCourse, CourseOffering, Schedule, Instructor counts and error count)
- Run the three validation queries and spot check
- Pull commit c908fa1 and rebuild Tier 3 when Tier 2 validation passes

**Checked live on 2026-10-16:** the repository
### Last session — 2026-10-16
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-QuarterBefore2013-Build |
| Session | `4d60a658-4eef-427f-8dc8-7e60610b8c56` |
**In its own words (excerpt):**
Yes, run and check Tier 2 before Tier 3. The links would work in either order, but the order decides whose course titles and descriptions end up in Salesforce.

**Why the order matters** (from `coursesImport5Year.ts` and `coursesImportAllTime.ts` on the branch):
- Tier 2 and Tier 3 share `Learning` and `LearningCourse` records, matched on the base course code (`External_ID_4D__c`).
- Both flows leave an existing record alone and only create one when it's missing. So whichever tier runs first sets the catalog title and description.
- If Tier 3 ran first, a course offered both before 2021 and in 2021–23 would keep its old pre-2021 title and description. Tier 2 would then skip it as "exists".
- The right order is Tier 1 → Tier 2 → Tier 3, newest first.

The offerings themselves don't overlap. Tier 2 only takes quarters with years 21–23 and Tier 3 only takes 20 and older. Offerings are matched on the source row ID, so neither tier overwrites the other's offerings. My Tier 3 change doesn't touch Tier 2, so you can run Tier 2 now.

**Checking Tier 2 after it runs** (no org is attached to this session, so you'll need to run these):

| Check | Expected |
|---|---|
| Run summary | Learning,

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
