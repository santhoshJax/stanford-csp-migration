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
**Status:** at risk — Registration patch ready; skipped-rows reporting gap identified. Awaiting architect confirmation on 3 defaults + ATE decision.

**Done this session**
- Reviewed registration code on branch; confirmed TypeScript compiles and tests pass
- Identified gap: skipped rows not written to results sheet; recommended Skipped tab in reportResults.ts
- Drafted Slack message to architect with 3 defaults + 4 open questions

**Open items**
- Apply registration-orderitems-draft-activate.patch via Build session on santhoshJax/stanford-csp-migration
- Architect confirms: UnitPrice = Tuition (not Extension), INCLUDE_DROP_ROWS = false, INCLUDE_ADJUSTMENT_ROWS = false
- Architect confirms: negative UnitPrice handling in org
- Architect confirms: ATE population decision (Sep 28 decision vs. mapping doc)
- Turn off test flags (TEST_MODE, TEST_LIMIT, TEST_SKIP) before full run
- Create PricebookEntry.External_ID_4D__c field in UAT org
- Verify Student__r.Student_ID_4D__c and Course_Offering__r.External_ID_4D__c field names in org
- Verify both price books active in UAT org

**Decisions**
- Registration flow two-round: Draft load, then OrderItem load, then Activation
- OrderItem key: ENR-{Enrollment.ID}
- TotalAmount unmapped; Salesforce calculates from line items
- Skip Drop, AJST, New, DupEnrollment rows in OrderItem load
- Blank Status counts as New in enrollment rule
- Index version incremented to 2
- Product2 upsert keyed on External_ID_4D__c = Course.ID

**Blockers**
- Patch must be applied via Build session (General session cannot push code)
- Test flags still enabled (TEST_MODE=true, TEST_LIMIT, TEST_SKIP=100)
- PricebookEntry.External_ID_4D__c field must be created in UAT org
- Both price books must be active in UAT org before purchase load run
- Architect confirmation needed on 3 defaults and ATE decision to unblock full run

**Next**
- Post Slack message to architect (provide channel/handle to send it)
- Await architect confirmation on: Tuition-only pricing, Drop/Adjustment skip flags, negative UnitPrice, ATE population
- Start Build session to apply registration-orderitems-draft-activate.patch
- Decide whether to extend patch with Skipped tab in reportResults.ts for both Registration and Purchase Item
- Turn off TEST_MODE, TEST_LIMIT, TEST_SKIP in both flows
- Verify field names and price book status in UAT org
- Run purchase load sequence in UAT

**Checked live on 2026-11-02:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-02
| | |
|---|---|
| Type | GENERAL |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements |
| Session | `51a1a748-4e1f-426c-9437-2dafc7a5da2b` |
**In its own words (excerpt):**
# Skipped rows, and the updated Slack message

I read the code on the branch this turn and ran nothing. Thanks for confirming that negative `UnitPrice` is accepted and the Order still activates.

## Are skipped rows kept in the results sheet?

**No, not today.** The results sheet has only two tabs per object, **Success** and **Errors**. They are written by the shared `reportResults.ts`, which Purchase Item and the other flows also use. In `registrationItemFlow.ts` a skipped row is:
- Counted per reason: `orderNotLoaded`, `orderNotDraft`, `dropRows`, `adjustmentRows`, `excludedStatus`, `courseWithoutProduct`, `badTuition` and so on.
- Written to the log, and to the run summary as `skipped…` numbers.
- Not written to the sheet. You can't see which enrollment ID was skipped or why.

That is a gap for reconciliation. For example, if 586,169 enrollments give N OrderItems, you want to account for the rest row by row.

**What I'd recommend.** Add a third **Skipped** tab per object, with the input fields plus a `Skip Reason` column. The reasons would be the same categories as the counters above. The point is that every input row lands in exactly one tab:
- **Success:** the OrderItem was cr

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
