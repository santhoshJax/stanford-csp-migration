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
**Status:** at risk — Skipped-tab feature deployed & awaiting validation; workbook now conflicts with code on ATE, Order.Status, OrderItems, and multi-term keys—…

**Done this session**
- Read workbook (Oct 23) Registration, Enrollment, Object Level Mapping tabs
- Compared workbook against repo ARCHITECTURE.md, registrationFlow.ts, enrollmentFlow.ts
- Identified 4 code–workbook conflicts: ATE population, Order.Status (Draft vs Activated), OrderItem creation, ATE multi-term key
- Mapped 5 decisions needed: Adjustment OrderItems, Dropped enrollment charges, UnitPrice source, Payment-only registrations, Product Name source

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

**Checked live on 2026-10-26:** the Salesforce org, Google Workspace, the repository
### Last session — 2026-10-26
| | |
|---|---|
| Type | GENERAL |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements |
| Session | `51a1a748-4e1f-426c-9437-2dafc7a5da2b` |
**In its own words (excerpt):**
The workbook now links enrollments to registrations through a new OrderItem/Product layer and a registration-to-enrollment link, but several pieces conflict with the code in the repo or are incomplete.

**What I read:**
- The workbook (modified Oct 23), tabs `Registration`, `Enrollment` and `Object Level Mapping`.
- The repo's `ARCHITECTURE.md` and `registrationFlow.ts` (default branch).
- `enrollmentFlow.ts` (your working branch).

**Caveat on "what changed":** I can't see the sheet's version history. I inferred the changes from the workbook's own `[PREVIOUS]/[UPDATED]` notes and from comparing it with the code, which reflects the earlier mapping. Please confirm that matches what you edited.

## 1. What changed in the workbook

**Registration tab**
- **Target objects:** the Object Level row now lists `AcademicTermEnrollment, CardPaymentMethod, Order, Payment`. Previously it was the last three plus PaymentGroup.
- **New OrderItem rows:**
  - `OrderId` is the created Order.
  - `UnitPrice` comes from `Enrollment.Tuition`.
  - `Quantity` is 1.
  - `Course_Offering__c` comes from `Enrollment.Course_ID`.
  - `Product2Id` is found via the Course Offering.
  - `Student__c` comes from `St

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
