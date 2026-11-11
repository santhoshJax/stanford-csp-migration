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
**Status:** at risk — Code complete & pushed; Prismatic publish + 3 org checks + Trevor Q&A needed before UAT load

**Done this session**
- Compiled all open questions from code review and architecture notes
- Identified 14 items for Trevor approval (Century Club V1/V2, 5 missing discount types, course+fee pricing, date filters, course code meanings, adjustment lines, STAP/drop details, order type distinction, historical order state, payment fie…

**Open items**
- Publish branch to Prismatic: run npm run import and move UAT instance to new version
- Org check: Confirm Check_Amount__c on Order and External_ID_4D__c on Product2/PricebookEntry exist and are writable
- Org check: Verify no duplicate product names (case-insensitive) exist in UAT
- Org check: Confirm StanfordContinuingStudies Price Book exists in UAT instance settings
- Verify Student load has completed in UAT (Purchase needs Student_ID_4D__c)
- Resolve PR #1 merge/close decision to separate Course Import and Purchase reviews
- Run Purchase load sequence in UAT after Prismatic publish and org checks pass
- Trevor approval: 14 questions on Century Club versions, discount type mappings, course+fee pricing, date filters, course codes, adjustment/STAP/drop handling, order type field, historical order state, payment field names, check number type…

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
- Trevor must answer 14 open questions before UAT load can proceed

**Next**
- Send Trevor the 14 questions (with blank answer column) for approval
- Run npm run import to build and publish branch as new Prismatic integration version
- Move UAT instance to the new Prismatic version
- Run three org checks in UAT (field writability, product name duplicates, price book setting)
- Confirm Student load completed in UAT
- Run Purchase load sequence: Inventory → Purchase round 1 → Item → Purchase round 2

**Checked live on 2026-11-11:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-11-11
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
I've put together everything still open for Trevor. It comes from this session's review and the open-item notes in the code and `ARCHITECTURE.md` on `stanford-csp-orchestrate`. Earlier parts of this session were shortened, so a question from those turns that never made it into the code or docs may be missing.

## A. New from this week's review

**1. Century Club: V1 or V2?** 4D has only "Century Club", but the picklist has V1 and V2. It affects 3 sample rows, e.g. 592420720.

**2. Five discount types aren't on the picklist:** `Staff, No STAP` (10 rows), `Other` (5), `Pro-Rated Late Add` (4), `Financial Aid` (4) and `Post-Doc` (2). For each one: add a picklist value, map it to an existing value, or leave it blank?

**3. Course with a fee: how should the course line be priced?** E.g. 592420276 / 930195 (ART 132): Tuition 590 + Fee 15.
- One line at 605 (my recommendation)
- 590 plus a +15 "discount"
- 590 plus a separate fee line

**4. One date filter for Registration, Enrollment and Course.** Today Registration uses `Registration_Date` ≥ 2024-10-06, but Course and Enrollment use fall 2024 – summer 2026 terms. Fall 2024 sign-ups made before 6 Oct are lost. Should Payments and Purchas

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
