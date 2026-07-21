---
name: intent-export-openspec
description: Convert one chosen packet into a proposal draft + delta spec hints that can be handed to OpenSpec without wasting tokens. Does not intrude on OpenSpec's main generation. Can invoke /opsx:propose when instructed to proceed.
---

# intent-export-openspec Skill

## Core Mission
- **Success Criteria**:
  - One target packet is converted into an OpenSpec proposal draft (Why/What Changes/Impact) + delta spec hints
  - With the common contract, input is limited to the target packet + `selected` from the common selection result; only contract absence uses the existing packet + Compass path, and no full Tree/Compass is transcribed into OpenSpec
  - The delta hints carry parent intent / invariant references, forming a propagation structure to impl
  - The output is led by natural-language guidance, and `/opsx:propose` can be invoked when instructed to proceed
  - The output is confined to `.intent/openspec/` and does not touch `.intent/cc-sdd/`
  - No application code has been changed at all

## Execution Steps

### Step 1: Narrow down to one target packet
- Read `.intent/packets/index.md` and present the active packet candidates. If index.md is absent, build the candidate list directly from the frontmatter of the files under `.intent/packets/active/`, continue, and prompt regeneration of the index. If `.intent/packets/` itself is absent (or `active/` is empty), guide the user to "run `/intent-packets` first" and stop.
- If a packet is specified by argument, use it; otherwise narrow down to one from the candidates by priority or by asking the user in natural language and waiting for their answer, and read only the file of the confirmed target packet (under `.intent/packets/active/`) — do not bulk-read all packet files.
- **Draft guard**: when the confirmed target packet's `state` is draft, ask the user in natural language whether to "activate it and continue the export" and wait for their answer; once the user approves, update the frontmatter `state` to active and regenerate `index.md` before continuing (never export a draft as is without confirmation; this activation is the only canonical write the export makes).
- Read the mode state in order: the inherited issue directory's `discovery/<slug>-<rand>/mode.md` (A34; inherit the issue name that discover output) → else the single `.intent/mode.local.md` (legacy) → else old `.intent/mode.md` (the CONTRACT.md read fallback contract). If both are absent, continue with the standard default and announce it.

