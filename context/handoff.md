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
### Engagement state — 2026-11-04
**Status:** at risk — Code pushed & PR #1 ready; validation deploy & UAT verification still pending before merge

**Done this session**
- Confirmed adjustment mapping logic: Amount = Extension − Tuition, keyed ADJ-{Enrollment.ID}, loads as step 2 before activation
- Verified branch head e4eaa6a includes adjustment code in registrationItemFlow.ts on stanford-csp-orchestrate
- Confirmed PR #1 includes all adjustment changes, ready for review

**Open items**
- Run sf deploy validate against UAT org to confirm field requirements & catch schema mismatches
- Verify in UAT: External_ID_4D__c exists on OrderItemAdjustmentLineItem, price books active, org automation sets four Product fields
- Test Drop rows with positive adjustment amounts in UAT
- Confirm org accepts adjustment with no OrderAdjustmentGroup record
- Update Registration Item error message to point at org automation instead of course imports
- Open PR #1 for review & merge to main
- Rebuild & import three course integrations into Prismatic
- Run Deploy session to ship to production

**Decisions**
- Discount adjustment amount = Extension − Tuition (no separate sign rule per row type)
- Adjustment keyed ADJ-{Enrollment.ID}, attached to line via ENR-{id}
- Adjustment loads as second step in Registration Item Import, before activation
- No adjustment created if Extension − Tuition = 0
- REG- prefix for registration orders; ENR- for registration line items; PIT- for purchase line items
- All enrollment rows (Add, Drop, AJST, New, DupEnrollment, Course cancel) generate line items
- Line item price sourced from Tuition field, not Extension
- TA_Discount compared only for mismatch warning; not written to Salesforce

**Blockers**
- Validation deploy not yet run — code unverified against target org
- External_ID_4D__c field must exist on OrderItemAdjustmentLineItem or upsert fails
- No PR review completed — code cannot merge until reviewed

**Next**
- Run sf deploy validate against UAT org to confirm field requirements & catch any org schema mismatches
- Verify in UAT: External_ID_4D__c on OrderItemAdjustmentLineItem exists, price books active, org automation sets all four Product fields
- Test Drop rows with positive adjustment amounts in UAT to confirm org accepts positive Amount
- Update Registration Item error message in registrationItemFlow.ts (one-line text change)
- Open PR #1 for review & merge to main
- Rebuild three course integrations in Prismatic & import
- Run Deploy session to ship to production

**Checked live on 2026-11-04:** the repository
### Last session — 2026-11-04
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-Registration-Enhancements- Build |
| Session | `be60d849-b984-488e-85da-da28ad9ff44a` |
**In its own words (excerpt):**
Yes, it's pushed. I read `src/registrationItemFlow.ts` from GitHub just now, and the adjustment code is on `stanford-csp-orchestrate`. The branch head is now `e4eaa6a`, because commits from later sessions sit on top of `6a4a78b`. PR #1 includes it. It hasn't been run against an org yet.

## How each adjustment row is mapped

Each enrollment row whose OrderItem loads can get one `OrderItemAdjustmentLineItem`:

| Salesforce field | Value | Source / rule |
|---|---|---|
| `External_ID_4D__c` (upsert key) | `ADJ-{Enrollment.ID}` | Enrollment `ID`, e.g. `ADJ-948272` |
| `OrderItemId` | Matched on `OrderItem.External_ID_4D__c = ENR-{Enrollment.ID}` | Salesforce finds the parent line by its external ID |
| `Name` | `Discount — Enrollment {ID}` | Fixed text |
| `Amount` | `Extension − Tuition`, rounded to cents | Enrollment `Extension` and `Tuition` |

Example, enrollment 948272:
- OrderItem `ENR-948272`: UnitPrice 250 (Tuition).
- Adjustment `ADJ-948272`: Amount 200 − 250 = **−50**, so the line total is 200, which equals Extension.

On a drop (948251) it's −524 − (−655) = **+131**.

## Rules
- **Amount is 0** (Extension equals Tuition): no adjustment is created.
- **Extension is blank or 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
