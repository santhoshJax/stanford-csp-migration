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
### Engagement state — 2026-10-26
**Status:** blocked — I read the Purchase, Purchase Item, Payments and Purchase Inventory tabs, plus the Object Level Mapping tab.

**Done this session**
- I read the Purchase, Purchase Item, Payments and Purchase Inventory tabs, plus the Object Level Mapping tab. I did not re-check the code for this pass. The statements about 4D business meaning are my inference from the sample data, so plea…

**Open items**
- Resolve architect conflict: ATE population for past data (Sep 28 decision vs workbook)
- Confirm Order.Status: Draft on load then activate, or Activated (FAILED_ACTIVATION risk)
- Define external ID prefixes for Order, OrderItem, Product to avoid collision with Purchase/Purchase_Item
- Fix ATE lookup key to include term (registration-plus-term) for multi-term checkouts
- Answer: does Registration use a prefix? Does Product Name have a source?
- Decide: Adjustment records get OrderItem? Dropped enrollments charged? UnitPrice = Tuition or Extension?
- De-duplicate Product and PricebookEntry between Registration and Purchase_Inventory flows
- Update ARCHITECTURE.md flow order and open items once decisions made

**Decisions**
- MAX_ROWS = 500 per run; POLL_BUDGET_MS = 10 min; MAX_JOB_HANDOFFS = 6
- Skipped tab rolls over same as Success/Errors tabs when full
- Account Login retry: up to 5 attempts, exponential backoff 2s–30s; non-retryable errors fail immediately
- TEST_MODE = false for next full run
- ENR- prefix for Enrollment ID (existing, confirmed in workbook)

**Blockers**
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- Code–workbook sync broken on ATE, Order.Status, OrderItem, and multi-term key—blocks Registration flow update

**Next**
- Architect to confirm: ATE population for past data (Sep 28 decision stands or reverses?)
- Confirm Order.Status strategy: Draft + activate, or Activated with FAILED_ACTIVATION mitigation
- Define external ID prefixes for Order, OrderItem, Product; answer Registration prefix & Product Name source
- Update workbook Registration tab: add ATE rows (key, Person Account, AcademicTerm, dates), AcademicOrder, Pricebook fields; fix ATE key to term-aware
- Draft Excel delta sheet (field-level old vs new, owner, status) or PR on stanford-csp-orchestrate for team review
- Post-deploy: run one batch and validate Skipped tab row count vs. log (from previous state)

**Checked live on 2026-10-26:** Google Workspace
### Last session — 2026-10-26
| | |
|---|---|
| Type | GENERAL |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements |
| Session | `51a1a748-4e1f-426c-9437-2dafc7a5da2b` |
**In its own words (excerpt):**
I read the Purchase, Purchase Item, Payments and Purchase Inventory tabs, plus the Object Level Mapping tab. I did not re-check the code for this pass. The statements about 4D business meaning are my inference from the sample data, so please confirm them.

## In plain words

Think of a shop with a price list, receipts, receipt lines and a till:

| 4D table | Everyday meaning | Lands in Salesforce as |
|---|---|---|
| **Purchase Inventory** | The price list, about 9 items such as "Manuscript surcharge" or transcript fee | `Product2` + `PricebookEntry` |
| **Purchase** | The receipt for non-course buys, with card details and totals | `Order` + `CardPaymentMethod` |
| **Purchase Item** | The lines on that receipt (what, how many, price) | `OrderItem` |
| **Payments** | The till log, with one row per charge or refund | `Payment` (+ `Refund`) |
| **Registration** (new tab) | The receipt for signing up for courses | `Order` + `OrderItem` + `AcademicTermEnrollment` |
| **Enrollment** | The seat in the course | `CourseOfferingParticipant` |

## Diagram

```mermaid
flowchart TD
    INV["Purchase Inventory<br/>(price list)"] --> PROD["Product2 + PricebookEntry"]
    COURSE["Course"] -->|"cou

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
