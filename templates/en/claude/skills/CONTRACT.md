# intent-* Skill Shared Contract

The conventions that every `intent-*` skill follows. The scope is the whole set of skills whose names start with `intent-`, not an enumerated list (adding a skill does not require revising this contract; it applies as-is). They are aligned to the same skeleton as cc-sdd's `kiro-*` skills and coexist non-destructively.

## frontmatter (required fields)

```yaml
---
name: intent-<phase>            # Must start with intent-. Never collide with kiro-* (required for all skills)
description: <one-line summary>  # A description that makes clear when to use it (required for all skills)
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion  # (required for all skills)
argument-hint: <description of arguments>  # (required for all skills)
# disable-model-invocation: true  # Required only for canonical-writers (see below). Not placed on auto-invocable skills
---
```

- The required fields are the four `name` / `description` / `allowed-tools` / `argument-hint` (uniformly for all skills).
- **`disable-model-invocation: true` is required only for skills that rewrite canonical (canonical-writers)**. Skills that do not rewrite canonical — either read-only or with Write limited to a derived area `.intent/<area>/` (auto-invocable) — **do not place it** = the model may invoke them automatically from context.
  - The **decision axis for auto-invocability is "whether it rewrites canonical (the sources of truth such as intent-tree / intent-compass / the packets and plan.md under `.intent/packets/`)"**. If it does not rewrite canonical, it is auto-invocable (no `disable`); if it does, set `disable-model-invocation: true` to make it slash-invocation only.
  - This "auto-invocable" axis is **a different axis from the "read-only skills (narrowing `allowed-tools` to `Read, Glob, Grep`; only `intent-status` / `intent-validate`)"** in the frontmatter exceptions section below (do not conflate them). The read-only-skill axis is a discipline about narrowing allowed-tools, whereas the auto-invocable axis also includes `intent-overview` / `intent-from-spec` / `intent-to-spec`, which carry `Write` (they are auto-invocable because their Write is limited to a derived area and does not rewrite canonical). See the "read-only skills" note below for the detailed cross-reference.
  - **Skill classification (the source-of-truth enumeration that downstream references)**:
    - **auto-invocable (5)** = **do not place** `disable-model-invocation`: `intent-status` / `intent-validate` / `intent-overview` / `intent-from-spec` / `intent-to-spec`.
    - **canonical-writer (7)** = **require** `disable-model-invocation: true`: `intent-discover` / `intent-compass` / `intent-packets` / `intent-writeback` / `intent-improve` / `intent-export-cc-sdd` / `intent-export-openspec`.
    - This enumeration must stay consistent with the test's `AUTO_INVOCABLE_SKILLS` (`test/structure-pack.test.mjs`) (a brake against duplicated management). When changing the auto-invocable set, update this enumeration and that test together.
- `name` is `intent-*`. The directory name must match it too. Never collide with `kiro-*`.
- `allowed-tools` is **limited to planning-oriented tools**: `Read, Write, Glob, Grep, AskUserQuestion` (add `Agent` if needed).
  - Exception: only export skills (currently `intent-export-cc-sdd` to invoke `/kiro-spec-init`, and `intent-export-openspec` to invoke `/opsx:propose`) may add `Skill`. Invocation is limited to this single command per skill.
  - Exception (Bash, strictly limited): skills that run the staleness check (currently the gate checks in `intent-export-cc-sdd` / `intent-export-openspec` and the freshness warning in `intent-status`) may add `Bash` solely to launch the read-only script `node .intent/scripts/intent-check.mjs` and — for the export record of the export skills (`intent-export-cc-sdd` / `intent-export-openspec`) — to run the read-only `git rev-parse --short HEAD` (neither creates, modifies, nor deletes any files). No other Bash use is permitted to intent-* skills.
  - Exception: **read-only skills** (currently `intent-status` / `intent-validate`) narrow `allowed-tools` to **`Read, Glob, Grep`**. They carry neither `Write` nor the interactive-confirmation tool (`AskUserQuestion`). This is an intentional, permitted narrowing of the standard set. As an exception, under the Bash-limited exception above, `intent-status` may additionally use `Bash` solely to launch the read-only script `node .intent/scripts/intent-check.mjs` (the property of creating, modifying, and deleting no files is preserved; its `allowed-tools` becomes `Read, Glob, Grep, Bash`). `intent-validate` carries no Bash.
    - Note (a different terminology axis): this **"read-only skill" axis (allowed-tools narrowing; only `intent-status` / `intent-validate`)** and the **"auto-invocable" axis (does not rewrite canonical; the 5 skills that do not place `disable-model-invocation`)** in the frontmatter required-fields convention above are **different axes**. Auto-invocable also includes `intent-overview` / `intent-from-spec` / `intent-to-spec`, which carry `Write`, so the two sets do not coincide. Do not conflate them.

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
  - The scope of INV6 is "do not change application code", not "do not invoke other skills". The two are distinct concepts. `intent-export-cc-sdd` invoking `/kiro-spec-init` does not contradict INV6 (it touches no code).
