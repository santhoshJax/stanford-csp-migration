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
### Engagement state — 2026-11-02
**Status:** at risk — Purchase flows restored to committed state; 41 objects mapped. UAT field creation & architect decision still blocking.

**Done this session**
- Verified purchase flows match last committed code (89984d6)
- Removed uncommitted file rename from local copy
- Confirmed split purchase flow approach abandoned — three flows, four runs

**Open items**
- Create PricebookEntry.External_ID_4D__c field (Text, External ID, Unique) in UAT org
- Verify both price books active in UAT org before purchase load sequence
- Architect decides: Registration Orders field (Balance_Due__c vs BalanceDue__c)
- Confirm all 41 objects and fields exist in UAT org
- Run purchase load: Inventory → Purchase (off) → Item → Purchase (on)
- Open PR from stanford-csp-orchestrate to main
- Rebuild integrations and import into Prismatic
- Deploy to Salesforce org

**Decisions**
- Blank Status counts as New in enrollment rule
- Index version incremented to 2
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID, PUR- for Purchase orders
- TEST_MODE=false for next full run
- Three purchase flows, four runs (no split)

**Blockers**
- PricebookEntry.External_ID_4D__c field must be created in UAT org
- Both price books must be active in UAT org before purchase load run
- Registration Orders field decision still open (Balance_Due__c vs BalanceDue__c)

**Next**
- Create PricebookEntry.External_ID_4D__c field in UAT org
- Verify both price books active in UAT org
- Get architect decision on Registration Orders field name
- Confirm all 41 objects and fields exist in UAT org
- Run purchase load sequence in UAT
- Open PR to main
- Schedule Deploy session

**Checked live on 2026-11-02:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-02
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Orders |
| Session | `f4cdddc2-dc81-4ddd-82f3-28dc8071f9d4` |
**In its own words (excerpt):**
The purchase flows are back to exactly what was last committed, and I'm not splitting them.

**What I checked:**
- **GitHub:** `stanford-csp-orchestrate` is at `89984d6`. The only commits after our purchase change (`bc96380`) are 5 automatic handoff notes, and none of them touch code.
- **Local copy:** the split I'd started before you stopped the session had left one uncommitted change on disk. It was a file rename (`purchaseItemFlow.ts` to `purchaseItems.ts`) with no content changes, and it had never been committed or pushed. I undid it, so the local copy now has no changes and matches the branch.

**How it stays:** three purchase flows, run four times: Purchase Inventory, then Purchase with activation off, then Purchase Item, then Purchase again with **Activate Purchase Orders** on.

**About the payment source file:** you're right. The Purchase flows read only the Purchase file. The separate Payments flow (flow 29) is the one that reads the payment source file.

Sources: checked live: the local checkout and the remote `stanford-csp-orchestrate` branch (git status, log, ls-remote) · not checked: the Salesforce org
<!-- orchestrate:session-state:end -->
