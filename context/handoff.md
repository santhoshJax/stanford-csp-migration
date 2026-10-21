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
### Engagement state — 2026-10-21
**Status:** at risk — Enrolled-only filter committed; field precision blocker remains. Deploy & test filter; widen Dropped_Special_Percent__c & Dropped_Percent__…

**Done this session**
- Enrolled-only filter code committed to stanford-csp-orchestrate (5f8e1d2)
- Filter logic, tests, config description, and architecture doc updated (4 files, +249/-6)
- GitHub branch verified pointing to commit

**Open items**
- Test quarter code wi24 in source data to confirm it equals 20242
- Update sheet: Enrollment_Count row → 'don't load'
- Update sheet: Cancelled target → Enrollment_Status__c only
- Update sheet: Units target → Units__c only
- Update sheet: Web_Registration_Closed Map Type → Direct Map
- Mark sheet row 123 Tuition_Rule_ID 'Done (duplicate)' of row 89
- Check precision and scale of Dropped_Special_Percent__c and Dropped_Percent__c in org; widen to accept 100
- Review results sheet from run for errors on windows after row 99

**Decisions**
- Tier 2 can run now; Tier 3 changes do not touch Tier 2 logic
- Execution order locked: Tier 1 → Tier 2 → Tier 3 (newest first)
- All-time Enrollment flow must run after All-time Course flow; Waiver after Enrollment
- Other Cost, Staff Detail, Timecard flows filter on Tier 1 range (2024–2025 prefixes)
- Tier 3 intentional gaps confirmed: no schedules, instructors, Duration_Unit__c, tuition rule per sheet flags
- Preferred fix: widen org field definition for Dropped_Special_Percent__c and Dropped_Percent__c to Number or Percent (5,2)
- Enrolled-only filter: Account Login User creation requires at least one Enrollment row with Status = 'Enrolled' for that Student_ID

**Blockers**
- Quarter-code convention unverified: wi24 = 20242 assumption blocks all three flows until tested in source data
- Dropped_Special_Percent__c field too narrow in org; row 49 (100.0 value) rejected; must widen before re-run

**Next**
- Open pull request for enrolled-only filter on GitHub
- Review and merge PR to main
- Run Deploy session to ship filter to org
- After deploy: verify 'Enrollment File ID' config var points to Enrollment TSV
- Test-mode run to validate filter; check log for skipped student count and enrolled-only User creation
- Widen Dropped_Special_Percent__c and Dropped_Percent__c in org to accept 100
- Re-run row 49 after field widening
- Test quarter code wi24 mapping in source data

**Checked live on 2026-10-21:** the repository
### Last session — 2026-10-21
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
━━ Build status (auto-checked from tool results — deploy = sf CLI exit, not runtime effect) ━━
• Code committed: yes
• Pushed to GitHub: no
• Validated (sf deploy validate): NOT verified
• Deployed to org: no deploy in this session run — if an earlier run deployed, verify in the target org
Next: open/refresh the PR → review → merge to main → run a Deploy session to ship. This work is NOT live yet.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The enrolled-only filter is pushed as commit `5f8e1d2` on `stanford-csp-orchestrate`. I checked GitHub afterwards and the branch points to that commit.

**What's in the commit (4 files, +249 / −6)**
- `src/accountLoginFlow.ts`: an Account Login row now gets a User only if its `Student_ID` has at least one row with `Status = "Enrolled"` in the Enrollment source file. Students who are Wait List, Drop, Cancelled or any other status are skipped, and the log counts them. The filter reuses the existing "Enrollment File ID" config var. The run stops with an error if that config var is empty or the file has no `Student_ID` or `Status` column.
- `src/accountLoginFlow.test.ts`: new tests for the filter.
- `src/configPages.ts`: the config var descript

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
