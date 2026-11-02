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
### Engagement state — 2026-11-02
**Status:** at risk — Mapped 31 flows → 40 objects; UAT field creation & architect decision still blocking purchase load run.

**Done this session**
- Scanned codebase: 31 flows writing to ~40 Salesforce objects (custom + standard + Education Cloud)
- Built object-to-flow map from stanford-csp-orchestrate branch 7c3a691

**Open items**
- Create PricebookEntry.External_ID_4D__c field (Text, External ID, Unique) in UAT org
- Verify both price books active in UAT org before purchase load sequence
- Architect decides: Registration Orders field (Balance_Due__c vs BalanceDue__c)
- Verify all ~40 objects and their External_ID_4D__c fields exist in UAT org
- Run purchase load: Inventory → Purchase (Activate off) → Item → Purchase (Activate on)
- Open PR from stanford-csp-orchestrate to main once architect approves and UAT validation complete
- Rebuild integrations and import into Prismatic
- Deploy to Salesforce org

**Decisions**
- Blank Status counts as New in enrollment rule
- Index version incremented to 2
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Two order streams: Registration (tuition) and Purchase (non-course items)

**Blockers**
- PricebookEntry.External_ID_4D__c field must be created in UAT org
- Both price books must be active in UAT org before purchase load run
- Registration Orders field decision still open (Balance_Due__c vs BalanceDue__c)

**Next**
- Create PricebookEntry.External_ID_4D__c field in UAT org
- Verify all ~40 objects and External_ID_4D__c fields exist in UAT org
- Get architect decision on Registration Orders field
- Verify both price books active in UAT org
- Run purchase load sequence in UAT
- Open PR to main

**Checked live on 2026-11-02:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-02
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseEnhancement-Products |
| Session | `fb62e2a5-4dd6-4b7d-bb02-3ebab9e5ae57` |
**In its own words (excerpt):**
The integration has 31 flows, and between them they write to about 40 Salesforce objects. I took this from the latest code on `stanford-csp-orchestrate` (`7c3a691`). Objects ending in `__c` are custom; the rest are standard or Education Cloud / Commerce objects.

## People and organisations
| Flow | Objects written |
|---|---|
| Student | `Account` (Person Accounts) |
| Account Login | `User`, `PermissionSetAssignment` |
| Instructor / Associate | `Account`, `PersonEmployment` |
| Department | `Account` (business accounts) |

## Academic calendar
| Flow | Objects written |
|---|---|
| Quarter / Quarter Before 2013 | `AcademicYear`, `AcademicTerm`, `AcademicSession` |

## Courses
| Flow | Objects written |
|---|---|
| Course All / 2-Year / 5-Year | `LearningCourse`, `CourseOffering`, `Product2`, `PricebookEntry` (Standard + custom book) |
| Tuition Rule | `Tuition_Rule__c` |
| Unit Rule | `Unit_Rule__c` |
| Course Associate Instructor | `Course_Offering_Staff_Detail__c` |
| Course Other Cost | `CourseOfferingExpense__c` |
| Course Timecard | `Course_Offering_Staff_Timecard__c` |
| Coursework | `Syllabus__c` |
| Textbook | `Textbook__c` |

## Enrollments
| Flow | Objects written |
|-

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
