---
name: intent-discover
description: The entry point of Intent Planning. From the repository's pain points, README, and an overview of existing code, build an Intent Tree (L0-L4) and recommend/confirm the mode for working out the Intent. Does not implement.
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
argument-hint: <problem / idea / target scope>
---

# intent-discover Skill

## Core Mission
- **Success Criteria**:
  - The L0–L4 Intent Tree is structured, with canonical (confirmed) and inferred (guessed) separated
  - The mode for working out the Intent is recommended/confirmed and recorded in `.intent/mode.local.md` (the local canonical source for mode state)
  - Whether question delegation (designer-questions) is needed is confirmed and recorded in `.intent/mode.local.md` (the purpose as well when on; if deferred, it is noted in Open Questions)
  - Open Questions that the human should review are made explicit
  - When drift-watch is on, terrain diagnosis is performed, the matching pattern is named, and it is recorded in drift-log (when off, nothing is done)
  - When drift-watch is on, context-cost-cues are matched and ways of progressing that eat context are named in a noticing tone (recorded to no log; when off, nothing is done)
  - No application code has been changed at all

## Execution Steps

### Step 1: Select the mode
- Read and apply `rules/mode-selection.md`.
- Check the available modes (`.intent/modes/*.md`) and recommend a mode based on the repository situation.
- Confirm with the user via `AskUserQuestion` (run the recommend→confirm wiring even if standard is the only candidate).
- Record the confirmed result in `.intent/mode.local.md` (the local canonical source for mode state; not tracked by git). Enforcement / Drift-watch (shared policy) stay in `.intent/mode.md` and are not touched.
- **Recommend → confirm → record the target format (optional, deferrable)**: after confirming the mode, when the target format (which exit to take = `cc-sdd` / `openspec` / `to-spec`) can be inferred from the case, ask the user to confirm it, and on confirmation record it in the `format` line of `.intent/mode.local.md`. The inference signals are the case type (mode; whether the artifact is code or a document; presence of `.kiro/` or a repository-root `openspec/`, etc.), and the format→exit correspondence is kept consistent with `intent-packets/rules/export-route.md` (the exit decision lane). Follow the **same confirmation discipline as mode / designer-questions / purpose**: if it cannot be inferred, or the user defers/declines, **do not fill it in by guessing — do not record it** (continue with it unspecified; the exit decision later falls back to inference). Recording the format is optional; discover continues as before even without it. **Only `/intent-discover` writes the format** (other skills read it read-only — DR26).
- Read `rules/designer-questions.md` and confirm/record question delegation (designer-questions).

### Step 2: Apply the algorithm according to the mode definition
- Read the confirmed mode definition (e.g. `.intent/modes/standard.md`).
- Open the mode definition that `.intent/mode.local.md`'s `definition` (falling back to the old `.intent/mode.md`) points to, and read and apply the algo rule (`rules/algo-*.md`) assigned to the Intent Tree construction phase (standard → `rules/algo-gore-lite.md`; refactor → `rules/algo-gore-lite.md` + `rules/algo-drift-analysis.md`, plus `rules/algo-intent-recovery.md` for intent-less code). The examples are not exhaustive; the mode definition's table is always authoritative.

### Step 3: Build the Intent Tree
- Following GORE-lite, decompose L0 (purpose) → L1 (outcomes) → L2 (capabilities) → L3 (behavior/architectural intent) → L4 (candidate packets).
- Separate confirmed intent from guesses (Assumptions). Put anything undetermined into Open Questions.
- If an existing `.intent/intent-tree.md` exists, read it and present additions/updates as a proposal rather than overwriting.

### Step 3.5: Terrain Diagnosis (drift-watch)
- Check the value of `drift-watch` in the `## Drift-watch (user-managed)` section of the `.intent/mode.md` read in Step 1. When it is not `on` (including off, unspecified, invalid value, missing section, or missing mode.md), do not perform terrain diagnosis; continue to Step 4 as before (byte-identical to current behavior).
- Only when it is `on`, read and apply `rules/drift-terrain.md`. The symptom × in-progress Intent Tree matching, the named presentation of matching patterns, drafting anti-direction / invariant candidates into Open Questions, and appending to drift-log are all delegated to the rule's procedure (do not duplicate the procedure here). Also apply the "Context cost cues" section at the end of that rule: match the types in `.intent/context-cost-cues.md` and name, in a noticing tone, ways of progressing that eat context (recorded to no log; skip if the catalog is absent).

### Step 4: Present
- Present the proposed update to `.intent/intent-tree.md`.
- Apply the additional Intent Tree confirmations in `rules/designer-questions.md` (L1 measurement criteria / screen rough), following the rule's applicability conditions.
- Do not make implementation changes. Do not jump ahead with refactoring proposals.

## Output Description

**Reader**: a human developer who is about to start working out the intent.
**What this output makes them grasp first**: "the skeleton of the Intent Tree is in place. **Next is `/intent-compass`**. But these are the only Open Questions to answer before finalizing."

Lead the output with the conclusion.

- **Next move (top, one line)**: `/intent-compass` (building the decision criteria; defining the Invariants / Anti-direction that prevent local optimizations).
- **Open Questions that need confirmation**: the points a human must finalize (left as questions rather than filled in by guessing). Phrased so it is clear that clearing only these is enough before moving on.
- **Details (proposed deliverable updates)**: the proposed update to `.intent/intent-tree.md` (L0–L4 / Open Questions / Assumptions; canonical and inferred kept distinct), the confirmed mode (`.intent/mode.local.md`), and the confirmed designer-questions / purpose.

## Safety & Fallback
- If the input (problem / target scope) is ambiguous, do not fill in with guesses; ask the user.
- If an existing Intent Tree exists, do not destroy it; present the diff as a proposed update.
- Do not change application code.
