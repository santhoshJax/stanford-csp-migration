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
### Engagement state — 2026-11-11
**Status:** at risk — Cutoff date 2024-10-06 documented on sheet. Awaiting client confirmation & Build session start with UAT org.

**Done this session**
- Added Purchase_Date cutoff rule (2024-10-06, fixed not rolling) to sheet Conversion Logic cell
- Verified cutoff saved on Purchase tab

**Open items**
- Code: Map Check_Amt to Check_Amount__c in mapToOrder
- Code: Set OrderItem.Type to 'Order Product' default
- Code: Apply case-insensitive product name match and IsActive=true filter to PricebookEntry query
- Code: Upsert PricebookEntry on External_ID_4D__c with success/failure tabs
- Code: Switch TEST_MODE off in Purchase and Purchase Item flows
- Org check: Confirm existing PricebookEntry records carry External_ID_4D__c field
- Org check: Verify no duplicate product names between nine inventory items and course products
- Sheet: Fill SA Reviewed By and Script Status columns on all three tabs

**Decisions**
- Purchase cutoff is fixed 2024-10-06, not rolling two-year window; shared with Registration and Payments
- PricebookEntry external ID key format: STD-{ID} for Standard, {ID} for StanfordContinuingStudies
- Keep site API names (StanfordContinuingStudies); change display name and URL path only
- Move hardcoded portal URLs to CSP_Storefront_Base_URL label
- Split ParticipantId into ParticipantContactId and ParticipantAccountId columns
- Use real API names from org describe; ParticipationStatus replaces placeholder Status
- CSV uses real 003 Contact IDs and 001 Account IDs; update existing records, keep Id column
- File prices overwrite hand-edited prices in Salesforce (no hand-edit protection)

**Blockers**
- Org access needed to verify existing PricebookEntry records have External_ID_4D__c populated
- Org access needed to confirm no duplicate product names between inventory and course products
- UAT org must be attached to Build session for five pre-build checks to run
- Client decision required: confirm 2024-10-06 cutoff is correct or provide exact date if rolling two-year window needed

**Next**
- Obtain final client decision on 2024-10-06 cutoff (if rolling window required, note exact start date)
- Start Build session: select Build type, repo santhoshJax/stanford-csp-migration, branch stanford-csp-orchestrate, attach UAT org
- In Build session, paste Purchase Build Brief (D01) goal and request five pre-build org checks
- Fill SA Reviewed By and Script Status columns on all three sheet tabs
- Verify CC_Transaction_ID mapping against Registration flow before Build runs

**Checked live on 2026-11-11:** Google Workspace
### Last session — 2026-11-11
| | |
|---|---|
| Type | REVIEW |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Inventory |
| Session | `37d53c41-f101-4747-94db-b73400d5256e` |
**In its own words (excerpt):**
I added the 2024-10-06 cutoff to the sheet and read the cell back to confirm it saved. I changed no code.

## What I wrote

On the **Purchase** tab, the Purchase_Date row (row 7) now has this in Conversion Logic: only rows with `Purchase_Date` on or after 2024-10-06 are loaded. It is a fixed cutoff shared with Registration and Payments, not a rolling two years, and earlier rows are filtered out. The note about blank dates is kept.

Nothing in the code changes, since the flow already uses that date.

## How to start a Build session

I can't start one from inside this Review session. You start it yourself from the web app, the same place you started this one.

1. Open **New session** and choose the **Build** type.
2. Select the repository `santhoshJax/stanford-csp-migration`.
3. Set the working branch to `stanford-csp-orchestrate`. The code changes should go on that branch, not on `main`.
4. Attach the **UAT org** on the new-session form. Without it, the five pre-build checks can't run.
5. Paste the goal: ask it to implement the Purchase Build Brief (D01) and to run the five pre-build org checks first. You can attach D01 or paste its contents.

The Build session will show you its pla

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
