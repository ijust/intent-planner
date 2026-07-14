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

## Showing active side / archive split (two layers of the reading view; derived, machine-generated)

The append-only records (deltas / export-log / drift-log / compass-archive) are divided by the split into an **active side (the thin current projection) and archive (history)**. The overview reading view presents these two layers **shown split** (the derived machine generation of INV25-(1) / DR33; it creates no new canonical file and modifies no source of truth, read-only).

| Layer | What to read | Treatment in the reading view |
|---|---|---|
| **Active side** | directly under each record's split dir `.intent/<rec>/*.md` (source of truth if present; natural-key ascending) / else old `.intent/<rec>.md` (generated mirror) | Present thinly as the "current" section (the current projection). When the split form and the old mirror coexist, treat the split form as the source of truth and do not double-count the mirror |
| **Archive (history)** | files under each record's `.intent/<rec>/archive/` (e.g. `deltas/archive/<year>/`; compass-archive is per-rule) | Present as a "history" section in a **separate frame** from the active side. Do not mix it into the active tally (pending learnings, latest export, etc.) |

- The split view is a **derived machine generation**; it does not add a new canonical file (writes go only under `.intent/overview/`; the source of truth is read-only). In environments where `archive/` is absent, omit the "history" section (do not error).
- In environments with only the old single-file format (split / archive not yet deployed), read the active side from the old mirror and omit the "history" section with a note that history is delegated to git history (backward compatible; do not fill in by guessing).

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

## Source material for the agent understanding map (optional view)

When the user asks for an "understanding map", "agent understanding map", or to fill gaps in the agent's understanding of intent, `.intent/overview/agent-understanding-map.md` may be generated as a derived view. This is an auxiliary overview view and never writes to any canonical `.intent/*.md`.

Limit reads to the following.

| Map section | Source material to read | How to write it |
|---|---|---|
| North Star / non-goals | `## North Star` / `## Anti-direction` in `.intent/intent-compass.md` | List the decision ceiling and forbidden lines briefly. Do not fill by guessing |
| Current hierarchy map | `## L0`–`## L4` in `.intent/intent-tree.md` | Summarize in L0→L4 order; split L4 candidates into packeted / not-yet-packeted |
| Major capability / architecture axes | IDs and headings such as `C31 / C38` / `A48-A49` that actually appear in intent-tree / compass | Include only IDs that exist; otherwise write "not observed" |
| Active packet side | `.intent/packets/index.md` and frontmatter from `.intent/packets/active/*.md` | Show `state` / `depends_on` / `spec_refs` / `updated_at` as grounds. Do not copy packet bodies wholesale |
| Known understanding gaps | `## Open Questions` / `## Assumptions` / Questions- or Deferred-like headings in active packets | Keep canonical and inferred separate, and write gaps as candidates |

- The map is a derived artifact showing "what the agent has understood"; it does not append understanding gaps to canonical Open Questions.
- State the source file for each section, either at the end of the section or in a footnote. Any understanding without evidence is isolated as `inferred` and never mixed with canonical material.
- Use IDs such as `C31 / C38` / `A48-A49` as headings only when they actually exist in the files read. Do not invent missing IDs.

## Cross-packet shared-contract view (only when applicable)

- Only when Impact Analysis explicitly marks a shared-contract source reference, add `shared contract | protecting packet | Safety reference | integration oracle | status` read-only to the packet face of the existing overview and `.intent/overview/agent-understanding-map.md`. When there is no shared contract, emit no section, empty table, or warning.
- Group the `## Safety / Invariants` of active packets and the thin mapping in `.intent/packets/plan.md` by identical source reference. Do not merge different source references merely because their prose is similar.
- Mark a contract `unassigned` when no packet protects it, name both packets and mark `conflict` only when their protections or oracles cannot coexist, and mark `integration not verified` when the integration oracle is missing. Multiple protecting packets alone are not a conflict.
- If `.intent/overview/coverage-map.md` already exists, reference it for code-area coverage rather than reimplementing its three-face comparison. Create neither a new shared-contract output file nor a canonical source.

## Handling of missing / blank artifacts

- When an aggregation-target artifact is blank or partial, mark the relevant part explicitly as **"not filled in"**. Do not fill in by guessing (R2.5).
- When a source file itself is absent, state that absence explicitly and guide the user to the skill that should be run first (do not write).

## Output discipline

- Place canonical intent (tree L0–L4 / compass 4 sections / packets / plan / export-log / deltas) and inferred intent (from recovery) side by side, **kept distinct**.
- State that the generated view is **derived / re-generatable** and not the canonical source. Never write back to the canonical.
