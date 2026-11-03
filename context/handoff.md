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
**Status:** at risk — Course Products removal planned; architect decisions still blocking build. Session documented current Product/PricebookEntry writes across…

**Done this session**
- Documented all Product2 fields written by course flows vs. Purchase Inventory
- Documented all PricebookEntry fields and update logic for both flows
- Clarified org automation dependency once course Products removed

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

**Checked live on 2026-11-03:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-03
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseEnhancement-Products |
| Session | `fb62e2a5-4dd6-4b7d-bb02-3ebab9e5ae57` |
**In its own words (excerpt):**
Two groups of flows write these objects: the three course flows and Purchase Inventory. Below is every field each one writes, taken from the latest code on `stanford-csp-orchestrate` (`247f2e0`). The course flows still create Products and price book entries, because the removal we planned last turn hasn't been built yet.

## Product2

| Field | Course flows (All / 2-Year / 5-Year) | Purchase Inventory |
|---|---|---|
| `External_ID_4D__c` (upsert key) | Course.ID, e.g. `20241_POL 68 H` | Purchase Inventory.ID, e.g. `3` |
| `Name` | Course.Title with HTML removed, up to 255 characters. If the title is blank it uses Course.Code, then Course.ID | Item_Type |
| `ProductCode` | Course.Code, e.g. `POL 68 H` (only if there is one) | Item_Type |
| `Description` | Course.Description converted to plain text, `_4DNL_` turned into line breaks, cut to 4,000 characters (only if there is one) | Description, cut to 4,000 characters (only if there is one) |
| `IsActive` | Always `false` | The 4D `Active` value |
| `Course_Offering__c` | The Course Offering saved for the same row | — |
| `QuantityUnitOfMeasure` | — | Unit_Description, only if it's a known picklist value. Anything else is skipped wit

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
