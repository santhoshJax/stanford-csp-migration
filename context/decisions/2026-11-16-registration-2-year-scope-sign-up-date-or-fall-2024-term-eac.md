# ADR-021 — Registration 2-year scope: sign-up date OR Fall 2024+ term; each commerce flow keeps its own cutoff

**Date:** 2026-11-16 · **Status:** Accepted
**Deciders:** Santhosh Kumar Aleti · **Supersedes:** Registration 2-year scope: sign-up date OR Fall 2024+ term; each commerce flow keeps its own cutoff (2026-11-16-registration-scope-date-or-term.md)

## Context

Registration loaded only sign-ups on or after 6 Oct 2024, but the rule is 23 Sep 2024. Sign-ups made before a Fall 2024 quarter starts would load enrollments without an Order, so their course lines and payments would be dropped. Purchase and Payments shared one date constant, which made the cutoff fragile.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Date only, 23 Sep 2024** | One-line change that follows the rule exactly. | Fall 2024 sign-ups made before 23 Sep still get no Order, so their course lines are skipped. |
| **B — Date OR term** | Covers early sign-ups for Fall 2024 and later courses, so their course lines have an Order to attach to. | Registration must read the Enrollment file for early sign-ups, which adds load work and needs the Enrollment File ID setting. |

## Decision

Registration loads a registration if its sign-up date is on or after 23 Sep 2024, or if any of its enrollments is on a Fall 2024 or later course. The cutoff date stays as a constant inside registrationFlow.ts. Purchase and Payments each keep their own copy of the 23 Sep 2024 cutoff instead of sharing one constant.

## Why

The person wanted the rule followed without creating a shared settings value, and chose the option that keeps Fall 2024 enrollments with their Orders.

## Consequences

**Accepted costs:**
- Registration reads the Enrollment file for sign-ups dated 1 Jan 2024 to 22 Sep 2024.
- The Enrollment File ID setting must be filled in or the run stops with an error.
- Payments is still date-only, so a payment made before 23 Sep 2024 for an early Fall 2024 sign-up will not load.

**What this forecloses:**
- A single shared cutoff constant across Purchase and Payments.

**Revisit if:**
Payments should load whenever its Order was loaded, or when the other term-based flows are reviewed.

---

_Recorded automatically by Orchestrate when turn 13 of the session “Stanford-Data-Migration-Registration-Enhancements- Build” finished, from the person’s answers to Orchestrate’s questions. Edit it freely: Orchestrate never rewrites a record a person has edited._
<!-- orchestrate:decision-capture {"session":"be60d849-b984-488e-85da-da28ad9ff44a","turn":13,"from":"answer"} -->
