---
name: intent-discover
description: The entry point of Intent Planning. From the repository's pain points, README, and an overview of existing code, build an Intent Tree (L0-L4) and recommend/confirm the mode for working out the Intent. Does not implement.
---

# intent-discover Skill

## Core Mission
- **Success Criteria**:
  - The L0–L4 Intent Tree is structured, with canonical (confirmed) and inferred (guessed) separated
  - The mode for working out the Intent is recommended/confirmed and recorded in `.intent/mode.md`
  - The development purpose (purpose) is confirmed and recorded in `.intent/mode.md` (if deferred, it is noted in Open Questions)
  - Open Questions that the human should review are made explicit
  - No application code has been changed at all

## Execution Steps

### Step 1: Select the mode
- Read and apply `rules/mode-selection.md`.
- Check the available modes (`.intent/modes/*.md`) and recommend a mode based on the repository situation.
- Confirm by asking the user in natural language and waiting for their answer (run the recommend→confirm wiring even if standard is the only candidate).
- Record the confirmed result in `.intent/mode.md`.
- Read `rules/purpose-poc.md` and confirm/record the development purpose (purpose).

### Step 2: Apply the algorithm according to the mode definition
- Read the confirmed mode definition (e.g. `.intent/modes/standard.md`).
- Open the mode definition that `.intent/mode.md`'s `definition` points to, and read and apply the algo rule (`rules/algo-*.md`) assigned to the Intent Tree construction phase (standard → `rules/algo-gore-lite.md`; refactor → `rules/algo-gore-lite.md` + `rules/algo-drift-analysis.md`, plus `rules/algo-intent-recovery.md` for intent-less code). The examples are not exhaustive; the mode definition's table is always authoritative.

### Step 3: Build the Intent Tree
- Following GORE-lite, decompose L0 (purpose) → L1 (outcomes) → L2 (capabilities) → L3 (behavior/architectural intent) → L4 (candidate packets).
- Separate confirmed intent from guesses (Assumptions). Put anything undetermined into Open Questions.
- If an existing `.intent/intent-tree.md` exists, read it and present additions/updates as a proposal rather than overwriting.

### Step 4: Present
- Present the proposed update to `.intent/intent-tree.md`.
- If the purpose is poc, apply the additional Intent Tree confirmations in `rules/purpose-poc.md` (L1 measurement criteria / screen rough).
- Do not make implementation changes. Do not jump ahead with refactoring proposals.

## Output Description
- Proposed update to `.intent/intent-tree.md` (L0–L4 / Open Questions / Assumptions)
- The confirmed mode (`.intent/mode.md`)
- The confirmed development purpose (purpose)
- Open Questions that the human should review
- The command to run next: `/intent-compass`

## Safety & Fallback
- If the input (problem / target scope) is ambiguous, do not fill in with guesses; ask the user in natural language and wait for their answer.
- If an existing Intent Tree exists, do not destroy it; present the diff as a proposed update.
- Do not change application code.
