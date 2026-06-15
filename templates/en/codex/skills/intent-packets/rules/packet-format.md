# Packet file format

The **single canonical source** for the packet file format, ID rule, state transitions, and the index regeneration procedure (`.intent/packets/active/<packet_id>.md` and `.intent/packets/archive/<year>/<packet_id>.md`). Skills that create, update, or move packets — and skills that read packets — follow these rules.

## Frontmatter schema (10 fixed keys)

Each packet file starts with a YAML frontmatter (`---` delimited). The keys are **fixed to these 10**: `packet_id` / `name` / `state` / `created_at` / `closed_at` / `parent_intents` / `spec_refs` / `superseded_by` / `summary` / `depends_on`.

```yaml
---
packet_id: pkt-20260612-auth-session   # Immutable. Matches the file name. For packet-to-packet references only
name: "Auth session cleanup"           # Canonical packet name. Matching key for export-log / Source Packet / deltas / slug derivation
state: implementing                    # draft | ready | implementing | verifying | done
created_at: 2026-06-12T05:00:00Z       # Creation timestamp (ISO 8601)
closed_at: ""                          # Filled in when done (date). Leave empty if unknown at migration
parent_intents: [L1-2, L2-3]           # References into the tree
spec_refs: []                          # Finalized at writeback completion
superseded_by: ""                      # Successor packet_id when superseded
summary: "Clean up auth sessions"      # Source of the one-line summary in the index
depends_on: []                         # List of packet_ids this packet depends on (default []). For packet-to-packet references only
---
```

- `state` takes one of 5 values: `draft | ready | implementing | verifying | done` (see "State value domain"). Superseded is **not a state** but a separate axis expressed by filling in `superseded_by` (see "State transitions and placement").
- `depends_on` is a list of the `packet_id`s of the packets this packet depends on (default `[]`). Like `superseded_by`, **packet-to-packet references use `packet_id`** (never `name`). It holds only dependencies declared by a human; tools do not infer or compute dependencies.
- **Keep undetermined keys with empty values** (never omit the key itself — for determinism of index regeneration and checks). `depends_on` keeps `[]` even when there are no dependencies; do not omit the key.
- **Summary maintenance norm**: a skill that updates a packet's body must also keep the frontmatter `summary` in sync.

## How name and packet_id are used

- **`name` is the canonical packet name (the matching key)**. The export-log `| packet |` column, the `## Source Packet` heading of cc-sdd drafts, the Delta headings in deltas, and the cc-sdd slug derivation all use `name`. Never use `packet_id` for any of these.
- **`packet_id` is reserved for the file name (`<packet_id>.md`) and packet-to-packet references such as `superseded_by`**.

### Mutability of name

- After the first export (the moment a row lands in the export-log), `name` is **immutable**. Treat a rename as a supersede (create a successor packet + replace the old packet).
- Renaming before export is allowed as a differential update (even then, `packet_id` and the file name do not change).

### Resolving a name to a file

1. Match the `name` column of `index.md`, or the frontmatter `name` under `active/`, to identify the file.
2. If it is not in `active/`, reference `archive/` **explicitly** (an explicit exception to the principle "archive/ is normally not read").

## ID rule

- Format: `pkt-<YYYYMMDD>-<slug>`. The date part is the **creation date** (obtained via the shell).
- The slug is derived from `name` by the rule in the next subsection. The next subsection is a **verbatim copy** of map-cc-sdd (the slug rule of the cc-sdd export); when changing it, revise both at the same time (the cc-sdd output directory name is derived from the same `name` by the same rule, so the two coincide).

### Slug rule (deterministic)

Derive the directory name (slug) from the packet name **deterministically** in the following order. The same packet name always yields the same slug.

1. Apply NFC normalization.
2. Trim leading/trailing whitespace.
3. Lowercase ASCII uppercase letters.
4. Replace whitespace and path-dangerous characters (`/ \ : * ? " < > |`) with `-`.
5. Collapse consecutive `-` into one.
6. Strip leading/trailing `-`.

- Non-ASCII characters (Japanese etc.) are preserved as-is.
- If the result is an empty string, use `unnamed-packet` as the slug and notify the user.

### Same-day collision

- When creating a **different packet** whose slug collides on the same day (same `YYYYMMDD`), assign an alternative ID with a numbered suffix starting at `-2`, and notify the user of the packet-name → ID mapping. Never silently overwrite.
- `packet_id` and the file name (`<packet_id>.md`) are **immutable** (they do not change on rename, state change, or move).

## State value domain

`state` is one of 5 values distinguishing the stage of progress. The values are mutually exclusive, and a packet is in exactly one stage. State is a **declarative state record**, not a management mechanism (state machine) with transition rules, guards, or automatic progression.

| state | Meaning | Placement | Evidence | depends_on |
|-------|---------|-----------|----------|------------|
| `draft` | Drafting / undetermined | `active/` | Not required | Optional |
| `ready` | Ready to start (dependencies resolved, awaiting implementation) | `active/` | Not required | Declaring it presumes all dependencies are `done` |
| `implementing` | Under implementation | `active/` | Provisional in-progress records allowed | — |
| `verifying` | Implemented, awaiting verification (Evidence undetermined) | `active/` | Being collected (mark as undetermined) | — |
| `done` | Evidence obtained / complete | `archive/<year>/` | **Presumed finalized** | — |

