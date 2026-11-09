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
**Status:** at risk — Payments Import refined & pushed; 18 open questions block UAT validation & deploy

**Done this session**
- Compiled 18 open questions from code comments and decisions into structured list for stakeholder review

**Open items**
- Architect: confirm other 4D payment tables beyond Payments file
- Admin: add 6 discount types to Order.TA_Discount_Type__c in UAT
- Admin: create Registration Fee product in UAT with active price book entry
- Confirm 'Stanford Medical Center' vs 'Stanford Healthcare' picklist value
- Confirm 2-year cutoff date (2024-10-06) with Julia or Trevor
- Resolve 18 open questions from code (field names, lookup fields, cutoff logic, drop registrations, STAP handling, etc.)
- Run sf deploy validate against UAT org schema
- Turn off TEST_MODE in all commerce flows before deploy

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
- 18 open questions from code require stakeholder answers before UAT validation can proceed
- Code not yet validated against UAT org schema
- Registration Fee product must exist in UAT before first run
- 6 discount picklist values not yet added to UAT
- 'Stanford Medical Center' identity unconfirmed

**Next**
- Share 18-question list with Trevor/Julia for answers (offer spreadsheet format)
- Admin: add 6 discount types and Registration Fee product to UAT
- Architect: confirm other 4D payment tables
- Confirm 2-year cutoff and resolve field-name questions (4D_Payment_Sub_Type__c, 4D_Freeze__c, Payment_Type)
- Run sf deploy validate against UAT org
- Turn off TEST_MODE in commerce flows
- Review PR #1, merge to main, run Deploy session

**Checked live on 2026-11-09:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-09
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
Here are the open questions for each import, taken from the code on `stanford-csp-orchestrate` (head `df24360`) and this session's decisions. I've left out anything the architect or you have already settled.

## Registration Import
1. **Discount values.** Has the admin added the 6 values to `Order.TA_Discount_Type__c` in UAT? They are MLA, SAA onetime, Teacher, Medical Center, Faculty and World Affairs Council.
2. **"Stanford Medical Center".** Is this the same as **Stanford Healthcare**, or is it a separate value?
3. **2-year cutoff.** The architect said "I believe 2 years". We still need a firm yes from Julia or Trevor on the exact date, **2024-10-06**.
4. **Cash, check and SNAP registrations.** These rows have no card details, but a card payment record is still created for every registration. Should we skip the card record for them?
5. **Balance field.** Registration writes `Balance_Due__c` and Purchase writes `BalanceDue__c`. Order seems to have both fields. Which one is correct?
6. **EffectiveDate.** The workbook gives no source for this required field, so we use Registration_Date. Is that right?
7. **Drop registrations** (sample 592434586 / 592436118). You asked me to set the

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
