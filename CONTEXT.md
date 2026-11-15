<!-- orchestrate:template-version: v1.0.0 -->
# Context — Stanford CSP / Code Review

> **This file is the index.** It is loaded into every Orchestrate session on this repo, so it stays
> short — target 150 lines, hard ceiling 200. One line per entry pointing at the detail file. Put the
> detail in `context/`, not here.

**Last reviewed:** 2026-11-11 · **Maintained by:** the team working this engagement

---

## The one-paragraph version


Build and configure the Marketing Cloud emails, automations and templates for the Stanford CSP program so that email creation is complete by the start of UAT, targeting the November 30 timeline. The build is blocked on email copy the CSP team has yet to supply, and the footer text and hyperlink have been fixed to white so CSP can confirm the change in test emails.

_Kept up to date by Orchestrate from the sessions (last 2026-11-12). Edit it and Orchestrate leaves it to you._
<!-- orchestrate:summary 0252dacd284f -->

---

## Where things are

| File | What lives there | Read it when |
|---|---|---|
| [`context/client.md`](context/client.md) | Who they are, org chart, decision makers | You need to know who to ask, or who signs off |
| [`context/environment.md`](context/environment.md) | Orgs, sandboxes, credential *references* | You are about to deploy or connect to something |
| [`context/goals.md`](context/goals.md) | What we are solving, success criteria, budget | You are scoping, estimating, or saying no to something |
| [`context/decisions/`](context/decisions/) | One dated ADR per architectural choice | You are about to relitigate a settled decision |
| [`context/history.md`](context/history.md) | Shipped / parked / abandoned, dated | You are wondering whether something already exists |
| [`context/handoff.md`](context/handoff.md) | Current state, in progress, next steps | **Start here** if you are picking this up cold |
| [`context/gotchas.md`](context/gotchas.md) | The things that will bite you | **Before** you assume something works the obvious way |

<!-- orchestrate:auto-index -->
**Index** (kept by Orchestrate from what this memory holds; edit outside these markers):
- [`context/handoff.md`](context/handoff.md) — where things stand and what is next — start here
- [`context/goals.md`](context/goals.md) — goals, success criteria and scope
- [`context/client.md`](context/client.md) — who the client is and who decides
- [`context/environment.md`](context/environment.md) — orgs, sandboxes and connection references
- [`context/gotchas.md`](context/gotchas.md) — what will bite you
- [`context/history.md`](context/history.md) — shipped, parked and abandoned work
- [`context/sessions/README.md`](context/sessions/README.md) — one record per session: what each did, decided and left open
- Decisions in [`context/decisions/`](context/decisions/) (17, newest first):
  - [OrderItem keys use a {source}-{type}-{id} scheme](context/decisions/2026-11-15-orderitem-source-type-key-scheme.md)
  - [ADR-017 — Keep the course tuition line key as ENR-{Enrollment.ID}](context/decisions/2026-11-15-keep-the-course-tuition-line-key-as-enr-enrollment-id.md)
  - [ADR-014 — Role indicators on the Person Account: checkboxes leaning over Constituent Roles](context/decisions/2026-11-13-role-indicators-on-the-person-account-checkboxes-leaning-ove.md)
  - [Refund permission holders and removal of the other staff classes from the guest permission set](context/decisions/2026-11-13-refund-permission-holders-and-guest-grant-removals.md)
  - [Portal URLs come from a network-derived resolver, not Custom Labels](context/decisions/2026-11-13-portal-urls-from-network-resolver-not-labels.md)
  - [Enrollment Fee loads as its own OrderItem ("Course Additional Fees")](context/decisions/2026-11-13-enrollment-fee-separate-order-item.md)
  - [ADR-009 — Update affected UAT users in place rather than recreating them](context/decisions/2026-11-12-update-affected-uat-users-in-place-rather-than-recreating-th.md)
  - [Remove StripeGCRefundAction from the CSP_Checkout_Guest_Access permission set](context/decisions/2026-11-12-remove-stripegcrefundaction-from-guest-permission-set.md)
  - [ADR-007 — Purchase and Purchase Item load orders from 6 October 2024 onward](context/decisions/2026-11-12-purchase-and-purchase-item-load-orders-from-6-october-2024-o.md)
  - [ADR-010 — Production load order: Person Accounts first, then Users](context/decisions/2026-11-12-production-load-order-person-accounts-first-then-users.md)
  - [ADR-008 — Email is masked in UAT and users loaded inactive until migration validated](context/decisions/2026-11-12-email-is-masked-in-uat-and-users-loaded-inactive-until-migra.md)
  - [ADR-006 — Oracle Financials is the ledger; Salesforce holds course- and student-level financial detail](context/decisions/2026-04-adr-006-oracle-ledger-salesforce-transactional-detail.md)
  - [ADR-005 — Waitlist offers, duplicate merges and transcript duplicates stay staff-controlled](context/decisions/2026-04-adr-005-manual-first-staff-controlled-processes.md)
  - [ADR-004 — Portals use standard Experience Cloud components; no custom code or LWCs](context/decisions/2026-04-adr-004-standard-experience-cloud-components.md)
  - [ADR-003 — Course evaluation responses stay in Qualtrics; Salesforce stores aggregates only](context/decisions/2026-04-adr-003-evaluation-data-stays-in-qualtrics.md)
  - [ADR-002 — Dual authentication: Stanford IdP for staff, native Salesforce auth for external users](context/decisions/2026-04-adr-002-dual-authentication-model.md)
  - [ADR-001 — Standard-first data model; every individual is a Person Account](context/decisions/2026-04-adr-001-standard-first-person-account-model.md)