- **Respect the mode (read fallback contract)**: resolve mode state in the order **the inherited issue directory's `discovery/<slug>-<rand>/mode.md` (A34; inherit the issue name that discover output) → otherwise the single `mode.local.md` (legacy) → otherwise old `mode.md` → otherwise the `standard` default** (backward-compatible fallback). Follow the mode definition in the definition file. When none is present, continue with `standard` as the default and add "mode undetermined; `/intent-discover` recommended" to the Open Questions (do not stop). Enforcement / Drift-watch (shared policy) are read from `mode.md` (not subject to this fallback contract). See `.intent/discovery/README.md` for the issue-directory scheme.
- **When a prior deliverable is missing**, do not fill the gap with guesses; guide the user to "run the corresponding command first" and stop (distinguish this from the absence of mode state).

## Question and Terminology Conventions

- **Self-contained questions**: every question or confirmation addressed to the user must be a self-contained sentence that can be answered without knowing the terminology. When a term is used, include a one-line explanation inside the question text itself (e.g., "Confirm whether the first packet (unit of work) is a walking skeleton (a minimal implementation that runs end to end from input to output)").
- **English terms + one-line explanations**: keep terms in English; do not replace them with translated coinages. When an explanation is needed, attach a one-line explanation that states the function or meaning (in parentheses or as a blockquote) at the first occurrence.
- **Do not invent coined terms**: do not invent new coined terms that are absent from the canonical vocabulary (the ubiquitous language already in use across the intent deliverables); reuse an existing term. If you must introduce a new term, attach a one-line explanation at its first occurrence.
- **Terms introduced in design docs must be identifiers; metaphor names in prose are written as plain descriptive words**: when introducing a term in design docs (SKILL.md / rules / convention docs / `.intent` deliverables), keep only cross-referenced identifiers (command names, frontmatter keys, file names, log values, glossary headings); do not coin metaphor names used only in prose (writer-coined words that do not even describe the function) — write them as plain descriptive words. Keep identifiers (deleting them breaks references) with a one-line explanation. Open metaphor names into plain language (so the reader can grasp the meaning without separately learning the word).

## State sharing across skills

- The shared state points are **the issue directory `discovery/<slug>-<rand>/mode.md`** (mode state: mode / designer-questions / purpose; local-only, git-ignored; read the single `mode.local.md` as legacy/fallback when absent) and **`mode.md`** (shared policy: Enforcement / Drift-watch; git-tracked) — two channels (do not create hidden sharing). The read fallback contract is consolidated in "Respect the mode" above.
- `.intent/deltas.md` is a **deliverable** just like the packet files under `.intent/packets/` (written by intent-writeback, read by intent-status / intent-improve); it is distinct from the mode-state sharing described above. It is not the introduction of new hidden sharing.
- **The role-lens (`lens:` line) reading contract**: the issue directory's `mode.md` may hold a `lens:` line recording the perspectives this case needs (e.g., deciding the product / managing progress / designing the experience / the case's specialist-domain perspective — **not a fixed list; plain-word free text**) and whether each is held by **a person or stood in for**. **Only intent-discover is the writer** (the same single-writer discipline as format/question-depth). Readers (compass / packets, etc.) read it read-only and route confirmations to the user accordingly: "direct a person perspective's questions to that person / for a stand-in perspective, present an inferred provisional answer and ask only for affirmation" — **the routing does not depend on the perspective's name** (it works on the person/stand-in distinction alone). Without the line, behave as before (backward compatible; do not fill in by guessing). **Whether such a person exists is kept only in the git-ignored issue directory and never transcribed into canonical files (intent-tree / compass / packets)** (do not put organizational information into shared artifacts).

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
