# ADR-002 — Dual authentication: Stanford IdP for staff, native Salesforce auth for external users

**Date:** 2026-04 (requirements baseline; discussion date not recorded) · **Status:** Accepted
**Deciders:** Stanford CSP and UIT with Jax; individual names not recorded · **Supersedes:** none

> Reconstructed from approved requirements INT-SSO-01/02/03, SEC-AUTH-001, AUTH-EXT-01..03,
> INT-CAN-01/02, SP-ACC-02, and Amendment 1 §2.3.5. SME: Eli Lev, Amy Tollafield.

## Context

Staff have Stanford identities. **Students and instructors are non-matriculated and have no SUNet IDs.**
The same Salesforce org must serve both, plus single sign-on into Canvas for students. Stanford
requires MFA for staff, centralised access revocation, and has FERPA obligations on student records.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Staff: Stanford IdP via SAML (MFA at the IdP). External users: native Salesforce auth. Salesforce is the IdP for Canvas.** | Fits who actually has credentials; central revocation and MFA for staff; low friction for learners | Two auth paths to test and support; PCI scope could widen if the pattern drifts |
| **B — Everyone through Stanford identity** *(not documented as evaluated)* | One path | Learners have no SUNet IDs |
| **C — Everyone on native Salesforce auth** *(not documented as evaluated)* | One path | Loses central revocation and MFA enforcement for staff |

## Decision

- **Staff** authenticate via Stanford's enterprise IdP using SAML SSO; MFA is enforced by that IdP.
- **External users** (students, instructors) use **native Salesforce authentication** with Salesforce-managed credentials.
- Each learner has **one external identity** shared by the Student Portal and the Storefront; potential duplicate identities are flagged for reporting, not auto-merged.
- **Canvas SSO**: Salesforce is the SAML identity provider; Canvas is the service provider. Canvas matches students on a **persistent numeric CSP student ID**, not email.
- **Authentication is required** before completing registration and checkout (FERPA, academic-record precision, discount validation).

## Why

Credentials follow reality (learners have none from Stanford) while keeping Stanford's controls where
Stanford can enforce them. Requiring login at checkout was decided for FERPA, record accuracy and
discount validation (SP-ACC-02).

## Consequences

**Accepted costs:**
- Stanford's Canvas team must configure the SAML service provider on our schedule.
- Two authentication paths to document and test.

**What this forecloses:**
- Guest checkout. Anonymous browsing of the catalog is allowed; purchase is not.

**Revisit if:**
Stanford's authentication ever stops being standard SAML or native Salesforce auth — Amendment 1 §2.3.1
says that would likely bring SSO into the **PCI review**, adding scope and timeline.
