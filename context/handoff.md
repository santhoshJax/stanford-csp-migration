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
### Engagement state — 2026-11-09
**Status:** at risk — Payments Import refined: orphan payments now load without Registration/Purchase/Transcript links. Code pushed, tests pass, UAT validation &…

**Done this session**
- Refined Payments Import to load payments without Registration_ID/Purchase_ID/Transcript_Request_ID links if those records don't exist in Salesforce
- Added run log counters: registrationNotInOrg, purchaseNotInOrg, transcriptRequestNotInOrg
- Code committed to stanford-csp-orchestrate (df24360) and pushed to GitHub
- Type check and 142 unit tests pass

**Open items**
- Architect: name other 4D payment tables if they exist beyond the one Payments file
- Confirm 'Stanford Medical Center' vs 'Stanford Healthcare' picklist value
- Admin adds 6 discount types to Order.TA_Discount_Type__c in UAT
- Create Registration Fee product in UAT with active price book entry
- Run sf deploy validate against UAT org schema
- Confirm 2-year cutoff (2024-10-06) with Julia or Trevor
- Turn off TEST_MODE in all commerce flows before deploy
- Review and merge PR #1 to main

**Decisions**
- Payments Import is sole payment source; Registration/Purchase no longer create Payment/Refund
- Payments with Purchase_ID attach to purchase payment group; registration ID takes precedence if both present
- Orphan payments (missing Registration/Purchase/Transcript records) now load without those links instead of being skipped
- Student_ID link remains required; payments without matching student still rejected by Salesforce
- Old Payment/Refund code kept behind ORDER_FLOWS_CREATE_PAYMENTS switch for potential reversal
- CardLastFour as Number(4,0); card brand mapping; 2-digit expiry year adds 2000
- All enrollment rows generate line items; Fee line created in first Registration Import (Draft only)
- Unreferenced Refunds from negative CC_Amt are correct

**Blockers**
- Code not yet validated against UAT org schema
- Registration Fee product must exist in UAT before first run
- 6 discount picklist values not yet added to UAT
- 'Stanford Medical Center' identity unconfirmed

**Next**
- Ask architect: are there other 4D payment tables beyond the one Payments file?
- Admin: add 6 discount types and Registration Fee product to UAT
- Run sf deploy validate against UAT org
- Confirm 2-year cutoff with Julia or Trevor
- Turn off TEST_MODE in commerce flows
- Review PR #1, merge to main, run Deploy session

**Checked live on 2026-11-09:** the repository
### Last session — 2026-11-09
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch stanford-csp-orchestrate)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Payments Import now links each of Registration_ID, Purchase_ID and Transcript_Request_ID only when that record exists in Salesforce. If it doesn't, the payment still loads without that link. I pushed this to `stanford-csp-orchestrate` as commit `df24360`, and the branch on GitHub points at it, so PR #1 includes it. The type check passes and 142 tests pass. The 5 failures are the usual Student-flow tests. It hasn't been run against an org yet, and test mode is still on.

## How a payment row loads now

| Payment row has | Record is in Salesforce | Record isn't in Salesforce |
|---|---|---|
| Registration_ID | Linked to the `REG-` payment group | Loads **without the link** (before, it was skipped) |
| Purcha

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
