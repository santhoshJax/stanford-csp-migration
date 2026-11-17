# Remove StripeGCRefundAction from the CSP_Checkout_Guest_Access permission set

**Date:** 2026-11-12 · **Status:** Accepted
**Deciders:** the engagement team (stated as settled in the 2026-11-13 Design session request) · **Supersedes:** none

## Context

The 2026-11-11 code review of `release/qa-baseline-2026-11-02` found that `CSP_Checkout_Guest_Access` grants Apex access to `StripeGCRefundAction`. That class issues real Stripe refunds, runs `without sharing` and never checks the caller. In devmain the permission set is assigned to 2 site guest users and 7 logged-in students.

## Decision

`StripeGCRefundAction` comes out of `CSP_Checkout_Guest_Access`. This is settled and is not reopened by later design work.

## Why

No guest or student has any reason to call a staff refund controller. Removing the grant closes the exposure regardless of any later code fix.

## Consequences

- Removing the grant alone is not enough. The 2026-11-13 design adds a custom permission (`APP_CSP_Process_Refunds`), a permission set (`APP_CSP_Refund_Processor`) and a server-side check on every refund method (PR 1).
- Rollbacks of PR 1 must not restore this grant.
