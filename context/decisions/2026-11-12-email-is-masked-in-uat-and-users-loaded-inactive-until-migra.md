# ADR-008 — Email is masked in UAT and users loaded inactive until migration validated

**Date:** 2026-11-12 · **Status:** Accepted
**Deciders:** Santhosh Kumar Aleti · **Supersedes:** none

## Context

After UAT welcome emails went out, some users logged in and saw another person's data because Contact emails were loaded wrong, and the User records copy email from Contact.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Load Users as inactive with masked or no-access emails until validated** | Stops wrong-person logins and emails while the load is verified | Users are not usable until the validation gate passes |

## Decision

Load Users as inactive, with emails masked or no-access, until the email-to-student-ID comparison passes; no migration is signed off until it passes for every record.

## Why

Wrong email on a Contact produces a wrong User login, so a mismatch exposes another student's record.

## Consequences

**Accepted costs:**
- Users remain unusable until validation completes

**What this forecloses:**
- Activating migrated Users before the email comparison passes

**Revisit if:**
The load is fixed and the full comparison shows zero mismatches

---

_Recorded automatically by Orchestrate when turn 1 of the session “Stanford-Inter-data-Mismatch-Review-Meet” finished, from what was agreed in the conversation. Edit it freely: Orchestrate never rewrites a record a person has edited._
<!-- orchestrate:decision-capture {"session":"f357a1a9-506d-401f-9b33-519da7f68e5f","turn":1,"from":"conversation"} -->
