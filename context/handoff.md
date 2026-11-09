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
**Status:** at risk — Code ready for UAT setup; 11 config items needed before import, products & fields still pending

**Done this session**
- Verified branch 4612381 has no pending commits
- Documented flow run order and dependencies
- Listed all UAT setup requirements from code

**Open items**
- Admin: create STAP product in UAT with $0 price, active status
- Admin: create Course Drop product in UAT with $0 price, active status
- Admin: create Registration Fee product in UAT if missing
- Verify Order.Prior_Registration__c lookup field exists on Order in UAT
- Verify Order.BalanceDue__c field exists in UAT
- Create Payment.Transcript_Request__c lookup to CSP_Transcript_Request__c
- Mark External_ID_4D__c as External ID on PaymentGroup and Refund
- Confirm STAP Product and Course Drop Product setting names match created products

**Decisions**
- Flow run order: Student → Courses → Transcript Request → Purchase Inventory → Registration R1 (Draft) → Registration Item → Registration R2 (Activate) → Purchase flows → Payments
- STAP and Course Drop products use $0 price; UnitPrice overridden by file data
- Payments Import is sole payment source; Registration/Purchase no longer create Payment/Refund
- Prior_Registration__c filled in round 1 if prior Order exists; round 2 backfills missing
- BalanceDue__c is unified balance field across Registration and Purchase

**Blockers**
- STAP and Course Drop products not yet created in UAT
- Required fields (Prior_Registration__c, BalanceDue__c, Transcript_Request__c, External_ID_4D__c) not yet verified/created in UAT
- TEST_MODE still on in commerce flows

**Next**
- Admin: create STAP, Course Drop, and Registration Fee products in UAT with $0 price, active status
- Admin: verify/create Order.Prior_Registration__c, Order.BalanceDue__c, Payment.Transcript_Request__c lookups
- Admin: mark External_ID_4D__c as External ID on PaymentGroup and Refund
- Confirm STAP Product and Course Drop Product setting names in integration config
- Run test import in UAT with test mode on to validate setup
- Turn off TEST_MODE in commerce flows when ready for full load

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
I've checked the branch on GitHub. Its latest code commit is `4612381` and nothing is waiting to be pushed. Below is the run order, and then what to set up in UAT for the changes from 8–9 November.

## The order the flows run in, and why

Each step needs records from the step before it to already be in Salesforce. Records are matched by their 4D IDs, so if a record isn't there yet, the link fails or the row is skipped.

| # | Flow | Why it goes here |
|---|---|---|
| 1 | **Student** | Every Order, card record, line item and payment points to a student. Students have to exist first. |
| 2 | **Course imports** | These create the course products and their prices in the price book. A course line on an Order can't be created without its course product. |
| 3 | **Transcript Request** | Payments for transcripts link to these. If they're missing, the payment still loads but without the link. |
| 4 | **Purchase Inventory** | This creates the merchandise products that Purchase Item lines use. |
| 5 | **Registration, round 1** ("Activate Registration Orders" = false) | Creates each Order as **Draft**, with its card record, fee line, STAP line and payment group. It's Draft because Salesforce o

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
