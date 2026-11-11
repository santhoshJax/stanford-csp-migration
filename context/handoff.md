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
**Status:** at risk — Code complete & pushed with GatewayDate fix; Prismatic publish + org checks + Trevor Q&A still needed before UAT load

**Done this session**
- Fixed GatewayDate to send ISO 8601 datetime (2024-10-14T00:00:00.000Z) instead of bare date
- Added GatewayDate tests (191 of 196 pass; 5 pre-existing Student Import failures remain)
- Committed fix to stanford-csp-orchestrate branch and pushed to GitHub
- Documented GatewayDate gotcha in project notes

**Open items**
- Publish branch to Prismatic: run npm run import and move UAT instance to new version
- Org check: Confirm Check_Amount__c on Order and External_ID_4D__c on Product2/PricebookEntry exist and are writable
- Org check: Verify no duplicate product names (case-insensitive) exist in UAT
- Org check: Confirm StanfordContinuingStudies Price Book exists in UAT instance settings
- Verify Student load has completed in UAT (Purchase needs Student_ID_4D__c)
- Resolve PR #1 merge/close decision to separate Course Import and Purchase reviews
- Re-run Purchase round 1 with card payment method rows only (after confirming update vs. insert behavior)
- Trevor approval: 14 questions on Century Club versions, discount type mappings, course+fee pricing, date filters, course codes, adjustment/STAP/drop handling, order type field, historical order state, payment field names, check number type

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
- Code not yet published to Prismatic; flows still run old version (bare date, not ISO 8601)
- Org access needed to verify three pre-deploy checks (field existence, product name duplicates, price book setting)
- Trevor must answer 14 open questions before UAT load can proceed

**Next**
- Run npm run import to build and publish branch as new Prismatic integration version
- Move UAT instance to the new Prismatic version
- Run three org checks in UAT (field writability, product name duplicates, price book setting)
- Confirm Student load completed in UAT
- Test Purchase round 1 re-run on one order to confirm update vs. insert behavior before full reload
- Re-run Purchase round 1 with card payment method rows only
- Send Trevor the 14 questions for approval

**Checked live on 2026-11-11:** the repository
### Last session — 2026-11-11
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Purchase-Related-build |
| Session | `2cb154f7-df0b-4f6d-b07b-4304c80b818e` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch stanford-csp-orchestrate)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I committed the GatewayDate fix as `84d809f` and pushed it to `stanford-csp-orchestrate`. GitHub shows it as the branch's latest commit. I didn't open a new PR, so the commit shows up in PR #1 like the last one.

**The fix:** `GatewayDate` is a date-and-time field in Salesforce, but the flow was sending only the date. It now sends `2024-10-14T00:00:00.000Z`, which is midnight UTC. The Enrollment flow handles `RegistrationDateTime` the same way. If the source date is blank or can't be read, the field is still left out.

**Tests:** 191 of 196 pass, including the 2 new GatewayDate tests. The 5 failures are the same Student Import tests that were failing before this change. The type check and lint both pass.



_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