- The only terminal value is `done`. Finalizing `state=done` presupposes that the `## Evidence` section has finalized verification results (a declarative order of "human/check confirms → record → done", not an automatic transition).
- Changes to the stage of progress are recorded declaratively, and their finalization rests on a human or a check gate (not finalized by AI self-report alone).

### Backward-compatible migration (from the old `draft | active | done`)

| Old state | New state | Rationale |
|-----------|-----------|-----------|
| `draft` | `draft` | Same |
| `active` | `implementing` | Safe-side default for a started packet (loses the least information; can later be re-declared `ready`/`verifying`) |
| `done` | `done` | Same |

- Why `active → implementing` is the default: the old `active` covered both "started" and "ready to start", so we err on the safe side (treat as in progress) to prevent "treated as done while not finished".
- Migration is **presented as a differential update proposal** and recorded after user confirmation. It does not destroy or delete existing packets (**move only**).
- **Handling missing `depends_on`/`## Evidence`**: even if an existing packet lacks the `depends_on` key or the `## Evidence` section, do not force an immediate bulk migration. The reader treats absent `depends_on` as "no dependencies (equivalent to the empty set)" and absent `Evidence` as "unfilled" (do not fill in by guessing). The next create/update flow that touches the packet appends `depends_on: []` as a differential edit (non-destructive lazy completion).

## State transitions and placement

- Superseded is **not a state** but a separate axis: fill in `superseded_by` with the successor `packet_id`, not the state.
- Placement mapping:
  - `draft | ready | implementing | verifying` → `active/`
  - `done` or `superseded_by` filled in → `archive/<year>/`
- Writing the state and moving the file are one combined operation (never leave a done packet lingering in `active/`; lingering is subject to status's integrity checks).
- **No deletion**: packet files are only moved, never deleted.

## Body section structure

Right after the frontmatter, place a `# <name>` heading (recommended), followed by the sections below (inheriting the structure of the current packet definition section).

- `## Parent Intent` — The L0 / L1 / L2 / L3 this packet supports.
- `## Why` — Why this packet is needed.
- `## Scope` — What is included.
- `## Non-scope` — What is not included.
- `## Expected Behavior` — The behavior observable after completion.
- `## Safety / Invariants` — The constraints to uphold. **The canonical source of packet-specific invariants** (never write them into the compass; the compass holds only project-universal invariants).
- `## Validation` — How to verify (**plan**). Tests, manual check, log check, type checking, etc.
- `## Evidence` — What was verified (**result**). Place it right after `Validation` (plan) and before `Rollback`. Each entry can include "the verified result, the date performed, the corresponding check-axis ID (the stable kebab-case ID in `validate-checks.md`), and the source (intent-validate / drift-watch / human confirmation)".
- `## Rollback` — How to revert on failure.
- `## cc-sdd Mapping` — How to convert this packet into cc-sdd's requirements / design / tasks.

### Distinguishing `## Validation` (plan) and `## Evidence` (result)

`Validation` is "how it is intended to be verified (plan)", and `Evidence` is "the actual result of verification (reality)"; the two are **not mixed**.

```markdown
## Evidence
- 2026-06-15 — `unit: auth-session expiry test` green / `invariant-conflict` not applicable
  - Check axes: invariant-conflict, l3-intent-mismatch
  - Source: intent-validate (human confirmation: NN)
```

- Each entry can include the verified result, the date performed, the check-axis ID (kebab-case), and the source.
- If there is no result, **keep an empty section** and do not fill in unfilled entries by guessing.
- Evidence is recorded based on check results (intent-validate / drift-watch) or human confirmation rather than AI self-report, in a form whose source can be traced.
- **`state=done` presupposes that Evidence has finalized verification results** (done with empty Evidence is a contradictory state).

## index.md regeneration procedure

`.intent/packets/index.md` is a generated artifact and must not be hand-edited. A skill that changed the canonical (anything under packets/) regenerates it at the end of its run by the following procedure.

1. Read **only the frontmatter** of every packet file under `active/` (do not read the bodies — deterministic).
2. Build the `| packet_id | name | state | summary |` table in **ascending** `packet_id` order (`depends_on` is not emitted as an index column — for determinism and to avoid table bloat; the read-only side reads `depends_on` directly from the `active/` frontmatter).
3. If `active/` is empty (or absent), the canonical form is the table with the header only.

## Read-only consumer contract

Read-only skills such as intent-status / intent-overview **only read** the following interfaces defined by this canonical source, and do not modify the packet canonical.

- **`state` (5-value domain)**: `draft | ready | implementing | verifying | done`. Used to judge the stage of progress.
- **`depends_on` (list of packet_ids)**: blocked status is derived read-only as "there is a packet in `depends_on` that is not `done` = blocked". The derived result is not written back to the packet. It does not auto-launch the next step or auto-determine ordering based on dependencies.
- **`## Evidence` section**: verified results, date performed, check-axis ID, source. Material for the "degree of finalization of evidence" in progress.

**Backward-compatible reading discipline (do not fill in by guessing)**:
- Absent `depends_on` → read as "no dependencies (empty set)".
- Absent/empty `## Evidence` → make it explicit as "unfilled / unobserved" and do not complete it.
- Old `state: active` → read as "in progress (equivalent to `implementing`)".
- When a new field or new section is unfilled or absent, make that location explicit as "unfilled / unobserved".
