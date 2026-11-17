# ADR-010 — Production load order: Person Accounts first, then Users

**Date:** 2026-11-12 · **Status:** Accepted
**Deciders:** Santhosh Kumar Aleti · **Supersedes:** none

## Context

Users copy username and email from Contacts, so Contacts must be correct before Users load.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Reload Person Accounts first, then Users** | Users inherit corrected Contact data | Requires a sequenced reload |

## Decision

For production, reload Person Accounts first, then Users, using the corrected load.

## Why

The User email and username are copied from the Contact, so fixing the student load fixes User data only if Contacts load first.

## Consequences

**Accepted costs:**
- A sequenced, two-step reload

**What this forecloses:**
- Loading Users before Person Accounts are corrected

**Revisit if:**
The User load stops copying email from Contact

---

_Recorded automatically by Orchestrate when turn 1 of the session “Stanford-Inter-data-Mismatch-Review-Meet” finished, from what was agreed in the conversation. Edit it freely: Orchestrate never rewrites a record a person has edited._
<!-- orchestrate:decision-capture {"session":"f357a1a9-506d-401f-9b33-519da7f68e5f","turn":1,"from":"conversation"} -->
