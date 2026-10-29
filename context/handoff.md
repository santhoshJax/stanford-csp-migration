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
### Engagement state — 2026-10-29
**Status:** at risk — BUILD completed; enrollment rule drafted locally, awaiting team decision on blank Status handling before push

**Done this session**
- Drafted enrollment rule changes across 6 files (accountLoginFlow, accountLoginIndex, tests, ARCHITECTURE.md)
- Confirmed code changes not yet pushed; branch still at 6b3a81c

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
- Team decision pending: blank Status field handling in enrollment rule before push

**Next**
- Team reviews enrollment rule changes (patch file or draft PR available)
- Confirm blank Status field treatment (currently New) and any other enrollment rule feedback
- Push enrollment rule to branch (either stanford-csp-orchestrate or separate feature branch per team decision)
- Run SQL queries in UAT org to diagnose 110 extra Course Offerings
- Review and merge PR from stanford-csp-orchestrate to main
- Run Deploy session to ship code live to Salesforce org

**Checked live on 2026-10-29:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-10-29
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix(again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
Got it. I'll hold everything until you've confirmed what you need to. Go ahead with your questions.

**Nothing was pushed.** The branch on GitHub is still at `6b3a81c`, the same commit as before. The new enrollment rule exists only as uncommitted edits in my working copy, in these 6 files:
- `src/accountLoginFlow.ts`
- `src/accountLoginIndex.ts`
- `src/accountLoginFlow.test.ts`
- `src/accountLoginIndex.test.ts`
- `src/accountLoginSkipped.test.ts`
- `ARCHITECTURE.md`

**Ways to continue without pushing to the shared branch:**
1. **Push to a separate branch** (for example `stanford-csp-orchestrate-enrollment-rule`) and open a draft pull request into `stanford-csp-orchestrate`. You and the team can review the diff without the shared branch changing. Pushing to another branch does go against the fixed branch for this session, so I'd only do it if you say so.
2. **Get the diff as a file.** I can attach a patch file, or a short document listing each change, so you can review it offline or share it with the team.
3. **Wait for the team.** I keep the edits local and push nothing until the team has replied to the Slack message. That includes how a blank Status should count, which I've treat

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
