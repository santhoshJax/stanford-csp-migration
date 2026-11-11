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
**Status:** at risk — GatewayDate fix pushed; 18 Trevor questions identified (14 must-answer + 4 org-check); Prismatic publish & UAT checks still blocked

**Done this session**
- Extracted all open questions from import flow comments on stanford-csp-orchestrate branch
- Identified 18 questions: 14 requiring Trevor approval, 4 requiring UAT org checks
- Documented questions by category: discount/line handling, payment methods, field names, date cutoffs, other flows

**Open items**
- Publish branch to Prismatic: run npm run import and move UAT instance to new version
- Org check: Confirm Check_Amount__c on Order and External_ID_4D__c on Product2/PricebookEntry exist and are writable
- Org check: Verify no duplicate product names (case-insensitive) exist in UAT
- Org check: Confirm StanfordContinuingStudies Price Book exists in UAT instance settings
- Verify Student load has completed in UAT (Purchase needs Student_ID_4D__c)
- Resolve PR #1 merge/close decision to separate Course Import and Purchase reviews
- Re-run Purchase round 1 with card payment method rows only (after confirming update vs. insert behavior)
- Send Trevor 14 must-answer questions: discount type mappings, STAP/drop/payment handling, check number field type, order type field, final order state, transaction ID mapping, purchase/payments cutoff date, payment field names, refund setu…

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
- Code not yet published to Prismatic; flows still run old version (bare date, not ISO 8601)
- Org access needed to verify three pre-deploy checks (field existence, product name duplicates, price book setting)
- Trevor must answer 14 open questions before UAT load can proceed

**Next**
- Format 14 must-answer questions for Trevor with Answer column (ready to send as Word doc or email)
- Run npm run import to build and publish branch as new Prismatic integration version
- Move UAT instance to the new Prismatic version
- Run three org checks in UAT (field writability, product name duplicates, price book setting)
- Confirm Student load completed in UAT
- Test Purchase round 1 re-run on one order to confirm update vs. insert behavior before full reload

**Checked live on 2026-11-11:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-11
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Related-build |
| Session | `2cb154f7-df0b-4f6d-b07b-4304c80b818e` |
**In its own words (excerpt):**
I couldn't find the "14 questions" list from earlier written down anywhere: the project notes only name the topics. So I went through the comments in every import flow on `stanford-csp-orchestrate` (latest commit) and pulled out each question that is still open. I found 18. I left out anything the code marks as decided or confirmed.

## Must answer before the UAT load (Registration and Purchase orders)

1. **Discount names that still load blank.** These source values match nothing in `Order.TA_Discount_Type__c`: `Century Club`, `Staff, No STAP`, `Other`, `Pro-Rated Late Add`, `Financial Aid`, `Post-Doc`. For each one, should it go to an existing value or a new picklist value? For `Century Club`, should it be V1 or V2?
2. **STAP line.** We use `Discount_Amt` exactly as the file signs it (for example −415 on 592436117 and +610 on drop 592436118), on a product named "STAP". Is that the right column and the right product?
3. **Drop line.** A drop Order's line amount is `Courses_Subtotal`. Is that the right column?
4. **Registrations paid by cash, check or SNAP.** These rows have no card details, but we still create a CardPaymentMethod for every registration. Should we skip it for these

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
