# intent-* Skill Shared Contract

The conventions that every `intent-*` skill follows. The scope is the whole set of skills whose names start with `intent-`, not an enumerated list (adding a skill does not require revising this contract; it applies as-is). They are aligned to the same skeleton as cc-sdd's `kiro-*` skills and coexist non-destructively.

## frontmatter (required fields)

```yaml
---
name: intent-<phase>            # Must start with intent-. Never collide with kiro-*
description: <one-line summary>  # A description that makes clear when to use it
---
```

- `name` is `intent-*`. The directory name must match it too. Never collide with `kiro-*`.
- The frontmatter is limited to **`name` / `description` only** (the Codex minimal-frontmatter convention). Do not place `allowed-tools` / `argument-hint` / `disable-model-invocation`.
  - Note: on the claude side too, `disable-model-invocation` is not uniform across all skills — it is a conditional field placed only on skills that rewrite canonical (canonical-writers) (see the claude CONTRACT). The Codex side, regardless of that condition and regardless of skill classification, places none of the three fields (the minimal-frontmatter convention).
  - Tool limitations (restricting to planning-oriented tools, not changing application code, etc.) are expressed in the body and the "Shared constraints" below, not in the frontmatter.
  - **Gemini CLI also shares this minimal-frontmatter tree.** Gemini CLI reads `.agents/skills/` as Agent Skills and injects `name` + `description` via progressive disclosure at startup, so the Codex minimal-frontmatter convention fits as-is. The gemini entry in `AGENT_REGISTRY` uses `skillSubdir: "codex"` (sharing the `.agents/skills` destination with Codex); no gemini-specific skill tree is created (verified by real-machine smoke that the shared tree is read — gemini-cli-support).

## Body structure

Align to the cc-sdd style.

```
# <skill-name> Skill

## Core Mission
- Success Criteria: ...

## Execution Steps
### Step 1: ...   (Read and apply rules/*.md as needed)
### Step 2: ...

## Output Description
- The generated update proposal
- Open Questions that the human should review
- The command to run next

## Safety & Fallback
- Behavior on error / missing prerequisites
```

## Shared constraints

- **Output is fundamentally a "proposed update"**. Writing to `.intent/` is allowed.
- **Do not change application code** (INV6).
  - The scope of INV6 is "do not change application code", not "do not invoke other skills". The two are distinct concepts. `intent-export-cc-sdd` invoking `/kiro-spec-init` and `intent-export-openspec` invoking `/opsx:propose` do not contradict INV6 (they touch no code).
- **Respect the mode (read fallback contract)**: resolve mode state in the order **`mode.local.md` → otherwise old `mode.md` → otherwise the `standard` default** (backward-compatible fallback). Follow the mode definition in the definition file. When neither `mode.local.md` nor old `mode.md` is present, continue with `standard` as the default and add "mode undetermined; `/intent-discover` recommended" to the Open Questions (do not stop). Enforcement / Drift-watch (shared policy) are read from `mode.md` (not subject to this fallback contract).
- **When a prior deliverable is missing**, do not fill the gap with guesses; guide the user to "run the corresponding command first" and stop (distinguish this from the absence of mode state).
- **Confirm with the user in natural language**: present the recommendation, ask the user in natural language, and wait for their answer. Do not depend on a dedicated tool.
- **Bash (shell execution) is not used as a rule. Strictly limited exception**: skills that run the staleness check (currently the gate checks in `intent-export-cc-sdd` / `intent-export-openspec` and the freshness warning in `intent-status`) may use Bash solely to launch the read-only script `node .intent/scripts/intent-check.mjs` and — for the export record of the export skills (`intent-export-cc-sdd` / `intent-export-openspec`) — to run the read-only `git rev-parse --short HEAD` (neither creates, modifies, nor deletes any files). No other Bash use is permitted to intent-* skills.
- **Read-only skills** (currently `intent-status` / `intent-validate`) perform reading and reporting only: they do not write, and they do not run interactive confirmation with the user (natural-language reporting only). This is an intentional, permitted narrowing of the standard conventions. As an exception, under the Bash-limited exception above, `intent-status` may additionally use Bash solely to launch the read-only script `node .intent/scripts/intent-check.mjs` (the property of creating, modifying, and deleting no files is preserved). `intent-validate` carries no Bash.

