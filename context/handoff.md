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
**Status:** on track — Code verified correct; TEST_MODE=false change + redeploy needed before full 85-batch import

**Done this session**
- Verified src/accountLoginFlow.ts matches documented logic across 16 key lines
- Confirmed enrolled-only filter, permission set safety, and batch sequencing work correctly
- Identified TEST_MODE=true as only blocker for full import

**Open items**
- Change TEST_MODE from true to false in src/accountLoginFlow.ts and redeploy
- Open pull request for commits 5f8e1d2 + 5921ac8 to main
- Run full import (85 batches, ~135.8 MB Enrollment file) after TEST_MODE=false redeploy
- Monitor full run for speed and skip counts; expect slower batches if any contain non-enrolled students
- Widen Dropped_Special_Percent__c and Dropped_Percent__c in org to accept 100
- Update sheet: Enrollment_Count row → 'don't load'; Cancelled target → Enrollment_Status__c only; Units target → Units__c only; Web_Registration_Closed → Direct Map
- Mark sheet row 123 Tuition_Rule_ID 'Done (duplicate)' of row 89
- Fix two labelled steps '6.' and garbled header line in comments (optional, can batch with TEST_MODE change)

**Decisions**
- Tier 2 can run now; Tier 3 changes do not touch Tier 2 logic
- Execution order locked: Tier 1 → Tier 2 → Tier 3 (newest first)
- All-time Enrollment flow must run after All-time Course flow; Waiver after Enrollment
- Other Cost, Staff Detail, Timecard flows filter on Tier 1 range (2024–2025 prefixes)
- Enrolled-only filter: Account Login User creation requires at least one Enrollment row with Status = 'Enrolled' for that Student_ID
- Preferred fix: widen org field definition for Dropped_Special_Percent__c and Dropped_Percent__c to Number or Percent (5,2)

**Blockers**
- TEST_MODE=true still in code; full import requires change to false + redeploy

**Next**
- Change TEST_MODE to false in src/accountLoginFlow.ts (optionally tidy comments) and redeploy to instance
- Open pull request for 5f8e1d2 + 5921ac8 to main
- Run full import and monitor log for speed and skip counts across all 85 batches

**Checked live on 2026-10-22:** nothing — the status above is as recorded, not re-checked
### Last session — 2026-10-22
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
I checked the code you pasted against `src/accountLoginFlow.ts` on `stanford-csp-orchestrate` (head `bedfbb3`). It matches, and it's correct to run in test mode. Before a full import, `TEST_MODE` has to be changed first.

**How I compared them:** I didn't diff the two files line by line. Instead I checked 16 lines from your paste against the branch, and all 16 are there. They include the test-mode settings, the `Enrolled` status match, the `.0` clean-up, the early stop, the permission set lookup, the `Student_ID` check, the duplicate merge and the next-batch call. The commits since my last review only touch `handoff.md`, so the flow code hasn't changed.

**What runs correctly**
- **Enrolled-only filter:** looks up `Student_ID` and `Status` by header name and matches `Enrolled` ignoring case and spaces. It runs after duplicate IDs are merged and before the Salesforce lookup. If either column is missing, the run stops.
- **Permission sets:** a wrong or ambiguous name stops the run before any User is written. Assignments a User already has are skipped, so re-running is safe.
- **Moving between batches:** the next batch starts at the first row the current batch didn't process, so rows 

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
