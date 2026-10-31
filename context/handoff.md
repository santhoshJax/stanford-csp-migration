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
**Status:** at risk — Purchase flow complete with BalanceDue__c confirmed; registration field decision still open; 6 files ready to commit pending architect appr…

**Done this session**
- Confirmed Purchase Orders use BalanceDue__c (no code change needed)
- Updated purchaseFlow.ts note to record field confirmation

**Open items**
- Architect decides: should Registration Orders also switch to BalanceDue__c or keep Balance_Due__c
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
- Architect confirms whether Registration Orders should switch to BalanceDue__c or keep Balance_Due__c
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
Thanks for checking. That closes the purchase side: Purchase Orders already write `BalanceDue__c`, so the code didn't need to change. I only updated the note in `purchaseFlow.ts` to record that you confirmed the field in the org. I left the mapping workbook alone, as you asked.

**Registration orders may not need to switch.** The registration flow's notes say `Balance_Due__c` was checked on Stanford_UAT on 2026-09-29 and exists there. So Order seems to have two balance fields:
- `BalanceDue__c` is used by Purchase Orders, which you confirmed today.
- `Balance_Due__c` is used by Registration Orders, checked in September.

If both fields are real, registration loads won't fail, so I've left registration on `Balance_Due__c`. The question is whether the two order types should use the same field. If the architect wants just one, tell me which and I'll switch the other.

**Where things stand:** the 6 changed files are still only on disk on `stanford-csp-orchestrate`. Nothing is committed, pushed or deployed. The last test run had all 28 purchase-flow tests passing. Today's change was only a comment, so I didn't run the tests again.

When you're ready, tell me to commit and push.

Sources

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
