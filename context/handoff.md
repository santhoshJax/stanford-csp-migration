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
**Status:** at risk — Filter code verified & ready for test run; redeploy needed, 3 config vars to check, full import blocked on TEST_MODE flag & speed validation

**Done this session**
- Verified enrolled-only filter commit 5f8e1d2 is correct, builds, and passes Account Login tests
- Confirmed filter logic matches Enrollment import (Student_ID, Status=Enrolled, tab delimiter, .0 handling)
- Confirmed no pull request exists yet; branch not behind main

**Open items**
- Redeploy integration from stanford-csp-orchestrate branch to instance
- Verify 3 config vars on instance: Account Login Profile Name, Permission Sets, Enrollment File ID
- Run test-mode import (TEST_MODE=true, 2 rows) and review log for enrollment check timing
- Test quarter code wi24 in source data to confirm it equals 20242
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
- TEST_MODE=true hardcoded in code; full import requires code change to false + redeploy
- Speed unvalidated; full run reads 135.8 MB Enrollment file ~85 times (once per batch); test-mode timing required before full import
- Dropped_Special_Percent__c field too narrow in org; row 49 (100.0 value) rejected; must widen before re-run

**Next**
- Redeploy integration from stanford-csp-orchestrate branch to instance
- Check 3 config vars on instance match expected values
- Run test-mode import and review log for enrollment check step timing and row counts
- After test validates, change TEST_MODE to false and redeploy for full import
- Open pull request for both commits (5f8e1d2 + 5921ac8) to main once test run succeeds

**Checked live on 2026-10-22:** the repository
### Last session — 2026-10-22
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
The branch is ready for a **test-mode** run of Account Login Import. The enrolled-only filter is in the code, it's correct, and it builds. It is **not** ready for the full import yet, for two reasons below.

**What I checked on `stanford-csp-orchestrate` (head `6e4890b`)**
- The filter commit `5f8e1d2` is on the branch, along with the permission-set commit `5921ac8`. The branch is not behind `main`, and no pull request exists yet.
- Someone pushed 4 more commits after mine (`188e3ec` and a merge). They only change Course import files and `handoff.md`. None of the Account Login files, or anything the flow imports, were touched.
- **The filter does what you asked.** For each batch of 2,000 Account Login rows:
  1. It removes duplicate Student_IDs.
  2. It reads the Enrollment file and keeps only students with at least one row where `Status = Enrolled`.
  3. It matches the remaining students to Contacts, creates the Users and assigns the 3 permission sets.
  - Students who are Wait List, Dropped, Cancelled and so on are skipped, and the log shows how many.
- **The column names match the Enrollment import.** It uses `Student_ID`, `Status` and the value `Enrolled`, the same as `enrollme

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
