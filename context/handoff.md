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
**Status:** at risk — Balance & Stanford Healthcare fixed & pushed; 9 blockers remain before UAT validation

**Done this session**
- Balance field: Registration now writes BalanceDue__c (matches Purchase)
- Stanford Medical Center mapped to Stanford Healthcare in discount logic
- 3 new tests added and passing (145 total pass, 5 expected Student-flow failures)
- Changes committed to stanford-csp-orchestrate (commit d8e1901) and pushed to GitHub

**Open items**
- Admin: add 5 discount values to Order.TA_Discount_Type__c in UAT (MLA, SAA onetime, Teacher, Faculty, World Affairs Council)
- Architect: confirm Order lookup field name for Prior_Registration_ID
- Architect: confirm if STAP line is own product or adjustment on each course line
- Architect: confirm STAP amount source (Discount_Amt or STAP_Applied)
- Architect: confirm where drop with no enrollment row gets its lines
- Confirm 2-year cutoff date (2024-10-06) with Julia or Trevor
- Confirm if cash/check/SNAP registrations should skip card payment record creation
- Confirm EffectiveDate source (Registration_Date assumed, needs validation)

**Decisions**
- Balance field: BalanceDue__c is correct (unified across Registration and Purchase)
- Stanford Medical Center and Medical Center both map to Stanford Healthcare
- Payments Import is sole payment source; Registration/Purchase no longer create Payment/Refund
- Payments with Purchase_ID attach to purchase payment group; registration ID takes precedence if both present
- Orphan payments load without missing links instead of being skipped
- Student_ID link remains required; payments without matching student rejected
- Old Payment/Refund code kept behind ORDER_FLOWS_CREATE_PAYMENTS switch for potential reversal
- CardLastFour as Number(4,0); card brand mapping; 2-digit expiry year adds 2000

**Blockers**
- 4 architectural questions on Prior_Registration_ID field, STAP handling, and drop line sourcing block Drop/STAP feature build
- 5 discount picklist values not yet added to UAT (MLA, SAA onetime, Teacher, Faculty, World Affairs Council)
- 2-year cutoff date (2024-10-06) unconfirmed with Julia or Trevor
- Code not yet validated against UAT org schema (sf deploy validate pending)
- TEST_MODE still on in commerce flows

**Next**
- Admin: add 5 discount values to Order.TA_Discount_Type__c in UAT
- Architect: answer 4 questions on Prior_Registration_ID field, STAP product/adjustment, STAP amount source, drop line sourcing
- Confirm 2-year cutoff date (2024-10-06) with Julia or Trevor
- Run sf deploy validate against UAT org schema
- Turn off TEST_MODE in all commerce flows
- Open PR #1 → review → merge to main → run Deploy session to ship to UAT

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

Both changes are committed and pushed to `stanford-csp-orchestrate` as commit `d8e1901`. The branch on GitHub points at that commit, so PR #1 includes them. The type check passes and 145 tests pass; the 5 failures are the usual Student-flow tests. Nothing has been run against an org, and test mode is still on.

**What's in the commit:**
- **Balance field:** Registration now writes `BalanceDue__c`, the same field Purchase uses. It no longer writes `Balance_Due__c`.
- **Discount type:** `Medical Center` and `Stanford Medical Center` now load as **Stanford Healthcare**.
- **Tests:** 3 new tests for these changes.

**Still to do:**
- **Discount values in UAT:** the admin needs to add these 5 values to `Order.T

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
