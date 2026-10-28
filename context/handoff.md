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
**Status:** at risk — Account Login duplicate & email issues analyzed; PR pending merge; Deploy & full integration run still needed

**Done this session**
- Analyzed Account Login skip reasons: 2,961 merged duplicates, 1,182 invalid IDs, 258 no-email, 3 no-account, 999 blank rows
- Analyzed DUPLICATE_USERNAME errors (187 total): identified three causes and query method to diagnose
- Documented username suffix fix option for email clashes

**Open items**
- Review and merge PR from stanford-csp-orchestrate to main
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows; verify Success + Errors + Not Processed + Skipped = source count
- Confirm whether Student source file contains repeated IDs
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
- Account Login: 187 DUPLICATE_USERNAME errors need diagnosis (existing User, shared email, or other org clash)

**Next**
- Decide: username suffix for Account Login Users or export 187 failed emails for audit
- Review and merge PR from stanford-csp-orchestrate to main
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows with new config; verify row counts balance

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
Here's what each skip reason and the error mean, based on the code on `stanford-csp-orchestrate`. I haven't changed anything.

## Skipped reasons (other than Not enrolled)

**Duplicate Student_ID (merged): 2,961.** No data was lost here. These are extra rows for a student who appears more than once in the Account Login file. Only the student's **first** row is sent to Salesforce, and the User is set active if **any** of the student's rows is active. The other rows go to this list. The Detail column gives the line and window each one was merged into.
*Example:* student 12345 is on lines 1,200 and 3,600. Line 1,200 creates the User, and line 3,600 is listed here as "merged into line 1,200".

**Invalid Student_ID: 1,182.** The Student_ID must be a whole number greater than 0. Rows are skipped when the ID is:
- blank
- `0` (or `00`)
- not a plain whole number, for example `ABC`, `12-34`, or `12345.0`

The Detail column shows the actual value, so you can see which of these it was. **Worth checking:** if many of them look like `12345.0`, those are real IDs that a spreadsheet export reformatted. The import rejects them as they stand.

**No usable email: 258.** The student is enrolled and 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
