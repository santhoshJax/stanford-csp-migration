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
### Engagement state — 2026-11-08
**Status:** at risk — Fee feature built & pushed; architect answers settle 4 questions but reverse payments decision—needs A/B choice before code changes

**Done this session**
- Received architect answers to 8 questions
- Confirmed: Unreferenced Refunds correct, discount picklist values, TotalAmount logic, 2-year cutoff

**Open items**
- Architect decision: Payments table as only source (A) or both sources with dedup (B)?
- Name other 4D payment tables if architect picks option A
- Confirm 'Stanford Medical Center' vs 'Stanford Healthcare' picklist value
- Confirm 2-year cutoff (2024-10-06) with Julia or Trevor before full load
- Admin adds 6 discount types to Order.TA_Discount_Type__c in UAT
- Create Registration Fee product in UAT with active price book entry
- Run sf deploy validate against UAT org schema
- Remove Refund step from flows only if payments decision is finalized

**Decisions**
- CardLastFour sent as Number(4,0); leading zero cannot be stored
- Card brand mapping: MC/MasterCard→Master Card, AmEx/AMEX→American Express
- 2-digit expiry year adds 2000; 4-digit year used as-is
- Adjustment Name sourced from Order.TA_Discount_Type__c with fallback
- All enrollment rows generate line items
- Payments Import flow: decision pending (A or B)
- Unreferenced Refunds from negative CC_Amt are correct; Refund step stays until payments decision made
- Fee line created in first Registration Import run (Draft stage only)

**Blockers**
- Payments table loading strategy undefined—architect must choose A (Payments only) or B (both, no duplicates)
- Code unvalidated against UAT org schema
- Registration Fee product must exist in UAT before first run
- 6 discount picklist values not yet added to UAT; 'Stanford Medical Center' identity unconfirmed

**Next**
- Draft question for architect: pick option A or B for payments; name other 4D payment tables if A
- Once architect chooses: update Registration and Purchase flows per decision
- Admin adds 6 discount types and Registration Fee product to UAT
- Run sf deploy validate against UAT org
- Confirm 2-year cutoff with Julia or Trevor
- Merge PR #1 to main and run Deploy session

**Checked live on 2026-11-08:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-08
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
The architect's answers settle 4, 6, 7 and 8. Answer 5 reverses what we decided, and the code can't change until we agree how payments should load. I haven't changed anything yet. The remote branch is at `6802d78` and matches what we built.

## What each answer means

| # | Answer | Effect on the code |
|---|---|---|
| 4 | An Unreferenced Refund is correct | **No change.** A negative CC_Amt already loads as an Unreferenced Refund attached to the payment group. This also overrides the "no refunds" line in the Gemini notes from 2026-11-05, so I won't remove the Refund step. |
| 5 | "Shouldn't the payments table be loaded?" | **This reverses our decision.** On 2026-11-02 Trevor said to skip the Payments table, and we did. See below. |
| 6 | Add the 6 values to the picklist | **No code change.** The code already sends MLA, SAA onetime, Teacher, Medical Center, Faculty and World Affairs Council. An admin needs to add them to `Order.TA_Discount_Type__c` in UAT before the first run. I can't do it, because no org is attached to this session. **Still not answered:** whether "Stanford Medical Center" is the same as "Stanford Healthcare". |
| 7 | 2 years was the original agreement | **No chan

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
