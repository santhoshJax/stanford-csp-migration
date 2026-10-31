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
**Status:** at risk — Purchase flow mappings documented; 5 architect decisions + 5 failing tests block commit

**Done this session**
- Documented complete field-by-field mapping for all 6 purchase flows (Product2, PricebookEntry, Order, CardPaymentMethod, PaymentGroup/Payment, OrderItem)
- Identified 5 mapping decisions still requiring architect confirmation
- Confirmed code compiles and 19 purchase flow tests pass

**Open items**
- Architect confirms Order price book: Standard or StanfordContinuingStudies
- Architect confirms Order.Status handling: add custom field or accept loss
- Architect provides real Product2.QuantityUnitOfMeasure picklist values
- Architect confirms Balance_Due__c vs BalanceDue__c field name
- Architect confirms product ID prefix strategy for inventory products (recommend PIT-)
- Fix 5 failing Student Import tests before merge
- Commit and push 6 changed files to stanford-csp-orchestrate branch
- Run Deploy session to ship code live to Salesforce org

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
- Architect has not confirmed which price book Orders should use
- Architect has not confirmed Order.Status, QuantityUnitOfMeasure, Balance_Due field decisions
- Architect has not confirmed product ID prefix strategy (PIT- recommended for inventory)
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- 5 Student Import tests failing (pre-existing, not caused by this commit)

**Next**
- Architect reviews and confirms 5 mapping decisions from D01 workbook
- Fix 5 failing Student Import tests
- Commit 6 changed files to stanford-csp-orchestrate once architect approves
- Open and review pull request from stanford-csp-orchestrate into main
- Run Deploy session to ship code live to Salesforce org

**Checked live on 2026-10-31:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-10-31
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Orders |
| Session | `f4cdddc2-dc81-4ddd-82f3-28dc8071f9d4` |
**In its own words (excerpt):**
Below is the field-by-field mapping the purchase flows write, as of the current (uncommitted) code. The same content is in the **D01 — Purchase Source-to-Target Mapping** workbook already attached to this session.

## 1. Purchase_Inventory → Product2 (Purchase Inventory Import, runs 1st)

| Source field | Target field | How it's handled |
|---|---|---|
| ID | External_ID_4D__c | Upsert key, raw ID with no prefix |
| Item_Type | Name | Copied. The row is skipped if blank because Name is required |
| Item_Type | ProductCode | Copied |
| Description | Description | Cut to 4,000 characters |
| Unit_Description | QuantityUnitOfMeasure | Only written if it's a valid picklist value (today only "Each"). Otherwise left blank |
| Active | IsActive | TRUE/FALSE → checkbox |
| Created_\* / Last_Modified_\* | — | Not loaded (Do Not Map) |

## 2. Purchase_Inventory → PricebookEntry (same flow)

| Source | Target field | How it's handled |
|---|---|---|
| Unit_Price | UnitPrice | Same price in every configured book. No entry if blank |
| Active | IsActive | Same as Product2.IsActive |
| Product2 created in this run | Product2Id | Lookup |
| **Price Books** setting | Pricebook2Id | One entry per b

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
