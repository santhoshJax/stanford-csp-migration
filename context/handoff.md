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
### Engagement state — 2026-10-31
**Status:** blocked — Purchase flows exist as 3 separate flows, not combined; 3 architect decisions + price book strategy block merge

**Done this session**
- Confirmed three separate Purchase flows (Inventory, Purchase, Purchase Item) exist on branch since 2026-10-14
- Mapped all 11 code departures from workbook against live repo
- Identified gaps: no combined flow, hard-coded Standard Price Book, course/inventory product name collision risk, no registration line items

**Open items**
- Architect confirms Order.Status handling: Draft + custom field for source, or accept loss
- Architect provides real Product2.QuantityUnitOfMeasure picklist values for unit mapping
- Architect confirms Balance_Due__c vs BalanceDue__c field name
- Architect decides: price book name, whether to retire 3 flows or keep alongside combined flow
- Architect confirms which product and price book registration OrderItems should use
- Fix 5 failing Student Import tests before merge
- Build combined purchase flow (if architect approves strategy) or update three existing flows
- Run Deploy session to ship code live to Salesforce org

**Decisions**
- Blank Status counts as New in enrollment rule (awaiting team confirmation)
- Index version incremented to 2; old saved index will not be reused
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Two order streams: Registration (tuition) and Purchase (non-course items)

**Blockers**
- No combined purchase flow committed; three separate flows exist but don't match requested architecture
- Price book name not configurable; all flows hard-code Standard Price Book
- Product name collision risk: Purchase Item matches by name across all 4D products, including course products
- Architect has not confirmed external ID prefix strategy (REG-, PUR-, ENR-, PIT-, CRS-) for both streams
- Three mapping decisions unconfirmed: Order.Status, QuantityUnitOfMeasure picklist values, Balance_Due field name
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- 5 Student Import tests failing (pre-existing, not caused by this commit)

**Next**
- Send architect decision document: price book name/strategy, retire vs keep 3 flows, 3 mapping decisions, registration line item product/price book
- Architect confirms all decisions before build work starts
- Fix 5 failing Student Import tests
- Build combined purchase flow or update three existing flows per architect decision
- Open and review pull request from stanford-csp-orchestrate into main
- Run Deploy session to ship code live to Salesforce org

**Checked live on 2026-10-31:** the repository, the Salesforce org, Google Workspace
### Last session — 2026-10-31
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Orders |
| Session | `f4cdddc2-dc81-4ddd-82f3-28dc8071f9d4` |
**In its own words (excerpt):**
I haven't built or changed anything. Short version: the purchase work exists as three separate flows, not one, and it doesn't do what you described yet.

## What's in the repo now (`stanford-csp-orchestrate`)

All three were added in one commit on 2026-10-14 and are registered as flows 26–28:

| Flow | Creates | Price book |
|---|---|---|
| Purchase Inventory Import | Product2 and PricebookEntry | Standard Price Book only |
| Purchase Import | CardPaymentMethod, Order, PaymentGroup, Payment | Order set to Standard Price Book |
| Purchase Item Import | OrderItem (line items) | Looks up the entry in Standard Price Book |

Each flow has its own file ID setting and they must run in order: Inventory, then Purchase, then Purchase Item. Purchase and Purchase Item are still in test mode, so each run loads only 50 records and stops after one window.

## Gaps against what you asked for

1. **There is no single flow.** Products, price book entries, orders and line items are created by three flows. The last session's notes mention a combined purchase flow patch, but it was never committed. Nothing like it is on the branch.
2. **The price book name isn't configurable.** All three flows hard-cod

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
