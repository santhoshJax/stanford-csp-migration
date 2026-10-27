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
**Status:** at risk — Skipped rows spread across sheets & logs; architect decisions still pending on IDs/pricing/rows

**Done this session**
- Identified why skipped rows are incomplete: restarts create new sheets, failed writes log only to console, pre-6dd614b runs have no record

**Open items**
- Rebuild 5-Year integration in Prismatic (npm run import) if not done since 2ab766a
- Architect: confirm two order types (Registration, Purchase) or add third for transcripts
- Architect: decide Order/OrderItem/Product external ID prefixes (REG-, PUR-, ENR-, PIT-, CRS-) to prevent collisions
- Architect: confirm price book entry value for course Products (Tuition Rule or 0)
- Architect: confirm UnitPrice source (Tuition or Extension) and fee/discount handling
- Architect: confirm OrderItem rows follow deduplicated COP or all enrollments; dropped course handling
- Architect: confirm historical Orders end as Draft or Activated; who builds activation step
- Combine Skipped tabs from all Account Login sheets in Failed Records folder + log warnings into one list

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
- Skipped rows from Account Login import are fragmented across multiple sheets and logs; no single authoritative list exists

**Next**
- Combine all Skipped tabs from Failed Records folder + log warnings into one complete list for review
- Send 14 architect questions with suggested load order; await confirmation on order types, ID prefixes, pricing, row logic, activation owner
- Check if 5-Year integration rebuilt since 2ab766a; rebuild if needed
- Decide: implement three code changes to prevent future sheet fragmentation, or manually combine existing sheets via Google Workspace connector

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
You already have this for one continuous run. All windows in a run write to the same Skipped tab, each row with its reason. The problem is that it falls apart if the run is restarted or a sheet write fails. I read the code on `stanford-csp-orchestrate` at `aa93334` and changed nothing.

## How it works today
- **One run, one sheet.** The first window creates the results spreadsheet. Each window passes its `sheetId` to the next, so every window adds its skipped rows to the **same Skipped tab**, with the Window # and the reason.
- **The reasons recorded** are: column count mismatch, invalid Student_ID, duplicate Student_ID merged, not enrolled, no matching Account, and no usable email.
- **Same student in two windows:** this isn't treated as a skip. Both windows send the User, and the second one updates it. That's why it never shows up in Skipped.

## Why you might still not have the full list
1. **Each restart creates a new spreadsheet.** A run started by hand has no `sheetId`, so it creates a new "Account Login Import - User - <date time>" sheet, and the Window # starts again at 1. Skipped rows end up spread across several sheets in the Failed Records folder.
2. **A failed write on

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
