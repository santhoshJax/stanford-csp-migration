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
**Status:** at risk — 6 uncommitted files need rebase onto latest remote; price book settings must be consolidated before commit

**Done this session**
- None

**Open items**
- Rebase our 6 files onto latest remote (e17c1bb and 5 newer commits)
- Combine duplicate 'Price Books' settings into one shared setting for course and purchase
- Standardize new settings to use 'default' instead of 'defaultValue'
- Compile and re-run purchase + course price book test suites
- Commit and push consolidated changes to stanford-csp-orchestrate
- Verify both price books active and PricebookEntry.External_ID_4D__c exists in UAT org
- Run purchase load: Inventory → Purchase (off) → Item → Purchase (Activate on)
- Architect decides: Registration Orders field (Balance_Due__c vs BalanceDue__c)

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
- 6 uncommitted files conflict with 6 newer remote commits (including e17c1bb price book entries)
- Duplicate 'Price Books' settings must be consolidated before push
- Registration orders field decision still open (Balance_Due__c vs BalanceDue__c)
- PricebookEntry.External_ID_4D__c field and StanfordContinuingStudies Price Book must exist in UAT before first run

**Next**
- Proceed: rebase, consolidate settings, standardize to 'default', retest, commit and push
- Verify both price books active and PricebookEntry.External_ID_4D__c in UAT org
- Run purchase load sequence (Inventory → Purchase off → Item → Purchase on)
- Architect confirms Registration Orders field choice
- Open PR to main once architect approves and org validation complete

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
Quick update: I checked the branch before answering, and something has changed since we last spoke that affects the next step.

**What I found**
- Your 6 changed files are still on disk in this session, on `stanford-csp-orchestrate`. They aren't committed yet.
- The remote branch now has 6 newer commits. One of them came from a separate session: `e17c1bb`, which adds price book entries for course Products.
- That commit adds its own **"Price Books"** setting with the same default as ours (`Standard Price Book,StanfordContinuingStudies Price Book`) and its own price-book helper. Every settings page belongs to one integration, so pushing our change as it is would give that integration two settings with the same name.
- Our two new settings are written with `defaultValue`. The rest of the settings file, including the course commit, uses `default` with a string value such as `"false"`. That should be made consistent.

**Next steps, in order**
1. **Rebase our change onto the latest remote branch.** Then combine the two "Price Books" settings into one shared setting that drives both course and purchase products, and use one price-book helper instead of two.
2. **Make the two new settings

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