<!-- /orchestrate:auto-index -->

## Fast facts

<!-- The handful of things worth carrying inline, so a session that reads ONLY this file is not lost.
     Keep it to what changes rarely. Anything volatile belongs in handoff.md. -->

| | |
|---|---|
| Primary Salesforce org | {{SF_ORG_ALIAS}} |
| Sandbox(es) | *see [`context/environment.md`](context/environment.md)* |
| Delivery methodology | Jax: Launch · Define · Develop · Test · Release · Sustain |
| Repo | `Jax-Consulting/proj-edu-stanford-csp` |
| Default branch | `main` |

## Current state

> **Start with [`context/handoff.md`](context/handoff.md).** It is rewritten at the end of every
> session; this index is not. If the two disagree, handoff.md is newer.

---

## Rules for this directory

1. **`CONTEXT.md` is required. Everything under `context/` is optional.**
   An empty `goals.md` is worse than no `goals.md` — it looks answered when it is not. Delete a file
   you have nothing to put in, or leave the `> **Not yet filled in.**` marker so it is visibly unfilled.
2. **Never put secrets in any of these files.** Reference the credential — the 1Password/LastPass entry,
   the Named Credential, the External Client App — never the value. A private repo is still a repo:
   it gets cloned, forked, backed up and shared.
3. **One ADR per decision, not one per meeting.** ADRs are for choices with tradeoffs someone might
   question later, not status updates. See [`context/decisions/README.md`](context/decisions/README.md).
4. **`handoff.md` gets rewritten at the end of every session.** If it is not, it rots within a week and
   the next person stops trusting it — which costs more than not having it.
5. **`gotchas.md` entries carry the incident.** "Cannot deploy Prompt Template content via Metadata API —
   silent no-op, must use Prompt Builder UI (hit 2026-09-10, cost 2 hrs)." The incident and the date are
   what stop the next person waving it away.
6. **Dated, not relative.** "Shipped 2026-04-12", never "shipped last spring". Someone will read this
   in 2027.

## How this connects to the wider picture

Patterns, standards and learnings that are **not specific to this client** do not belong here — they go
to Revecast's central ontology, where every future engagement can benefit from them. Client code and
client-identifying detail stay in this repo and never leave it.

<!-- Link relevant central patterns here rather than copying them:
     - [pattern-name](ontology link)
-->
