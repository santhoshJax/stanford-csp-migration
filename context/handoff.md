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
**Status:** blocked — I changed nothing.

**Done this session**
- I changed nothing. Here are the six points, checked against `purchaseInventoryFlow.ts` and `purchaseItemFlow.ts` on the `stanford-csp-orchestrate` branch. ## 1. Why prices never update on re-run This is a limitation of how the flow was bui…

**Open items**
- Team: attempt CSV load to UAT; report FIELD_INTEGRITY_EXCEPTION or duplicate rule errors
- Team: confirm Grade_Option__c picklist labels match CSV values (Letter Grade, CR/NC, NGR, blank)
- Admin: verify/create Order.Prior_Registration__c, Order.BalanceDue__c, Payment.Transcript_Request__c lookups in UAT
- Admin: mark External_ID_4D__c as External ID on PaymentGroup, Refund, Product2
- Admin: create STAP, Course Drop, Registration Fee products in UAT ($0 price, both price books)
- Dev: refactor section 1a code to use CSP_Storefront_Base_URL label
- Confirm: delete 12 zeroed Hypercare - Stan:ContEd records or leave as-is
- Obtain usable content from 2026-11-09 screen recording (wait, describe, screenshots, or re-record with narration)

**Decisions**
- Keep site API names (StanfordContinuingStudies); change display name and URL path only
- Move hardcoded portal URLs to CSP_Storefront_Base_URL label
- Split ParticipantId into ParticipantContactId and ParticipantAccountId columns
- Use real API names from org describe; ParticipationStatus replaces placeholder Status
- CSV uses real 003 Contact IDs and 001 Account IDs (no fallback needed)
- Update existing records in org rather than insert new ones (keep Id column in CSV)
- Jason's hours consolidated to single workstream record per week (not split evenly)

**Blockers**
- Grade_Option__c picklist labels unconfirmed against org schema
- Duplicate rule on student + offering may block CSV load if active
- Required UAT fields (Prior_Registration__c, BalanceDue__c, Transcript_Request__c, External_ID_4D__c) not yet verified/created
- Screen recording (2026-11-09) unprocessable; no transcript or usable content extracted

**Next**
- Verify Price Books setting in deployed Prismatic instance matches code default
- Confirm StanfordContinuingStudies Price Book exists and is active in UAT org
- Check org automation doesn't duplicate entries for inventory products
- Decide on screen recording: wait for reprocessing, describe content, share screenshots, or re-record with narration
- Team: attempt CSV load to UAT; report any errors to unblock field confirmation

**Checked live on 2026-11-11:** the repository
### Last session — 2026-11-11
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Flows |
| Session | `37d53c41-f101-4747-94db-b73400d5256e` |
**In its own words (excerpt):**
I changed nothing. Here are the six points, checked against `purchaseInventoryFlow.ts` and `purchaseItemFlow.ts` on the `stanford-csp-orchestrate` branch.

## 1. Why prices never update on re-run
This is a limitation of how the flow was built. It isn't a business rule.
- The code comment says the workbook gives PricebookEntry no External ID. Product2 has `External_ID_4D__c`, so it can be upserted. PricebookEntry has no such key, so the flow can only insert it.
- On a re-run the flow queries each price book first. If the product already has an entry there, it skips it. That avoids duplicate-entry errors, but it also means a changed price in the file is ignored.
- A skip is not a conflict. The price could be updated by looking up the existing entry's Id and sending an update. That is not written today.

If you want prices to follow the file, I can add an update step for existing entries. The catch is that it would overwrite any price someone edited by hand in Salesforce. Do you want that, or should hand edits win?

## 2 and 3. Order of runs and the UAT prerequisite
Noted. Purchase Inventory runs before Purchase Item Import, and `External_ID_4D__c` already exists on Product2 in UAT.



_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
