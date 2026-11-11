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
**Status:** at risk — Workbook finalized; PIT- prefix safe; 6 code changes + TEST_MODE ready for Build; org checks needed

**Done this session**
- Confirmed PIT- prefix has no collision with Registration flow prefixes (ENR-, ADJ-, FEE-, STAP-, DROP-)
- Verified Registration uses Check_Amt → Check_Amount__c mapping; Purchase must copy this pattern
- Confirmed Registration sets OrderItem.Type = 'Order Product' as constant; Purchase should match
- Confirmed Registration filters PricebookEntry with IsActive=true AND Product2.Name match

**Open items**
- Code: Map Check_Amt to Check_Amount__c in mapToOrder
- Code: Set OrderItem.Type to 'Order Product' default
- Code: Apply case-insensitive product name match and IsActive=true filter to PricebookEntry query
- Code: Upsert PricebookEntry on External_ID_4D__c with success/failure tabs
- Code: Switch TEST_MODE off in Purchase and Purchase Item flows
- Org check: Confirm existing PricebookEntry records carry External_ID_4D__c field
- Org check: Verify no duplicate product names between nine inventory items and course products
- Org check: Test upsert behavior sending Product2Id and Pricebook2Id on existing entries

**Decisions**
- PricebookEntry external ID key format: {ID}-STD for standard, {ID}-CSP for CSP (no unprefixed fallback)
- Keep site API names (StanfordContinuingStudies); change display name and URL path only
- Move hardcoded portal URLs to CSP_Storefront_Base_URL label
- Split ParticipantId into ParticipantContactId and ParticipantAccountId columns
- Use real API names from org describe; ParticipationStatus replaces placeholder Status
- CSV uses real 003 Contact IDs and 001 Account IDs; update existing records, keep Id column
- File prices overwrite hand-edited prices in Salesforce (no hand-edit protection)

**Blockers**
- Org access needed to verify existing PricebookEntry records have External_ID_4D__c populated
- Org access needed to confirm no duplicate product names between inventory and course products

**Next**
- Build session: apply 6 code changes (Check_Amt mapping, OrderItem.Type default, case-insensitive name match, PricebookEntry upsert, success/failure tabs, TEST_MODE off)
- Attach org to Build session for checks 1–4 (price entry fields, ID overlap, upsert behavior, duplicate names)
- Verify Price Books setting still reads 'Standard Price Book,StanfordContinuingStudies Price Book'
- Test UAT with real data files; check for scientific notation in large IDs and unexpected Item_Type values
- Document in runbook: Purchase Item cannot add lines to Orders already activated by Purchase round 2

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
The `PIT-` prefix is safe, and the confirmed price-entry key format settles the open decision. I changed nothing. I read the Registration flows and shared helpers on `stanford-csp-orchestrate`, in the clone at commit `409bdff`.

## PIT- and the Registration flow

Registration writes `OrderItem.External_ID_4D__c` with five prefixes of its own:

| Flow | Prefix | Where |
|---|---|---|
| Registration Item (course lines) | `ENR-` | `registrationItemFlow.ts` |
| Registration Item (adjustment lines) | `ADJ-` | `registrationItemFlow.ts` |
| Registration (fee line) | `FEE-` | `registrationFlow.ts` |
| Registration (STAP line) | `STAP-` | `registrationFlow.ts` |
| Registration (drop line) | `DROP-` | `registrationFlow.ts` |
| **Purchase Item** | **`PIT-`** | `purchaseItemFlow.ts` |

None of the Registration prefixes is `PIT-`, so `PIT-` can't collide with them. A comment in `registrationItemFlow.ts` already notes that Purchase Item uses `PIT-` on the same object. That doubt is closed.

## Other things the Registration flow settled

- **Check_Amt:** Registration does `parseCurrency(raw.Check_Amt)` and writes `Check_Amount__c`. It does the same for `Check_No`, which goes to `Check_Number__c`.

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
