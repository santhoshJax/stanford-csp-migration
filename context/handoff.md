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
**Status:** at risk — Code validated: price book logic blocks >1 custom book. UAT setup & architect decision still blocking.

**Done this session**
- Validated price book resolution logic: Standard always included, max 1 custom book enforced, run stops before any save if violated

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
**Short answer: the run stops at the start of the first window, before any course, offering or product is saved.** Giving two custom books doesn't mean they get used "instead of" Standard. The Standard book is always added, so the flow would end up with Standard plus two custom books, and the code doesn't allow more than one custom book.

**What happens, step by step** (this is `resolvePriceBooks` in `courseUtils.ts` on `stanford-csp-orchestrate`). Say you set `Price Books` = `StanfordContinuingStudies Price Book,Another Custom Book`:

1. **It looks up both names.** If either one isn't found or is inactive, the run stops on that error first.
2. **It finds the Standard Price Book anyway.** It isn't in your list, so the flow adds it and logs a warning. The Standard book can't be left out.
3. **It counts the custom books.** There are 2, so the run stops with this error:
   > `[Price Books] Only one custom price book is supported, but 2 are listed: "StanfordContinuingStudies Price Book", "Another Custom Book". Entry keys are Course.ID for the custom book and STD-<Course.ID> for Standard, so a second custom book would overwrite the first.`
4. **Nothing is written** in that window. No Le

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
