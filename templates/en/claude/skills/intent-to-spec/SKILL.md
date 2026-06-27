---
name: intent-to-spec
description: Outward generation skill that reads Intent, steering, and packets within a given scope read-only and maps them into a single readable natural-language Spec under `.intent/nl-spec/` in the given format.
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion
argument-hint: <source scope / format> (the scope hint and the layout. If no format is specified, the default is used and which format the output was generated in is stated explicitly.)
---

# intent-to-spec Skill

## Core Mission
- **Success Criteria**:
  - Reads, read-only, only the `.intent/` artifacts within the user-specified scope (source scope: Intent subtree / packet group / steering constraints / cross-cutting requirements) as source material, and binds the three layers (the Intent's why / invariants / decision rules / steering-grade constraints / requirements' individual demands) across them (R1.1 / R1.2)
  - When the source scope is ambiguous, or the corresponding artifact is absent, generates no natural-language Spec and stops, showing the user what is ambiguous (the available scope) or which artifact is missing (the relevant skill to prepare it) (R1.3)
  - Treats the projection sources (intent-tree / compass / packets / steering) read-only, and does not create, modify, or delete them (R1.4)
  - Composes the natural-language Spec per the specified target format (the why-fronted upstream layout / the requirements-crossing integrated spec / their middle), and when no format is specified, uses the default and states explicitly in the output which format it was generated in (R2.1 / R2.4)
  - Satisfies trace assignment, inferred marking, invariant preservation, and the supplemented-places list (done in Step 4; R3.1 / R3.2 / R3.3 / R3.4)
  - Outputs the artifact as derived (regenerable) under `.intent/nl-spec/` by full replacement, and never creates, modifies, or deletes any canonical artifact (intent-tree / compass / packets). States at the top of the output that it is derived / regenerable / not the source of truth (R4.1 / R4.2 / R4.3)
  - Does not modify application code in the intent-planning phase (R4.4). Follows the `intent-*` naming convention, does not modify external spec tools or the kiro-* development environment, does not call `map-cc-sdd.md`, and does not change the behavior of `/intent-export-cc-sdd` (R5.5)

## Execution Steps

### Step 1: Source interpretation (confirm the scope; do not generate if ambiguous/absent)
- When the user runs `/intent-to-spec`, first interpret the argument's scope hint and format specification per `rules/source-scope.md`. For any axis the arguments alone do not uniquely determine, ask the user via `AskUserQuestion` and wait for the answer before confirming (do not fill in by guessing).
- **No-generation gate (fail-fast. R1.3)**: when the source scope is ambiguous (no axis is uniquely determined by arguments or dialogue) or the corresponding artifact is absent (the specified intent-tree / compass / packet / steering does not exist or is unfilled), generate **no** natural-language Spec and write nothing under `.intent/nl-spec/`. Name and present what is ambiguous (the available scope: existing subtrees, packet list, presence of steering) or the missing artifact (the relevant skill to prepare it: discover / compass / packets, etc.), and stop.
- Once the scope is confirmed, proceed to Step 2.

