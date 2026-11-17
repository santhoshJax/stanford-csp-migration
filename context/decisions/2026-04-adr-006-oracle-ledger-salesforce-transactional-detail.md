# ADR-006 — Oracle Financials is the ledger; Salesforce holds course- and student-level financial detail

**Date:** 2026-04 (requirements baseline; discussion date not recorded) · **Status:** Accepted
**Deciders:** Stanford CSP Finance (Harry Williamson, Holly Odorfer) with Jax · **Supersedes:** none

> Reconstructed from approved requirements FIN-ARCH-01, FIN-ARCH-02, FIN-CORE-01, FIN-HIST-01,
> FIN-SEC-01/02 and SOW "integration 01" (mappings to the finance system).

## Context

Stanford's financial system of record is Oracle Financials. CSP needs course- and student-level
detail (revenue, refunds, STAP, break-even, instructor compensation) that Oracle does not hold,
for audit and reconciliation.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Oracle = ledger; Salesforce = transactional detail; Jax delivers mappings, Stanford UIT builds the middleware** | Clean ledger/detail split; Stanford keeps accounting control; matches SOW | Reconciliation between two systems; depends on UIT schedule |
| **B — Salesforce as the financial system of record** *(not documented as evaluated)* | One system | Contradicts FIN-ARCH-01 |

## Decision

Treat **Oracle Financials as the system of record** and use Salesforce for **transactional detail**
(per-course and per-student), reconciliation support, audit trail, break-even and revenue reporting.
Finance has **read-only** access to payment records; **correction authority is restricted to Student
Services** (FIN-SEC-01/02). Jax provides **data mappings**; **Stanford UIT builds the middleware**.

## Why

"Ledger vs detail separation" and "supports audit and reconciliation" (requirement notes).

## Consequences

**Accepted costs:**
- Integration success depends on UIT delivering middleware on schedule (SOW assumption 6).
- Reconciliation reports must be designed to tie Salesforce detail to Oracle totals.

**What this forecloses:**
- Salesforce acting as a general ledger.

**Revisit if:**
Stanford changes its finance system, or UIT cannot deliver the middleware before UAT.
