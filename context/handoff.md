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
### Engagement state — 2026-10-28
**Status:** at risk — Account Login fixed & PR pending; Student & Enrollment flows audited—no index needed, but duplicate & reporting gaps found

**Done this session**
- Audited Student flow: no duplicate check; repeated IDs would fail in-window or overwrite cross-window
- Audited Enrollment flows (2-year & all-time): whole-file duplicate check in memory, no index needed
- Identified reporting gaps: merged/skipped rows not listed; results-sheet write failures only warn; no count reconciliation

**Open items**
- Open PR from stanford-csp-orchestrate to main; review & merge
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows; verify Success + Errors + Not Processed + Skipped = source count
- Confirm whether Student source file contains repeated IDs (single count settles if duplicate logic needed)
- Architect: confirm two order types (Registration, Purchase) or add third for transcripts
- Architect: decide Order/OrderItem/Product external ID prefixes (REG-, PUR-, ENR-, PIT-, CRS-)
- Architect: confirm price book entry value for course Products and UnitPrice source
- Architect: confirm OrderItem rows follow deduplicated COP or all enrollments

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
- Student flow: no duplicate check; repeated IDs would fail or overwrite—need to confirm if file has repeated IDs first

**Next**
- Check Student source file for repeated IDs (single count); if none found, Student only needs reporting fixes
- Review and merge PR from stanford-csp-orchestrate to main
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows with new config (no Account Login Results Spreadsheet ID field)

**Checked live on 2026-10-28:** the repository
### Last session — 2026-10-28
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
I read both flows and changed nothing. **Student and Enrollment don't need the index file. They handle duplicates in two different ways, and neither matches Account Login.** Enrollment already has a whole-file duplicate check. Student has no duplicate check at all.

## Student Import (`src/studentFlow.ts`)

**How it runs:** it reads the file in windows of 2,000 rows (`MAX_ROWS = 2000`). Each window sends its rows to Salesforce as an upsert on `Account.Student_ID_4D__c`, then starts the next window from the byte offset where it stopped. This is the same windowed design Account Login had before the change.

**Duplicate handling:** there isn't any, either within a window or across windows. The only rows it skips are:
- rows whose column count doesn't match the header
- rows where ID is blank, not a number, or 0
- in correction mode, rows that aren't in the correction sheet

**What would happen if a Student ID appeared twice:**
- **In the same window:** both rows go into one Bulk API job keyed on the same external ID. Salesforce normally rejects those rows with a duplicate external ID error, so they would show up on the Errors tab. This is the same error that led to the per-window chec

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
