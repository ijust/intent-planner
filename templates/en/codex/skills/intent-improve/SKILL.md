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
  - On a run whose 5 classifications include `Decision Rules update recommended` or `invariant violation detected`, following the provisions of `rules/improve-axes.md`, it also prompts the user to run `/intent-validate` (the check for conformance catch-up) (on a run that does not include them, it does not prompt; it only guides and does not itself make a conformance judgment)
  - When drift-watch is on, the coherence detections are recorded into drift-log as stage:improve / outcome:missed and a pattern×outcome improvement report is presented (when off / missing / invalid / missing section / missing mode.md, nothing is done; the 5 classifications are unchanged)
  - No application code has been changed at all

## Execution Steps

### Step 1: Collect the current state
- Read the `.intent/` deliverables (intent-tree.md / intent-compass.md / `.intent/packets/index.md` + the packet files under active/ (cross-cutting read for the completeness axis; do not read archive/) / the per-packet drafts under `cc-sdd/<slug>/` / deltas.md). If `.intent/` is absent, guide the user through setup (installing intent-planner and running `/intent-discover`) and stop.
- Read the mode state in order: the inherited issue directory's `discovery/<slug>-<rand>/mode.md` (A34; inherit the issue name that discover output) → else the single `.intent/mode.local.md` (legacy) → else old `.intent/mode.md` (the CONTRACT.md read fallback contract). If both are absent, continue with the standard default and announce it.
- Collect the implementation reality: the codebase (read-only via Read/Glob/Grep), the presence and placement of tests, the progress of `.kiro/specs/` (only if it exists), and the promoted / pending entries of deltas.md.
- If `.kiro/` is absent, continue without cc-sdd context. If deltas.md is absent, continue treating it as "no delta records" (non-blocking).
- If a target scope is specified by argument, narrow down to it; otherwise target the whole of `.intent/`.

### Step 2: Evaluate on the three axes
- Read `rules/improve-axes.md` and cross-check `.intent/` against the implementation reality on the three axes of completeness / correctness / coherence.
- Always attach evidence (file / relevant text) to the evaluation. Do not present an evaluation whose evidence cannot be shown.

### Step 3: Classify and report
- Classify the evaluation results into the 5 classifications (aligned / intent reinforcement recommended / corrective packet recommended / Decision Rules update recommended / invariant violation detected; multiple may apply) and present them organized per classification.
- When unrecorded write-back learnings or declined items with the "on-hold" tag are detected, also include guidance to `/intent-writeback` following the provisions of `rules/improve-axes.md`.
- On a run whose 5 classifications include `Decision Rules update recommended` or `invariant violation detected`, following the "Validate catch-up guidance" provisions of `rules/improve-axes.md`, also include guidance to `/intent-validate` (the check for conformance catch-up) alongside the writeback guidance (on a run that does not include them, do not include it; only guide and do not make the judgment yourself).
- When drift-watch is on (when off / missing / invalid / missing section / missing mode.md, do nothing): check the `drift-watch` value in the `## Drift-watch (user-managed)` section of `.intent/mode.md`, and only when it is `on`, following the provisions of `rules/improve-axes.md`, record the drift detected on the coherence axis (invariant violation / anti-direction conflict) into `.intent/drift-log.md` as a `stage: improve` / `outcome: missed` draft, and present a `pattern × outcome` cross-tabulated improvement report. Delegate the recording details (the fixed 9-key order, append-only, obtaining commit, creating drift-log when absent) to `rules/improve-axes.md` (do not duplicate them here). This recording **does not create a new correction class** (the 5 classifications above are unchanged), and does not write into deltas.md or hook writeback. When off / missing / invalid / missing section / missing mode.md, do not record or aggregate drift and proceed as before (byte-equivalent to current behavior). Note that the report of the 5 classifications above is always done regardless of the drift-watch value.

### Step 4: Confirm approval per proposal for the corrections
- For each item that needs correction, present the correction proposal (a deliverable update proposal or a corrective packet proposal) and confirm the user's approval **per proposal** (do not force bulk approval).
- Proposals that were not approved end as presentation only (do not rewrite).

### Step 5: Reflect only the approved corrections
- Reflect only the approved corrections into the canonical deliverables (intent-tree.md / intent-compass.md / under `.intent/packets/` (the target packet file / plan.md)).
- When the canonical under `.intent/packets/` has been changed (including when a delta promotion is reflected into the target packet file), regenerate `.intent/packets/index.md` from the frontmatter under active/.
- Corrections that change the Decision Rules follow the change convention of `rules/improve-axes.md` (add a new entry in ADR form + annotate the old entry as superseded with a reference to its successor and move it to `.intent/compass-archive/<rule-slug>.md` (a per-rule file)).
- Do not write into deltas.md (recording deltas and finalizing declined-item tags are the responsibility of `/intent-writeback`).

## Output Description

> **The output target is the terminal.** Use no raw HTML (`<details>` / `<summary>`, etc., collapsible UI) in the output; separate details with plain Markdown headings instead (in a terminal the raw tags are shown literally and become unreadable). Internal notations such as `[[...]]` (wikilinks for memory / delta) are legitimate in records written to delta / memory files, but in human-facing terminal output do not emit them raw — open them into ordinary words (spell the linked name out in plain prose).

**Reader**: a human developer who, after implementation, approves and corrects the drift between intent and implementation.
**What this output makes them grasp first**: "**here is the drift between implementation and intent (invariant violations come first if any). There are N items pending approval.** If there is a missed write-back, go to `/intent-writeback`." The breakdown of the three-axis evaluation is detail for the decision.

Lead the output with the conclusion (the drift and the pending approvals).

- **Divergence summary (top)**: show the key points of the detected corrections by classification. If there is an `invariant violation detected`, lead with it as the top priority. If everything is `aligned` (no drift), state explicitly "aligned, no correction needed".
- **Approval-pending list (next, per proposal)**: attach evidence (file / relevant text) to each correction proposal. Phrased so it is clear what gets reflected by approving what.
- **Writeback guidance** (when applicable): when an unrecorded write-back learning is detected, guidance to run `/intent-writeback`.
- **Validate catch-up guidance** (when applicable): on a run whose 5 classifications include `Decision Rules update recommended` / `invariant violation detected`, attach the guidance to run `/intent-validate` (the check for conformance catch-up) alongside the writeback guidance.
- **Details**: the three-axis evaluation summary (completeness / correctness / coherence) and the breakdown by classification (aligned / intent reinforcement recommended / corrective packet recommended / Decision Rules update recommended / invariant violation detected).
- **Improvement report** (when drift-watch=on): a report cross-tabulating drift-log by `pattern × outcome`. Always attach the honesty notes (`missed=0` is a suspicion of missing records / frequent `false-positive` suggests the anti-direction is too broad), align the aggregation keys to the type (pattern), and establish the group comparison (without group / with group) by the type id and the `commit` column of drift-log only (do not create an additional comparison mechanism).

## Safety & Fallback
- Do not rewrite the `.intent/` deliverables without user approval. Confirm approval per proposal.
- Do not change application code (INV6. Code is read-only via Read/Glob/Grep).
- Do not write into `.kiro/` (progress is read-only). The absence of `.kiro/` continues without cc-sdd context.
- Do not write directly into deltas.md. Handling of missed write-backs and on-hold items is guidance to `/intent-writeback` only; the final updates are done by writeback.
- The absence of `.intent/` guides the user through setup and stops. The absence of mode.md does not stop; continue with the standard default and announce it.
