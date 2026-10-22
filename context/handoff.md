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
**Status:** on track — Code verified identical to branch; TEST_MODE=false change + redeploy still needed before full 85-batch import

**Done this session**
- Confirmed src/accountLoginFlow.ts on branch matches pasted code character-for-character (1,025 lines, checksum a33c699c…)

**Open items**
- Change TEST_MODE from true to false in src/accountLoginFlow.ts (line 109) and redeploy to instance
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
- TEST_MODE=true still in code (line 109); full import requires change to false + redeploy

**Next**
- Change TEST_MODE to false in src/accountLoginFlow.ts and redeploy to instance
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
Your pasted code is identical to `src/accountLoginFlow.ts` on `stanford-csp-orchestrate`, character for character. This time I compared the whole file rather than spot-checking lines.

**How I checked**
- I downloaded the file from GitHub at the current head of the branch (`23976d5`).
- I saved your paste to a separate file and compared the two with `diff` and `cmp`. Both report no differences, both files have 1,025 lines, and their checksums match (`a33c699c…`).
- The file was last changed in commit `5f8e1d2`, the enrolled-only filter. The 4 commits pushed since then only touched `handoff.md`.

So what you're running is what's on the branch, including both the permission-set step and the enrolled-only filter.

**Before the full import:** `TEST_MODE = true` is still set on line 109. As it stands, the flow handles 2 rows and doesn't go on to the next batch. For the full run, it needs changing to `false` and the integration redeploying. I can make that change and push it to the branch once you confirm.

Sources: checked live: `src/accountLoginFlow.ts` on GitHub branch `stanford-csp-orchestrate` (head `23976d5`), the branch's commit history · not checked: what's deployed on the integr

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
