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
**Status:** at risk — Code committed (bc96380); course & purchase flows verified reading shared Price Books setting. UAT setup & architect decision still blockin…

**Done this session**
- Verified course flows (All, 2-Year, 5-Year) process in 100-row windows with price book validation, product creation, and dual price book entries
- Confirmed Purchase flows now also read shared Price Books setting from Course Configuration
- Validated no duplicate price book logic; all flows use single consolidated setting

**Open items**
- Create PricebookEntry.External_ID_4D__c field (Text, External ID, Unique) in UAT org
- Verify both price books active in UAT org before purchase load sequence
- Run purchase load: Inventory → Purchase (Activate off) → Item → Purchase (Activate on)
- Architect decides: Registration Orders field (Balance_Due__c vs BalanceDue__c)
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
- Verify both price books active in UAT org
- Get architect decision on Registration Orders field
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
| Name | Stanford-Data-Migration-CourseEnhancement-Products |
| Session | `fb62e2a5-4dd6-4b7d-bb02-3ebab9e5ae57` |
**In its own words (excerpt):**
Here's how the three course flows (All, 2-Year and 5-Year) run now. I checked this against the latest code on `stanford-csp-orchestrate`. Since my commit, another session has changed the Purchase flows (`bc96380`) so they also read the same `Price Books` setting. The course flows themselves work the same as when I built them.

## In simple words

The course file is processed in **windows of 100 rows**. Each window does the same six things:

**1. Check the price books first**
- The flow reads the `Price Books` setting (by default: `Standard Price Book,StanfordContinuingStudies Price Book`).
- It looks both books up in Salesforce.
- If a book is missing or inactive, or more than one custom book is listed, **the window stops before saving anything**.
- The Standard Price Book is always included, even if it's left off the list.

**2. Go through the course rows one by one**
For each course in the window:
- **Learning Course:** saves the base course (for example, `POL 68`). Sections like `POL 68 H` and `POL 68 Z` share one.
- **Course Offering:** saves the actual section with its dates, tuition and so on. It's matched on the 4D ID, so a re-run updates the record rather than creating a ne

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
