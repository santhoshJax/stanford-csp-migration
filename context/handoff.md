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
**Status:** at risk — Code ready for UAT setup; Purchase Inventory flow documented; 11 config items + Product2.External_ID_4D__c still needed

**Done this session**
- Documented Purchase Inventory flow: reads catalogue, creates/updates products, adds prices to all price books

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

**Blockers**
- STAP and Course Drop products not yet created in UAT
- Required fields (Prior_Registration__c, BalanceDue__c, Transcript_Request__c, External_ID_4D__c) not yet verified/created in UAT
- Product2.External_ID_4D__c not yet verified as External ID in UAT
- TEST_MODE still on in commerce flows

**Next**
- Admin: create STAP, Course Drop, and Registration Fee products in UAT with $0 price, active status
- Admin: verify/create Order.Prior_Registration__c, Order.BalanceDue__c, Payment.Transcript_Request__c lookups
- Admin: mark External_ID_4D__c as External ID on PaymentGroup, Refund, and Product2
- Confirm STAP Product and Course Drop Product setting names in integration config
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
Purchase Inventory loads 4D's **catalogue of things a student can buy**, such as a transcript or a manuscript surcharge. It doesn't create any purchases. It sets up the products so the purchase lines have something to point at later. I read this in `src/purchaseInventoryFlow.ts` on `stanford-csp-orchestrate` at commit `4612381`.

## What it does, step by step

**1. It reads the Purchase Inventory file.** This is a small file of a few dozen rows. Each row is one item that can be sold.

**2. It creates or updates one Product (`Product2`) per row.**

| Source column | Salesforce field | Notes |
|---|---|---|
| `ID` | `External_ID_4D__c` | The raw ID (1–9), with no prefix. It can't clash with course IDs like `20081_DAR 200`. |
| `Item_Type` | `Name` and `ProductCode` | e.g. "Transcript" |
| `Description` | `Description` | |
| `Unit_Description` | `QuantityUnitOfMeasure` | Only the 5 known picklist values are loaded, e.g. "Each" or "per 1,000 words". Any other value leaves the field blank and logs a warning. |
| `Active` | `IsActive` | |

A row with no `Item_Type` is skipped, because a product needs a name.

**3. It gives each product a price (`PricebookEntry`) in every price book liste

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
