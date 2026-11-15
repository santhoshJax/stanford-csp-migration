# ADR-007 — Purchase and Purchase Item load orders from 6 October 2024 onward

**Date:** 2026-11-12 · **Status:** Accepted
**Deciders:** Santhosh Kumar Aleti · **Supersedes:** none

## Context

The team needed to fix how far back the purchase data load should go, and what period the purchase line items should follow.

## Options considered

| Option | For | Against |
|---|---|---|
| **A — Fixed cutoff of 6 October 2024 (same as Registration)** | Consistent with Registration; a single fixed date; no rolling window to maintain | Applying it to Purchase_Date is an assumption, since the Purchase data has no column that marks the cutoff |

## Decision

Purchase orders are loaded when Purchase_Date is on or after 6 October 2024, with no end date. Purchase Item has no date filter of its own: a line loads only if its parent order loaded, so it follows the same period.

## Why

Matches the cutoff already used for Registration, giving one consistent period across the commerce data.

## Consequences

**Accepted costs:**
- Lines whose own date is before the cutoff but whose order is on or after it still load
- Lines whose order is older than the cutoff, or failed to load, are skipped and listed on the Skipped tab with reason 'Order not loaded'
- Confirmation that Purchase_Date is the right field for the cutoff is still outstanding (question 9 on the Trevor list)

**What this forecloses:**
- A rolling 'last two years' window

**Revisit if:**
Trevor confirms a different date field for the cutoff, or the business asks for a different start date

---

_Recorded automatically by Orchestrate when turn 10 of the session “Stanford-Data-Migration-Purchase-Related-build” finished, from what was agreed in the conversation. Edit it freely: Orchestrate never rewrites a record a person has edited._
<!-- orchestrate:decision-capture {"session":"2cb154f7-df0b-4f6d-b07b-4304c80b818e","turn":10,"from":"conversation"} -->
