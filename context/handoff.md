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
**Status:** blocked — The duplicate check only looks inside one window.

**Done this session**
- The duplicate check only looks inside one window. It does not compare across windows. I read the code on `stanford-csp-orchestrate` at `d831965` and changed nothing. ## When the same Student_ID shows up in two windows - **Same window:** th…

**Open items**
- Rebuild 5-Year integration in Prismatic (npm run import) if not done since 2ab766a
- Architect: confirm two order types (Registration, Purchase) or add third for transcripts
- Architect: decide Order/OrderItem/Product external ID prefixes (REG-, PUR-, ENR-, PIT-, CRS-) to prevent collisions
- Architect: confirm price book entry value for course Products (Tuition Rule or 0)
- Architect: confirm UnitPrice source (Tuition or Extension) and fee/discount handling
- Architect: confirm OrderItem rows follow deduplicated COP or all enrollments; dropped course handling
- Architect: confirm historical Orders end as Draft or Activated; who builds activation step
- Add price book entries for course Products and set Order.Pricebook2Id, OrderItem.PricebookEntryId for both streams

**Decisions**
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Product descriptions: HTML stripped, plain text only, 4,000-char limit
- Two order streams exist: Registration (tuition) and Purchase (non-course items)

**Blockers**
- Product2.External_ID_4D__c clash: Purchase Inventory and Course flows both upsert same field—silent overwrites break downstream lookups; prefix format not decided
- Architect has not confirmed external ID prefix strategy (REG-, PUR-, ENR-, PIT-, CRS-) for both streams
- Architect has not confirmed price book entry value for course Products or UnitPrice source (Tuition vs Extension)
- Architect has not confirmed whether OrderItems follow deduplicated COP rows or all enrollment rows
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- 5-Year integration may not be rebuilt since fix was pushed—old build still running in Prismatic

**Next**
- Send 14 architect questions (structure, IDs/keys, pricing, rows/status, payments) with suggested load order to decision-maker
- Await architect confirmation on: order types, external ID prefixes, price book entry value, UnitPrice source, OrderItem row logic, activation step owner
- Check: has 5-Year integration been rebuilt (npm run import) since commit 2ab766a; rebuild if needed
- Once prefixes decided, update purchaseInventoryFlow.ts and courseFlow.ts; add Purchase flow skeleton
- Design Payments reconciliation: single source, Order lookup, CardPaymentMethod and PaymentGroup links

**Checked live on 2026-10-27:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-10-27
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
The duplicate check only looks inside one window. It does not compare across windows. I read the code on `stanford-csp-orchestrate` at `d831965` and changed nothing.

## When the same Student_ID shows up in two windows
- **Same window:** the extra rows go to the Skipped tab as "Duplicate Student_ID merged". The detail text reads "Another row **in this window** has the same Student_ID".
- **Different windows:** neither row is skipped. Each window sends that student to Salesforce, and because Users are upserted on Federation Id, the second window updates the User the first one created. So the student appears **twice in Success** (once "Created", once "Updated"), or in Errors if that window failed. They never go to Skipped.

**So cross-window duplicates aren't part of your 2,409.** They add extra Success rows rather than leaving rows out. If you compare by row count, that can actually hide missing rows, so compare unique Student_IDs.

**There is a separate risk here.** Within a window, a student counts as active if *any* of their rows is active. Across windows, the last window wins. If window 3 has the active row and window 7 has a stale `Inactive=TRUE` row, the User ends up **inactiv

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
