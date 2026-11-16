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
### Engagement state — 2026-11-16
**Status:** blocked — ━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━ • Code committed: yes (branch stanford-csp-o…

**Done this session**
- ━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━ • Code committed: yes (branch stanford-csp-orchestrate) • Pushed to GitHub: yes • Validated (sf deploy validate): NOT verified • Deployed to org…

**Open items**
- Answer A: should Alert use the cutoff date or the term?
- Answer B: is it acceptable that Fall 2024 sign-ups before 9/23 get no Order?
- Update Registration, Purchase and Payments cutoffs to 2024-09-23
- Remove end date (Summer 2026) from the 7 quarter flows
- Switch off test mode for the full load
- Run npm run import to publish the new code to Prismatic
- Fix student email mismatches (~2,700 Contact records) before registration load
- Create UAT products (Registration Fee, STAP, Course Drop, Adjustment, Course Additional Fees) with active prices and enter names in Prismatic config

**Decisions**
- Course date ranges: 5-year Fall 2021 to Summer 2024, 2-year Fall 2024 onward, all-time AY 2020-21 and older (no change)
- Registration waits for the student email fix before running

**Blockers**
- Cutoff changes not made pending answers A and B
- Test mode still enabled
- New code not yet published to Prismatic
- Roughly 2,700 Contact email mismatches must be fixed first
- UAT products and price book entries not confirmed
- Org fields not verified; no org attached to this session

**Next**
- Get answers to A and B from user
- Apply cutoff and end-date changes, then test and push
- Run npm run import
- Complete the email fix (switch off duplicate rule, re-run Student, re-run user email update)
- Set up UAT products and Prismatic config names
- Run 50-record test load: Registration round 1, Registration Item, Registration with Activate=true, then Payments; check Order totals
- Switch off test mode and run full load

**Checked live on 2026-11-16:** the repository
### Last session — 2026-11-16
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

I've built the Registration date fix and pushed it to `stanford-csp-orchestrate` as commit `0b603af`. It hasn't been published to Prismatic or run against an org yet, because no org is attached to this session.

## What changed

**Registration** keeps its date as a constant in `registrationFlow.ts`, like the other flows. A registration now loads if either of these is true:
- its sign-up date is on or after **23 Sep 2024**, or
- any of its enrollments is on a **Fall 2024 or later** course (term `20241` onward, with no end term).

So a student who signed up on 15 Aug 2024 for a Fall 2024 course now gets an Order, and their course line has an Order to attach to.

To check that second rule, Registration has to

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
