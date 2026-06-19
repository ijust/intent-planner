---
name: intent-validate
description: Read-only verification that cross-checks intent-tree, intent-compass, and packets (+ the export draft) and reports contradictions, coverage gaps, boundary inconsistencies, and normative violations with severity. Fixes remain proposals.
allowed-tools: Read, Glob, Grep
argument-hint: none
---

# intent-validate Skill

## Core Mission
- **Success Criteria**:
  - intent-tree, intent-compass, and packets (+ the export draft) are cross-checked, applying all checks in the check catalog (the set of checks, their categories, and their severities are authoritatively defined by the table in `rules/validate-checks.md`)
  - Findings are classified by severity (must-fix / recommended / info), and every item carries its check ID (the ID column of the table in `rules/validate-checks.md`), its evidence (file and the relevant statement), and a fix proposal (the skill to re-run or the fix direction)
  - Unverified targets (missing / unfilled deliverables, plus the IDs of skipped checks) are stated explicitly together with the reason
  - Packets are read statically from the four PBR perspectives (user / operations / test / maintenance), confirming read-only whether each perspective's breakdown conditions are documented
  - No file has been created, changed, or deleted at all (read-only, one-way reporting)

## Execution Steps

### Step 1: Confirm the prerequisites
- If `.intent/` is absent, guide the user through the intent-planner setup steps (running `npx intent-planner`) and finish.
- Partial absence of `intent-tree.md` / `intent-compass.md` / `.intent/packets/` is **non-blocking**: do not stop; run the checks within the verifiable scope and report the missing deliverables as unverified targets (packets count as missing when `.intent/packets/` is absent or `active/` is empty; in that case skip the packet-dependent checks).

### Step 2: Read the deliverables
- Read `.intent/intent-tree.md`, `.intent/intent-compass.md`, `.intent/packets/index.md` and `.intent/packets/plan.md`, and the packet files subject to the checks (for cross-packet checks, read all files under `active/`; do not read `archive/`), plus `.intent/cc-sdd/<slug>/*.md` (the per-packet export drafts, if present) and `.intent/mode.local.md` (falling back to `.intent/mode.md` if absent) for the mode state.
- If both mode.local.md and mode.md are absent, continue with the standard default and announce it (do not stop).

### Step 3: Apply the check catalog
- Read `rules/validate-checks.md` and apply all checks in the check catalog (the set of checks, their categories, and their severities are authoritatively defined by the table in `rules/validate-checks.md`).
- Severity classification (including the must-fix / recommended decision for the L3 mismatch) follows the criteria in the rules.
- The target of the boundary checks is the directory of the packet on the latest row of `.intent/export-log.md` (identification is authoritatively the exact match of the `## Source Packet` heading in the directory's requirements.md). Drafts of past packets coexist by design and are not treated as violations. If export-log is absent or uninterpretable, fall back to the drafts' Source Packet headings (when multiple directories exist, present them as candidates without asserting one) and report that fact.

### Step 3.5: Statically confirm the four PBR perspectives (read-only; search for breakdown conditions)
- Read the packets (under `active/`, plus the export drafts if present) from the four perspectives below, and statically confirm **whether each perspective's breakdown conditions are documented**. If the documentation is missing, list it as a finding for that perspective in the severity-grouped list (perform no automatic fix or interactive confirmation).
- **User perspective**: whether the breakdown conditions of the behavior for the user (inputs / situations under which the expected behavior collapses) are documented.
- **Operations perspective**: whether a fail-safe design (behaviors such as degradation, rejection, retry) against faults, timeouts, and malicious input is documented.
- **Test perspective**: whether test cases based on equivalence partitioning and boundary-value analysis can be created. If they cannot, report it as a missing boundary condition.
- **Maintenance perspective**: whether the packet holds How internally (fixing a ceiling) and thereby obstructs the free design of the implementing agent.
- For every perspective, do not stop at confirming the happy path; actively search for "the conditions under which this design breaks down (abnormal cases, high load, invalid input)" (confirmation-bias mitigation). When no breakdown condition is found, treat it as "the breakdown-condition documentation is missing" rather than "unexplored".
- This per-perspective confirmation is a static check item; introduce no new interaction loop, state machine, or interactive-confirmation tool. If an interactive per-perspective audit is needed, note in Open Questions / fix proposals that it is delegated to the existing reviewer subagent practice (`kiro-review`, etc.).

### Step 4: Report (one-way; fixes are proposals only)
- Present the findings as a list grouped by severity (must-fix / recommended / info), citing for every finding its check ID (the ID column of the table in `rules/validate-checks.md`) together with the severity (e.g., `must-fix invariant-conflict: …`).
- Always attach to every item its "evidence (file and the relevant statement)" and a "fix proposal (the skill to re-run or the fix direction)".
- State the unverified targets and their reasons explicitly, identifying skipped checks by their IDs.
- Present the remaining Open Questions.
- Perform no automatic fixes at all.

## Output Description

**Reader**: a human developer who looks at the findings and decides whether to remediate.
**What this output makes them grasp first**: "**N must-fix / M recommended**. These are what to fix, and this is the command to re-run." The enumeration of check IDs / unverified targets is detail for the decision, so place it after the counts and the must-fix items.

Lead the output with the conclusion (the counts and the must-fix items).

- **Verdict summary (top, one line)**: `N must-fix / M recommended / K info`. If there are 0 must-fix, state explicitly "no critical issues".
- **Must-fix list (next)**: each item with its check ID + evidence (file and the relevant statement) + fix proposal (the skill to re-run or the fix direction). The chunk the reader should tackle first.
- **Details**: the recommended / info-level findings (same format), the unverified targets (including the IDs of skipped checks) and their reasons, and the Open Questions that the human should review.
- Include the command to run next in the fix proposals (e.g., re-running `/intent-compass`).

## Safety & Fallback
- Read-only: create, change, or delete no file whatsoever. Keep fixes as proposals, always attaching the skill to re-run or the fix direction.
- Only the absence of `.intent/` is a stop condition: guide the user through the setup steps and finish.
- Partial absence of deliverables is non-blocking: check only the verifiable scope and state the unverified targets and reasons explicitly.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- Do not change application code (INV6. Being read-only, the skill has no write path in the first place).
