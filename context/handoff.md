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
### Engagement state — 2026-11-05
**Status:** at risk — Fee line feature built & pushed; 5 blockers remain: Trevor's answers, schema validation, picklist check, Refund removal, STAP/Drop/lookup w…

**Done this session**
- Built $35 registration fee as separate line item (FEE-{ID})
- Committed to stanford-csp-orchestrate branch (commit 5698075)
- Pushed to GitHub; PR #1 includes fee feature
- 135 tests pass including 3 new ones with sample registrations
- Type check passes

**Open items**
- Remove Refund step from Registration and Purchase flows
- Drop Order activation: create lines from registration or activate empty Order?
- STAP line structure: separate product or adjustment? Which product?
- STAP amount: use Discount_Amt or STAP_Applied?
- Prior_Registration_ID: lookup field name and target object
- Enrollment credits: source column and product/name for line item
- Run sf deploy validate against UAT org schema
- Confirm 6 discount types exist in UAT picklist; decide handling

**Decisions**
- CardLastFour sent as Number(4,0); leading zero cannot be stored
- Card brand mapping: MC/MasterCard→Master Card, AmEx/AMEX→American Express
- 2-digit expiry year adds 2000; 4-digit year used as-is
- Adjustment Name sourced from Order.TA_Discount_Type__c with fallback
- All enrollment rows (Add, Drop, AJST, New, DupEnrollment, Course cancel) generate line items
- Payments Import flow left unchanged per architect guidance
- Refund records will be removed from migration
- Fee line created in first Registration Import run (Draft stage only)

**Blockers**
- Code unvalidated against UAT org schema — sf deploy validate not yet run
- 5 questions to Trevor block STAP, Drop Order, Prior_Registration_ID, enrollment credits work
- Discount type picklist mismatch: 6 values in code, not confirmed in UAT
- Registration Fee product must exist in UAT before first run

**Next**
- Post 5 questions to Trevor in chat (Drop Order lines, STAP structure/amount, Prior_Registration_ID field, enrollment credits source)
- Create Registration Fee product in UAT with active price book entry
- Run sf deploy validate against UAT org once Trevor answers
- Check UAT picklist values for Refund.Type and TA_Discount_Type__c
- Remove Refund step from flows and push to stanford-csp-orchestrate
- Build STAP, Drop Order, and lookup work after Trevor's answers
- Open PR #1 → review → merge to main → run Deploy session

**Checked live on 2026-11-05:** the repository
### Last session — 2026-11-05
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

The $35 registration fee now loads as its own line item on the Order. I pushed this to `stanford-csp-orchestrate` as commit `5698075`; the remote branch points at it, so PR #1 includes it. It hasn't been run against an org.

## How each registration now loads
Each registration still becomes one Order, keyed `REG-{ID}`. Its lines are:
- **One line per enrollment** (from Registration Item Import): price = Tuition, plus the discount adjustment, so each line comes to its Extension.
- **New: one fee line**, keyed `FEE-{Registration ID}`. It's created in the first Registration Import run, when Orders are still Draft:
  - Price = `Reg_Fee`, quantity 1, type "Order Product".
  - It's attached to the Order through 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
