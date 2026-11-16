# ADR-019 — Hold the full registration data load until student email mismatches are fixed

**Date:** 2026-11-16 · **Status:** Accepted
**Deciders:** Santhosh Kumar Aleti · **Supersedes:** none

## Context

Registration import depends on Contact email matching; about 2,700 Contact email mismatches were outstanding and the 13 Nov standup set the order of fixes.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Load registration data now** | Faster progress toward UAT | Records would attach to mismatched contacts |
| **B — Fix student email mismatches first, then load** | Registration attaches to correct contacts | Load is delayed until the fix is complete |

## Decision

Registration data is not loaded in full until the student email fix is complete: switch off the duplicate rule, re-run Student, then re-run the user email update.

## Why

Trevor stated at the 13 Nov standup that registration waits until the email mismatches are fixed.

## Consequences

**Accepted costs:**
- Full registration load waits on the email fix sequence

**What this forecloses:**
- Loading registration before the email mismatches are resolved

**Revisit if:**
The email mismatch count is resolved or Trevor changes the standup decision

---

_Recorded automatically by Orchestrate when turn 13 of the session “Stanford-Data-Migration-Registration-Enhancements- Build” finished, from what was agreed in the conversation. Edit it freely: Orchestrate never rewrites a record a person has edited._
<!-- orchestrate:decision-capture {"session":"be60d849-b984-488e-85da-da28ad9ff44a","turn":13,"from":"conversation"} -->
