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
**Status:** at risk — Code committed (96e3ddf); config bug found & fix ready. PR review & deploy still pending.

**Done this session**
- Identified root cause: Account Login Results Spreadsheet ID missing default value in configPages.ts
- Confirmed fix: add `default: ""` (one line) to match other optional sheet ID settings
- Verified flow logic already handles blank/whitespace as 'create new sheet'

**Open items**
- Add `default: ""` to Account Login Results Spreadsheet ID in src/configPages.ts and commit to stanford-csp-orchestrate
- Open/review/merge PR to main; then run Deploy session to ship code live
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
- Confirm: add `default: ""` to Account Login Results Spreadsheet ID and push to stanford-csp-orchestrate
- Open PR from stanford-csp-orchestrate to main; review & merge
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows; verify row counts balance across four tabs

**Checked live on 2026-10-27:** the repository
### Last session — 2026-10-27
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
You're right, and the bug is mine. The description calls the setting "Optional", but I didn't give it a default value. Without a default, the config screen treats it as required and won't save it empty. The other optional sheet IDs in this file, such as "Course Correction Sheet ID" and "Student/Instructor/Associate Correction Sheet ID", have `default: ""`, which is why they can be left blank. The fix is to add that same line to this setting.

## What the setting is for, with an example

The flow reads the ~160,000-row file in windows of 500 rows, which is about 320 windows. All the results go into one results spreadsheet with Success, Errors, Not Processed and Skipped tabs.

**Run with no problems:**
- Window 1 creates the spreadsheet, say "Account Login Import – 28 Oct 10:00", with ID `1AbC…xyz`.
- Window 1 passes that ID to window 2, window 2 passes it to window 3, and so on.
- All 320 windows write to that one sheet. You don't need the setting at all.

**Run that stops partway:**
- Windows 1–120 write to sheet `1AbC…xyz`. Then window 121 stops, for example on `LIMIT_EXCEEDED` or a failed sheet write.
- The log says: resume from byte X and set "Account Login Results Spreadsheet I

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
