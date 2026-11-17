# ADR-017 — Keep the course tuition line key as ENR-{Enrollment.ID}

**Date:** 2026-11-15 · **Status:** Accepted
**Deciders:** Santhosh Kumar Aleti · **Supersedes:** none

## Context

Choice of key for the course (tuition) line, given the new scheme introduces ENR-FEE- and ENR-ADJ-.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Keep ENR-{Enrollment.ID}** | Unchanged, so no re-keying of existing course lines | Less explicit than adding a CRS segment |
| **B — ENR-CRS-{Enrollment.ID}** | Parallel to ENR-FEE- and ENR-ADJ- naming | Re-keys existing course lines |

## Decision

The course (tuition) line keeps the key ENR-{Enrollment.ID}.

## Why

Keeping the existing key avoids re-keying course lines that already exist.

## Consequences

**Accepted costs:**
- Course line key is not parallel in form to the ENR-FEE- and ENR-ADJ- keys

**What this forecloses:**
- Changing the course line key to ENR-CRS-

**Revisit if:**
The course line needs to be distinguished from other enrollment lines in reporting

---

_Recorded automatically by Orchestrate when turn 13 of the session “Stanford-Data-Migration-Registration-Enhancements- Build” finished, from the person’s answers to Orchestrate’s questions. Edit it freely: Orchestrate never rewrites a record a person has edited._
<!-- orchestrate:decision-capture {"session":"be60d849-b984-488e-85da-da28ad9ff44a","turn":13,"from":"answer"} -->