### Step 2: Three-layer read (read the three layers read-only)
- Per the "three-layer read (exact, fixed references)" table in `rules/source-scope.md`, read the three layers across the confirmed scope read-only.
- Bind, as source material for a single document, the Intent's why / invariants / decision rules (`.intent/intent-tree.md`'s L0–L4 / `.intent/intent-compass.md`'s North Star, Invariants, Anti-direction, Decision Rules), the steering-grade constraints (only when specified, tech.md, etc.), and the requirements' individual demands (`.intent/packets/index.md` + `.intent/packets/active/*.md`).
- Hold canonical-derived material and inferred-derived material (intent-tree's Assumptions / Open Questions) distinct from the reading stage, and never mix them. Do not read out-of-scope artifacts. Treat the projection sources read-only and do not modify them (R1.4).

### Step 3: Target-format mapping (when defaulting, state the format explicitly)
- Per the confirmed target format, map the three-layer material bound by Step 2 — keeping the provenance of which layer / which heading / which packet it came from — into a single natural-language Spec.
- For the **upstream layout (why-fronted)**, delegate to `rules/format-upstream.md`; for the **integrated spec (requirements-crossing)**, delegate to `rules/format-integrated.md`. Express the middle format as a degree adjustment between the two rules, without adding another rule.
- **When no format is specified (R2.4)**: use the default format and state explicitly in the output **which format it was generated in** (whether the default used was the upstream layout or the integrated spec). Do not pick the default silently.
- Delegate the mapping to this skill's format rules. Do **not** call `map-cc-sdd.md` (the cc-sdd mapping is owned by export-cc-sdd, and this skill does not touch it).

### Step 4: Fabrication check (trace assignment / inferred marking / invariant preservation)
- Per `rules/fabrication-guard.md`, check whether the natural-language Spec assembled by the format mapping fabricates beyond the projection source.
- Trace each statement to a referenceable form pointing to its projection source (which Intent L-level / which compass section / which packet / which constraint) (R3.1). Mark statements with no grounding in the source as inferred and never mix them with the confirmed ones (R3.2). Hold the source's invariants / constraints without omission or alteration (R3.4). Present the supplemented (inferred) places as a list the user can review (R3.3; this is a warning and does not stop generation).

### Step 5: Derived write (full replacement to `.intent/nl-spec/`)
- Only after all reading, mapping, and checking are complete, **last** write the generated natural-language Spec to `.intent/nl-spec/<format>.md` by **full replacement** (rerunning with the same scope+format is idempotent by full replacement. R4.2).
- State at the top of the output that this Spec is derived / regenerable / not the source of truth / Git-untracked, and that the statements marked inferred are provisional until the user's review (R4.3).
- Never write to any canonical `.intent/*.md` (intent-tree / compass / packets), steering (tech.md), or application code (R4.1 / R4.4). Limit the write destination to under `.intent/nl-spec/`.

## Output Description

> **The output target is the terminal.** Use no raw HTML (`<details>` / `<summary>`, etc., collapsible UI) in the output; separate details with plain Markdown headings instead (in a terminal the raw tags are shown literally and become unreadable). Internal notations such as `[[...]]` (wikilinks for memory / delta) are legitimate in records written to delta / memory files, but in human-facing terminal output do not emit them raw — open them into ordinary words (spell the linked name out in plain prose).

- `.intent/nl-spec/<format>.md` (derived, regenerable, Git-untracked; the header states it is not the source of truth). Its content follows the confirmed target format:
  - **Upstream layout**: purpose (why) → invariants / constraints to hold → decision rules → individual demands → assumptions / unresolved (a separate inferred block, if any), in that order (per the composition in `rules/format-upstream.md`).
  - **Integrated spec**: overview → premise invariants / constraints → integrated demands with acceptance criteria → assumptions / unresolved (a separate inferred block, if any), in that order (per the composition in `rules/format-integrated.md`).
  - **Format default statement**: when unspecified, state the default format used (Step 3; R2.4).
  - **Trace / inferred marking**: assign each statement a reference to its projection source, and place statements with no grounding in the source as inferred, in a block / marking distinct from the confirmed ones.
  - **Review list of supplemented places**: alongside, a list naming which statement was supplemented and for what reason, for the statements marked inferred.
- Layers / sections without source material are omitted with the reason (unfilled / unobserved) stated explicitly (never filled in by guessing).

## Safety & Fallback
- **Write boundary**: writes are limited to under `.intent/nl-spec/`. The canonical `.intent/*.md` (intent-tree / compass / packets / mode, etc.), steering (tech.md), and application code are read-only — never created, modified, or deleted there (the `Write` in the frontmatter is permitted solely for writing under `.intent/nl-spec/`. R4.1).
- **Derived — not the source of truth**: the artifact is derived / regenerable and not the source of truth. State this at the top of the output, and create no dual source of truth against canonical (R4.3).
- **Fabrication suppression (the outward load-bearing problem)**: never leave a statement without a trace as confirmed (each statement is either traceable to a projection source or marked inferred). Never mix inferred with confirmed, and never omit or alter the source's invariants / constraints. Always present supplemented places as a review list and never dissolve them silently into the body (R3.x).
- **Mapping ownership boundary**: delegate the format mapping to this skill's `rules/format-upstream.md` / `rules/format-integrated.md`, and do not call `map-cc-sdd.md`. Do not change the behavior of `/intent-export-cc-sdd` (the source/format-fixed special case) (R5.3 / R5.5).
- **Read-only**: treat the projection sources (intent-tree / compass / packets / steering) read-only and do not create, modify, or delete them (R1.4).
- **Zero external dependencies** (INV2 / R5.1). Introduces no external package, AST parser, or custom schema; limited to Node standard and natural-language heuristics, completing the projection within a natural-language workflow.
- **Does not modify application code** (INV6 / R4.4).
- **Naming / no external modification**: follows the `intent-*` naming convention and does not modify external spec tools or the kiro-* development environment (R5.5).
- **When prerequisites are absent**: when the source scope is ambiguous or the corresponding artifact is absent, write nothing, state the absence/ambiguity, guide to the available scope or the missing artifact (the relevant skill to prepare it), and stop (fail-fast. R1.3).
- **On partial gaps**: layers / sections whose source material cannot be read are stated as "unfilled / unobserved" and omitted (never filled in by guessing).
