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
**Status:** at risk — Patch applied & tested cleanly; Build session needed to commit/push/PR. Architect decisions & UAT verification still pending.

**Done this session**
- Patch applied to stanford-csp-orchestrate (conflict resolved: PI-→PIT-, added ENR- rows)
- tsc & jest passed (141 pass, 5 Student-flow tests ignored as expected)
- Skipped tab implemented for Registration Item flow with skip reasons
- registrationFlow.ts header refreshed with architect open items listed

**Open items**
- Commit & push patch via Build session, then open PR stanford-csp-orchestrate → main
- Architect confirms: UnitPrice = Tuition, INCLUDE_DROP_ROWS = false, INCLUDE_ADJUSTMENT_ROWS = false
- Architect confirms: negative UnitPrice handling in org
- Architect confirms: ATE population decision (Sep 28 decision vs. mapping doc)
- Decide: use standard Order.Type field or record types to mark Registration vs. Purchase orders
- Add Skipped tab to reportResults.ts for Purchase Item flow (Registration Item done)
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP before full run
- Verify Student__r.Student_ID_4D__c and Course_Offering__r.External_ID_4D__c field names in UAT org

**Decisions**
- Registration flow two-round: Draft load, then OrderItem load, then Activation
- OrderItem key: ENR-{Enrollment.ID} for registration; PIT-{Purchase_Item.ID} for purchase
- Order external ID: raw Registration ID for registration orders; PUR-{Purchase.ID} for purchase orders
- TotalAmount unmapped; Salesforce calculates from line items
- Skip Drop, AJST, New, DupEnrollment rows in OrderItem load
- Blank Status counts as New in enrollment rule
- Index version incremented to 2
- Product2 upsert keyed on External_ID_4D__c = Course.ID

**Blockers**
- Patch not yet committed/pushed to GitHub (General session cannot write repo code)
- Order.Type marking decision needed before full run
- Architect confirmation needed on 3 defaults and ATE decision
- PricebookEntry.External_ID_4D__c field must exist in UAT org
- Both price books must be active in UAT org

**Next**
- Start Build session on stanford-csp-orchestrate to commit patch, push, and open PR to main
- Post Slack message to architect with 3 defaults + ATE decision request
- Decide Order.Type marking approach (standard field vs. record types) and communicate
- Verify UAT org: price books active, PricebookEntry.External_ID_4D__c field exists, field names correct
- Add Skipped tab for Purchase Item flow (follow-up after Registration Item pattern)
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP when ready for full load

**Checked live on 2026-11-02:** the repository
### Last session — 2026-11-02
| | |
|---|---|
| Type | GENERAL |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements |
| Session | `422d462b-583e-4819-b0ea-cc287228936d` |
**In its own words (excerpt):**
The patch is applied and checked, but I couldn't commit, push or open the PR. This is a General session, which can't change repository code. The patch needs a Build session pointed at `santhoshJax/stanford-csp-migration`. Nothing has been written to GitHub, so the PR (to-do 5) is not done.

## Patch result
- **Apply:** your patch is built for c837f37, but `stanford-csp-orchestrate` is at 2fadc88. `git apply --check` failed on `ARCHITECTURE.md` only, because the PI- → PIT- rename touched the same lines. The other 7 files applied cleanly with `--3way`.
- **Conflict fix:** I kept `PIT-` for Purchase Item and added your Registration, Registration Item and `ENR-` rows. I also fixed a stale `"PI-"` mention in the new flow's header comment.
- **`tsc --noEmit`:** clean.
- **jest:** 141 pass. The only failures are the 5 Student-flow tests you said to ignore.
- **Lint:** prettier is clean on the files I touched. One lint error remains in `registrationFlow.ts` (an irregular-whitespace error on an existing BOM-stripping regex); it is in code I didn't touch.

## To-do status
1. **Skipped tab: done for Registration Item.**
   - I added `writeSkippedInputTab` in `reportResults.ts`. It writes Wind

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
