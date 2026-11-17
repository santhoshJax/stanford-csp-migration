# Portal URLs come from a network-derived resolver, not Custom Labels

**Date:** 2026-11-13 · **Status:** Accepted
**Deciders:** Julia Cannon (answered in the 2026-11-13 Design session "Design the Solution") · **Supersedes:** the 2026-11-10 direction "hardcoded portal URLs move to the CSP_Storefront_Base_URL label"

## Context
`CSP_Storefront_Base_URL` holds the QA URL and `CSP_Student_Portal_URL` the devmain URL in source. Every deploy overwrites labels with the source value, so a label can't hold a per-org URL. `StripeGCCheckoutSessionAction` L47 falls back to the devmain sandbox site URL, and the unmerged branch `feature/storefront-url-labels` would switch that fallback to the QA label.

## Decision
PR 2 adds a server-side resolver (`CspEnvironment`) that derives the portal base URL from the Experience Cloud network name, which is the same in every org. The labels are marked deprecated and are not read by code. `feature/storefront-url-labels` is closed, not merged.

## Why
The network name is stable across orgs, so no post-deploy edit is needed. A label-based approach needs a manual edit in every org after every deploy.

## Consequences
- Someone with write access must close (delete) `feature/storefront-url-labels`. A Design session can't delete branches.
- The deprecated labels are deleted in a later cleanup.
