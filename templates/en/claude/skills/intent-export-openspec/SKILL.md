---
name: intent-export-openspec
description: Convert one chosen packet into a proposal draft + delta spec hints that can be handed to OpenSpec without wasting tokens. Does not intrude on OpenSpec's main generation. Can invoke /opsx:propose when instructed to proceed.
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Skill, Bash
argument-hint: <target packet name (optional)>
---

# intent-export-openspec Skill

## Core Mission
- **Success Criteria**:
  - One target packet is converted into an OpenSpec proposal draft (Why/What Changes/Impact) + delta spec hints
  - The input is limited to the target packet file + the compass's project-universal Invariants/Anti-direction, and the full Tree/Compass is not transcribed into OpenSpec
  - The delta hints carry parent intent / invariant references, forming a propagation structure to impl
  - The output is led by natural-language guidance, and `/opsx:propose` can be invoked when instructed to proceed
  - The output is confined to `.intent/openspec/` and does not touch `.intent/cc-sdd/`
  - No application code has been changed at all

## Execution Steps

### Step 1: Narrow down to one target packet
- Read `.intent/packets/index.md` and present the active packet candidates. If index.md is absent, build the candidate list directly from the frontmatter of the files under `.intent/packets/active/`, continue, and prompt regeneration of the index. If `.intent/packets/` itself is absent (or `active/` is empty), guide the user to "run `/intent-packets` first" and stop.
- If a packet is specified by argument, use it; otherwise narrow down to one from the candidates by priority or user confirmation, and read only the file of the confirmed target packet (under `.intent/packets/active/`) — do not bulk-read all packet files.
- **Draft guard**: when the confirmed target packet's `state` is draft, confirm via AskUserQuestion whether to "activate it and continue the export"; once the user approves, update the frontmatter `state` to active and regenerate `index.md` before continuing (never export a draft as is without confirmation; this activation is the only canonical write the export makes).
- Read `.intent/mode.md`. If absent, continue with the standard default and announce it.

