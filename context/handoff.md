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
**Status:** at risk — Code committed & pushed (bc96380); awaiting UAT validation, architect field decision, and deploy

**Done this session**
- Rebased 6 files onto latest remote (7 newer commits, no conflicts)
- Consolidated duplicate 'Price Books' settings into one shared setting
- Standardized 'Activate Purchase Orders' to use 'default: "false"'
- Deleted duplicate price book helper; purchase flows now use course checks
- All 48 purchase and course price book tests pass; 133/138 full suite pass
- Committed and pushed to stanford-csp-orchestrate (bc96380)

**Open items**
- Verify both price books active and PricebookEntry.External_ID_4D__c exists in UAT org
- Run purchase load sequence: Inventory → Purchase (off) → Item → Purchase (on)
- Architect decides: Registration Orders field (Balance_Due__c vs BalanceDue__c)
- Open PR to main once architect approves and UAT validation complete
- Deploy to Salesforce org (not yet run)

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
- PricebookEntry.External_ID_4D__c field and both price books must be active in UAT before purchase load run

**Next**
- Verify in UAT org: both price books active, PricebookEntry.External_ID_4D__c field exists
- Run purchase load: Inventory → Purchase (Activate off) → Item → Purchase (Activate on)
- Architect confirms Registration Orders field choice
- Open PR from stanford-csp-orchestrate to main
- Schedule Deploy session to ship to Salesforce

**Checked live on 2026-10-31:** the repository
### Last session — 2026-10-31
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Orders |
| Session | `f4cdddc2-dc81-4ddd-82f3-28dc8071f9d4` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch stanford-csp-orchestrate)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Steps 1–4 are done. The change is committed and pushed to `stanford-csp-orchestrate` as commit `bc96380`. I checked that the remote branch now points to that commit and nothing is left uncommitted. It isn't on `main` and hasn't been run in Salesforce.

**What changed from the plan**
- **Rebase:** I rebased onto the latest branch with no conflicts. By then the branch had 7 newer commits, not 6, because another handoff note had landed.
- **One "Price Books" setting:** I removed ours. All the course and purchase flows now read the setting on the Course Configuration page, and I updated its description to cover the purchase flows too.
- **One set of price book checks:** I deleted our copy of the price book cod

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
