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
### Engagement state — 2026-10-31
**Status:** at risk — Price book code committed & pushed (8 files, 34 tests pass); registration field decision & org validation still open; mapping sheet & UAT s…

**Done this session**
- Committed 8 files (1,203 lines added, 2 removed) to stanford-csp-orchestrate
- Pushed to GitHub (commit e17c1bb); remote branch verified
- Rebased onto handoff note (32fd881) cleanly
- Type check passed; 34 price book and Product tests passed

**Open items**
- Architect decides: should Registration Orders switch to BalanceDue__c or keep Balance_Due__c
- Validate BalanceDue__c, 5 unit picklist values, Activated status, StanfordContinuingStudies price book exist in org
- Create PricebookEntry.External_ID_4D__c field (Text, External ID, Unique) in UAT with integration user edit access
- Create active StanfordContinuingStudies Price Book in UAT
- Set Price Books config var on Course Configuration page if book names differ from default
- Update D01 mapping workbook: add Pricebook2 and PricebookEntry rows, reflect Balance Due field and Activated status changes
- Fix 5 pre-existing failing Student Import tests
- Create PR to main and merge after architect approval

**Decisions**
- Blank Status counts as New in enrollment rule
- Index version incremented to 2
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Two order streams: Registration (tuition) and Purchase (non-course items)

**Blockers**
- Registration orders field decision still open (Balance_Due__c vs BalanceDue__c)
- Salesforce org not attached; BalanceDue__c, picklist values, Activated status, price book names not validated live
- PricebookEntry.External_ID_4D__c field and StanfordContinuingStudies Price Book must exist in UAT before first run

**Next**
- Architect confirms whether Registration Orders should switch to BalanceDue__c or keep Balance_Due__c
- Attach Salesforce org and validate BalanceDue__c, unit picklist, Activated status, price book in live org
- Create PricebookEntry.External_ID_4D__c field and StanfordContinuingStudies Price Book in UAT
- Update D01 mapping workbook with Pricebook2 and PricebookEntry rows
- Rebuild three course integrations and import into Prismatic
- Run first integration against org to validate price book step
- Create PR to main once architect approves registration field decision and org validation complete

**Checked live on 2026-10-31:** the repository
### Last session — 2026-10-31
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseEnhancement-Products |
| Session | `fb62e2a5-4dd6-4b7d-bb02-3ebab9e5ae57` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch no)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The price book step is committed and pushed. Commit `e17c1bb` is on `stanford-csp-orchestrate` on GitHub, and I checked that the remote branch now points at that commit and that `src/coursePricebook.ts` reads back from GitHub.

**What was pushed:** the same 8 files from the diff you reviewed (1,203 lines added, 2 removed). There's no PR to `main`.

**Before committing:**
- Someone pushed a handoff note (`32fd881`) to the branch after I built. It only changed `context/handoff.md`, so I rebased onto it without conflicts.
- After the rebase, the type check was clean and all 34 price book and Product tests passed.

**Not done yet:**
1. **Your team creates in UAT:** the `PricebookEntry.External_ID_4D__c` field (Text, External ID, Un

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
