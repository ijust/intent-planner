# Intent Document Aggregation Procedure (read-only, derived re-generation)

The canonical source for how the `intent-overview` skill aggregates and formats scattered `.intent/` intent artifacts into a single read-through view. SKILL.md holds only the procedure and reporting format; "what to read from which heading/column, and how to order it" refers to this document. This rule is **read-only** and never modifies the canonical `.intent/*.md` (writes go only under `.intent/overview/`). It does not re-implement the recovery / validation / drift decision logic — it only reads the outputs those layers leave behind.

## Aggregation targets and exact references (fixed)

The headings and column names of each artifact are fixed in the table below (if they change, this rule must follow — i.e. a Revalidation Trigger). Canonical descriptions and inferred (guessed) descriptions are presented separately and never mixed.

| Source | File to read | Exact heading/column (fixed) | Handling in the view |
|---|---|---|---|
| Intent tree | `.intent/intent-tree.md` | `## L0`–`## L4` (hierarchy body) + `## Assumptions` (+ `## Open Questions` if present) | Format L0–L4 as canonical. Assumptions / Open Questions go in a separate frame as inferred |
| Compass | `.intent/intent-compass.md` | `## North Star` / `## Anti-direction` / `## Invariants` / `## Decision Rules` | Format the 4 sections as-is into a read-through |
| Packet index | `.intent/packets/index.md` | columns `packet_id \| name \| state \| summary` | Aggregate the index table. Show each packet's state alongside |
| Packet body | `.intent/packets/active/*.md` | frontmatter 10 keys (including `depends_on`) + body `## Evidence` section | Read frontmatter and Evidence, tie them to the progress / dependency / evidence context |
| Plan | `.intent/packets/plan.md` | `## Walking Skeleton` / `## Recommended First Packet` / `## Deferred` | Present as the "next-step context" of the packet aggregation |
| Export history | split form `.intent/export-log/*.md` (source of truth if present; `exported_at` ascending) / else old `.intent/export-log.md` (generated mirror) | columns `packet \| exported_at \| commit` | Present as an export history timeline (readable even when split) |
| Learnings (deltas) | split form `.intent/deltas/*.md` (if present) + old `.intent/deltas.md` (when coexisting) | `Status` + learning tags | Tie to the packet aggregation as pending learnings (readable even when split) |

## Packet frontmatter and state value domain (fixed)

- Frontmatter has **10 keys** (including `depends_on`). `depends_on` is a set of packet_ids (dependencies).
- `state` is one of **5 values**: `draft | ready | implementing | verifying | done`.
- The packet body's `## Evidence` section contains verification results and check-axis IDs (kebab-case).

## Backward compatibility (reading the legacy schema)

Read backward-compatibly even in environments where the new schema (10 keys, 5 values) is not yet deployed. Do not fill in missing parts by guessing.

| Observed state | How to read it |
|---|---|
| `depends_on` is absent | Read as "no dependencies (empty set)" |
| `## Evidence` section is absent | Read as "not filled in" |
| Legacy 3-value state (`draft \| active \| done`) remains | Read `active` as "in progress (≈implementing)". `draft` / `done` stay as-is |

## Handling of inferred (reverse-inference) — delegated, read-only

- This rule does **not** independently perform intent reverse-inference from code. No AST traversal, no static analysis, no external scanner (INV2 / R4.4).
- It **reads** the inferred intent that refactor-mode `algo-intent-recovery` left in the intent-tree (originating from `## Assumptions` / `## Open Questions`), marks it explicitly as inferred, and presents it separated from the canonical L0–L4 body (R4.1 / R4.3 / R2.4).
- **When reverse-inference has not been obtained** (refactor-mode discover not run, and no inferred in `## Assumptions`): state that absence explicitly and guide the user to run refactor-mode discover including `algo-intent-recovery`. Do not fill in by guessing (R4.2).

## Handling of missing / blank artifacts

- When an aggregation-target artifact is blank or partial, mark the relevant part explicitly as **"not filled in"**. Do not fill in by guessing (R2.5).
- When a source file itself is absent, state that absence explicitly and guide the user to the skill that should be run first (do not write).

## Output discipline

- Place canonical intent (tree L0–L4 / compass 4 sections / packets / plan / export-log / deltas) and inferred intent (from recovery) side by side, **kept distinct**.
- State that the generated view is **derived / re-generatable** and not the canonical source. Never write back to the canonical.
