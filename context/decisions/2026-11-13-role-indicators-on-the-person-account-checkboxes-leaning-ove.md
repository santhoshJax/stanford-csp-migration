# ADR-014 — Role indicators on the Person Account: checkboxes leaning over Constituent Roles

**Date:** 2026-11-13 · **Status:** Accepted
**Deciders:** Julia Cannon · **Supersedes:** ADR-001 (2026-04-adr-001-standard-first-person-account-model.md)

## Context

Roles (student, instructor, associate) need to be flagged on the Person Account, and Constituent Roles were considered as an alternative.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Constituent Roles** | Records date-bounded role periods | Implies historical migration scope; used only as a flag; extra object to maintain; not every role has a portal user |
| **B — Checkboxes (Student / Instructor / Associate)** | Simple flags set when a Course Offering Participant record exists; no extra object | Loses role history unless tracked elsewhere |

## Decision

Leaning toward checkboxes, set from Course Offering Participant records. Not final; pending CSP input on whether flags can be switched off and when a role officially starts.

## Why

Avoids expanding migration scope to historical role data and avoids using an object as a simple flag.

## Consequences

**Accepted costs:**
- Role history not captured in a dedicated object

**What this forecloses:**
- None recorded.

**Revisit if:**
CSP requires dated role history or role periods must be tracked.

---

_Recorded automatically by Orchestrate when turn 1 finished, from what was agreed in the conversation. Edit it freely: Orchestrate never rewrites a record a person has edited._
<!-- orchestrate:decision-capture {"session":"ead8e446-b809-4625-afdb-da533a3f7ddb","turn":1,"from":"conversation"} -->
