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
**Status:** at risk — All enrollment rows now generate line items; code complete. Order marking & payment scope still block full run.

**Done this session**
- Verified External_ID_4D__c field usage across Product2, PricebookEntry, and Purchase Inventory flows

**Open items**
- Architect decision: Order.Type__c field vs. record type to mark Registration vs. Purchase orders
- Architect decision: Payments table as sole payment source or other sources exist
- Architect decision: historical Orders end state (Draft or Activated)
- Verify Tuition sign on Drop/AJST rows in real Enrollment file (positive vs. negative)
- Verify UAT org: Student__r.Student_ID_4D__c, Course_Offering__r.External_ID_4D__c field names, price books active
- Review and merge PR #1 to main
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP before full run
- Reconcile Order totals against Payments (New/DupEnrollment rows may increase totals)

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
- Order marking strategy (Order.Type__c vs. record type) blocks full run—REG-/PUR- prefix currently the only differentiator
- Architect confirmation needed on payment source scope and historical order end state

**Next**
- Architect confirms Order marking decision (field vs. record type), payment source scope, historical order status
- Obtain real Drop/AJST Enrollment rows from 4D to verify Tuition sign (positive vs. negative)
- Verify UAT org: price books active, External_ID_4D__c field exists on PricebookEntry
- Review and merge PR #1 to main
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP in code
- Run Deploy session: validate then deploy to target org

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
Here's what the code on `stanford-csp-orchestrate` (`ed2be45`) saves in each one.

## Product2: `External_ID_4D__c`
| Flow | Value saved | Example |
|---|---|---|
| Course All / 2-Year / 5-Year | **Course.ID**, unchanged | `20241_POL 68 H` |
| Purchase Inventory | **Purchase Inventory.ID**, unchanged | `3` |

Both flows upsert on this field, so a re-run updates the existing Product instead of creating a new one. Course IDs and inventory IDs (1–9) never overlap, so neither needs a prefix.

## Pricebook2: no external ID
- Nothing is saved, because the flows never create price books.
- They find each book **by name**, using the `Price Books` config var. The Standard Price Book is found by `IsStandard = true`.

## PricebookEntry: `External_ID_4D__c`
| Flow | Book | Value saved | Example |
|---|---|---|---|
| Course flows | Standard | `STD-` + Course.ID | `STD-20241_POL 68 H` |
| Course flows | Custom (StanfordContinuingStudies) | Course.ID | `20241_POL 68 H` |
| Purchase Inventory | any | **Nothing.** The field is left blank | — |

**Two things to be aware of:**
- **The course flows don't match on this key.** They find an existing entry by Product + Price Book, then insert or update it

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
