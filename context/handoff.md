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
**Status:** at risk — Product description fix verified & tested (commit 2ab766a); 4 failed Products await re-run. Prefix clash & org limits still block productio…

**Done this session**
- Verified Product2 description mapping in code: HTML→plain text, 4,000-char limit with Salesforce encoding rules
- Confirmed description handling: Learning Course HTML (32k), Product2 plain text (4k), Course Offering not written
- Re-ran 13 Product tests; all pass including row 75 (previously failed STRING_TOO_LONG)

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
- Product descriptions: HTML stripped, plain text only, 4,000-char limit applied as Salesforce stores it (encoding: &, <, >, ", ' and line breaks count at stored size)
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
Yes, that's how the code works now. The description-length error from your log (`STRING_TOO_LONG` on rows 75, 80, 81 and 91) shouldn't happen again. I can't promise "no errors" yet, though, because the fix hasn't run against the org.

**What happens to each description** (`courseUtils.ts`, commit `2ab766a`, used by the All, 2-Year and 5-Year flows):
1. **HTML is removed.** Tags like `<span style=…>` are stripped. `<br/>`, `<li>` and paragraph breaks become line breaks. Codes like `&amp;`, `&#39;` and `&quot;` become the real characters.
2. **The text is capped at 4,000 the way Salesforce counts it.** Your log shows Salesforce turns `&`, `<`, `>`, `"` and `'` into codes and stores line breaks as two characters. Text that looked shorter than 4,000 still went over, and that's why those 4 rows failed. The cap now counts each of those characters at its stored size, so the text it sends stays under the limit.
3. **Long text is cut at a clean point** and trailing spaces are removed. If nothing is left after the HTML is removed, the description is left out instead of being sent empty.

**What I checked just now:** I re-ran the 13 Product tests and all pass. One of them uses the row 75 desc

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
