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
**Status:** at risk — PIT- prefix committed & pushed; patch file confirmed valid but display issue; awaiting architect decisions & Build session to apply patch

**Done this session**
- Confirmed patch file exists and is valid (41,945 bytes, 7 file diffs)
- Created .txt copy of patch for attachment display workaround

**Open items**
- Apply registration-orderitems-draft-activate.patch via Build session
- Architect confirms: UnitPrice = Tuition (not Extension), INCLUDE_DROP_ROWS = false, INCLUDE_ADJUSTMENT_ROWS = false
- Architect confirms: negative UnitPrice handling in org
- Architect confirms: ATE population decision (Sep 28 decision vs. mapping doc)
- Decide: use standard Order.Type field or record types to mark Registration vs. Purchase orders
- Add Skipped tab to reportResults.ts for both Registration and Purchase Item flows
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
- Registration patch not yet applied (requires Build session)
- Order.Type marking decision needed before full run
- Architect confirmation needed on 3 defaults and ATE decision
- PricebookEntry.External_ID_4D__c field must exist in UAT org
- Both price books must be active in UAT org

**Next**
- Start Build session on stanford-csp-orchestrate branch to apply registration-orderitems-draft-activate.patch
- Open PR on GitHub for stanford-csp-orchestrate → review → merge to main
- Post Slack message to architect with 3 defaults + ATE decision request
- Decide Order.Type marking approach (standard field vs. record types) and communicate
- Verify UAT org: price books active, PricebookEntry.External_ID_4D__c field exists, field names correct

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
The patch file is still there, but it may not have shown up in your attachments list. It is 41,945 bytes and contains 7 file diffs. I checked its start and it is a valid diff.

To get around the display problem, I made a second copy named `registration-orderitems-draft-activate.patch.txt`. Some attachment views don't list `.patch` files, but they do list `.txt` files. Check the attachments again after this message. The `.txt` file has identical contents, so you can rename it back to `.patch` or apply it as it is.

The "Design" and "Planning" suggestions you see are the platform's generic next-session buttons. They aren't where the patch is. Neither of those is the right place to apply it, because they can't change code. You need a **Build** session for that. Start it from the New Session launcher, on `santhoshJax/stanford-csp-migration` with branch `stanford-csp-orchestrate`.

If the attachment still doesn't appear, there are two other ways to get the patch to the Build session:
1. **Google Drive.** I upload the patch to your Drive and you share the link in the Build session. This writes a file into your Drive, so I'll only do it if you say yes.
2. **Handover file in the repo.** I 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
