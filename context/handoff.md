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
**Status:** at risk — Product description fix verified in code (2ab766a); 4 failed Products await re-run. Prefix clash & org limits still block production.

**Done this session**
- Verified Product2 description mapping: HTML→plain text, 4,000-char limit in courseUtils.ts (commit 2ab766a)
- Confirmed Course.Description routing across all three flows (Learning Course HTML 32k, Product2 plain text 4k, Course Offering not written)
- Documented description persistence: Learning Course shared by sections, Product per section, 2-Year flow only refreshes on re-run

**Open items**
- Architect decision: assign Product2 external ID prefix format (CRS-{CourseID} vs numeric) to resolve clash
- Re-run All, 2-Year, 5-Year flows to create 4 failed Products with fixed descriptions
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code to confirm no org conflicts
- Resolve code–workbook sync on ATE, Order.Status, OrderItem, multi-term key (blocks Registration flow)
- Address Salesforce org licence/storage limit (User creates rejected with LIMIT_EXCEEDED)
- Open PR to main, review, merge once prefix decision made
- Schedule Deploy session to push both Transcript Request and prefix-corrected flows to org

**Decisions**
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Product descriptions: HTML stripped, plain text only, 4,000-char limit applied as Salesforce stores it
- Course.Description: Learning Course keeps HTML (32k limit); Product2 gets plain text (4k limit); Course Offering not written

**Blockers**
- Product2.External_ID_4D__c clash: Purchase Inventory and Course flows both upsert same field with numeric values—silent overwrites break downstream lookups
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED

**Next**
- Architect: decide Product2 external ID prefix format (e.g. CRS-{CourseID}, keep numeric for Purchase Inventory)
- Re-run All, 2-Year, 5-Year flows to create 4 failed Products with fixed descriptions
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code
- Open PR to main, review, merge
- Schedule Deploy session to push both Transcript Request and prefix-corrected flows to org

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
The source `Course.Description` from 4D is saved in **two places**. I checked this in the code on `stanford-csp-orchestrate` at commit `2ab766a`.

| # | Salesforce record | Field | How it's written | Which flows |
|---|---|---|---|---|
| 1 | **Learning Course** | `Description` | The HTML stays as it is, because this is a rich text field. `_4DNL_` becomes a line break. The text is cut at 32,000 characters, and nothing is written if the 4D value is blank. | All, 2-Year, 5-Year |
| 2 | **Product2** (added this session) | `Description` | The HTML is converted to plain text and cut at 4,000 characters. | All, 2-Year, 5-Year |

**Where it happens in the code**
- **Learning Course:** `lc.Description = normaliseCatalogNotes(row.Description).slice(0, 32000)`
  - `coursesImportAllTime.ts`, line 769
  - `coursesImport2Year.ts`, line 1372
  - `coursesImport5Year.ts`, line 930
- **Product2:** each flow passes `description: row.Description` (All line 910, 2-Year line 1759, 5-Year line 1158) to `buildCourseProductPayload` in `courseUtils.ts`. That function converts the text and sets `payload.Description`.

**Where the description is *not* saved**
- **Course Offering:** no flow writes `Course.Desc

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
