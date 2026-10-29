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
**Status:** at risk — Enrollment rule pushed to stanford-csp-orchestrate (f1f7922); PR review & merge to main pending before deploy

**Done this session**
- Committed enrollment rule changes (6 files, 222 added/83 removed) to stanford-csp-orchestrate
- Pushed commit f1f7922 to GitHub after fixing author name
- Confirmed blank Status treated as New in rule logic

**Open items**
- Team confirms blank Status field handling (currently New) and reviews enrollment rule changes
- Open pull request from stanford-csp-orchestrate into main
- Review and merge PR to main
- Fix 5 failing Student Import tests before merge
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows; verify Success + Errors + Not Processed + Skipped = source count
- Architect: confirm two order types (Registration, Purchase) or add third for transcripts
- Architect: decide Order/OrderItem/Product external ID prefixes (REG-, PUR-, ENR-, PIT-, CRS-)

**Decisions**
- Blank Status counts as New in enrollment rule (awaiting team confirmation)
- Index version incremented to 2; old saved index will not be reused
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Two order streams: Registration (tuition) and Purchase (non-course items)

**Blockers**
- Product2.External_ID_4D__c clash: Purchase Inventory and Course flows both upsert same field—silent overwrites break downstream lookups; prefix format not decided
- Architect has not confirmed external ID prefix strategy (REG-, PUR-, ENR-, PIT-, CRS-) for both streams
- Architect has not confirmed price book entry value for course Products or UnitPrice source (Tuition vs Extension)
- Architect has not confirmed whether OrderItems follow deduplicated COP rows or all enrollment rows
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- 5 Student Import tests failing (pre-existing, not caused by this commit)

**Next**
- Team reviews enrollment rule changes and confirms blank Status treatment
- Open pull request from stanford-csp-orchestrate into main
- Fix 5 failing Student Import tests
- Merge PR to main
- Run Deploy session to ship code live to Salesforce org

**Checked live on 2026-10-29:** the repository
### Last session — 2026-10-29
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix(again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch stanford-csp-orchestrate)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The new enrollment rule is pushed to `stanford-csp-orchestrate` as commit `f1f7922`, on top of `f4e6964`. I fetched the branch back from GitHub to check: the commit is there, with the same 6 files (222 lines added, 83 removed), and there are no local changes left.

The first push attempt failed because the commit had no author name. I set it to the name used on the branch's earlier commits (Santhosh) and pushed again.

**What it changes:**
- **Login created:** any of the student's Enrollment rows has a Status other than New.
- **Skipped as "Only New enrollments":** every row is New or blank.
- **Skipped as "No enrollment rows":** the student has no rows in the Enrollment file.
- **Index rebuilt:** the Stud

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
