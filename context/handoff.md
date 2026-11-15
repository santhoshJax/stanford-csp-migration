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
### Engagement state — 2026-11-15
**Status:** blocked — ━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━ • Code committed: yes (branch stanford-csp-o…

**Done this session**
- ━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━ • Code committed: yes (branch stanford-csp-orchestrate) • Pushed to GitHub: yes • Validated (sf deploy validate): NOT verified • Deployed to org…

**Open items**
- Accept ADR-011 (trigger framework) and ADR-012 (sharing and object/field security standard)
- Delete branch feature/storefront-url-labels (needs someone with write access)
- Send CSP copy request and set return date
- Trevor to answer 17 open questions before UAT load
- Verify whether Salesforce sends an order email by checking the org
- Verify ticket numbers against Ashwani's pending list
- Check Somnath's emails for white footer
- Decide whether to keep Nov 30 timeline wording

**Decisions**
- Purchase cutoff fixed at 2024-10-06
- Purchase Item loads only if parent order loaded
- PricebookEntry external ID: STD-{ID} for Standard, {ID} for StanfordContinuingStudies
- Keep site API names; change display name and URL path only
- Portal URLs come from server-side resolver keyed on site network name (supersedes CSP_Storefront_Base_URL label approach)
- APP_CSP_Refund_Processor assigned to Rajesh Yeddula and Satabhisa Roy in PR 1 window; CSP staff can be added later via permission set
- All four staff classes removed from CSP_Checkout_Guest_Access in PR 1
- ParticipantId split into ParticipantContactId and ParticipantAccountId

**Blockers**
- Marketing Cloud email creation blocked on remaining CSP copy
- Email mis-mapping root cause unconfirmed; production correctness at risk
- Code not yet published to Prismatic; UAT still on old version
- Org access needed for pre-deploy checks
- ADR-011 and ADR-012 unaccepted; PR 3 and PRs 4a–4d wait on them
- Conflicting accounts on whether Salesforce currently sends order confirmation email (not verified in org)
- Role indicator choice depends on CSP answers (checkboxes vs Constituent Roles) and may require ADR-001 update

**Next**
- Accept ADR-011 and ADR-012
- Start Build session for PR 1, beginning with read-only check of DynamicLink records in stanford-qa
- Send CSP copy request and set return date (Julia)
- Julia to request approved sender addresses from Stanford
- Santhosh to fix Contact/User load mismapping after Trevor's comparison sheets
- Run npm run import to publish and move UAT
- Send Person Account reply after reviewing placeholders and internal-reasoning wording
- Put role-indicator questions (switch-off rule, official-status rule) to CSP and get the Data Model deck reviewed

**Checked live on 2026-11-15:** the repository
### Last session — 2026-11-15
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes (branch stanford-csp-orchestrate)
• Pushed to GitHub: yes
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The new line keys and the course fee line are built, tested and pushed to `stanford-csp-orchestrate` as commit `ef89a6c`. Nothing has been loaded into an org yet, because no org is attached to this session.

## Keys now

| Line | Built from | Key | Example |
|---|---|---|---|
| Course (tuition) | Enrollment | `ENR-{Enr.ID}` (unchanged) | `ENR-930195` at 590 |
| Course fee (new) | Enrollment | `ENR-FEE-{Enr.ID}` | `ENR-FEE-930195` at 15 |
| Course discount (adjustment record) | Enrollment | `ENR-ADJ-{Enr.ID}` | `ENR-ADJ-948272` at −50 |
| Registration fee | Registration | `REG-FEE-{Reg.ID}` | `REG-FEE-592420276` at 35 |
| STAP | Registration | `REG-STAP-{Reg.ID}` | `REG-STAP-592420276` at −640 |
| Registrat

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
