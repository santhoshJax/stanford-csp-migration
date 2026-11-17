# Registration 2-year scope: sign-up date OR Fall 2024+ term; each commerce flow keeps its own cutoff

**Date:** 2026-11-16 · **Status:** Superseded by ADR-021 (2026-11-16-registration-2-year-scope-sign-up-date-or-fall-2024-term-eac.md)
**Deciders:** Santhosh Kumar Aleti · **Refines:** ADR-018 (2026-11-15-use-fixed-date-and-term-cutoffs-for-the-2-year-and-5-year-da.md) for Registration

## Context
Registration filtered only by Registration_Date, while Enrollment filters by course term. Students who signed up before 9/23/2024 for a Fall 2024 course got an Enrollment but no Order. Purchase and Payments shared one cutoff constant in commerceShared.ts, while Registration had its own copy.

## Decision
- Registration loads a registration when Registration_Date >= 2024-09-23, OR when any of its Enrollment rows is on a Fall 2024 or later course (Course_ID term prefix >= 20241, no upper limit).
- Performance guard: the term check only applies to registrations dated on or after 2024-01-01 (TERM_MATCH_EARLIEST_DATE in registrationFlow.ts).
- No shared setting: each flow keeps its own fixed TWO_YEAR_CUTOFF constant in its own file. Registration, Purchase and Payments are all 2024-09-23. COMMERCE_TWO_YEAR_CUTOFF was removed.

## Consequences
- Registration reads the Enrollment file (the "Enrollment File ID" config var) in any window that holds registrations dated 2024-01-01 to 2024-09-22.
- Payments still filters by date only, so payments dated before 9/23/2024 for early Fall 2024 sign-ups are not loaded. This is an open question.
- Built in commit 0b603af on stanford-csp-orchestrate. Not yet published to Prismatic or run against an org.
