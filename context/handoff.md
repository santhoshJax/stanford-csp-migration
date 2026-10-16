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
**Status:** at risk — Mapping review complete: 2 critical gaps (EnrolleeCount, CourseOffering.Status), 7 field-name mismatches, quarter-window misalignment needs…

**Done this session**
- Reviewed all 6 mapping tabs + Course against flows on stanford-csp-orchestrate
- Identified 2 flagged fields not written: Enrollment_Count (read-only conflict) and Cancelled (Status vs Enrollment_Status__c)
- Found 7 object/field name mismatches between sheet and code (Other Cost, Timecard, Waiver, IP_GradeEnteredDate__c)
- Confirmed Staff Detail complete; Tier 2/3 Other Cost, Staff Detail, Timecard missing
- Documented 60k enrollment rows skipped (grades S, NG, AU, P, W unmapped)

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

**Checked live on 2026-10-16:** Google Workspace, the repository
### Last session — 2026-10-16
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseFlow-Review |
| Session | `7429b002-74d0-4757-ae64-31c1acd5195f` |
**In its own words (excerpt):**
I reviewed all six tabs, plus the Course tab I could already read, against the flows on `stanford-csp-orchestrate`. Most of the mapping is in place. The gaps below need a decision or a check before sign-off.

**How I checked.** I matched every non-"Do Not Map" row's target API name against each flow. I then read the field-building code for the three course tiers, Staff Detail, Timecard, Waiver and Enrollment. I did not read all 8,500 lines of the flows line by line.

**No org was attached to this session.** I could not verify that any object or field API name exists in Salesforce.

## 1. Course flows (Tier 1 = "2 year" file, Tier 2 = "5 year" file, Tier 3 = "all time" file)
The flag columns in the sheet say which fields each tier should carry.

- **Tier 2:** all 32 flagged fields are covered except the two gaps below.
- **Tier 3:** all 22 flagged fields are covered except the same two gaps.
- **Tier 1:** I found no mapped field that is missing.

Two flagged mappings are not written by any tier:
- **`Enrollment_Count`:** the sheet says to map it directly to `EnrolleeCount`. The flows skip it, saying the field is read-only. The sheet and the code disagree on this, and neither tab tel

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
