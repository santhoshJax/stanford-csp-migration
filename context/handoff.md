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
**Status:** at risk — Purchase flow code complete & tested; architect answers applied. Registration orders & org validation still open.

**Done this session**
- Applied all 5 architect answers to purchase flow code
- Added Activate Purchase Orders on/off setting with two-round workflow
- Updated unit picklist to handle all 5 values (Each, per 1,000 words, per application cycle, first-one-free, per course)
- Switched purchase orders to BalanceDue__c field
- All 28 purchase-flow tests pass; 9 new tests added

**Open items**
- Architect confirms whether registration orders should also switch to BalanceDue__c
- Validate BalanceDue__c, 5 unit picklist values, Activated status, StanfordContinuingStudies price book exist in org
- Update D01 mapping workbook to reflect Balance Due field, unit-of-measure rule, and Activated status changes
- Fix 5 failing Student Import tests before merge
- Commit and push 6 changed files to stanford-csp-orchestrate branch
- Run Deploy session to ship code live to Salesforce org

**Decisions**
- Blank Status counts as New in enrollment rule
- Index version incremented to 2
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Two order streams: Registration (tuition) and Purchase (non-course items)

**Blockers**
- Registration orders field decision still open (Balance_Due__c vs BalanceDue__c)
- Salesforce org not attached to this session; BalanceDue__c, picklist values, Activated status, price book names not validated live
- 5 Student Import tests failing (pre-existing, not caused by this commit)

**Next**
- Architect confirms registration order field: switch to BalanceDue__c or keep Balance_Due__c
- Attach Salesforce org and validate BalanceDue__c, unit picklist, Activated status, price book in live org
- Update D01 workbook with current field names, unit values, and activation workflow
- Fix 5 failing Student Import tests
- Commit 6 changed files once architect approves registration field decision and org validation complete

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
I've applied all five of your answers. Three needed code changes and two confirmed what was already built. Everything is still on disk only, on `stanford-csp-orchestrate`. Nothing is committed, pushed or deployed.

| # | Your answer | What changed |
|---|---|---|
| 1 | Course and inventory IDs never overlap | No code change. Inventory products keep the raw ID (1–9) as their key, with no prefix. |
| 2 | Run the import a second time to move Draft orders to active | New on/off setting, **Activate Purchase Orders**, which starts off (details below). |
| 3 | Unit picklist values added in the org | The flow now writes all 5 values: Each, per 1,000 words, per application cycle, "First one is free, $10 charged for each additional", per course. Any other value is still left blank, with a warning. |
| 4 | The Order field is `BalanceDue__c` | Purchase Orders now write `BalanceDue__c`. |
| 5 | Orders use StanfordContinuingStudies Price Book | No code change. That's already the rule. Standard gets an entry only so the custom one is accepted. |

**How the two rounds run**
1. Run **Purchase Import** with the setting off. Orders are created as Draft.
2. Run **Purchase Item Import**. Line items are

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
