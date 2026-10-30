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
### Engagement state — 2026-10-30
**Status:** blocked — I wrote the combined purchase flow and type-checked it, but I couldn't commit or push it.

**Done this session**
- I wrote the combined purchase flow and type-checked it, but I couldn't commit or push it. This is a General session, which can't change code in the repo. I attached the changes as `purchase-combined-flow.patch` (601 lines) plus `purchaseCo…

**Open items**
- Team confirms blank Status field handling (currently New) and reviews enrollment rule changes
- Open pull request from stanford-csp-orchestrate into main
- Review and merge PR to main
- Fix 5 failing Student Import tests before merge
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows; verify Success + Errors + Not Processed + Skipped = source count
- Architect: confirm two order types (Registration, Purchase) or add third for transcripts
- Architect: decide Order/OrderItem/Product external ID prefixes (REG-, PUR-, ENR-, PIT-, CRS-)

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

**Next**
- Team reviews enrollment rule changes and confirms blank Status treatment
- Open pull request from stanford-csp-orchestrate into main
- Fix 5 failing Student Import tests
- Merge PR to main
- Run Deploy session to ship code live to Salesforce org

**Checked live on 2026-10-30:** the Salesforce org, the repository, Google Workspace
### Last session — 2026-10-30
| | |
|---|---|
| Type | GENERAL |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Orders |
| Session | `6f09d647-de77-4c02-89d2-2ebcb15e2452` |
**In its own words (excerpt):**
I wrote the combined purchase flow and type-checked it, but I couldn't commit or push it. This is a General session, which can't change code in the repo. I attached the changes as `purchase-combined-flow.patch` (601 lines) plus `purchaseCombinedFlow.ts`. I haven't run the flow against a Salesforce org. To get it onto `stanford-csp-orchestrate`, start a Build session on this repo and have it apply the patch, or run `git apply purchase-combined-flow.patch` yourself.

**What I found:** the repo already had four separate flows for this (Purchase Inventory, Purchase, Purchase Item and Payments). All of them were hardwired to the Standard Price Book.

**What I added:** a new flow, "Purchase Combined Import" (`src/purchaseCombinedFlow.ts`). It runs these steps in order:
1. **Products:** it creates a Product2 from each Purchase Inventory row.
2. **Price book entries:** it looks up the price book whose name is in the new config value `Purchase Price Book Name`, and creates the book if it doesn't exist. It adds a Standard Price Book entry first, which Salesforce requires before a custom book can have one. It then adds one entry per product in the named book. Existing entries are not repriced

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
