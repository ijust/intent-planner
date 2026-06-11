---
name: intent-improve
description: After implementation, cross-check the .intent/ deliverables against the implementation reality on the three axes of completeness / correctness / coherence, classify the drift, and propose corrections. Reflects changes only after user approval. Guides missed write-backs to /intent-writeback.
---

# intent-improve Skill

## Core Mission
- **Success Criteria**:
  - The `.intent/` deliverables and the implementation reality (codebase, tests, cc-sdd spec progress) are evaluated on the three axes (completeness / correctness / coherence)
  - The evaluation results are presented in the 5 classifications (aligned / intent reinforcement recommended / corrective packet recommended / Decision Rules update recommended / invariant violation detected), with evidence (file / relevant text)
  - Only the corrections the user approved are reflected into `.intent/` (the approval unit is per proposal)
  - When an unrecorded write-back learning is detected, the skill does not write a delta itself but prompts the user to run `/intent-writeback`
  - No application code has been changed at all

## Execution Steps

### Step 1: Collect the current state
- Read the `.intent/` deliverables (intent-tree.md / intent-compass.md / packets.md / the cc-sdd/ drafts / deltas.md). If `.intent/` is absent, guide the user through setup (installing intent-planner and running `/intent-discover`) and stop.
- Read `.intent/mode.md`. If absent, continue with the standard default and announce it.
- Collect the implementation reality: the codebase (read-only via Read/Glob/Grep), the presence and placement of tests, the progress of `.kiro/specs/` (only if it exists), and the promoted / pending entries of deltas.md.
- If `.kiro/` is absent, continue without cc-sdd context. If deltas.md is absent, continue treating it as "no delta records" (non-blocking).
- If a target scope is specified by argument, narrow down to it; otherwise target the whole of `.intent/`.

### Step 2: Evaluate on the three axes
- Read `rules/improve-axes.md` and cross-check `.intent/` against the implementation reality on the three axes of completeness / correctness / coherence.
- Always attach evidence (file / relevant text) to the evaluation. Do not present an evaluation whose evidence cannot be shown.

### Step 3: Classify and report
- Classify the evaluation results into the 5 classifications (aligned / intent reinforcement recommended / corrective packet recommended / Decision Rules update recommended / invariant violation detected; multiple may apply) and present them organized per classification.
- When unrecorded write-back learnings or declined items with the "on-hold" tag are detected, also include guidance to `/intent-writeback` following the provisions of `rules/improve-axes.md`.

### Step 4: Confirm approval per proposal for the corrections
- For each item that needs correction, present the correction proposal (a deliverable update proposal or a corrective packet proposal), and **per proposal** ask the user in natural language and wait for their answer (do not force bulk approval).
- Proposals that were not approved end as presentation only (do not rewrite).

### Step 5: Reflect only the approved corrections
- Reflect only the approved corrections into the canonical deliverables (intent-tree.md / intent-compass.md / packets.md).
- Corrections that change the Decision Rules follow the change convention of `rules/improve-axes.md` (add a new entry in ADR form + a superseded note on the old entry).
- Do not write into deltas.md (recording deltas and finalizing declined-item tags are the responsibility of `/intent-writeback`).

## Output Description
- Three-axis evaluation summary
- Detections and correction proposals per classification (with evidence)
- Approval-pending list (per proposal)
- Writeback guidance (when applicable: guidance to run `/intent-writeback`)

## Safety & Fallback
- Do not rewrite the `.intent/` deliverables without user approval. Confirm approval per proposal by asking the user in natural language and waiting for their answer.
- Do not change application code (INV6. Code is read-only via Read/Glob/Grep).
- Do not write into `.kiro/` (progress is read-only). The absence of `.kiro/` continues without cc-sdd context.
- Do not write directly into deltas.md. Handling of missed write-backs and on-hold items is guidance to `/intent-writeback` only; the final updates are done by writeback.
- The absence of `.intent/` guides the user through setup and stops. The absence of mode.md does not stop; continue with the standard default and announce it.
