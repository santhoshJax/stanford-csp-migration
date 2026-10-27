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
**Status:** at risk — Code committed & pushed (96e3ddf); not deployed yet. Architect decisions still pending on IDs/pricing/rows.

**Done this session**
- Committed 7-file change (+1,716 / −458) to stanford-csp-orchestrate branch (96e3ddf)
- Pushed to GitHub; type check clean, all 32 Account Login tests pass
- Implemented deduplication: one Student_ID per run, later rows marked Skipped with window #
- Added row count validation & byte-offset resume for restarts on same sheet

**Open items**
- Open/review/merge PR to main; then run Deploy session to ship code live
- Run full integration on ~160,000 rows; verify Success + Errors + Not Processed + Skipped = source count
- Architect: confirm two order types (Registration, Purchase) or add third for transcripts
- Architect: decide Order/OrderItem/Product external ID prefixes (REG-, PUR-, ENR-, PIT-, CRS-) to prevent collisions
- Architect: confirm price book entry value for course Products (Tuition Rule or 0)
- Architect: confirm UnitPrice source (Tuition or Extension) and fee/discount handling
- Architect: confirm OrderItem rows follow deduplicated COP or all enrollments; dropped course handling
- Combine Skipped tabs from all Account Login sheets in Failed Records folder into one authoritative list

**Decisions**
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Product descriptions: HTML stripped, plain text only, 4,000-char limit
- Two order streams exist: Registration (tuition) and Purchase (non-course items)
- Deduplication: one Student_ID per run; later rows marked Skipped with window #; restart reuses index from Drive

**Blockers**
- Product2.External_ID_4D__c clash: Purchase Inventory and Course flows both upsert same field—silent overwrites break downstream lookups; prefix format not decided
- Architect has not confirmed external ID prefix strategy (REG-, PUR-, ENR-, PIT-, CRS-) for both streams
- Architect has not confirmed price book entry value for course Products or UnitPrice source (Tuition vs Extension)
- Architect has not confirmed whether OrderItems follow deduplicated COP rows or all enrollment rows
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- Code not deployed yet; integration still running old build

**Next**
- Open PR from stanford-csp-orchestrate to main; review & merge
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows; verify row counts balance across four tabs
- Send 14 architect questions with suggested load order; await confirmation on order types, ID prefixes, pricing, row logic, activation owner

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
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch 96e3ddf)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I pushed the change to `stanford-csp-orchestrate` as commit `96e3ddf`, and the branch on GitHub now points to it. It changes 7 files (+1,716 / −458). It hasn't been deployed or run yet.

The first commit attempt failed because this checkout had no git author set, so nothing was written then. I committed again under the same author as the branch's earlier commits (Santhosh). My working notes in `tasks/` were left out of the commit.

**What changes in the next run**
- **The whole file is read once before window 1.** This builds an index with one entry per Student_ID and saves it to Drive. A restart on the same file reuses that index.
- **Each student is sent to Salesforce once,** using their first row and marked active if an

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
