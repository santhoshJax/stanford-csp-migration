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
### Engagement state — 2026-11-03
**Status:** at risk — Discount logic built & pushed (commit 6a4a78b); validation deploy & Registration Item lookup strategy still pending

**Done this session**
- Mapped Course.ID external ID usage across CourseOffering, Product2, PricebookEntry (Standard & custom)

**Open items**
- Run sf deploy validate against UAT org to confirm field requirements
- Verify in UAT org: External_ID_4D__c on OrderItemAdjustmentLineItem, price books active
- Test Drop rows with positive adjustment amounts in UAT
- Confirm Registration Item lookup: use Product2.Course_Offering__r.External_ID_4D__c or rely on org automation to copy Course Offering 4D ID to Product
- Decide: keep or delete unused Product/PricebookEntry code after removal from course flows
- Verify file encoding (UTF-8 re-export) handles garbled Notes values
- Confirm STAP registration-level discount already included in TA_Discount
- Confirm no adjustment group record needed (B2C-to-Order Management mapping)

**Decisions**
- Discount adjustment amount = Extension − Tuition (no separate sign rule per row type)
- Adjustment keyed ADJ-{Enrollment.ID}, attached to line via ENR-{id}
- Adjustment loads as second step in Registration Item Import, before activation
- No adjustment created if Extension − Tuition = 0
- Mismatch rows (Extension − Tuition ≠ TA_Discount) load with warning logged
- REG- prefix for registration orders; ENR- for registration line items; PIT- for purchase line items
- All enrollment rows (Add, Drop, AJST, New, DupEnrollment, Course cancel) generate line items
- Line item price sourced from Tuition field, not Extension

**Blockers**
- External_ID_4D__c field must exist on OrderItemAdjustmentLineItem or load fails
- Validation deploy not yet run — code unverified against target org
- Registration Item lookup strategy unresolved: Product2.External_ID_4D__c vs. Product2.Course_Offering__r.External_ID_4D__c

**Next**
- Run sf deploy validate against UAT org to confirm field requirements
- Verify in UAT org: External_ID_4D__c on OrderItemAdjustmentLineItem, price books active
- Test Drop rows with positive adjustment amounts in UAT
- Resolve Registration Item lookup: confirm org automation or update query to use Course_Offering__r.External_ID_4D__c
- Review & merge PR #1 to main
- Run Deploy session to ship code to production

**Checked live on 2026-11-03:** the repository
### Last session — 2026-11-03
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseEnhancement-Products |
| Session | `fb62e2a5-4dd6-4b7d-bb02-3ebab9e5ae57` |
**In its own words (excerpt):**
In the Course import flow (All, 2-Year and 5-Year), the Course Offering's key `External_ID_4D__c` = **Course.ID** (for example `20241_POL 68 H`). That same value is reused on two more objects.

## Objects that carry the Course Offering's 4D ID

| Object | Field | Value saved | Example |
|---|---|---|---|
| **CourseOffering** (the original) | `External_ID_4D__c` | Course.ID | `20241_POL 68 H` |
| **Product2** | `External_ID_4D__c` | Course.ID, the same value | `20241_POL 68 H` |
| **PricebookEntry**, custom book | `External_ID_4D__c` | Course.ID, the same value | `20241_POL 68 H` |
| **PricebookEntry**, Standard book | `External_ID_4D__c` | `STD-` + Course.ID | `STD-20241_POL 68 H` |

The Product also links to its offering through `Product2.Course_Offering__c`. That field holds the Course Offering's Salesforce record Id, not the 4D ID.

## Objects that use a different key
- **Learning** and **LearningCourse** don't use Course.ID. Their `External_ID_4D__c` is the **base course code with the section suffix removed**, for example `POL 68`, so all the sections of a course share one Learning Course.
- The Course Offering points back to its Learning Course through that base code (`Learnin

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
