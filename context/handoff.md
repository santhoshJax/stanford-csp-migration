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
**Status:** at risk — Product2 step confirmed in all three flows (8e29ccc); prefix clash & org field validation still block production

**Done this session**
- Clarified Product2 upsert behavior across All, 2-Year, 5-Year flows—each creates one Product per Course Offering, updates on re-run
- Confirmed Products linked to Course Offerings via Course_Offering__c lookup; External_ID_4D__c = Course.ID
- Documented re-run behavior: Learning/Learning Course skipped in All & 5-Year flows; Products updated; IsActive reset to FALSE each run

**Open items**
- Architect decision: assign Product2 external ID prefix format (CRS-{CourseID} vs numeric) to resolve clash
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code to confirm no org conflicts
- Verify Product2.Course_Offering__c and External_ID_4D__c fields exist in org before first run
- Resolve code–workbook sync on ATE, Order.Status, OrderItem, multi-term key (blocks Registration flow)
- Address Salesforce org licence/storage limit (User creates rejected with LIMIT_EXCEEDED)
- Open PR to main, review, merge once prefix decision made
- Schedule Deploy session to push Transcript Request and prefix-corrected flows to org

**Decisions**
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run

**Blockers**
- Product2.External_ID_4D__c clash: Purchase Inventory and Course flows both upsert same field with numeric values—silent overwrites break downstream lookups; requires prefix assignment before production
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED

**Next**
- Architect: decide Product2 external ID prefix format (e.g. CRS-{CourseID}, keep numeric for Purchase Inventory)
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code
- Verify Product2.Course_Offering__c and External_ID_4D__c exist in org
- Open PR to main, review, merge
- Schedule Deploy session to push both Transcript Request and prefix-corrected flows

**Checked live on 2026-10-27:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-10-27
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseEnhancement-Products |
| Session | `fb62e2a5-4dd6-4b7d-bb02-3ebab9e5ae57` |
**In its own words (excerpt):**
You're mostly right, but the three flows don't all behave the same way on a re-run. I checked this in the code on `stanford-csp-orchestrate` at commit `8e29ccc`. Here's what each record type does:

| Record | All flow | 2-Year (Tier 1) | 5-Year (Tier 2) |
|---|---|---|---|
| Learning + Learning Course | **Skipped** if the course already exists. It is not updated. | Updated | **Skipped** if the course already exists. It is not updated. |
| Course Offering | Updated | Updated | Updated |
| **Product2** | **Created** (updated on later runs) | **Created** | **Created** |
| Course Department | n/a | Updated | Updated |
| Location | n/a | Reuses the existing one, or creates it if missing | Reuses the existing one, or creates it if missing |
| Schedule, Instructor, Associate | n/a | **Skipped** if they already exist. They are not updated. | **Skipped** if they already exist. They are not updated. |

So:
- **Nothing is duplicated.** Every save either matches on the 4D ID or checks whether the record exists before creating it.
- **Products are the only new records.** You get one per Course Offering, linked to it. Running a flow again updates that Product instead of creating a second one.
- 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
