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
### Engagement state — 2026-11-10
**Status:** at risk — Code complete; UAT setup blocked on 11 config items + price book verification. Session clarified product requirements.

**Done this session**
- Clarified that Registration Fee, STAP, and Course Drop products need $0 price in both Standard and StanfordContinuingStudies price books
- Confirmed product names must match exactly (spelling and capitals) in UAT config boxes

**Open items**
- Admin: create STAP product in UAT with $0 price, active status in both price books
- Admin: create Course Drop product in UAT with $0 price, active status in both price books
- Admin: create Registration Fee product in UAT with $0 price, active status in both price books
- Verify Order.Prior_Registration__c lookup field exists on Order in UAT
- Verify Order.BalanceDue__c field exists in UAT
- Create Payment.Transcript_Request__c lookup to CSP_Transcript_Request__c
- Mark External_ID_4D__c as External ID on PaymentGroup and Refund
- Verify Product2.External_ID_4D__c exists and is marked as External ID in UAT

**Decisions**
- Flow run order: Student → Courses → Transcript Request → Purchase Inventory → Registration R1 (Draft) → Registration Item → Registration R2 (Activate) → Purchase flows → Payments
- STAP and Course Drop products use $0 price; UnitPrice overridden by file data
- Payments Import is sole payment source; Registration/Purchase no longer create Payment/Refund
- Prior_Registration__c filled in round 1 if prior Order exists; round 2 backfills missing
- BalanceDue__c is unified balance field across Registration and Purchase
- Purchase Inventory prices only added if not already present; price updates require manual intervention
- StanfordContinuingStudies Price Book is the order price book; all order line items must use prices from this book

**Blockers**
- STAP, Course Drop, and Registration Fee products not yet created in UAT
- Required fields (Prior_Registration__c, BalanceDue__c, Transcript_Request__c, External_ID_4D__c) not yet verified/created in UAT
- Product2.External_ID_4D__c not yet verified as External ID in UAT
- StanfordContinuingStudies Price Book not verified to exist and be active in UAT
- TEST_MODE still on in commerce flows

**Next**
- Admin: create STAP, Course Drop, and Registration Fee products in UAT with exact names, $0 price, active status in both Standard and StanfordContinuingStudies price books
- Admin: verify StanfordContinuingStudies Price Book exists and is active in UAT
- Admin: verify/create Order.Prior_Registration__c, Order.BalanceDue__c, Payment.Transcript_Request__c lookups
- Admin: mark External_ID_4D__c as External ID on PaymentGroup, Refund, and Product2
- Run test import in UAT with test mode on to validate setup
- Turn off TEST_MODE in commerce flows when ready for full load

**Checked live on 2026-11-10:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-10
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
Each of the three boxes takes the **exact name of a Salesforce product** (`Product2.Name`) that already exists in UAT. Nothing else goes in them: no IDs and no prices.

| Box | What to enter | Why it's needed |
|---|---|---|
| **Registration Fee Product** | `Registration Fee`, or whatever the fee product is called in UAT | Each registration with a fee gets a fee line on its Order, such as $35. Salesforce won't create a line without a product, so this tells the import which product to use. |
| **STAP Product** | `STAP` | Each STAP registration gets a discount line, such as −$415, or +$610 on a drop. This names the product for that line. |
| **Course Drop Product** | `Course Drop` | A drop Order with no enrollment row gets a drop line, such as −$610. The import first tries the original course's product. It only uses this product when it can't find exactly one course. |

**Why a product at all:** in Salesforce, every line on an Order has to point to a product that has an active price in the Order's price book. These three products just label what kind of line it is. The amount on each line comes from the file (`Reg_Fee`, `Discount_Amt`, `Courses_Subtotal`), so the price you give the p

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
