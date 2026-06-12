---
name: intent-validate
description: Read-only verification that cross-checks intent-tree, intent-compass, and packets (+ the export draft) and reports contradictions, coverage gaps, boundary inconsistencies, and normative violations with severity. Fixes remain proposals.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep
argument-hint: none
---

# intent-validate Skill

## Core Mission
- **Success Criteria**:
  - intent-tree, intent-compass, and packets (+ the export draft) are cross-checked, applying all checks in the check catalog (the set of checks, their categories, and their severities are authoritatively defined by the table in `rules/validate-checks.md`)
  - Findings are classified by severity (must-fix / recommended / info), and every item carries its check ID (the ID column of the table in `rules/validate-checks.md`), its evidence (file and the relevant statement), and a fix proposal (the skill to re-run or the fix direction)
  - Unverified targets (missing / unfilled deliverables, plus the IDs of skipped checks) are stated explicitly together with the reason
  - No file has been created, changed, or deleted at all (read-only, one-way reporting)

## Execution Steps

### Step 1: Confirm the prerequisites
- If `.intent/` is absent, guide the user through the intent-planner setup steps (running `npx intent-planner`) and finish.
- Partial absence of `intent-tree.md` / `intent-compass.md` / `packets.md` is **non-blocking**: do not stop; run the checks within the verifiable scope and report the missing deliverables as unverified targets.

### Step 2: Read the deliverables
- Read `.intent/intent-tree.md`, `.intent/intent-compass.md`, `.intent/packets.md`, `.intent/cc-sdd/*.md` (the export draft, if present), and `.intent/mode.md`.
- If mode.md is absent, continue with the standard default and announce it (do not stop).

### Step 3: Apply the check catalog
- Read `rules/validate-checks.md` and apply all checks in the check catalog (the set of checks, their categories, and their severities are authoritatively defined by the table in `rules/validate-checks.md`).
- Severity classification (including the must-fix / recommended decision for the L3 mismatch) follows the criteria in the rules.
- The boundary checks assume the single-slot constraint (the export draft holds only the latest 1 packet's worth).

### Step 4: Report (one-way; fixes are proposals only)
- Present the findings as a list grouped by severity (must-fix / recommended / info), citing for every finding its check ID (the ID column of the table in `rules/validate-checks.md`) together with the severity (e.g., `must-fix invariant-conflict: …`).
- Always attach to every item its "evidence (file and the relevant statement)" and a "fix proposal (the skill to re-run or the fix direction)".
- State the unverified targets and their reasons explicitly, identifying skipped checks by their IDs.
- Present the remaining Open Questions.
- Perform no automatic fixes at all.

## Output Description
- The list of findings by severity (must-fix / recommended / info) (each item: check ID + evidence + fix proposal)
- The unverified targets (including the IDs of skipped checks) and their reasons
- Open Questions that the human should review
- The command to run next (as part of the fix proposals; e.g., re-running `/intent-compass`)

## Safety & Fallback
- Read-only: create, change, or delete no file whatsoever. Keep fixes as proposals, always attaching the skill to re-run or the fix direction.
- Only the absence of `.intent/` is a stop condition: guide the user through the setup steps and finish.
- Partial absence of deliverables is non-blocking: check only the verifiable scope and state the unverified targets and reasons explicitly.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- Do not change application code (INV6. Being read-only, the skill has no write path in the first place).
