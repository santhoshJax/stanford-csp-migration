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
**Status:** blocked — The Product-per-course part of the mapping is already built in the repo, but the Registration flow doesn't use it yet.

**Done this session**
- The Product-per-course part of the mapping is already built in the repo, but the Registration flow doesn't use it yet. It still creates no OrderItems, and the Products it would point at have no price list entry. I read the live Registratio…

**Open items**
- Rebuild 5-Year integration in Prismatic (npm run import) if not done since 2ab766a
- Re-run 5-Year flow to create 4 failed Products with fixed descriptions
- Decide: fix HTML-as-codes edge case (decode before strip) and add test, or accept literal <br> in output
- Architect decision: assign Product2 external ID prefix format (CRS-{CourseID} vs numeric) to resolve clash
- Re-run All & 2-Year flows to create remaining failed Products
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code to confirm no org conflicts
- Resolve code–workbook sync on ATE, Order.Status, OrderItem, multi-term key (blocks Registration flow)

**Decisions**
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Product descriptions: HTML stripped, plain text only, 4,000-char limit applied as Salesforce stores it (encoding: &, <, >, ", ' and line breaks count at stored size)
- Course.Description: Learning Course keeps HTML (32k limit); Product2 gets plain text (4k limit); Course Offering not written

**Blockers**
- Product2.External_ID_4D__c clash: Purchase Inventory and Course flows both upsert same field with numeric values—silent overwrites break downstream lookups
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- 5-Year integration may not be rebuilt since fix was pushed—old build still running in Prismatic

**Next**
- Check: has 5-Year integration been rebuilt (npm run import) since commit 2ab766a?
- Rebuild 5-Year in Prismatic if needed, then re-run 5-Year flow
- Decide: fix HTML-as-codes edge case (decode before strip) or accept literal <br> in output
- Architect: decide Product2 external ID prefix format (CRS-{CourseID} or numeric split)
- Re-run All & 2-Year flows with confirmed prefix logic
- Open PR to main once prefix decision made

**Checked live on 2026-10-27:** the Salesforce org, Google Workspace, the repository
### Last session — 2026-10-27
| | |
|---|---|
| Type | GENERAL |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements |
| Session | `51a1a748-4e1f-426c-9437-2dafc7a5da2b` |
**In its own words (excerpt):**
The Product-per-course part of the mapping is already built in the repo, but the Registration flow doesn't use it yet. It still creates no OrderItems, and the Products it would point at have no price list entry. I read the live Registration and Course tabs (the workbook was modified today at 11:59 UTC) and the code on `stanford-csp-orchestrate`. I didn't run any flows or check the org, so org-behaviour points below are flagged as unverified.

## 1. What changed in the workbook

- **Product rows moved out of Registration.** The Registration tab no longer has Product rows. My earlier read of it had four, for Name, Description, ProductCode and IsActive. The tab now ends at the `Product.Course_Offering__c` row.
- **Product rows now live on the Course tab.** They are rows 127–131:

| Product field | Source | Rule |
|---|---|---|
| `Name` | `Course.Title` | Direct map |
| `Course_Offering__c` | `Course.ID` | Lookup to the Course Offering |
| `Description` | `Course.Description` | Direct map |
| `ProductCode` | `Course.Code` | Full code with section suffix, e.g. `OWC 303 A`, same as `CourseOffering.Name`. Blank if Code is empty. |
| `IsActive` | none | Default **FALSE** (the earlier Regis

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
