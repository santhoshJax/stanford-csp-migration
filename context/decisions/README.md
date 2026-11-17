# Decisions (ADRs)

One file per meaningful architectural choice. **Append-only** — once an ADR is agreed, it is not
edited. If the decision changes, write a **new** ADR that supersedes it and mark the old one.

## Why this exists

When someone asks "why did we use X instead of Y?" six months from now, the answer is here. Without
it, settled decisions get relitigated at full cost, usually by someone who was not in the room.

## Naming

```
YYYY-MM-adr-NNN-short-slug.md
2026-03-adr-001-agentforce-vs-flow.md
2026-04-adr-002-data-cloud-retriever.md
```

Numbers never repeat, even across years. Use [`_template.md`](_template.md).

## What earns an ADR

**Yes:** a choice with tradeoffs someone could reasonably question later — picking one platform
capability over another, a data model that constrains future work, an integration pattern, a
deliberate deviation from Jax standards.

**No:** status updates, task lists, anything with one obvious answer, decisions already covered by the
Jax standards (link those instead of restating them).

**One ADR per decision, not one per meeting.** A meeting that settles three things produces three ADRs,
or one if they are really facets of the same choice. A meeting that settles nothing produces none.

## Status values

`Proposed` → `Accepted` → later possibly `Superseded by adr-NNN` or `Deprecated`.
