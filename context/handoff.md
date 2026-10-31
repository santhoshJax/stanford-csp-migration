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
### Engagement state — 2026-10-31
**Status:** at risk — Price book strategy clarified & code ready; awaiting architect decision on Order price book + 4 other mappings before commit

**Done this session**
- Confirmed price book setting works as specified: creates entries in both Standard + custom books, validates names exist
- Verified 6 changed files compile and all 19 purchase flow tests pass
- Clarified that Orders use StanfordContinuingStudies Price Book by default; awaiting confirmation if should use Standard instead

**Open items**
- Architect confirms which price book Orders should use (Standard vs StanfordContinuingStudies)
- Architect confirms Order.Status handling: Draft + custom field for source, or accept loss
- Architect provides real Product2.QuantityUnitOfMeasure picklist values for unit mapping
- Architect confirms Balance_Due__c vs BalanceDue__c field name
- Architect confirms which product and price book registration OrderItems should use
- Fix 5 failing Student Import tests before merge
- Commit and push 6 changed files to stanford-csp-orchestrate branch
- Run Deploy session to ship code live to Salesforce org

**Decisions**
- Blank Status counts as New in enrollment rule (awaiting team confirmation)
- Index version incremented to 2; old saved index will not be reused
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Two order streams: Registration (tuition) and Purchase (non-course items)

**Blockers**
- Architect has not confirmed which price book Orders should use (Standard vs StanfordContinuingStudies)
- Three mapping decisions unconfirmed: Order.Status, QuantityUnitOfMeasure picklist values, Balance_Due field name
- Architect has not confirmed external ID prefix strategy (REG-, PUR-, ENR-, PIT-, CRS-) for both streams
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- 5 Student Import tests failing (pre-existing, not caused by this commit)

**Next**
- Architect confirms Order price book choice (Standard or StanfordContinuingStudies) and 3 other mapping decisions
- Commit 6 changed files to stanford-csp-orchestrate once architect approves
- Fix 5 failing Student Import tests
- Open and review pull request from stanford-csp-orchestrate into main
- Run Deploy session to ship code live to Salesforce org

**Checked live on 2026-10-31:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-10-31
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Orders |
| Session | `f4cdddc2-dc81-4ddd-82f3-28dc8071f9d4` |
**In its own words (excerpt):**
Thanks for clarifying. The change I've already made does what you described, so nothing in the code needed to change.

**How the "Price Books" setting works:**
- **Default value:** `Standard Price Book,StanfordContinuingStudies Price Book`
- **Products:** Purchase Inventory Import gives every product a price entry in both books. The Standard Price Book entry is always created first, because Salesforce won't accept a custom price book entry until the standard one exists. If someone leaves Standard out of the setting, the flow adds it anyway.
- **Bad names:** if a name doesn't match an active price book in Salesforce, the run stops before any products are written, so nothing is half-loaded.
- **Orders:** Purchase Orders and their line items use StanfordContinuingStudies Price Book. An Order can only use one price book, and the rule picks the first custom one. Your answer didn't say which book orders should use, so I've kept it this way. Tell me if they should use the Standard Price Book instead.

**Where the change stands:** as you asked, the 6 changed files are only on disk in this session, on `stanford-csp-orchestrate`. They aren't committed, pushed, or deployed to Salesforce. The 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
