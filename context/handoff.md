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
**Status:** at risk — Transcript Request filtering confirmed; Product2 External_ID clash still blocks both flows until prefixes assigned

**Done this session**
- Validated Transcript Request row filters: Missing ID (skipped silent), 2-year scope (2024-07-07 fixed cutoff), empty entries dropped
- Confirmed unmatched Student IDs sent to error CSV per decision; blank Student_ID rows sent without Student__c value
- Identified stale code comment in buildRecords (says 'filter by account match', no longer accurate)

**Open items**
- Architect decision: assign Product2 external ID prefix format (e.g. CRS-{CourseID}, keep numeric for Purchase Inventory)
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code to confirm no org conflicts
- Open PR, review, merge to main once approved
- Schedule Deploy session to push Transcript Request and prefix-corrected flows to org
- Validate code deploy (sf deploy validate) on commit 3bfbfd7 before PR merge
- Architect confirm: ATE population for past data (Sep 28 decision vs workbook)
- Confirm Order.Status: Draft on load then activate, or Activated (FAILED_ACTIVATION risk)

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

**Checked live on 2026-10-27:** the repository
### Last session — 2026-10-27
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-TranscriptRequestUpdates |
| Session | `142b7fd5-2422-4c75-8ca4-5c332d6519db` |
**In its own words (excerpt):**
The Transcript Request import drops rows in only two places. Everything else is per-field cleanup that never removes a record. I checked this in `src/transcriptRequestFlow.ts` on `stanford-csp-orchestrate`.

## Filters that drop whole rows

| # | Filter | Rule in code | What happens to the row |
|---|---|---|---|
| 1 | **Missing ID** | `ID`, with any trailing `.0` removed, is empty | Skipped without being logged, and not counted in the source-row total |
| 2 | **2-year scope** | `Request_Date` must be on or after **2024-07-07** (`TWO_YEAR_CUTOFF`) | Skipped and counted as "filtered (outside 2yr window)" in the run log |

**One side effect of filter 2:** rows where `Request_Date` is blank, can't be parsed, or is the 4D null value `00/00/00` are also dropped. These rows aren't old; they just have no usable date. They are counted together with the out-of-window rows, so the log can't tell the two apart.

**The cutoff date is fixed:** 2024-07-07 is written directly into the code. It does not move forward over time, so a later run uses the same date.

The code comment puts the scope at **2,154 of 26,020** source records.

## Filter on child items (Transcript_Request_Item__c)

- One item

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
