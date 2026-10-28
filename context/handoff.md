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
### Engagement state — 2026-10-28
**Status:** at risk — Code analysis complete; 110 extra Course Offerings likely from old file version or manual creates. PR still pending merge; Deploy & integra…

**Done this session**
- Ruled out re-runs, overlapping flows, and key changes as source of 110 extra Course Offering records
- Identified three likely causes: source file version mismatch, manual/test records, or duplicate IDs in count
- Provided three SQL queries to diagnose 110 extras in UAT org

**Open items**
- Review and merge PR from stanford-csp-orchestrate to main
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows; verify Success + Errors + Not Processed + Skipped = source count
- Confirm whether Student source file contains repeated IDs
- Architect: confirm two order types (Registration, Purchase) or add third for transcripts
- Architect: decide Order/OrderItem/Product external ID prefixes (REG-, PUR-, ENR-, PIT-, CRS-)
- Architect: confirm price book entry value for course Products and UnitPrice source
- Architect: confirm OrderItem rows follow deduplicated COP or all enrollments

**Decisions**
- Product2 step: IsActive=FALSE, no price book entries created yet
- Product2 upsert keyed on External_ID_4D__c = Course.ID; Course_Offering__c lookup points to saved offering
- MAX_ROWS=500, POLL_BUDGET_MS=10min, MAX_JOB_HANDOFFS=6
- ENR- prefix for Enrollment ID
- TEST_MODE=false for next full run
- Product descriptions: HTML stripped, plain text only, 4,000-char limit
- Two order streams: Registration (tuition) and Purchase (non-course items)
- Deduplication: one Student_ID per run; later rows marked Skipped with window #; restart reuses index from Drive

**Blockers**
- Product2.External_ID_4D__c clash: Purchase Inventory and Course flows both upsert same field—silent overwrites break downstream lookups; prefix format not decided
- Architect has not confirmed external ID prefix strategy (REG-, PUR-, ENR-, PIT-, CRS-) for both streams
- Architect has not confirmed price book entry value for course Products or UnitPrice source (Tuition vs Extension)
- Architect has not confirmed whether OrderItems follow deduplicated COP rows or all enrollment rows
- Salesforce org licence or storage limit exceeded; all User creates rejected with LIMIT_EXCEEDED
- Code not deployed yet; integration still running old build

**Next**
- Run SQL queries in UAT org to diagnose 110 extra Course Offerings; compare External_ID_4D__c against source file
- Confirm source file version and whether it matches the 15,539 distinct IDs counted
- Review and merge PR from stanford-csp-orchestrate to main
- Run Deploy session to ship code live to Salesforce org
- Run full integration on ~160,000 rows with new config; verify row counts balance

**Checked live on 2026-10-28:** the repository
### Last session — 2026-10-28
| | |
|---|---|
| Type | BUILD |
| Outcome | COMPLETED |
| Branch | `stanford-csp-orchestrate` |
| Name | Stanford-Data-Migration-CourseEnhancement-Products |
| Session | `fb62e2a5-4dd6-4b7d-bb02-3ebab9e5ae57` |
**In its own words (excerpt):**
I couldn't check the source data or the UAT org from this session. No Salesforce org is attached, and Google Workspace isn't connected, so I can't open the course file the flows read (the `Course File ID` set in Prismatic). What I could check is the code, and it narrows down where the 110 extra records came from. I changed no code.

**What the code rules out**
- **Re-runs and overlapping flows don't create duplicates.** All three course flows upsert Course Offering on `External_ID_4D__c` = the source `id`, with spaces trimmed. One distinct ID can only ever give one record.
- **That key has never changed.** It has been the same in every version since the first commit, so older builds didn't leave records behind under a different key.
- **No other flow creates Course Offerings.** The enrollment, certificate and other flows only point at existing offerings. If the offering is missing, those rows fail; they don't create one.
- **Skipped rows lower the count, not raise it.** Rows with a blank or out-of-range Quarter are skipped.

So the 110 extras are almost certainly records whose 4D ID **isn't in the source file you counted**. The likely causes:
1. **The file you counted isn't the one

_[summary truncated — see the session record for the full text]_
<!-- orchestrate:session-state:end -->