### Step 1.5: Enforcement gate (writeback freshness check)
- From the `## Enforcement (user-managed)` section of the `.intent/mode.md` read in Step 1, check the value of `enforcement`. If it is off, missing, or an invalid value (including mode.md being absent), skip this check and continue to Step 1.6 as today.
- When it is remind or gate, run `node .intent/scripts/intent-check.mjs` (a read-only script; it creates, modifies, and deletes no files) and follow its stdout.
- **Interpretation rules for the verdict line**: the stop decision is governed solely by `block=` on the first stdout line (do not re-derive or reinterpret). Whether a warning is needed is decided by `result=stale` or `pending>0`. Even when `result=not-applicable`, use the value of `pending=` from the verdict line as is.
- When gate and `block=yes`: present the grounds (the pending packet names and the elapsed commit count / threshold; quote intent-check's human-readable lines from the second line onward verbatim), stop the export, and guide the user to run `/intent-writeback`. Then ask the user in natural language whether to "proceed with the export anyway" and wait for their answer; only when the user explicitly instructs to proceed, run the export with a warning attached (the escape hatch for false positives).
- When remind and a violation is detected (`result=stale` or `pending>0`): present the same grounds as a warning and continue without stopping.
- Only when intent-check itself cannot run (command execution unavailable, script absent, or exit 2): treat staleness as not-applicable, read `.intent/deltas.md` to check for pending Delta entries (those carrying `- Status: pending`), and enter the same branches above using that result as `pending`.

### Step 1.6: Drift Check (drift-watch)
- Check the value of `drift-watch` in the `## Drift-watch (user-managed)` section of the `.intent/mode.md` read in Step 1. When it is not `on` (including off, unspecified, invalid value, missing section, or missing mode.md), do not perform this check; continue to Step 1.7 as today (byte-identical to current behavior).
- Only when it is `on`, read and apply `rules/drift-export-check.md`. The matching of the target packet's proposal/delta hints × compass (North Star / Anti-direction / Invariants), the named presentation of conflicts, appending a `stage: export` entry to drift-log, and resolving the outcome by the user's verdict are all delegated to the rule's procedure (do not duplicate the procedure here).
- This check is **warn-only and does not stop the export** (only the Step 1.5 enforcement gate can stop; drift-watch never stops because it assumes false positives).
- Order and orthogonality of the three checkpoints: **enforcement (procedure, may stop, Step 1.5) → drift-watch (direction, never stops, Step 1.6) → Open Questions (deadline, never stops, Step 1.7)**. Their inspection targets are orthogonal (procedure / direction / deadline).

### Step 1.7: Confirm unanswered Open Questions
- Read and apply `rules/export-questions.md`.

### Step 1.8: Preflight check of the OpenSpec prerequisite (warn only — do not stop)
- Observe read-only whether the **`openspec/` directory at the repository root** (the OpenSpec tool's marker) exists (Read/Glob; do not push this onto a mechanical check such as `intent-check.mjs`). It is **distinct from `.intent/openspec/` (this skill's own draft output directory)**; do not mistake the output directory for the prerequisite marker.
- When the repository-root `openspec/` is **absent**: **warn** that OpenSpec may not be set up. Guide: "The OpenSpec prerequisite (the `openspec/` directory at the repository root) was not found. Set up OpenSpec, or — if a readable artifact is the goal — the format-axis projection (an exit to a readable Spec) is also available." (The choice of exit follows the exit decision lane in `rules/export-route.md`; this SKILL does not name other export/projection skills' commands.) **Do not stop the draft generation** (continue to Step 2 onward).
- When the repository-root `openspec/` **exists**: emit nothing and continue to Step 2 (as before — no warn).
- This check is **warn only — it does not stop the export** (only the Step 1.5 enforcement gate can stop; the preflight follows drift-watch's false-positive-tolerant stance and does not stop — it does not foreclose adding `openspec/` later). Because OpenSpec's entry contract `/opsx:propose` cannot be observed read-only, the repository-root `openspec/` is used as a proxy marker for it being set up.

### Step 2: Apply the mapping rules
- Read and apply `rules/map-openspec.md`.
- When `.intent/execution-contract.md` exists, read it JIT and produce the common selection result once from the target packet and relevant decisions. The OpenSpec-specific rules place only its `selected` entries; they do not redefine candidate discovery or the meaning of `pull | exclude | confirm`.
- When `.intent/execution-contract.md` is absent, use `selection_status: legacy-not-applied` and continue with the existing input: one target packet file (including packet-specific invariants in Safety / Invariants) plus project-wide Invariants/Anti-direction from `.intent/intent-compass.md`. Do not claim that the new selection was applied.

### Step 3: Generate the draft
- Write the drafts under the per-packet directory `.intent/openspec/<slug>/`. The slug derivation and collision handling follow the "Output layout" section of `rules/map-openspec.md`. Continuing to export multiple packets never overwrites another packet's directory.
- Write the proposal draft (`## Why` / `## What Changes` / `## Impact`) into `.intent/openspec/<slug>/proposal.md`, shaped so the minimal and always-valid "change description" text for `/opsx:propose` can be derived from its opening.
- Write the delta spec hint skeleton into `.intent/openspec/<slug>/spec-delta.md` (`## ADDED Requirements` by default + conditional `## MODIFIED Requirements` / `## REMOVED Requirements`, with the `### Requirement: <name>` / `#### Scenario: <name>` skeleton).
- Do not complete the OpenSpec main body. Keep the delta to a hint skeleton; the reconciliation and completion are delegated to OpenSpec (from `/opsx:propose` onward) (INV4). Always leave parent intent and invariant references in the proposal/delta.
- Write the selection record defined by the common contract to `.intent/openspec/<slug>/constraint-selection.md`. Replace the entire file in the same run as proposal/delta, and do not treat a run that updates only one side as successful.
- Once the drafts are generated, write the export record into a **per-packet split file** `.intent/export-log/<packet-slug>.md` (following CONTRACT "Split and archive convention for append-only records"; since both cc-sdd and openspec write to each packet's file under the same split convention, the old tail-append collision on "the single log shared across export targets" disappears structurally). Derive `<packet-slug>` from the packet name via the existing slug rule (`intent-packets/rules/packet-format.md`) — do not create new/sequential numbering. The file holds the same table header as the scaffold (`| packet | exported_at | commit |`) plus the row `| <packet name> | <export datetime (ISO 8601 UTC)> | <commit hash> |` (append a row if the file exists; do not erase past rows). Obtain the commit hash by running `git rev-parse --short HEAD` (read-only); if it cannot be obtained, record `-`. Create the `.intent/export-log/` directory if absent.
- Then regenerate the old `.intent/export-log.md` as a **generated active mirror**: concatenate all data rows from `.intent/export-log/*.md` in `exported_at` ascending order and overwrite the mirror with the scaffold header + all rows (the split files are the source of truth; the mirror is derived, never hand-edited). This keeps single-file readers (status / validate / writeback / intent-check) from breaking. The mirror is folded in the later slice (wire) once reader cross-following is complete.

## Output Description
- The target packet's `.intent/openspec/<slug>/{proposal, spec-delta}.md` drafts (the `/opsx:propose` input proposal + delta hint skeleton)
- Regeneration proposal for the target packet's `.intent/openspec/<slug>/constraint-selection.md` (internal record, not passed downstream)
- One export-record row appended to `.intent/export-log.md`
- The target packet file's `state` update and the regeneration of `.intent/packets/index.md` when a draft was activated (omitted when none apply)
- Confirmation result for unanswered `[by export]` questions (the questions presented and the user's decision; omitted when none apply)
- Confirmation of whether it may be handed to OpenSpec (natural-language guidance; the lead)
- Copy block for `/opsx:propose` (fallback; secondary)
- Points to confirm before implementation
- Return-path guidance after the implementation goes around once (return to canonical via `/intent-writeback`; do not settle for writing Evidence directly into the packet)

### Plainness check for reports (user-facing reports; right before output; shared)

Right before emitting a user-facing report (progress, completion, items needing confirmation — including the end-of-turn summary), run this check (INV105, DR208). It applies only to user-facing report text, not to how internal records (canonical files and logs under `.intent/`) are written.

- **Do not transcribe internal documents verbatim**: text you just read or wrote in internal artifacts (tree, compass, packets, Open Questions) is written in internal vocabulary. In the report, restate that content in words a first-time reader understands (without changing facts or meaning).
- **Identifiers must not be the subject of the sentence**: when presenting an item to confirm or a unit of work, first write one sentence that stands on its own ("what and why"), then append identifiers (Open Question numbers, packet names, symbols, stage names) after it as references (e.g. "... please verify this before starting (ref: OQ-xxx-1)"). Do not delete identifiers or references to records for the sake of plainness (the trail back to the record is lost).
- **Signal for overload**: three or more unexplained internal terms in one sentence signal overload (read by meaning, not by mechanical count). If a sentence does not stand on its own, rewrite it in plain words before sending (without changing facts or meaning).
- **Do not convey meaning only through a metaphor or a vague qualifier**: the foundation of a report is precision — write so the meaning reads unambiguously (plain language is a means of staying easy to read while preserving it). Do not report results only with ungrounded qualifiers (e.g. "significantly", "nicely"); state observable facts. If you use a metaphor, pair it immediately with a precise restatement (do not force established technical terms, or ordinary words in their everyday sense, into strained paraphrases).
- This check works as a pair with the after-the-fact record (prevention alone is never enough): when a report failed to get through, log the case to the drift log while drift-watch is on, and feed the next prevention.

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
