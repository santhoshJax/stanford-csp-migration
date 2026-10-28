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
**Status:** at risk — Config field removed & committed; PR pending review; deploy & full integration run still needed. Student index file explained—safe to delet…

**Done this session**
- Explained Student index file: what it is, why it's saved to Drive, when it can be deleted

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
- Review and merge PR from stanford-csp-orchestrate to main
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows with new config (no Account Login Results Spreadsheet ID field)
- Verify row counts balance: Success + Errors + Not Processed + Skipped = source count

**Checked live on 2026-10-28:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-10-28
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
**The import creates this file itself. It's the Student index, the cross-window duplicate check we added in commit `96e3ddf`.** It isn't a results sheet, and you don't need to do anything with it.

## What it is
Before window 1, the import reads the whole Account Login file once and writes one small entry per Student_ID to this JSON file. Each entry holds:
- the student's first row (line number and window), which is the only row sent to Salesforce
- whether any of the student's rows is active
- how many rows the student has, and whether they're enrolled

The file also holds the overall counts: total lines, blank lines, valid rows, column mismatches, invalid IDs, unique students, and duplicate rows. It has IDs, flags and positions only. There are no names or emails in it.

**The name:** the import names it `Stanford CSP - Account Login Import - Student Index - <ID>.json`. The ID at the end (`169lMYyPTETvrVQtlieYdBo3VVplV9jkM`) is the Drive ID of your Account Login **source file**, which is how the import finds the right index again later. It's saved in the same folder as the results sheet (`src/accountLoginIndex.ts`, line 510).

## Why it's saved to Drive
Each window runs as a separ

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
