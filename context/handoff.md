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
**Status:** at risk — Code complete; UAT setup blocked on 11 config items + price book verification

**Done this session**
- Confirmed StanfordContinuingStudies Price Book is the order price book in config
- Clarified Purchase Inventory prices required in both Standard and custom price books

**Open items**
- Admin: create STAP product in UAT with $0 price, active status
- Admin: create Course Drop product in UAT with $0 price, active status
- Admin: create Registration Fee product in UAT if missing
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
- STAP and Course Drop products not yet created in UAT
- Required fields (Prior_Registration__c, BalanceDue__c, Transcript_Request__c, External_ID_4D__c) not yet verified/created in UAT
- Product2.External_ID_4D__c not yet verified as External ID in UAT
- StanfordContinuingStudies Price Book not verified to exist and be active in UAT
- TEST_MODE still on in commerce flows

**Next**
- Admin: create STAP, Course Drop, and Registration Fee products in UAT with $0 price, active status in both Standard and StanfordContinuingStudies price books
- Admin: verify StanfordContinuingStudies Price Book exists and is active in UAT
- Admin: verify/create Order.Prior_Registration__c, Order.BalanceDue__c, Payment.Transcript_Request__c lookups
- Admin: mark External_ID_4D__c as External ID on PaymentGroup, Refund, and Product2
- Run test import in UAT with test mode on to validate setup
- Turn off TEST_MODE in commerce flows when ready for full load

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
The other price book is **"StanfordContinuingStudies Price Book"**. I found it in the "Price Books" setting in `src/configPages.ts` on `stanford-csp-orchestrate`, where its default value is:

`Standard Price Book,StanfordContinuingStudies Price Book`

**What that means for Purchase Inventory:**
- Each inventory product gets a price, `Unit_Price`, in both books. The Standard Price Book is done first, because Salesforce needs a standard price before it accepts a custom one.
- The Standard Price Book is always included, even if someone removes it from the setting.
- The setting can hold **only one custom price book**. Every book listed has to exist and be active in the org, or the run stops before it writes anything.

**Why the custom book matters:** it's the **order price book**. Registration and Purchase Orders are created in it, and every line item has to use a price from that same book. The code picks the first custom book in the setting, and only falls back to Standard when no custom book is listed. So the STAP, Course Drop and Registration Fee products also need an active price in **StanfordContinuingStudies Price Book**.

**Course products are different:** the course import flo

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
