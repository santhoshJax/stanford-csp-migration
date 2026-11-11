# ADR-001 — Standard-first data model; every individual is a Person Account

**Date:** 2026-04 (requirements baseline; discussion date not recorded) · **Status:** Accepted
**Deciders:** Stanford CSP (requirements approved by Stanford) with Jax; individual names not recorded · **Supersedes:** none

> Reconstructed from approved requirements CDM-01, CDM-02, CDM-03 (SME: Eli Lev). Options below that
> are not stated in the source are labelled as such.

## Context

CSP's people are fluid: one individual can be a student, instructor, staff member or alumnus, sometimes
at the same time, and roles change over time. Education Cloud ships standard objects for academic
entities. The contract also commits Jax to a configuration-led build (the SOW calls for no custom
code in the portals) and to limiting technical debt.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Education Cloud standard objects first; every individual a Person Account; time-bound role relationships** | One record per human, no duplicates across personas; upgrade-safe; matches the requirement text | Person Accounts cannot be reversed in an org; role/date logic must be modelled carefully |
| **B — Business Accounts + Contacts with separate records per persona** *(not documented as evaluated)* | Familiar B2B pattern | Duplicates one person across personas — the exact problem CDM-02/03 exist to avoid |
| **C — Custom objects for CSP-specific entities first** *(not documented as evaluated)* | Fits 4D structure closely | Contradicts CDM-01; more technical debt |

## Decision

Use Education Cloud **standard objects as the authoritative source** for core academic entities and
introduce custom objects only where no standard one fits (e.g. the store/instructor models in SOW
build-core 14). Model **all individuals as Person Accounts**. Represent roles (student, staff,
instructor, alumni) as **time-bound relationships** on a single person record, with role-based
visibility.

## Why

Stated in the requirements: one individual may hold several personas concurrently, and roles "can vary
by date range". A single person record is the only way to avoid duplicating people while keeping
history accurate (also feeds HR-EMP-03 historical employment integrity and Data Cloud identity
resolution, DATA-CLOUD-01).

## Consequences

**Accepted costs:**
- Person Accounts are enabled once and are effectively permanent in the org.
- Every role-dependent security and reporting rule must resolve through the role relationship, not the record type.

**What this forecloses:**
- Separate Contact-per-persona designs; using Business Accounts to represent people.

**Revisit if:**
Stanford introduces a persona that must be modelled as an organisation, or Education Cloud standard
objects cannot represent a required academic entity.
