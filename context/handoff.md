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
**Status:** at risk — Code review complete. Five actionable findings; two decisions needed before build. Price update logic and name matching gaps identified.

**Done this session**
- Reviewed purchaseInventoryFlow.ts, purchaseItemFlow.ts, commerceShared.ts on stanford-csp-orchestrate
- Confirmed PricebookEntry external ID exists in UAT org; upsert is viable
- Identified three name-matching gaps: case sensitivity, IsActive filter, product name collision risk
- Mapped nine inventory items to Purchase Item product names; no gaps found in file

**Open items**
- Team: attempt CSV load to UAT; report FIELD_INTEGRITY_EXCEPTION or duplicate rule errors
- Team: confirm Grade_Option__c picklist labels match CSV values (Letter Grade, CR/NC, NGR, blank)
- Admin: verify/create Order.Prior_Registration__c, Order.BalanceDue__c, Payment.Transcript_Request__c lookups in UAT
- Admin: mark External_ID_4D__c as External ID on PaymentGroup, Refund, Product2
- Admin: create STAP, Course Drop, Registration Fee products in UAT ($0 price, both price books)
- Dev: refactor section 1a code to use CSP_Storefront_Base_URL label
- Decide: PricebookEntry external key format ({inventory ID}-STD, {inventory ID}-CSP, or {inventory ID}-{Pricebook2Id})
- Decide: make Product2.Name match case-insensitive and filter on IsActive = true

**Decisions**
- Keep site API names (StanfordContinuingStudies); change display name and URL path only
- Move hardcoded portal URLs to CSP_Storefront_Base_URL label
- Split ParticipantId into ParticipantContactId and ParticipantAccountId columns
- Use real API names from org describe; ParticipationStatus replaces placeholder Status
- CSV uses real 003 Contact IDs and 001 Account IDs (no fallback needed)
- Update existing records in org rather than insert new ones (keep Id column in CSV)
- Jason's hours consolidated to single workstream record per week (not split evenly)
- File prices will overwrite hand-edited prices in Salesforce (no hand-edit protection)

**Blockers**
- PricebookEntry key format undecided; blocks upsert refactor
- Name-match case sensitivity and IsActive filter undecided; blocks code change
- Grade_Option__c picklist labels unconfirmed against org schema
- Duplicate rule on student + offering may block CSV load if active
- Required UAT fields (Prior_Registration__c, BalanceDue__c, Transcript_Request__c, External_ID_4D__c) not yet verified/created

**Next**
- Decide PricebookEntry external key format and provide to Build session
- Decide whether to make Product2.Name match case-insensitive and add IsActive = true filter
- Build session: refactor purchaseInventoryFlow to upsert PricebookEntry; add two PricebookEntry result tabs
- Build session: add case-insensitive, IsActive-filtered name lookup to purchaseItemFlow
- Test in UAT: run Purchase Inventory twice to confirm PricebookEntry upsert handles non-updatable fields correctly

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
I changed nothing. I read `purchaseItemFlow.ts`, `purchaseInventoryFlow.ts` and `commerceShared.ts` on the `stanford-csp-orchestrate` branch.

## 1. Update prices from the file using External_ID_4D__c
PricebookEntry already has the external ID in your org, so the flow can upsert it instead of skipping existing entries.

- **Change:** upsert PricebookEntry through the same bulk upsert helper used for Product2. Drop the "query existing, then skip" step and the insert-only composite call.
- **Key format:** the file has one Unit_Price per product, but each product gets two entries (Standard and StanfordContinuingStudies). So the key can't be just the inventory ID. I suggest `{inventory ID}-STD` and `{inventory ID}-CSP`, or `{inventory ID}-{Pricebook2Id}`. Which do you prefer?
- **Product link:** the upsert can reference the product by its external ID (`Product2.External_ID_4D__c` column). It then doesn't depend on a successful Product2 result.
- **Risk to test in UAT first:** `Product2Id` and `Pricebook2Id` can't be changed on an existing PricebookEntry. If they are sent on the update, Salesforce may reject those rows. I haven't tested this. The check is to run it twice in UAT. If the 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
