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
**Status:** at risk — Purchase code committed & pushed; Prismatic publish & three org checks needed before load can run

**Done this session**
- Confirmed code committed to stanford-csp-orchestrate (ce43697) and pushed to GitHub

**Open items**
- Publish branch to Prismatic: run npm run import and move UAT instance to new version
- Org check: Confirm Check_Amount__c on Order and External_ID_4D__c on Product2/PricebookEntry exist and are writable
- Org check: Verify no duplicate product names (case-insensitive) exist in UAT
- Org check: Confirm StanfordContinuingStudies Price Book exists in UAT instance settings
- Verify Student load has completed in UAT (Purchase needs Student_ID_4D__c)
- Resolve PR #1 merge/close decision to separate Course Import and Purchase reviews
- Run Purchase load sequence in UAT after Prismatic publish and org checks pass
- Fill SA Reviewed By and Script Status columns on all three sheet tabs

**Decisions**
- Purchase cutoff is fixed 2024-10-06, not rolling two-year window
- PricebookEntry external ID key format: STD-{ID} for Standard, {ID} for StanfordContinuingStudies
- Keep site API names; change display name and URL path only
- Move hardcoded portal URLs to CSP_Storefront_Base_URL label
- Split ParticipantId into ParticipantContactId and ParticipantAccountId
- Use real API names from org describe; ParticipationStatus replaces placeholder Status
- CSV uses real 003 Contact IDs and 001 Account IDs; update existing records
- File prices overwrite hand-edited prices in Salesforce

**Blockers**
- Code not yet published to Prismatic; flows still run old version
- Org access needed to verify three pre-deploy checks (field existence, product name duplicates, price book setting)

**Next**
- Run npm run import to build and publish branch as new Prismatic integration version
- Move UAT instance to the new Prismatic version
- Run three org checks in UAT (field writability, product name duplicates, price book setting)
- Confirm Student load completed in UAT
- Run Purchase load sequence: Inventory → Purchase round 1 → Item → Purchase round 2
- Resolve PR #1 (merge or close) to enable separate Purchase code review

**Checked live on 2026-11-11:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-11
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Related-build |
| Session | `2cb154f7-df0b-4f6d-b07b-4304c80b818e` |
**In its own words (excerpt):**
**Not yet.** The code is on GitHub, but the purchase flows run from the integration in Prismatic, and that integration doesn't have the new code yet. If you run them now you get the old behaviour: test mode on, no `Check_Amount__c`, an exact-case product match, and price entries that are never updated on a re-run.

**Before you run:**
1. **Publish the branch to Prismatic.** Run `npm run import`, which builds the code and imports it as a new integration version. Then move the UAT instance to that version. Nothing has been published yet.
2. **Do three quick checks in UAT.** I couldn't run these because this session has no org attached:
   - `Check_Amount__c` on Order and `External_ID_4D__c` on Product2 and PricebookEntry exist, and the integration user can edit them.
   - No two products have names that differ only by capitalisation. If two do, Purchase Item uses whichever it finds first and logs a warning.
   - The instance's "Price Books" setting lists `StanfordContinuingStudies Price Book`.

   You don't need to fill in keys on existing price entries yourself. Purchase Inventory gives an entry its `STD-{ID}` / `{ID}` key on the first run.
3. **Make sure Student has been loaded.** 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
