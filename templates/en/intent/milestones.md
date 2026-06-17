# Milestones

> Record project milestone events ("production setup finalized", "exposed as a public API", etc.) by appending one row each. The only writer is the user; the readers are `/intent-improve` (matching each event against the Decision Rules' `Revisit when`) and `/intent-status` (showing unaddressed milestones as remaining work). It holds no decisions, learnings, or state — it is solely for recording milestone events.

## How this file operates

- **append-only**: rows are appended only. Never rewrite or delete a past row (to avoid creating an asymmetry in the world-line anchor).
- **the user fills it in declaratively**: milestone events are entered by hand by the user. This file does no automatic detection (the user is the one who records).
- **how readers use it**: `/intent-improve` matches each `event` against the `Revisit when` field of every Decision Rule via substring containment and raises matched Rules into the revisit re-proposal list. `/intent-status` notes any milestone that has been recorded but whose corresponding revisit is still unaddressed as remaining work. Both are read-only matches and never rewrite the compass automatically.

## How to fill it in

- **event**: a natural-language string matched against a Decision Rule's `Revisit when` via substring containment. Too short a string over-matches, so write a sufficiently specific natural-language phrase that makes clear which milestone was finalized (e.g., "production setup finalized on AWS ECS").
- **recorded_at**: written in ISO 8601 (e.g., `2026-06-18`).
- **note**: an optional remark (use `-` if not needed).

| event | recorded_at | note |
|---|---|---|
<!-- Example row (this comment line is not included in the real table):
| production setup finalized on AWS ECS | 2026-06-18 | infra direction finalized at the dev offsite |
-->
