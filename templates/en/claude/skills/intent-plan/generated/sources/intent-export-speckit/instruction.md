---
name: intent-export-speckit
description: Convert one chosen packet into a specify input + spec hints that can be handed to GitHub Spec Kit without wasting tokens. Does not intrude on Spec Kit's main generation. Can invoke /speckit.specify when instructed to proceed.
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Skill, Bash
argument-hint: <target packet name (optional)>
---

# intent-export-speckit Skill

## Core Mission
- **Success Criteria**:
  - One target packet is converted into a Spec Kit specify input + spec hints (parent intent / Invariant references + a one-line note that reflecting into constitution is the user's call)
  - Common selection uses only the target packet file + the result returned by `.intent/execution-contract.md`; with `selection_status: applied`, project-wide constraints are projected only from `selected`, without directly transcribing Tree/Compass
  - The specify input, spec hints, and internal `constraint-selection.md` are updated in the same run, and the internal record is not passed to Spec Kit
  - When the execution contract is absent, the export is marked `legacy-not-applied` and preserves the existing packet + Compass input and placement
  - The spec hints carry parent intent / invariant references, forming a propagation structure to impl
  - The output is led by natural-language guidance, and `/speckit.specify` can be invoked when instructed to proceed
  - The output is confined to `.intent/speckit/` and does not touch `.intent/cc-sdd/` / `.intent/openspec/`
  - No application code has been changed at all

## Execution Steps

### Step 1: Narrow down to one target packet
- Read `.intent/packets/index.md` and present the active packet candidates. If index.md is absent, build the candidate list directly from the frontmatter of the files under `.intent/packets/active/`, continue, and prompt regeneration of the index. If `.intent/packets/` itself is absent (or `active/` is empty), guide the user to "run `/intent-packets` first" and stop.
- If a packet is specified by argument, use it; otherwise narrow down to one from the candidates by priority or user confirmation, and read only the file of the confirmed target packet (under `.intent/packets/active/`) — do not bulk-read all packet files.
- **Draft guard**: when the confirmed target packet's `state` is draft, confirm via AskUserQuestion whether to "activate it and continue the export"; once the user approves, update the frontmatter `state` to active and regenerate `index.md` before continuing (never export a draft as is without confirmation; this activation is the only canonical write the export makes).
- Read the mode state in order: the inherited issue directory's `discovery/<slug>-<rand>/mode.md` (A34; inherit the issue name that discover output) → else the single `.intent/mode.local.md` (legacy) → else old `.intent/mode.md` (the CONTRACT.md read fallback contract). If both are absent, continue with the standard default and announce it.

### Step 1.5: Enforcement gate (writeback freshness check)
- From the `## Enforcement (user-managed)` section of the `.intent/mode.md` read in Step 1, check the value of `enforcement`. If it is off, missing, or an invalid value (including mode.md being absent), skip this check and continue to Step 1.6 as today.
- When it is remind or gate, run `node .intent/scripts/intent-check.mjs` with Bash (a read-only script; it creates, modifies, and deletes no files) and follow its stdout.
- **Interpretation rules for the verdict line**: the stop decision is governed solely by `block=` on the first stdout line (do not re-derive or reinterpret). Whether a warning is needed is decided by `result=stale` or `pending>0`. Even when `result=not-applicable`, use the value of `pending=` from the verdict line as is.
- When gate and `block=yes`: present the grounds (the pending packet names and the elapsed commit count / threshold; quote intent-check's human-readable lines from the second line onward verbatim), stop the export, and guide the user to run `/intent-writeback`. Then confirm via AskUserQuestion whether to "proceed with the export anyway", and only when the user explicitly instructs to proceed, run the export with a warning attached (the escape hatch for false positives).
- When remind and a violation is detected (`result=stale` or `pending>0`): present the same grounds as a warning and continue without stopping.
- Only when intent-check itself cannot run (Bash unavailable, script absent, or exit 2): treat staleness as not-applicable, check `.intent/deltas.md` for pending Delta entries (those carrying `- Status: pending`) via Read/Grep, and enter the same branches above using that result as `pending`.

### Step 1.6: Drift Check (drift-watch)
- Check the value of `drift-watch` in the `## Drift-watch (user-managed)` section of the `.intent/mode.md` read in Step 1. When it is not `on` (including off, unspecified, invalid value, missing section, or missing mode.md), do not perform this check; continue to Step 1.7 as today (byte-identical to current behavior).
- Only when it is `on`, read and apply `rules/drift-export-check.md`. The matching of the target packet's specify input/spec hints × compass (North Star / Anti-direction / Invariants), the named presentation of conflicts, appending a `stage: export` entry to drift-log, and resolving the outcome by the user's verdict are all delegated to the rule's procedure (do not duplicate the procedure here).
- This check is **warn-only and does not stop the export** (only the Step 1.5 enforcement gate can stop; drift-watch never stops because it assumes false positives).
- Order and orthogonality of the three checkpoints: **enforcement (procedure, may stop, Step 1.5) → drift-watch (direction, never stops, Step 1.6) → Open Questions (deadline, never stops, Step 1.7)**. Their inspection targets are orthogonal (procedure / direction / deadline).

### Step 1.7: Confirm unanswered Open Questions
- Read and apply `rules/export-questions.md`.

### Step 1.8: Preflight check of the Spec Kit prerequisite (warn only — do not stop)
- Observe read-only whether the **`.specify/` directory at the repository root** (the Spec Kit tool's marker) exists (Read/Glob; do not push this onto a mechanical check such as `intent-check.mjs`). It is **distinct from `.intent/speckit/` (this skill's own draft output directory)**; do not mistake the output directory for the prerequisite marker.
- When the repository-root `.specify/` is **absent**: **warn** that Spec Kit may not be set up. Guide: "The Spec Kit prerequisite (the `.specify/` directory at the repository root) was not found. Set up Spec Kit, or — if a readable artifact is the goal — the format-axis projection (an exit to a readable Spec) is also available." (The choice of exit follows the exit decision lane in `rules/export-route.md`; this SKILL does not name other export/projection skills' commands.) **Do not stop the draft generation** (continue to Step 2 onward).
- When the repository-root `.specify/` **exists**: emit nothing and continue to Step 2 (as before — no warn).
- This check is **warn only — it does not stop the export** (only the Step 1.5 enforcement gate can stop; the preflight follows drift-watch's false-positive-tolerant stance and does not stop — it does not foreclose adding `.specify/` later). Because Spec Kit's entry contract `/speckit.specify` cannot be observed read-only, the repository-root `.specify/` is used as a proxy marker for it being set up.

### Step 2: Apply the mapping rules
- Read and apply `rules/map-speckit.md`.
- Read the one target packet file (including the packet-specific invariants in Safety / Invariants) and the common selection result from `.intent/execution-contract.md`. With `selection_status: applied`, project-wide constraints come only from `selected` in the common result. Only when the execution contract is absent, use `legacy-not-applied` and continue with the existing packet + Compass input. Do not read the full Tree or other packets; only when direction is needed, reference a summary of Tree L0–L1.

### Step 3: Generate the draft
- Write the drafts under the per-packet directory `.intent/speckit/<slug>/`. The slug derivation and collision handling follow the "Output layout" section of `rules/map-speckit.md`. Continuing to export multiple packets never overwrites another packet's directory.
- Write the specify input (the natural-language feature description) into `.intent/speckit/<slug>/specify-input.md`, shaped so the minimal and always-valid "feature description" text for `/speckit.specify` can be derived from its opening.
- Write the spec hints into `.intent/speckit/<slug>/spec-hints.md` (parent intent / Invariant references + a one-line note that "reflecting into constitution.md is the user's call" + points for reconciling with the spec.md Spec Kit generated).
- In the same run, replace the entire file `.intent/speckit/<slug>/constraint-selection.md` as the internal record. Do not append, and do not treat a run as successful when only the drafts or only the internal record can be written. With `legacy-not-applied`, mark selected and confirmation candidates not applicable and retain only the reference to the existing primary downstream file `specify-input.md`.
- Do not complete the Spec Kit main body. Keep the spec hints to reconciliation points; the completion of spec.md is delegated to Spec Kit (from `/speckit.specify` onward) (INV4). Always leave parent intent and invariant references in the specify input/spec hints.
- Once the drafts are generated, write the export record into a **per-packet split file** `.intent/export-log/<packet-slug>.md` (following CONTRACT "Split and archive convention for append-only records"; since every export target writes to each packet's file under the same split convention, the old tail-append collision on "the single log shared across export targets" disappears structurally). Derive `<packet-slug>` from the packet name via the existing slug rule (`intent-packets/rules/packet-format.md`) — do not create new/sequential numbering. The file holds the same table header as the scaffold (`| packet | exported_at | commit |`) plus the row `| <packet name> | <export datetime (ISO 8601 UTC)> | <commit hash> |` (append a row if the file exists; do not erase past rows). Obtain the commit hash by running `git rev-parse --short HEAD` (read-only) with Bash; if it cannot be obtained, record `-`. Create the `.intent/export-log/` directory if absent.
- Then regenerate the old `.intent/export-log.md` as a **generated active mirror**: concatenate all data rows from `.intent/export-log/*.md` in `exported_at` ascending order and overwrite the mirror with the scaffold header + all rows (the split files are the source of truth; the mirror is derived, never hand-edited). This keeps single-file readers (status / validate / writeback / intent-check) from breaking.

<!-- intent-plan:downstream-start -->
### Step 4: Guide the handoff (natural-language led)
- The lead of the output is natural-language guidance: show the paths of the target packet's `.intent/speckit/<slug>/specify-input.md` and `spec-hints.md` and confirm "may this be handed to Spec Kit as is".
- When the user instructs to proceed, read the feature description from the target packet's `.intent/speckit/<slug>/specify-input.md` and invoke `/speckit.specify` with that as the argument (use `Skill`. Do not force the user to copy-paste).
- Pass only `specify-input.md` to `/speckit.specify`; do not pass the internal `constraint-selection.md` downstream.
- As a fallback, also include a copyable feature-description block for `/speckit.specify` (not the lead). Where the invocation cannot succeed (e.g., `/speckit.specify` is not installed), this copy block lets the handoff happen.
- **Delegation goes only up to invoking `/speckit.specify`**. The subsequent plan / tasks / implement workflows follow Spec Kit, and we do not push ahead automatically.
- **Make the return path explicit (the entry to the writeback phase)**: at the end of the guidance, add one line that once the Spec Kit implementation has gone around once (once learnings emerge from the reality of implementation), they are returned to the canonical deliverables via `/intent-writeback`. Do not settle for writing post-implementation learnings directly into the packet file as Evidence; always go through writeback (via a delta). This guidance makes the phase boundary explicit to the user: "pre-implementation drafting (compass/packets write canonical directly)" vs. "post-implementation extraction (writeback via a delta)".

<!-- intent-plan:downstream-end -->
## Output Description
- The target packet's `.intent/speckit/<slug>/{specify-input, spec-hints}.md` drafts (the `/speckit.specify` input feature description + spec hints)
- The target packet's `.intent/speckit/<slug>/constraint-selection.md` (the internal selection record, not passed downstream)
- One export-record row appended to `.intent/export-log.md`
- The target packet file's `state` update and the regeneration of `.intent/packets/index.md` when a draft was activated (omitted when none apply)
- Confirmation result for unanswered `[by export]` questions (the questions presented and the user's decision; omitted when none apply)
- Confirmation of whether it may be handed to Spec Kit (natural-language guidance; the lead)
- Copy block for `/speckit.specify` (fallback; secondary)
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
- Do not complete the main body of Spec Kit's spec / plan (drafts/hints only).
- Do not auto-invoke the Spec Kit workflow beyond `/speckit.specify` (plan / tasks / implement, etc.).
- Confine the output to `.intent/speckit/` and do not write into `.intent/cc-sdd/` / `.intent/openspec/`. Do not write into the repository-root `.specify/` / `specs/` / constitution.md either.
- Do not change application code (INV6. Invoking other skills is a concept distinct from INV6 and is allowed).
