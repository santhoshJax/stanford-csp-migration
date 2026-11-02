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
**Status:** at risk — 41 objects mapped across 29 flows; code validated. UAT field creation & architect decision still blocking.

**Done this session**
- Mapped all 41 Salesforce objects written by 29 flows in load order
- Confirmed shared objects use prefixed external IDs (PUR-, ENR-) to keep records apart
- Verified code matches object and field names on stanford-csp-orchestrate branch

**Open items**
- Create PricebookEntry.External_ID_4D__c field (Text, External ID, Unique) in UAT org
- Verify both price books active in UAT org before purchase load sequence
- Architect decides: Registration Orders field (Balance_Due__c vs BalanceDue__c)
- Run purchase load: Inventory → Purchase (Activate off) → Item → Purchase (Activate on)
- Confirm all 41 objects and fields exist in UAT org (code checked, org not attached)
- Open PR from stanford-csp-orchestrate to main once architect approves
- Rebuild integrations and import into Prismatic
- Deploy to Salesforce org

**Decisions**
- Blank Status counts as New in enrollment rule
- Index version incremented to 2
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID, PUR- for Purchase orders
- TEST_MODE=false for next full run
- Two order streams: Registration (tuition) and Purchase (non-course items)

**Blockers**
- PricebookEntry.External_ID_4D__c field must be created in UAT org
- Both price books must be active in UAT org before purchase load run
- Registration Orders field decision still open (Balance_Due__c vs BalanceDue__c)

**Next**
- Create PricebookEntry.External_ID_4D__c field in UAT org
- Verify both price books active in UAT org
- Get architect decision on Registration Orders field name
- Confirm all 41 objects and fields exist in UAT org
- Run purchase load sequence in UAT
- Open PR to main
- Schedule Deploy session

**Checked live on 2026-11-02:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-02
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Orders |
| Session | `f4cdddc2-dc81-4ddd-82f3-28dc8071f9d4` |
**In its own words (excerpt):**
The migration loads data into **41 Salesforce objects**: 29 standard and 12 custom. They're written by the 29 flows registered on `stanford-csp-orchestrate`. The table is in run order, and each object is listed under the first flow that writes it.

## People and setup

| Flow | Salesforce objects |
|---|---|
| 1. Student | Account (Person Account) |
| 2. Instructor | Account (Person Account), PersonEmployment |
| 3. Associate | Account (Person Account), PersonEmployment |
| 4 / 4b. Quarter, Quarter Before 2013 | AcademicYear, AcademicTerm, AcademicSession |
| 5. Department | Account (business accounts, parent and child) |
| 6. Unit Rule | Unit_Rule__c |
| 7. Tuition Rule | Tuition_Rule__c |
| 22. Account Login | User (portal users) |
| 21. Alert | RecordAlert |

## Courses (Course Import: 2 Year, 5 Year, All Time)

| Flow | Salesforce objects |
|---|---|
| 8 / 23 / 24. Course Import | Learning, LearningCourse, Location, CourseOffering, Product2, PricebookEntry, CourseOfferingSchedule, CourseOfferingParticipant (instructor, coordinator, associate). These flows also update the registration open date on AcademicTerm. |
| 9. Course Associate / Instructor | Course_Offering_Staff_Detail_

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
