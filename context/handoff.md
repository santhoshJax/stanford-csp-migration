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
**Status:** at risk — Course Products removal planned; awaiting 3 architect decisions before build

**Done this session**
- Analyzed course Product/PricebookEntry code across three commits
- Identified Registration Item dependency on course Products
- Drafted removal plan with three decision points

**Open items**
- Architect decision: Registration Item lookup strategy (Course Offering vs. Product External_ID)
- Architect decision: keep or delete unused Product/PricebookEntry code after removal
- Architect decision: Order.Type__c field vs. record type to mark Registration vs. Purchase orders
- Architect decision: Payments table as sole payment source or other sources exist
- Architect decision: historical Orders end state (Draft or Activated)
- Verify Tuition sign on Drop/AJST rows in real Enrollment file (positive vs. negative)
- Verify UAT org: Student__r.Student_ID_4D__c, Course_Offering__r.External_ID_4D__c field names, price books active
- Review and merge PR #1 to main

**Decisions**
- REG- prefix applied to registration orders, cards, payment groups, payments
- ENR- prefix for registration line items; PIT- for purchase line items
- registrationExtId() shared function ensures consistent key generation
- Registration flow two-round: Draft load, then OrderItem load, then Activation
- Drop and AJST enrollment rows each generate separate line items
- Line item price sourced from Tuition field, not Extension
- All enrollment rows (Add, Drop, AJST, New, DupEnrollment, Course cancel) generate line items
- Product2 upsert keyed on External_ID_4D__c = Course.ID

**Blockers**
- Order marking strategy (Order.Type__c vs. record type) blocks full run
- Architect confirmation needed on payment source scope and historical order end state
- Registration Item course Product lookup strategy must be decided before course Product removal

**Next**
- Architect decides: Registration Item lookup on Course Offering or Product External_ID
- Architect decides: delete or keep unused Product/PricebookEntry code
- Architect decides: build with diff review or build and push directly
- Obtain real Drop/AJST Enrollment rows from 4D to verify Tuition sign
- Verify UAT org: price books active, External_ID_4D__c field exists on PricebookEntry

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
I haven't changed anything yet. Here's what I found and the plan.

## What's on the branch now (`7c7ad00`)
The course Product work came in three commits, and they affect all three course flows (All, 2-Year, 5-Year):

| Commit | What it added |
|---|---|
| `8e29ccc` | A Product2 upsert for each Course Offering (Name, ProductCode, Description, `Course_Offering__c`, key `External_ID_4D__c` = Course.ID) |
| `2ab766a` | Cleans the Product Description: strips the HTML and caps it at 4,000 characters |
| `e17c1bb` | Standard and custom PricebookEntry for each Product (`coursePricebook.ts`) |

## Plan: remove Products and price book entries from the course flows
**Removed from the All, 2-Year and 5-Year flows:**
- The Product2 step, the price book check at the start of each window, the price book entry step, the `Product2` and `PricebookEntry` results tabs, and their summary lines.
- `coursePricebook.ts` and its tests, plus the Product payload and Description code in `courseUtils.ts` and `courseProduct.test.ts`. Nothing else uses them, and git history keeps them if you ever need them back.

**Unchanged:**
- Learning Course and Course Offering loads work exactly as before. Your org automati

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
