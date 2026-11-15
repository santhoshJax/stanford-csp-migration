# Refund permission holders and removal of the other staff classes from the guest permission set

**Date:** 2026-11-13 · **Status:** Accepted
**Deciders:** Julia Cannon (answered in the 2026-11-13 Design session "Design the Solution") · **Supersedes:** none

## Context
The 2026-11-13 solution design for the Apex review fixes adds the custom permission `APP_CSP_Process_Refunds` and the permission set `APP_CSP_Refund_Processor`, which gate every `StripeGCRefundAction` method (PR 1). Besides the refund class, `CSP_Checkout_Guest_Access` also grants three staff-only classes on `release/qa-baseline-2026-11-02`.

## Decision
1. `APP_CSP_Refund_Processor` is assigned to the current STAP refund processors, **Rajesh Yeddula and Satabhisa Roy**, in the PR 1 deploy window. CSP Student Services / Finance staff are added later by assignment only.
2. `CSPEnrollmentOfferAdminController`, `CSPInstructorPortalController` and `StripeGCEventHandler` come out of `CSP_Checkout_Guest_Access` in PR 1, along with `StripeGCRefundAction` (already decided 2026-11-12).

## Why
- These two users already reconcile STAP refunds. Starting with them keeps the Process Refund screens working on day one without widening access.
- None of the three classes is needed by guests: the admin controller is a staff record-page screen, instructors get their controller through `CSP_Instructor_Platform`, and the event handler runs from its trigger, which needs no class access.

## Consequences
- If the permission set is not assigned in the same deploy window, refunds stop working for everyone.
- Smoke-test the storefront and Instructor Portal home pages as a guest after the removal.
