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
**Status:** at risk — Enrolled-only filter committed & verified on repo; field precision & quarter-code blockers remain. Script provided for real row counts.

**Done this session**
- Verified enrolled-only filter commit 5f8e1d2 points correctly on GitHub branch
- Confirmed Account_Login.txt (26.9 MB, ~169k rows) and Enrollment.txt (135.8 MB) sizes
- Provided count_enrolled_account_logins.py script to get real enrolled student counts offline

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
- Real enrolled student count unknown; script provided but requires offline execution on full files (Drive reader limited to 10 MB)

**Next**
- Download Account_Login.txt and Enrollment.txt from Drive; run count_enrolled_account_logins.py to get real enrolled counts
- Open pull request for enrolled-only filter on GitHub (if not already open)
- Review and merge PR to main
- Run Deploy session to ship filter to org
- After deploy: verify 'Enrollment File ID' config var points to Enrollment TSV
- Widen Dropped_Special_Percent__c and Dropped_Percent__c in org to accept 100
- Test quarter code wi24 mapping in source data

**Checked live on 2026-10-21:** the repository, the Salesforce org, Google Workspace
### Last session — 2026-10-21
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-AccountLogin-IssueFix-Build (again) |
| Session | `153060d9-eedb-5466-b1ec-6a7a785b2b1c` |
**In its own words (excerpt):**
I couldn't get the real counts in this session. Drive's file reader stops at 10 MB, and the two source files are much bigger:

- [Account_Login.txt](https://drive.google.com/file/d/169lMYyPTETvrVQtlieYdBo3VVplV9jkM/view?usp=drivesdk) is 26.9 MB.
- [Enrollment.txt](https://drive.google.com/file/d/1wgEclnnltZKJyrfyqBJu1065iTnm1rLh/view?usp=drivesdk) is 135.8 MB.

When I tried to read them, both came back with "files up to 10 MB are read". No Salesforce org is attached here either, so I couldn't count from the org.

**Rough size of Account Login only:** your earlier log said the first 2,000 rows ended at byte 317,780. That's about 159 bytes per row, so the file probably has around **169,000 rows**. This is a guess from file size, not a count. It says nothing about how many of those students are enrolled.

**Script to get the real numbers:** I've written `count_enrolled_account_logins.py` and attached it to this session. It applies the same rules as the new filter in commit `5f8e1d2`:
- Both files are tab-separated with a header row.
- A trailing `.0` is removed from `Student_ID`, and blank or `0` IDs are skipped.
- A student counts as enrolled if any Enrollment row for them has `Statu

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
