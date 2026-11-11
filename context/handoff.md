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
### Engagement state — 2026-11-11
**Status:** at risk — Purchase code committed & pushed; org checks & deploy still needed before load can run

**Done this session**
- Committed six Purchase fixes to stanford-csp-orchestrate (ce43697): Check_Amount__c mapping, OrderItem.Type default, case-insensitive product match, PricebookEntry upsert on External_ID_4D__c, success/failure tabs, TEST_MODE off
- Added unit tests for all six changes; 189 of 194 tests pass (5 pre-existing Student Import failures unrelated)
- Pushed to GitHub; commit now visible in open PR #1

**Open items**
- Code: Validate deploy (sf deploy validate) before shipping
- Code: Resolve PR #1 merge/close decision to avoid mixing Course Import and Purchase reviews
- Org check: Confirm existing PricebookEntry records have External_ID_4D__c populated
- Org check: Verify no duplicate product names (case-insensitive) between nine inventory items and course products
- Org check: Confirm Check_Amount__c and External_ID_4D__c fields exist and are writable
- Deploy: Run Deploy session to ship code to UAT org
- Load: Run Purchase load against UAT after deploy and org checks pass
- Sheet: Fill SA Reviewed By and Script Status columns on all three tabs

**Decisions**
- Purchase cutoff is fixed 2024-10-06, not rolling two-year window
- PricebookEntry external ID key format: STD-{ID} for Standard, {ID} for StanfordContinuingStudies
- Keep site API names; change display name and URL path only
- Move hardcoded portal URLs to CSP_Storefront_Base_URL label
- Split ParticipantId into ParticipantContactId and ParticipantAccountId
- Use real API names from org describe; ParticipationStatus replaces placeholder Status
- CSV uses real 003 Contact IDs and 001 Account IDs; update existing records
- File prices overwrite hand-edited prices in Salesforce

**Blockers**
- Org access needed to verify PricebookEntry External_ID_4D__c is populated and writable
- Org access needed to confirm no duplicate product names (case-insensitive) exist
- PR #1 (Course Import) is open on same branch; merge or close before separate Purchase review

**Next**
- Resolve PR #1: merge to main or close, then open new PR for Purchase work alone
- Run sf deploy validate on stanford-csp-orchestrate branch
- Attach UAT org and run Deploy session to ship Purchase code
- In UAT org, run three pre-deploy org checks (External_ID_4D__c, product name duplicates, field writability)
- Run Purchase load in UAT after deploy and org checks pass
- Fill SA Reviewed By and Script Status columns on all three sheet tabs

**Checked live on 2026-11-11:** the repository
### Last session — 2026-11-11
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Related-build |
| Session | `2cb154f7-df0b-4f6d-b07b-4304c80b818e` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch stanford-csp-orchestrate)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I committed and pushed the Purchase changes to `stanford-csp-orchestrate` as commit `ce43697`, and confirmed it's on GitHub. I didn't open a new PR. But PR #1 (Course Import correction mode) is already open from this branch, so this commit now shows up in PR #1 too. If you want the Purchase work reviewed on its own, merge or close PR #1 first.

**What's in the commit:** six files covering the six changes:
- the check amount is now saved on the order
- order lines get the type "Order Product"
- product names match regardless of capitalisation, using only active prices
- price entries are matched on keys `STD-{ID}` (Standard) and `{ID}` (StanfordContinuingStudies), so a re-run updates them instead of adding 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
