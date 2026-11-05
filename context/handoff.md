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
**Status:** at risk — 8 decisions from 2026-11-05 meeting reviewed; 4 match code, 4 don't. Refund step ready to remove; 5 questions for Trevor block STAP/drop/lo…

**Done this session**
- Reviewed all 8 decisions from 2026-11-05 Gemini meeting notes against current code
- Identified 4 code mismatches: Drop Order activation, Refund records, STAP lines, Prior_Registration_ID lookup, enrollment credits
- Confirmed Refund removal is clear enough to build now

**Open items**
- Remove Refund step (negative CC_Amt) from Registration and Purchase — ready to build
- Drop Order lines: create from registration row or activate empty Order? (decision 1, 2, 5)
- STAP line structure: separate product or adjustment? Which product? (decision 5)
- STAP amount: use Discount_Amt or STAP_Applied? (decision 5)
- Prior_Registration_ID lookup field name and target object (decision 6)
- Enrollment credits: source column and product/name for line item (decision 8)
- Run sf deploy validate against UAT org — code unvalidated against schema
- Confirm 6 discount types in UAT picklist; decide handling strategy

**Decisions**
- CardLastFour sent as Number(4,0); leading zero cannot be stored
- Card brand mapping: MC/MasterCard→Master Card, AmEx/AMEX→American Express
- 2-digit expiry year adds 2000; 4-digit year used as-is
- Adjustment Name sourced from Order.TA_Discount_Type__c with fallback
- All enrollment rows (Add, Drop, AJST, New, DupEnrollment, Course cancel) generate line items
- Payments Import flow left unchanged per architect guidance
- Refund records will be removed from migration (decision 4 from 2026-11-05 meeting)

**Blockers**
- Code unvalidated against UAT org schema — sf deploy validate not yet run
- Discount type picklist mismatch: 6 values in code but not confirmed in UAT
- 5 questions to Trevor block STAP, drop Order, and Prior_Registration_ID work

**Next**
- Remove Refund step from Registration and Purchase; push to stanford-csp-orchestrate
- Post 5 questions to Trevor in chat (Drop Order lines, STAP structure/amount, Prior_Registration_ID field, enrollment credits source)
- Run sf deploy validate against UAT org once Trevor answers questions
- Check UAT picklist values for Refund.Type and TA_Discount_Type__c
- Build STAP, drop Order, and lookup work after Trevor's answers

**Checked live on 2026-11-05:** Google Workspace, the Salesforce org, the repository
### Last session — 2026-11-05
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
I read the Gemini meeting notes in full. I couldn't review the recording itself: it's a 288 MB video, and I have no tool that can transcribe it. The Google Doc also contains only Gemini's summary and screenshots, not a word-for-word transcript. So everything below comes from Gemini's notes, which may be inaccurate (the notes say so themselves). Where the notes are vague, I've said so.

## Decisions from the 2026-11-05 meeting

| # | Decision | Does the code match? |
|---|---|---|
| 1 | **Adds and drops stay as two separate Orders.** One Order has the add line, the other has the drop line. They are never merged. | Partly. We already load them as separate Orders. |
| 2 | **Drop Orders are activated like any other Order, not left as Draft.** Trevor didn't want empty Draft Orders. | **No.** A drop registration with no enrollment rows (e.g. 592436118) gets no line items, so it stays Draft today. |
| 3 | **The original Order doesn't change when a course is dropped.** An UnEnrolled enrollment keeps its full price, e.g. $610 stays on 592434586. | Yes. Every enrollment row already becomes a line item. |
| 4 | **No Refund records in the migration.** Trevor showed that in Salesforce a refund 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
