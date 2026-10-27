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
**Status:** at risk — Config field removed & committed (1964cf8); PR & deploy still pending. Integration not live yet.

**Done this session**
- Removed Account Login Results Spreadsheet ID field from src/configPages.ts
- Updated src/accountLoginFlow.ts to use trigger payload sheet ID only
- Updated ARCHITECTURE.md to document field removal and restart payload pattern
- Committed changes to stanford-csp-orchestrate (1964cf8) and pushed to GitHub
- Type check clean; all 32 Account Login tests pass

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
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch stanford-csp-orchestrate)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I've removed the "Account Login Results Spreadsheet ID" field and pushed the change to `stanford-csp-orchestrate` as commit `1964cf8`. GitHub shows the branch pointing at that commit. Nothing is deployed yet, so the field will stay on the config screen until you redeploy.

**What changed (3 files):**
- **`src/configPages.ts`:** the field is gone, so the config screen no longer asks for it.
- **`src/accountLoginFlow.ts`:** the flow only gets the results sheet ID from the trigger payload. Within one run nothing changes: window 1 creates the results sheet and passes its ID to each following window, so all rows go into one sheet. You don't need to set anything.
- **`ARCHITECTURE.md`:** updated to match, with a

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
