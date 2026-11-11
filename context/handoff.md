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
**Status:** at risk — Review complete: 6 code gaps found vs. decisions made. Workbook external ID format doesn't match flows.

**Done this session**
- Verified external ID prefixes in Purchase, Purchase Item, and Inventory flows
- Confirmed PUR- and PIT- prefixes are hardcoded and used in queries
- Identified 6 code gaps: Check_Amt not mapped, OrderItem.Type still off, name-match case sensitivity and IsActive filter not applied, PricebookEntry upsert key undecided, TEST_MODE still on

**Open items**
- Decide: PricebookEntry external ID key format ({ID}-STD / {ID}-CSP) — blocks upsert refactor
- Code change: Map Check_Amt to Check_Amount__c in mapToOrder
- Code change: Set OrderItem.Type to 'Order Product' default
- Code change: Apply case-insensitive product name match and IsActive=true filter to PricebookEntry query
- Code change: Switch TEST_MODE off in Purchase and Purchase Item flows for full load
- Update workbook: Show External_ID_4D__c with actual prefixes (PUR-, PIT-, none for Inventory)
- Verify: Registration flow external ID prefix for OrderItem (to confirm PIT- collision avoidance)
- Decide: Six workbook-flow decisions from prior session (Order Status, Subtotal, Check_Amt, Reconciliation_ID, Student_Country, OrderItem.Type, Ref_Table_Number, Payment_Type, Payment_Sub_Type, Freeze, negative Sales_Amount)

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
- PricebookEntry external ID key format undecided; blocks upsert refactor
- Six workbook-flow decisions unmade; blocks accurate Build requirements
- Workbook external ID format (External_Id_4D) doesn't match code (External_ID_4D__c with prefixes); blocks data validation

**Next**
- Decide PricebookEntry key format and confirm Check_Amt, OrderItem.Type, name-match, and TEST_MODE changes with stakeholder
- Provide corrected workbook showing External_ID_4D__c with actual prefixes to Build session
- Build session: apply 6 code changes and switch TEST_MODE off
- Verify Registration flow OrderItem prefix before full load

**Checked live on 2026-11-11:** the repository
### Last session — 2026-11-11
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Inventory |
| Session | `37d53c41-f101-4747-94db-b73400d5256e` |
**In its own words (excerpt):**
Yes, two of the three flows use a prefix. Inventory does not. I changed nothing. I read `purchaseInventoryFlow.ts`, `purchaseFlow.ts` and `purchaseItemFlow.ts` on `stanford-csp-orchestrate`.

## Prefixes in the External ID field (`External_ID_4D__c`)

| Flow | Object | Prefix | Key written |
|---|---|---|---|
| Purchase Inventory | Product2 | None | The raw 4D ID, e.g. `3` |
| Purchase Inventory | PricebookEntry | None | No external ID is written today |
| Purchase | Order, CardPaymentMethod, PaymentGroup (and Payment or Refund, if switched on) | `PUR-` | `PUR-<Purchase ID>` |
| Purchase Item | OrderItem | `PIT-` | `PIT-<Purchase Item ID>` |

- **Where the prefixes are set:** `PURCHASE_EXT_PREFIX = "PUR-"` in the Purchase flow and `ORDER_ITEM_EXT_PREFIX = "PIT-"` in the Purchase Item flow.
- **Shared key across objects:** Order, CardPaymentMethod and PaymentGroup all carry the same `PUR-<ID>`. That is safe because the key is unique within each object. It is also how Purchase Item and Payments link back to the Order.
- **Why `PUR-` exists:** the Purchase code comment says Registration uses `REG-` on the same four objects. The raw ID ranges don't overlap (Registration 20044–592436118

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
