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
**Status:** blocked — I re-read the sheet's tier flag columns and the three flows.

**Done this session**
- I re-read the sheet's tier flag columns and the three flows. You're right that my earlier answer blended the tiers. Here are the questions for each tier. Each tier has its own field list: Tier 1 maps all fields, Tier 2 maps the 32 fields f…

**Open items**
- Resolve EnrolleeCount: sheet says map directly, flows say read-only — which is correct?
- Resolve Cancelled: sheet says CourseOffering.Status, flows only set Enrollment_Status__c — architect decision needed
- Verify quarter-code windows: Tier 1 loads wi24–fa25, but Other Cost/Staff/Timecard filter on 2024–2025 prefixes (fa24–su26) — test one quarter code
- Confirm extract contains no quarters from fa26 onward, or add Tier 4
- Build Tier 2 and Tier 3 versions of Other Cost, Staff Detail, Timecard flows (currently 2-year only)
- Reconcile 7 field-name mismatches in org before sign-off (Other Cost, Timecard, Waiver, Grade_Entered_Date)
- Architect decision: Grade result mapping (Pass/Fail vs Final; 60k unmapped grades S/NG/AU/P/W)
- Resolve 5 open sheet items: Web_Registration_Closed, Contract_Template decode, Waiver Verification IP logic, Timecard University_ID/Employee_Name, Course_RecID crosswalk

**Decisions**
- Tier 2 can run now; Tier 3 changes do not touch Tier 2 logic
- Execution order locked: Tier 1 → Tier 2 → Tier 3 (newest first)
- All-time Enrollment flow must run after All-time Course flow; Waiver after Enrollment

**Blockers**
- Quarter-window misalignment: Tier 1 wi24–fa25 vs Other Cost/Staff/Timecard 2024–2025 prefix filter — needs verification before those flows run

**Next**
- Architect review: EnrolleeCount (read-only?), Cancelled field (Status vs Enrollment_Status__c), Grade result mapping (Pass/Fail scope)
- Test one quarter code to confirm window alignment (e.g., is 20241 = fa24 or wi24?)
- Confirm extract has no fa26+ quarters, or scope Tier 4
- Decide: Excel gap matrix (field-by-field) or Word summary of open decisions for architect
- Build Tier 2/3 Other Cost, Staff Detail, Timecard flows once course tiers validated
- Verify all 7 field-name mismatches exist in target org before Tier 2 run

**Checked live on 2026-10-16:** the repository, Google Workspace
### Last session — 2026-10-16
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseFlow-Review |
| Session | `7429b002-74d0-4757-ae64-31c1acd5195f` |
**In its own words (excerpt):**
I re-read the sheet's tier flag columns and the three flows. You're right that my earlier answer blended the tiers. Here are the questions for each tier. Each tier has its own field list: Tier 1 maps all fields, Tier 2 maps the 32 fields flagged "5-year", and Tier 3 maps the 22 fields flagged "All Courses".

Two points from my earlier answer were wrong or too broad:
- **Staff_Notes in Tier 2:** this is not a gap. The sheet says Staff_Notes is not combined with anything, so loading it on its own is correct.
- **Quarter windows:** the three course flows don't overlap or leave gaps between them. Tier 1 loads wi24 to fa25, Tier 2 loads years 21 to 23, and Tier 3 loads year 20 and older. The doubt I raised applies to the other flows (Other Cost, Staff Detail, Timecard). I did not re-check those this turn.

## Tier 1 (all fields, 2-year flow)

| # | Field | Question |
|---|---|---|
| 1 | Enrollment_Count | The sheet says to map it to `EnrolleeCount`. The flow skips it as read-only. Should the sheet change to "don't load", or does the org field need to be writable? |
| 2 | Cancelled | The sheet says to set `Status` = Cancelled. The flow only sets `Enrollment_Status__c`. Should `Status` al

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