## Question and Terminology Conventions

- **Self-contained questions**: every question or confirmation addressed to the user must be a self-contained sentence that can be answered without knowing the terminology. When a term is used, include a one-line explanation inside the question text itself (e.g., "Confirm with the user whether the first packet (unit of work) is a walking skeleton (a minimal implementation that runs end to end from input to output)").
- **English terms + one-line explanations**: keep terms in English; do not replace them with translated coinages. When an explanation is needed, attach a one-line explanation that states the function or meaning (in parentheses or as a blockquote) at the first occurrence.
- **Do not invent coined terms**: do not invent new coined terms that are absent from the canonical vocabulary (the ubiquitous language already in use across the intent deliverables); reuse an existing term. If you must introduce a new term, attach a one-line explanation at its first occurrence.

## State sharing across skills

- The shared state points are **`mode.local.md`** (mode state: mode / designer-questions / purpose; local-only, git-ignored) and **`mode.md`** (shared policy: Enforcement / Drift-watch; git-tracked) — two files (do not create hidden sharing). The read fallback contract is consolidated in "Respect the mode" above.
- `.intent/deltas.md` is a **deliverable** just like the packet files under `.intent/packets/` (written by intent-writeback, read by intent-status / intent-improve); it is distinct from the mode-state sharing described above. It is not the introduction of new hidden sharing.

### Split and archive convention for append-only records

The append-only single-Markdown records under `.intent/` (deltas / export-log / drift-log / milestones / compass-archive and the like — records of the same shape, where writers append at the end and readers read the whole file) collide on a single anchor (the end of the file) under concurrent appends and grow unbounded. To resolve this structurally, append-only records take a physical form that follows the conventions below (this is the single source of truth for the convention).

1. **Separate the active surface (the current projection) from history (archive)**. Keep the currently-referenced records thin on the active surface, and move terminal (no-longer-updated) entries off to archive.
2. **The split key has two classifications**. Records stop appending to the end of a single file and are instead written to small files split by a non-colliding natural key. The classification is decided by the record's origin: **packet-origin = a file per packet** (e.g. `deltas/<packet-slug>.md`) / **event-origin = a file per date+slug** (e.g. `drift-log/<date>-<slug>.md`). Because a different packet / different event touches a different file, end-of-file collisions disappear in principle.
3. **Do not use sequential numbering; use date+slug**. Do not use a central-counter sequence such as `0001` in file names (concurrent sessions cannot see each other's numbering and so cannot avoid collisions). Use date+slug instead.
4. **Archive eviction follows the existing `archive/<year>/` structure**. Move terminal entries off to `archive/<year>/` (a per-year directory; the precedent that packets already have) under the record directory, keeping the active surface thin. Do not invent a new eviction naming scheme.
5. **Do not use merge=union for records whose order is load-bearing**. `merge=union` (erasing conflict markers via gitattributes) silently breaks order, so do not use it for records where entry order carries meaning. Collisions are eliminated structurally by the split (convention 2).

- **Naming of the split key references the existing packet slug rule and does not redefine a new numbering scheme**. The deterministic slug derivation (NFC normalization → trim → lowercase → dangerous characters to `-` → collapse consecutive `-` → strip leading/trailing `-` → preserve non-ASCII) and the date part (the drafting date) have their single source of truth in the slug rule of `intent-packets/rules/packet-format.md`; the split key need only reference it (do not bring in new numbering logic or a central counter).
- The content of records (each record's entry format, fixed key order, etc.) is out of scope of this convention; split and archive govern placement only (content is kept behavior-preserving).
- **Placement for the five record files (where convention 2 applies)**: apply the classification above to all five files. **packet-origin** = `deltas/<packet-slug>.md` / `export-log/<packet-slug>.md` (a file per packet). **event-origin** = `drift-log/<date>-<slug>.md` / `milestones/<date>-<event-slug>.md` (a file per date+slug). **compass-archive is per superseded Decision Rule (rule-unit)** = `compass-archive/<rule-slug>.md` (re-superseding the same rule goes to the same file). Until reader cross-following is complete, keep the old `export-log.md` as a generated active mirror (split files concatenated in `exported_at` order; derived, never hand-edited) alongside the split files, regenerated by the writer on every export.
