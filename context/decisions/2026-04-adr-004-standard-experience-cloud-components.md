# ADR-004 — Portals use standard Experience Cloud components; no custom code or LWCs

**Date:** 2026-04 (requirements baseline; discussion date not recorded) · **Status:** Accepted
**Deciders:** Stanford CSP with Jax; individual names not recorded · **Supersedes:** none

> Reconstructed from approved requirements EXP-CLOUD-GEN-01..07 and the SOW line "build-core 16"
> ("No custom code or LWCs. Standard Experience Cloud UI").

## Context

Stanford requires WCAG 2.0 A/AA and its own accessibility review before production, and Stanford
branding, on a Salesforce portal and storefront. Salesforce Experience Cloud is also the CMS for the
portals and storefront — CSP Marketing confirmed on **2025-12-16** that Salesforce replaces WordPress.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Standard components and templates; limited styling via supported mechanisms; no page-specific or inline CSS where avoidable** | Lower technical debt and maintenance; upgrade-compatible; best chance of passing accessibility review | Less visual freedom; some Stanford branding wishes will not be met |
| **B — Custom LWCs / bespoke front end** *(not documented as evaluated)* | Pixel-perfect branding | Accessibility burden moves to us; outside SOW; more debt |

## Decision

Build the Student and Instructor portals and storefront from **standard Experience Cloud components
and out-of-the-box templates** (EXP-CLOUD-GEN-02/03). Apply Stanford branding within Salesforce-supported
styling. Restrict Experience Builder access (EXP-CLOUD-GEN-05). Use Stanford-approved subdomains. Where
the platform cannot meet WCAG, **document it and obtain a written Stanford accessibility exception**
before go-live.

## Why

Stated in the requirement: it "reduces technical debt, improves upgrade compatibility, and lowers
maintenance cost". The scope note on EXP-CLOUD-GEN-03 adds that limiting to standard templates is
"to ensure accessibility compliance".

## Consequences

**Accepted costs:**
- Stanford's accessibility review (4–6 weeks) still applies regardless of Salesforce's own compliance.
- Requests that need custom components become change requests.

**What this forecloses:**
- Custom LWC-based portal pages within the current budget.

**Revisit if:**
A must-have requirement cannot be met with standard components and Stanford will not grant an
accessibility exception.
