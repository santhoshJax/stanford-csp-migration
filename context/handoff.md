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
**Status:** at risk — Config field removed & committed (1964cf8); PR pending review; deploy & full integration run still needed. Cross-window dedup confirmed wor…

**Done this session**
- Confirmed Student_ID deduplication runs cross-window, unaffected by field removal
- Verified results sheet ID now sourced from trigger payload only
- Confirmed index persists on restart to maintain dedup across resume

**Open items**
- Open PR from stanford-csp-orchestrate to main; review & merge
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows; verify Success + Errors + Not Processed + Skipped = source count
- Architect: confirm two order types (Registration, Purchase) or add third for transcripts
- Architect: decide Order/OrderItem/Product external ID prefixes (REG-, PUR-, ENR-, PIT-, CRS-)
- Architect: confirm price book entry value for course Products and UnitPrice source
- Architect: confirm OrderItem rows follow deduplicated COP or all enrollments
- Combine Skipped tabs from all Account Login sheets in Failed Records folder into one list

**Decisions**
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Product descriptions: HTML stripped, plain text only, 4,000-char limit
- Two order streams: Registration (tuition) and Purchase (non-course items)
- Deduplication: one Student_ID per run; later rows marked Skipped with window #; restart reuses index from Drive

**Blockers**
- Product2.External_ID_4D__c clash: Purchase Inventory and Course flows both upsert same field—silent overwrites break downstream lookups; prefix format not decided
- Architect has not confirmed external ID prefix strategy (REG-, PUR-, ENR-, PIT-, CRS-) for both streams
- Architect has not confirmed price book entry value for course Products or UnitPrice source (Tuition vs Extension)
- Architect has not confirmed whether OrderItems follow deduplicated COP rows or all enrollment rows
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- Code not deployed yet; integration still running old build

**Next**
- Open pull request from stanford-csp-orchestrate to main
- Review and merge PR to main
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows with new config (no Account Login Results Spreadsheet ID field)
- Verify row counts balance: Success + Errors + Not Processed + Skipped = source count

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
**Yes. The import still compares Student_IDs across all windows.** Removing the field only changed where the results go. It didn't touch the duplicate check, which runs on its own.

They're two separate things:

| | What it does | Affected by the removed field? |
|---|---|---|
| **Student index** | Reads the whole Account Login file once before window 1 and records each Student_ID's first row, the window that row is in, and whether any of the student's rows is active | No |
| **Results sheet ID** | Says which spreadsheet the Success / Errors / Not Processed / Skipped rows are written to | This is the one the field used to set. It now comes only from the payload |

**What happens in each window** (`src/accountLoginFlow.ts`, step 6, which calls `applyStudentIndex` in `src/accountLoginIndex.ts`):
- Each of the window's 500 rows is looked up in the index.
- If the row is the student's **first row in the file**, it's sent to Salesforce. IsActive is true if **any** of that student's rows is active.
- Any other row for that student, in this window or another one, goes to **Skipped** with the reason "Merged into this student's first row: line N, window M".

**Example:** student 12345 is on

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
