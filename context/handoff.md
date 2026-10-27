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
**Status:** at risk — Product2 step built & committed (8e29ccc); prefix clash & org field validation still block production

**Done this session**
- Confirmed Product2 step integrated into all three course flows (All, 2-Year, 5-Year)
- Verified commit 8e29ccc pushed to stanford-csp-orchestrate with no uncommitted changes
- Validated Product2 mapping: External_ID_4D__c=Course.ID, Course_Offering__c lookup, IsActive=FALSE

**Open items**
- Architect decision: assign Product2 external ID prefix format (CRS-{CourseID} vs numeric)
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code to confirm no org conflicts
- Open PR to main, review, merge once approved
- Verify Product2.Course_Offering__c and External_ID_4D__c fields exist in org before first run
- Schedule Deploy session to push Transcript Request and prefix-corrected flows to org
- Resolve code–workbook sync on ATE, Order.Status, OrderItem, multi-term key (blocks Registration flow)
- Address Salesforce org licence/storage limit (User creates rejected with LIMIT_EXCEEDED)

**Decisions**
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID (confirmed in workbook)
- TEST_MODE=false for next full run

**Blockers**
- Product2.External_ID_4D__c clash: Purchase Inventory (numeric 1,2,3) and Course flows (numeric 1,2,3) both upsert same field—silent overwrites break downstream lookups; requires prefix assignment before production
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED

**Next**
- Architect: decide Product2 external ID prefix format (e.g. CRS-{CourseID}, keep numeric for Purchase Inventory)
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code
- Open PR to main, review, merge
- Verify Product2.Course_Offering__c and External_ID_4D__c exist in org
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
Yes, in all three course flows (All, Tier 1 / 2-Year, Tier 2 / 5-Year). Each Course Offering the flow saves gets one Product, and that Product points back to it. I checked this in the code on `stanford-csp-orchestrate` at commit `8e29ccc`.

**How it works, for each course row:**
1. The flow saves Learning, then Learning Course, then Course Offering, as it did before.
2. If the Course Offering saved, the flow saves a Product straight after it:
   - **Key:** `External_ID_4D__c` = Course.ID (for example `20081_WSP 138`), the same value the Course Offering uses.
   - **Link:** `Course_Offering__c` is set to the Salesforce Id of the offering saved for that row, so the lookup always points to the correct record.
   - **Fields:** `Name` comes from the Title, `Description` from the Description and `ProductCode` from the full Code. `IsActive` is FALSE.

**Cases where you won't get a Product, or might expect something different:**
- **The Course Offering fails:** no Product is created, and the row goes to the failed-records tab.
- **The Product fails but the offering saved:** the Course Offering stays in place. The Product error goes to the `Product2` tab of the results sheet, so you can fin

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
