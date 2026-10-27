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
**Status:** at risk — Product description fix committed (HTML→text, length handling); 4 failed Products await re-run. Prefix clash & org limits still block produ…

**Done this session**
- Fixed Product2 description: HTML stripped to plain text, length capped at Salesforce 4,000-char limit
- 13 Product tests pass including row 75 (previously failed); type check clean
- Committed fix to stanford-csp-orchestrate (commit 2ab766a), pushed to GitHub

**Open items**
- Architect decision: assign Product2 external ID prefix format (CRS-{CourseID} vs numeric) to resolve clash
- Re-run flows to pick up 4 failed Products (Course Offerings saved; only Products failed on External_ID_4D__c length)
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code to confirm no org conflicts
- Verify Product2.Course_Offering__c and External_ID_4D__c fields exist in org before first run
- Resolve code–workbook sync on ATE, Order.Status, OrderItem, multi-term key (blocks Registration flow)
- Address Salesforce org licence/storage limit (User creates rejected with LIMIT_EXCEEDED)
- Open PR to main, review, merge once prefix decision made

**Decisions**
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Product descriptions: HTML stripped, plain text only, 4,000-char limit applied as Salesforce stores it

**Blockers**
- Product2.External_ID_4D__c clash: Purchase Inventory and Course flows both upsert same field with numeric values—silent overwrites break downstream lookups; requires prefix assignment before production
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED

**Next**
- Architect: decide Product2 external ID prefix format (e.g. CRS-{CourseID}, keep numeric for Purchase Inventory)
- Re-run All, 2-Year, 5-Year flows to create 4 failed Products with fixed descriptions
- Update purchaseInventoryFlow.ts and courseFlow.ts with confirmed prefix logic
- Run sf deploy validate on updated code
- Open PR to main, review, merge
- Schedule Deploy session to push both Transcript Request and prefix-corrected flows to org

**Checked live on 2026-10-27:** the repository
### Last session — 2026-10-27
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseEnhancement-Products |
| Session | `fb62e2a5-4dd6-4b7d-bb02-3ebab9e5ae57` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch stanford-csp-orchestrate)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The Product description fix is now on `stanford-csp-orchestrate` as commit `2ab766a`. I checked that the remote branch points at that commit.

**What changed** (in `courseUtils.ts`, which the All, 2-Year and 5-Year flows all use):
- **HTML is turned into plain text.** Tags such as `<span style=…>` are removed. `<br/>`, `<li>` and paragraph breaks become line breaks. Codes like `&amp;`, `&#39;` and `&quot;` become the real characters.
- **The length cap allows for how Salesforce counts characters.** The 4,000 limit is applied to the text as Salesforce stores it, not the raw 4D text. That's why rows 75, 80, 81 and 91 failed before. With the tags gone, most descriptions now fit in full. Very long ones are cut

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
