# ADR-018 — Use fixed date and term cutoffs for the 2-year and 5-year data migration scope

**Date:** 2026-11-15 · **Status:** Accepted
**Deciders:** Santhosh Kumar Aleti · **Supersedes:** ADR-007 (2026-11-12-purchase-and-purchase-item-load-orders-from-6-october-2024-o.md)

## Context

The migration needs a consistent scope rule for quarter-based and non-quarter tables across the 2-year and 5-year windows, and the current code applies different dates and an unwanted end date.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Fixed cutoffs as stated: Fall 2024 and later for quarter tables in the 2-year window, 9/23/2024 and later for non-quart…** | One simple, auditable rule per table type; matches the agreed scope exactly | Some fall 2024 registrations made before 9/23/2024 will not have orders loaded |
| **B — Keep the existing code dates (10/6/2024 and mixed end dates)** | No code change needed | Does not match the agreed cutoffs and drops records from Fall 2026 onward |

## Decision

Quarter tables in the 2-year window load from Fall 2024 onward with no end date. Non-quarter tables in the 2-year window load from 9/23/2024 onward. Course data in the 5-year window loads from Fall 2021 onward.

## Why

Santhosh Kumar Aleti set these as the 2-year and 5-year cutoffs for the migration scope.

## Consequences

**Accepted costs:**
- Fall 2024 sign-ups made before 9/23/2024 will not have orders loaded and their course lines will be skipped as Order not loaded, pending a decision on Registration

**What this forecloses:**
- Using the 10/6/2024 cutoff for purchases and registrations

**Revisit if:**
Registration should follow the course term instead of the date, or the Course source file shows rows that the cutoffs would miss

---

_Recorded automatically by Orchestrate when turn 13 of the session “Stanford-Data-Migration-Registration-Enhancements- Build” finished, from what was agreed in the conversation. Edit it freely: Orchestrate never rewrites a record a person has edited._
<!-- orchestrate:decision-capture {"session":"be60d849-b984-488e-85da-da28ad9ff44a","turn":13,"from":"conversation"} -->
