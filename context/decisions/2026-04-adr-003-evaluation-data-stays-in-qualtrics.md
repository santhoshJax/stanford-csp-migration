# ADR-003 — Course evaluation responses stay in Qualtrics; Salesforce stores aggregates only

**Date:** 2026-04 (requirements baseline; discussion date not recorded) · **Status:** Accepted
**Deciders:** Stanford CSP (LDT / Integrations SMEs: Rachel Shirkey, Laura Lind) with Jax · **Supersedes:** none

> Reconstructed from approved requirements QUALTRICS-01, -02, -10, -11, -13, -14, -15, -16, INT-QUAL-01.

## Context

The legacy 4D system collected course evaluations; Stanford has an **existing enterprise Qualtrics
licence and an existing Qualtrics connector for Salesforce**. Instructors may only see summaries
(evaluation anonymity), students must not see results, and staff need course-level access. The SOW
budgets a connector install/configuration, not custom integration.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Use Qualtrics for surveys and results; push context to it; pull only aggregates (summary score, response rate) into Salesforce; use the existing connector** | Anonymity and raw data governed in one place; within the connector budget; retires 4D evaluations | Functionality limited to what the connector and Qualtrics natively offer |
| **B — Store individual responses as Salesforce records** | Rich in-Salesforce reporting | Prohibited by QUALTRICS-15; widens privacy exposure |
| **C — Build custom API integration** | Maximum control | Explicitly out of scope for QUALTRICS-10/11/13/14 |

## Decision

Replace 4D evaluations with **Qualtrics surveys**. Salesforce triggers surveys and pushes contextual
data to Qualtrics, retrieves **aggregate metrics only**, shows instructors a **link to the summary
report** (never individual responses), and **never stores individual responses** as records. Stay on the
existing connector; custom API work is out of scope.

## Why

Anonymity and data-minimisation, plus staying inside the contracted effort. The scope notes on the
requirements say so directly: capability is "limited by native Qualtrics capabilities and use of
existing Qualtrics connector".

## Consequences

**Accepted costs:**
- Evaluation-based sorting (QUALTRICS-19) and low-evaluation identification (LDT-15) depend on the synced aggregates only.
- Anything the connector cannot do is a change order.

**What this forecloses:**
- Response-level reporting inside Salesforce or Tableau Next.

**Revisit if:**
Stanford wants response-level analytics in Salesforce, or the connector proves unable to deliver the
aggregate sync (QUALTRICS-14).
