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
**Status:** blocked — I can't read the full text of the session "Stanford-Data-Migration-Purchase-Orders-General".

**Done this session**
- I can't read the full text of the session "Stanford-Data-Migration-Purchase-Orders-General". I have no tool that opens another session's record. The only copy I can reach is the excerpt in `context/handoff.md`, and it cuts off partway thro…

**Open items**
- Team confirms blank Status field handling (currently New) and reviews enrollment rule changes
- Architect decides: Order.Status—start Draft + custom field for source status, or leave lost?
- Architect provides real Product2.QuantityUnitOfMeasure picklist values for unit mapping
- Architect confirms Balance_Due__c vs BalanceDue__c field name
- Open pull request from stanford-csp-orchestrate into main
- Fix 5 failing Student Import tests before merge
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows; verify Success + Errors + Not Processed + Skipped = source count

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
- Product2.External_ID_4D__c clash: Purchase Inventory and Course flows both upsert same field—silent overwrites break downstream lookups; prefix format not decided
- Architect has not confirmed external ID prefix strategy (REG-, PUR-, ENR-, PIT-, CRS-) for both streams
- Architect has not confirmed price book entry value for course Products or UnitPrice source (Tuition vs Extension)
- Architect has not confirmed whether OrderItems follow deduplicated COP rows or all enrollment rows
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- 5 Student Import tests failing (pre-existing, not caused by this commit)
- Three mapping decisions blocking merge: Order.Status handling, QuantityUnitOfMeasure values, Balance_Due field name

**Next**
- Architect reviews 8 mapping departures and answers 3 decisions (Status, UOM picklist, field name)
- Start Build session to apply purchase-combined-flow.patch to stanford-csp-orchestrate branch
- Fix 5 failing Student Import tests
- Open and review pull request from stanford-csp-orchestrate into main
- Merge PR to main once tests pass and architect confirms mappings
- Run Deploy session to ship code live to Salesforce org

**Checked live on 2026-10-31:** the repository
### Last session — 2026-10-31
| | |
|---|---|
| Type | DESIGN |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Orders |
| Session | `bb2f49fc-4938-4adb-a07f-165cdb10f25f` |
**In its own words (excerpt):**
I can't read the full text of the session "Stanford-Data-Migration-Purchase-Orders-General". I have no tool that opens another session's record. The only copy I can reach is the excerpt in `context/handoff.md`, and it cuts off partway through the departures table. I haven't changed anything.

## What the excerpt says (session of 2026-10-30)

The combined purchase flow is written and type-checked, but I haven't seen it run against an org. It reuses the existing mappers, so most fields follow the Purchase Inventory, Purchase and Purchase Item tabs. The session found 8 places where the code departs from the workbook.

Of the 8 departures, I can only see the first row, `Purchase.Status` → `Order.Status`, and its text is cut off. The other 7 are lost, apart from the open items below.

## Decisions needed

**Architect decisions that block the merge:**
1. **`Order.Status`:** start every order as Draft and keep the source status in a new custom field, or accept that the source status is lost.
2. **`Product2.QuantityUnitOfMeasure`:** the real picklist values, so the unit mapping can be written.
3. **Balance due field name:** `Balance_Due__c` or `BalanceDue__c`.

**Other open decisions:**
4.

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
