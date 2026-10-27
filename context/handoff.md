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
**Status:** at risk — Product descriptions fixed & tested (commit 2ab766a); 5-Year flow may still run old build—rebuild & re-run needed to confirm fix works end-…

**Done this session**
- Confirmed description fix works: old build had <br> tags & raw 4k char cut; new code strips HTML, decodes entities, counts Salesforce storage size
- Verified both sample descriptions (6.3k raw, with codes) now pass at 3,999 chars by Salesforce count
- Identified root cause: 5-Year integration may not be rebuilt since commit 2ab766a was pushed to repo

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
This error most likely came from the **old build**, not from the fix in commit `2ab766a`. Two things point that way:

1. **The value sent still has `<br><br>` in it.** The new code turns every `<br>` into a line break before sending. If the new code had run on this row, there would be no `<br>` in the text.
2. **The current code can't go over 4,000 the way Salesforce counts.** I ran two fake descriptions built from your error text through the current code: one 6,300 characters long with raw `<br>` tags, `Q&amp;A` and curly quotes, and one with the HTML stored as `&lt;br&gt;` codes. Both came out at 3,999 by Salesforce's count, and both tests passed.

The old code just cut the raw 4D text at 4,000 characters. Salesforce then counted it as longer than that, which is exactly the error you got.

**Check this first:** has the 5-Year integration been rebuilt and imported into Prismatic (`npm run import`) since `2ab766a` was pushed? If the 2-Year one was rebuilt but the 5-Year one wasn't, that would explain why only the 5-Year window failed. Once it's on the new build, re-run that window. The Course Offering already saved, and the Product will be created without making a duplicate.

**One

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
