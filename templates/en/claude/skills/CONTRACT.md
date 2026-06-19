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
- **Respect the mode (read fallback contract)**: resolve mode state in the order **`mode.local.md` → otherwise old `mode.md` → otherwise the `standard` default** (backward-compatible fallback). Follow the mode definition in the definition file. When neither `mode.local.md` nor old `mode.md` is present, continue with `standard` as the default and add "mode undetermined; `/intent-discover` recommended" to the Open Questions (do not stop). Enforcement / Drift-watch (shared policy) are read from `mode.md` (not subject to this fallback contract).
- **When a prior deliverable is missing**, do not fill the gap with guesses; guide the user to "run the corresponding command first" and stop (distinguish this from the absence of mode state).

## Question and Terminology Conventions

- **Self-contained questions**: every question or confirmation addressed to the user must be a self-contained sentence that can be answered without knowing the terminology. When a term is used, include a one-line explanation inside the question text itself (e.g., "Confirm whether the first packet (unit of work) is a walking skeleton (a minimal implementation that runs end to end from input to output)").
- **English terms + one-line explanations**: keep terms in English; do not replace them with translated coinages. When an explanation is needed, attach a one-line explanation that states the function or meaning (in parentheses or as a blockquote) at the first occurrence.
- **Do not invent coined terms**: do not invent new coined terms that are absent from the canonical vocabulary (the ubiquitous language already in use across the intent deliverables); reuse an existing term. If you must introduce a new term, attach a one-line explanation at its first occurrence.

## State sharing across skills

- The shared state points are **`mode.local.md`** (mode state: mode / designer-questions / purpose; local-only, git-ignored) and **`mode.md`** (shared policy: Enforcement / Drift-watch; git-tracked) — two files (do not create hidden sharing). The read fallback contract is consolidated in "Respect the mode" above.
- `.intent/deltas.md` is a **deliverable** just like the packet files under `.intent/packets/` (written by intent-writeback, read by intent-status / intent-improve); it is distinct from the mode-state sharing described above. It is not the introduction of new hidden sharing.
