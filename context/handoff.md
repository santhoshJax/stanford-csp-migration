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
### Engagement state — 2026-10-27
**Status:** at risk — Two order streams confirmed (Registration + Purchase); 14 architect questions block build decisions on pricing, keys, and activation

**Done this session**
- Confirmed two separate order streams: Registration/Enrollment → Order+OrderItem (tuition) and Purchase/Purchase Item → Order+OrderItem (non-course)
- Identified transcript fees as possible third stream (unconfirmed)
- Read live Purchase, Purchase Item, Payments tabs; mapped data flow for both streams
- Listed 19 pending items across both streams and shared dependencies

**Open items**
- Rebuild 5-Year integration in Prismatic (npm run import) if not done since 2ab766a
- Architect: confirm two order types (Registration, Purchase) or add third for transcripts
- Architect: decide Order/OrderItem/Product external ID prefixes (REG-, PUR-, ENR-, PIT-, CRS-) to prevent collisions
- Architect: confirm price book entry value for course Products (Tuition Rule or 0)
- Architect: confirm UnitPrice source (Tuition or Extension) and fee/discount handling
- Architect: confirm OrderItem rows follow deduplicated COP or all enrollments; dropped course handling
- Architect: confirm historical Orders end as Draft or Activated; who builds activation step
- Add price book entries for course Products and set Order.Pricebook2Id, OrderItem.PricebookEntryId for both streams

**Decisions**
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Product descriptions: HTML stripped, plain text only, 4,000-char limit
- Two order streams exist: Registration (tuition) and Purchase (non-course items)

**Blockers**
- Product2.External_ID_4D__c clash: Purchase Inventory and Course flows both upsert same field—silent overwrites break downstream lookups; prefix format not decided
- Architect has not confirmed external ID prefix strategy (REG-, PUR-, ENR-, PIT-, CRS-) for both streams
- Architect has not confirmed price book entry value for course Products or UnitPrice source (Tuition vs Extension)
- Architect has not confirmed whether OrderItems follow deduplicated COP rows or all enrollment rows
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- 5-Year integration may not be rebuilt since fix was pushed—old build still running in Prismatic

**Next**
- Send 14 architect questions (structure, IDs/keys, pricing, rows/status, payments) with suggested load order to decision-maker
- Await architect confirmation on: order types, external ID prefixes, price book entry value, UnitPrice source, OrderItem row logic, activation step owner
- Check: has 5-Year integration been rebuilt (npm run import) since commit 2ab766a; rebuild if needed
- Once prefixes decided, update purchaseInventoryFlow.ts and courseFlow.ts; add Purchase flow skeleton
- Design Payments reconciliation: single source, Order lookup, CardPaymentMethod and PaymentGroup links

**Checked live on 2026-10-27:** Google Workspace
### Last session — 2026-10-27
| | |
|---|---|
| Type | GENERAL |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements |
| Session | `51a1a748-4e1f-426c-9437-2dafc7a5da2b` |
**In its own words (excerpt):**
# Two order streams: yes, the data supports it

I read the live Purchase, Purchase Item and Payments tabs just now. I did not re-read the Registration and Enrollment tabs or the code this turn. I haven't tested anything in the org.

## Is it true?

**Mostly yes.** The tabs show two separate sources that both end up as `Order` and `OrderItem`:

| | Stream 1: course registration | Stream 2: Purchase |
|---|---|---|
| 4D tables | Registration and Enrollment | Purchase and Purchase Item |
| What it is | Course checkout, and the tuition line per course | Non-course buys. The samples are a manuscript surcharge ("excess of 10,000 words") and a transcript fee ("Ref #15182"). |
| Order | One per registration | One per purchase |
| OrderItem | One tuition line per enrollment (new) | One line per purchase item. Product is chosen by `Item_Type`. |
| Product | Course Product, created with the course | Purchase Inventory Product |

**Evidence from the Payments tab:**
- A payment row carries `Registration_ID` (sample 560585), `Transcript_Request_ID` (sample 0) and `Purchase_ID` (sample 0). Zero looks like "not this type".
- That suggests each payment belongs to one of three kinds: registration, p

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
