# ADR-005 — Waitlist offers, duplicate merges and transcript duplicates stay staff-controlled

**Date:** 2026-04 (requirements baseline; discussion date not recorded) · **Status:** Accepted
**Deciders:** Stanford CSP Student Services (Amy Tollafield) with Jax · **Supersedes:** none

> Reconstructed from approved requirements SC-WAIT-06, SST-WAITLIST-01..03, SC-WAIT-09,
> AUTH-DUPE-01..03, and SST-TRANSCRIPT-03 with its scope note.

## Context

Student Services currently invites waitlisted students by email, may deliberately **over-offer**
seats, and applies judgment. Student identity records must be accurate for transcripts and
FERPA. Automation here would remove staff discretion and risk wrong merges.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Manual-first: staff select who is invited; no automatic next-in-line; duplicates are *identified* by matching rules but merged only after staff verification; transcript duplicates flagged manually** | Preserves discretion (over-offering); no irreversible automatic merges; smaller build | More staff effort; no alerting on duplicates |
| **B — Auto-enroll from waitlist; auto-merge on match** | Less staff work | Explicitly rejected by Student Services; risk of merging distinct people |

## Decision

- Waitlist invitations are a **staff-controlled** process; waitlist position is **not shown** to students; over-offering is supported; a closed waitlist converts to **future interest**.
- Potential duplicate students are **identified by configurable matching rules** but **never auto-merged**; merge needs staff verification (a manual field update or completed task) and leaves an **audit trail**.
- Transcript-request duplicates are **flagged manually** by staff; automation to find or alert on them is **out of scope**.

## Why

Student Services' stated working practice (Amy "explicitly rejected auto-enroll", emails invites
manually, may over-offer) and the need for accurate academic records.

## Consequences

**Accepted costs:**
- Staff workload; no automated duplicate alerts.

**What this forecloses:**
- Auto-enroll from the waitlist, any automatic merge, and automated transcript-duplicate detection — all without a change order.

**Revisit if:**
Waitlist volume makes manual invitation unworkable, or Stanford funds duplicate-detection automation.
