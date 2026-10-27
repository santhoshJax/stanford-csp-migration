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
### Engagement state — 2026-10-27
**Status:** at risk — Transcript Request deployed & validated; critical Product2 External_ID clash found in Purchase Inventory vs Course flows—blocks both until…

**Done this session**
- Identified root cause: Purchase Inventory & Course flows both upsert Product2 on External_ID_4D__c with overlapping numeric IDs (1,2,3…)
- Confirmed clash silently overwrites Products—no Salesforce error, breaks downstream Purchase Item lookups by Name
- Mapped fix: assign prefixes (e.g. CRS-3 for courses, keep 3 for Purchase Inventory) to separate External_ID ranges

**Open items**
- Validate code deploy (sf deploy validate) on commit 3bfbfd7 before PR merge
- Open PR on stanford-csp-orchestrate, review, merge to main
- Run Deploy session to ship Transcript Request to org
- Architect confirm: ATE population for past data (Sep 28 decision vs workbook)
- Confirm Order.Status: Draft on load then activate, or Activated (FAILED_ACTIVATION risk)
- Define external ID prefixes for Order, OrderItem, Product; confirm Registration prefix & Product Name source
- Fix ATE lookup key to include term (registration-plus-term) for multi-term checkouts
- Decide: Adjustment records get OrderItem? Dropped enrollments charged? UnitPrice = Tuition or Extension?

**Decisions**
- MAX_ROWS = 500 per run; POLL_BUDGET_MS = 10 min; MAX_JOB_HANDOFFS = 6
- Skipped tab rolls over same as Success/Errors tabs when full
- Account Login retry: up to 5 attempts, exponential backoff 2s–30s; non-retryable errors fail immediately
- TEST_MODE = false for next full run
- ENR- prefix for Enrollment ID (existing, confirmed in workbook)
- Transcript Request: unmatched Student IDs sent to error CSV with warning log; no blocking

**Blockers**
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- Code–workbook sync broken on ATE, Order.Status, OrderItem, and multi-term key—blocks Registration flow update
- Product2.External_ID_4D__c clash: Purchase Inventory (ID 1,2,3…) and Course flows (ID 1,2,3…) both upsert same field—silent overwrites break downstream lookups; requires prefix assignment before either flow runs in production

**Next**
- Architect decision: assign Product2 external ID prefix format (e.g. CRS-{CourseID}, keep numeric for Purchase Inventory)
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code to confirm no org conflicts
- Open PR, review, merge to main once approved
- Schedule Deploy session to push both Transcript Request and prefix-corrected flows to org

**Checked live on 2026-10-27:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-10-27
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseEnhancement-Products |
| Session | `fb62e2a5-4dd6-4b7d-bb02-3ebab9e5ae57` |
**In its own words (excerpt):**
Here it is in plain terms. I re-checked `src/purchaseInventoryFlow.ts` on `stanford-csp-orchestrate` to make sure this matches the code.

## The clash is on one field: `Product2.External_ID_4D__c`

It isn't about the Course Offering's external ID. `CourseOffering.External_ID_4D__c` holds only Course Offerings, so it's safe. The clash happens because **two different 4D tables would write their IDs into the same field on the same object (Product2)**.

## How Purchase Inventory relates to Product

The Purchase Inventory flow already creates Products. Each row in the 4D Purchase Inventory table (things you can buy, such as a transcript fee or a manuscript surcharge) becomes one Product2:

| Purchase Inventory (4D) | → | Product2 field |
|---|---|---|
| ID | → | `External_ID_4D__c` |
| Item_Type | → | `Name` and `ProductCode` |
| Description | → | `Description` |
| Active | → | `IsActive` |

It saves with an **upsert on `External_ID_4D__c`**: "if a Product with this ID already exists, update it, otherwise create it." Then it adds a price book entry for each of those Products.

## Why that causes a clash with courses

The new course step would also upsert Products on `External_ID_4D__c`,

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