### Step 1.5: Enforcement gate (writeback freshness check)
- From the `## Enforcement (user-managed)` section of the `.intent/mode.md` read in Step 1, check the value of `enforcement`. If it is off, missing, or an invalid value (including mode.md being absent), skip this check and continue to Step 1.6 as today.
- When it is remind or gate, run `node .intent/scripts/intent-check.mjs` with Bash (a read-only script; it creates, modifies, and deletes no files) and follow its stdout.
- **Interpretation rules for the verdict line**: the stop decision is governed solely by `block=` on the first stdout line (do not re-derive or reinterpret). Whether a warning is needed is decided by `result=stale` or `pending>0`. Even when `result=not-applicable`, use the value of `pending=` from the verdict line as is.
- When gate and `block=yes`: present the grounds (the pending packet names and the elapsed commit count / threshold; quote intent-check's human-readable lines from the second line onward verbatim), stop the export, and guide the user to run `/intent-writeback`. Then confirm via AskUserQuestion whether to "proceed with the export anyway", and only when the user explicitly instructs to proceed, run the export with a warning attached (the escape hatch for false positives).
- When remind and a violation is detected (`result=stale` or `pending>0`): present the same grounds as a warning and continue without stopping.
- Only when intent-check itself cannot run (Bash unavailable, script absent, or exit 2): treat staleness as not-applicable, check `.intent/deltas.md` for pending Delta entries (those carrying `- Status: pending`) via Read/Grep, and enter the same branches above using that result as `pending`.

### Step 1.6: Drift Check (drift-watch)
- Check the value of `drift-watch` in the `## Drift-watch (user-managed)` section of the `.intent/mode.md` read in Step 1. When it is not `on` (including off, unspecified, invalid value, missing section, or missing mode.md), do not perform this check; continue to Step 1.7 as today (byte-identical to current behavior).
- Only when it is `on`, read and apply `rules/drift-export-check.md`. The matching of the target packet's proposal/delta hints × compass (North Star / Anti-direction / Invariants), the named presentation of conflicts, appending a `stage: export` entry to drift-log, and resolving the outcome by the user's verdict are all delegated to the rule's procedure (do not duplicate the procedure here).
- This check is **warn-only and does not stop the export** (only the Step 1.5 enforcement gate can stop; drift-watch never stops because it assumes false positives).
- Order and orthogonality of the three checkpoints: **enforcement (procedure, may stop, Step 1.5) → drift-watch (direction, never stops, Step 1.6) → Open Questions (deadline, never stops, Step 1.7)**. Their inspection targets are orthogonal (procedure / direction / deadline).

### Step 1.7: Confirm unanswered Open Questions
- Read and apply `rules/export-questions.md`.

### Step 2: Apply the mapping rules
- Read and apply `rules/map-openspec.md`.
- The input is only the one target packet file (including the packet-specific invariants in Safety / Invariants) + the project-universal Invariants/Anti-direction of `.intent/intent-compass.md` (do not read the full Tree or other packets. Only when direction is needed, reference a summary of Tree L0–L1).

### Step 3: Generate the draft
- Write the drafts under the per-packet directory `.intent/openspec/<slug>/`. The slug derivation and collision handling follow the "Output layout" section of `rules/map-openspec.md`. Continuing to export multiple packets never overwrites another packet's directory.
- Write the proposal draft (`## Why` / `## What Changes` / `## Impact`) into `.intent/openspec/<slug>/proposal.md`, shaped so the minimal and always-valid "change description" text for `/opsx:propose` can be derived from its opening.
- Write the delta spec hint skeleton into `.intent/openspec/<slug>/spec-delta.md` (`## ADDED Requirements` by default + conditional `## MODIFIED Requirements` / `## REMOVED Requirements`, with the `### Requirement: <name>` / `#### Scenario: <name>` skeleton).
- Do not complete the OpenSpec main body. Keep the delta to a hint skeleton; the reconciliation and completion are delegated to OpenSpec (from `/opsx:propose` onward) (INV4). Always leave parent intent and invariant references in the proposal/delta.
- Once the drafts are generated, append one row to `.intent/export-log.md` (the single log shared across export targets): `| <packet name> | <export datetime (ISO 8601 UTC)> | <commit hash> |` (do not erase past rows). Obtain the commit hash by running `git rev-parse --short HEAD` (read-only) with Bash; if it cannot be obtained (not a git repository, etc.), record `-` and continue the export. If export-log.md is absent, create it anew with the same table header as the scaffold (`| packet | exported_at | commit |`).

### Step 4: Guide the handoff (natural-language led)
- The lead of the output is natural-language guidance: show the paths of the target packet's `.intent/openspec/<slug>/proposal.md` and `spec-delta.md` and confirm "may this be handed to OpenSpec as is".
- When the user instructs to proceed, read the minimal change description from the target packet's `.intent/openspec/<slug>/proposal.md` and invoke `/opsx:propose` with that as the argument (use `Skill`. Do not force the user to copy-paste).
- As a fallback, also include a copyable change-description block for `/opsx:propose` (not the lead).
- **Delegation goes only up to invoking `/opsx:propose`**. The subsequent apply / sync / archive workflows follow OpenSpec, and we do not push ahead automatically.
- **Make the return path explicit (the entry to the writeback phase)**: at the end of the guidance, add one line that once the OpenSpec implementation has gone around once (once learnings emerge from the reality of implementation), they are returned to the canonical deliverables via `/intent-writeback`. Do not settle for writing post-implementation learnings directly into the packet file as Evidence; always go through writeback (via a delta). This guidance makes the phase boundary explicit to the user: "pre-implementation drafting (compass/packets write canonical directly)" vs. "post-implementation extraction (writeback via a delta)".

## Output Description
- The target packet's `.intent/openspec/<slug>/{proposal, spec-delta}.md` drafts (the `/opsx:propose` input proposal + delta hint skeleton)
- One export-record row appended to `.intent/export-log.md`
- The target packet file's `state` update and the regeneration of `.intent/packets/index.md` when a draft was activated (omitted when none apply)
- Confirmation result for unanswered `[by export]` questions (the questions presented and the user's decision; omitted when none apply)
- Confirmation of whether it may be handed to OpenSpec (natural-language guidance; the lead)
- Copy block for `/opsx:propose` (fallback; secondary)
- Points to confirm before implementation
- Return-path guidance after the implementation goes around once (return to canonical via `/intent-writeback`; do not settle for writing Evidence directly into the packet)

## Safety & Fallback
- If `.intent/packets/` is absent (or `active/` is empty), stop and guide the user to `/intent-packets`.
- The absence of index.md does not stop; build the candidates directly from the files under `active/`, continue, and prompt regeneration of the index.
- The only canonical write is the draft-guard activation (`state` update + `index.md` regeneration), and only with the user's approval. Never rewrite intent-tree / intent-compass / packet bodies.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- The enforcement check is fail-open: even when intent-check cannot run, do not block the export. The export stops only when enforcement is gate and the verdict line says `block=yes`, or when the unrunnable fallback finds pending deltas under gate; even then the user's explicit instruction to proceed lets it run.
- The Open Questions check is a confirmation, not a stop; the user's explicit instruction to proceed lets the export run.
- Do not complete the main body of OpenSpec's proposal / delta spec (drafts/hint skeleton only).
- Do not auto-invoke the OpenSpec workflow beyond `/opsx:propose` (apply / sync / archive, etc.).
- Confine the output to `.intent/openspec/` and do not write into `.intent/cc-sdd/`.
- Do not change application code (INV6. Invoking other skills is a concept distinct from INV6 and is allowed).
