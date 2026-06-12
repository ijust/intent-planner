# Packet file format

The **single canonical source** for the packet file format, ID rule, state transitions, and the index regeneration procedure (`.intent/packets/active/<packet_id>.md` and `.intent/packets/archive/<year>/<packet_id>.md`). Skills that create, update, or move packets — and skills that read packets — follow these rules.

## Frontmatter schema (9 fixed keys)

Each packet file starts with a YAML frontmatter (`---` delimited). The keys are **fixed to these 9**: `packet_id` / `name` / `state` / `created_at` / `closed_at` / `parent_intents` / `spec_refs` / `superseded_by` / `summary`.

```yaml
---
packet_id: pkt-20260612-auth-session   # Immutable. Matches the file name. For packet-to-packet references only
name: "Auth session cleanup"           # Canonical packet name. Matching key for export-log / Source Packet / deltas / slug derivation
state: active                          # draft | active | done
created_at: 2026-06-12T05:00:00Z       # Creation timestamp (ISO 8601)
closed_at: ""                          # Filled in when done (date). Leave empty if unknown at migration
parent_intents: [L1-2, L2-3]           # References into the tree
spec_refs: []                          # Finalized at writeback completion
superseded_by: ""                      # Successor packet_id when superseded
summary: "Clean up auth sessions"      # Source of the one-line summary in the index
---
```

- `state` takes exactly 3 values: `draft | active | done`. Superseded is **not a state** but a separate axis expressed by filling in `superseded_by` (see "State transitions and placement").
- **Keep undetermined keys with empty values** (never omit the key itself — for determinism of index regeneration and checks).
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

## State transitions and placement

- State transitions: `draft → active → done`. Superseded is a **separate axis**: fill in `superseded_by` with the successor `packet_id`, not the state.
- Placement mapping:
  - `draft | active` → `active/`
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
- `## Validation` — How to verify. Tests, manual check, log check, type checking, etc.
- `## Rollback` — How to revert on failure.
- `## cc-sdd Mapping` — How to convert this packet into cc-sdd's requirements / design / tasks.

## index.md regeneration procedure

`.intent/packets/index.md` is a generated artifact and must not be hand-edited. A skill that changed the canonical (anything under packets/) regenerates it at the end of its run by the following procedure.

1. Read **only the frontmatter** of every packet file under `active/` (do not read the bodies — deterministic).
2. Build the `| packet_id | name | state | summary |` table in **ascending** `packet_id` order.
3. If `active/` is empty (or absent), the canonical form is the table with the header only.
