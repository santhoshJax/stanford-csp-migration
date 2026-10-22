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
### Engagement state — 2026-10-22
**Status:** on track — Test-mode import succeeded; enrolled-only filter working. Ready for higher test or full import after TEST_MODE=false.

**Done this session**
- Test-mode import (2 rows) executed successfully with enrolled-only filter active
- Verified all 3 permission set names exist in org (B2BBuyer, CSP_STAP_API_Access, CSP_Student_Education_Cloud_PS)
- Confirmed enrolled-only check runs and stops early when all students enrolled (2 sec, 118k rows read)
- Validated User upsert: 1 processed (Shannon McConville updated, not created), 0 failed
- Confirmed permission set assignments already in place for existing User

**Open items**
- Decide: run higher test limit (e.g. 50 rows) to test non-enrolled skip path and new User creation, or proceed to full import
- Change TEST_MODE from true to false in code and redeploy for full import
- Open pull request for commits 5f8e1d2 + 5921ac8 to main
- Run full import (85 batches, ~135.8 MB Enrollment file) after TEST_MODE=false redeploy
- Widen Dropped_Special_Percent__c and Dropped_Percent__c in org to accept 100
- Update sheet: Enrollment_Count row → 'don't load'
- Update sheet: Cancelled target → Enrollment_Status__c only; Units target → Units__c only; Web_Registration_Closed → Direct Map
- Mark sheet row 123 Tuition_Rule_ID 'Done (duplicate)' of row 89

**Decisions**
- Tier 2 can run now; Tier 3 changes do not touch Tier 2 logic
- Execution order locked: Tier 1 → Tier 2 → Tier 3 (newest first)
- All-time Enrollment flow must run after All-time Course flow; Waiver after Enrollment
- Other Cost, Staff Detail, Timecard flows filter on Tier 1 range (2024–2025 prefixes)
- Enrolled-only filter: Account Login User creation requires at least one Enrollment row with Status = 'Enrolled' for that Student_ID
- Preferred fix: widen org field definition for Dropped_Special_Percent__c and Dropped_Percent__c to Number or Percent (5,2)

**Blockers**
- TEST_MODE=true still in code; full import requires change to false + redeploy
- Speed unvalidated for non-enrolled case; full Enrollment file read (135.8 MB) occurs when batch contains any non-enrolled student; test-mode with higher limit recommended before full import

**Next**
- Confirm: proceed with higher test limit (50 rows) or go straight to TEST_MODE=false + full import
- Change TEST_MODE to false and redeploy to instance
- Open pull request for 5f8e1d2 + 5921ac8 to main
- Run full import and monitor log for speed and skip counts across all 85 batches

**Checked live on 2026-10-22:** Google Workspace, the repository
### Last session — 2026-10-22
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
The run worked, and the log shows each part of the change doing its job.

**What this run shows**
- **Permission sets:** all 3 names matched sets in the org (`B2BBuyer`, `CSP_STAP_API_Access`, `CSP_Student_Education_Cloud_PS`).
- **Enrolled-only check:** it ran, and both test students are Enrolled, so neither was filtered out. It stopped reading after 118,187 Enrollment rows because it had already found both students. That's why the step took only about 2 seconds.
- **Account match:** 1 of the 2 students has no Person Account in the org, so it was skipped. This is a separate check that was already in the flow. That student needs Student Import to run first.
- **User upsert:** 1 processed, 0 failed. I opened the [results sheet](https://docs.google.com/spreadsheets/d/1wecRladm9wOGhQ4Hjr_cno5U3-HQSTdUpj6ghN7mrHQ). It shows Shannon McConville (Student_ID `20461695`, User `005WH00000TasE9YAJ`) with **Action = Updated**. This is the same User from your first sample run, so it was updated rather than created again.
- **Assignments:** "3 already in place" means that User already had all 3 permission sets, so nothing new was created.

The `firstId`/`lastId` in the log are the first and last

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
