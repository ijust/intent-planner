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
