Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Process doc — the index itself has no decision state

# Decisions

This directory is for **Architecture Decision Records (ADRs)** — short,
dated records of a specific decision once it's actually made, not
proposals or in-progress discussion.

## When to add one

Add an ADR here when a decision named `[DECISION REQUIRED]` elsewhere in
`docs/` gets resolved by the product owner, especially if:
- It affects the data model (a schema direction chosen in
  [architecture/organizations.md](../architecture/organizations.md) or
  [architecture/marketplace.md](../architecture/marketplace.md), for
  example).
- It closes off an alternative that a future engineer might otherwise
  reconsider and redo work on.
- It's the kind of decision root `CLAUDE.md`'s "Lessons Learned" section
  describes wanting to have been written down (e.g. "why did we choose
  X branch/environment for this migration").

Don't add one for routine implementation choices that don't foreclose
alternatives — this directory should stay small and high-signal.

## Format

```markdown
# ADR-NNNN: <short title>

Date: YYYY-MM-DD
Status: Accepted | Superseded by ADR-NNNN

## Context
What decision was needed and why (link back to the [DECISION REQUIRED]
tag in the relevant docs/ file that raised it).

## Decision
What was decided.

## Consequences
What this rules out, what it commits to, what follow-up work it implies.
```

## Current open decisions awaiting an ADR

None yet recorded. See
[MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md)'s "Unresolved decisions"
section for the full list of `[DECISION REQUIRED]` items scattered
across this documentation set — that section is the working queue this
directory drains from once the product owner resolves each one.
