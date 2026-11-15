# ADR-009 — Update affected UAT users in place rather than recreating them

**Date:** 2026-11-12 · **Status:** Accepted
**Deciders:** Santhosh Kumar Aleti · **Supersedes:** none

## Context

Six confirmed wrong-email records needed correcting in UAT.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Update inactive users in place** | Preserves records and keeps masking applied | Requires careful editing of inactive users |
| **B — Recreate the users** | Clean records | Loses history and prolongs the incident |

## Decision

Affected inactive UAT Users are updated in place, keeping UAT email masking on every change.

## Why

Inactive users can be edited, and in-place updates are faster and keep masking.

## Consequences

**Accepted costs:**
- Careful manual editing of inactive users

**What this forecloses:**
- Recreating affected UAT users

**Revisit if:**
In-place updates prove unreliable

---

_Recorded automatically by Orchestrate when turn 1 of the session “Stanford-Inter-data-Mismatch-Review-Meet” finished, from what was agreed in the conversation. Edit it freely: Orchestrate never rewrites a record a person has edited._
<!-- orchestrate:decision-capture {"session":"f357a1a9-506d-401f-9b33-519da7f68e5f","turn":1,"from":"conversation"} -->
