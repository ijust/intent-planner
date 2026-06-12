---
name: intent-export-cc-sdd
description: Convert one chosen packet into a condensed draft that can be handed to cc-sdd without wasting tokens. Does not intrude on cc-sdd's main generation. Can invoke /kiro-spec-init when instructed to proceed.
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Skill, Bash
argument-hint: <target packet name (optional)>
---

# intent-export-cc-sdd Skill

## Core Mission
- **Success Criteria**:
  - One target packet is converted into a condensed cc-sdd Project Description + design/tasks hints
  - The input is limited to the target packet file + the compass's project-universal Invariants/Anti-direction, and the full Tree/Compass is not transcribed into cc-sdd
  - The tasks hints carry parent intent / invariant references, forming a propagation structure to impl
  - The output is led by natural-language guidance, and `/kiro-spec-init` can be invoked when instructed to proceed
  - No application code has been changed at all

## Execution Steps

### Step 1: Narrow down to one target packet
- Read `.intent/packets/index.md` and present the active packet candidates. If index.md is absent, build the candidate list directly from the frontmatter of the files under `.intent/packets/active/`, continue, and prompt regeneration of the index. If `.intent/packets/` itself is absent (or `active/` is empty), guide the user to "run `/intent-packets` first" and stop.
- If a packet is specified by argument, use it; otherwise narrow down to one from the candidates by priority or user confirmation, and read only the file of the confirmed target packet (under `.intent/packets/active/`) — do not bulk-read all packet files.
- **Draft guard**: when the confirmed target packet's `state` is draft, confirm via AskUserQuestion whether to "activate it and continue the export"; once the user approves, update the frontmatter `state` to active and regenerate `index.md` before continuing (never export a draft as is without confirmation; this activation is the only canonical write the export makes).
- Read `.intent/mode.md`. If absent, continue with the standard default and announce it.

### Step 1.5: Enforcement gate (writeback freshness check)
- From the `## Enforcement (user-managed)` section of the `.intent/mode.md` read in Step 1, check the value of `enforcement`. If it is off, missing, or an invalid value (including mode.md being absent), skip this check and continue to Step 2 as today.
- When it is remind or gate, run `node .intent/scripts/intent-check.mjs` with Bash (a read-only script; it creates, modifies, and deletes no files) and follow its stdout.
- **Interpretation rules for the verdict line**: the stop decision is governed solely by `block=` on the first stdout line (do not re-derive or reinterpret). Whether a warning is needed is decided by `result=stale` or `pending>0`. Even when `result=not-applicable`, use the value of `pending=` from the verdict line as is.
- When gate and `block=yes`: present the grounds (the pending packet names and the elapsed commit count / threshold; quote intent-check's human-readable lines from the second line onward verbatim), stop the export, and guide the user to run `/intent-writeback`. Then confirm via AskUserQuestion whether to "proceed with the export anyway", and only when the user explicitly instructs to proceed, run the export with a warning attached (the escape hatch for false positives).
- When remind and a violation is detected (`result=stale` or `pending>0`): present the same grounds as a warning and continue without stopping.
- Only when intent-check itself cannot run (Bash unavailable, script absent, or exit 2): treat staleness as not-applicable, check `.intent/deltas.md` for pending Delta entries (those carrying `- Status: pending`) via Read/Grep, and enter the same branches above using that result as `pending`.

### Step 1.7: Confirm unanswered Open Questions
- Read and apply `rules/export-questions.md`.

### Step 1.8: Legacy draft migration
- Detect any `*.md` files other than README.md directly under `.intent/cc-sdd/` (drafts in the legacy single-slot format). If none exist, do nothing and continue to Step 2.
- When found, read each file's `## Source Packet` heading to identify the owning packet name, and move the file into the `.intent/cc-sdd/<slug>/` directory derived by the slug rule of `rules/map-cc-sdd.md`. Files naming the same packet move together into the same directory.
- After moving, report the source → destination list to the user.
- For files whose `## Source Packet` heading is absent or undecidable, confirm the destination via AskUserQuestion. Never move without confirmation.
- The migration moves only draft files under `.intent/cc-sdd/`; do not change application code (INV6 stays).

### Step 2: Apply the mapping rules
- Read and apply `rules/map-cc-sdd.md`.
- The input is only the one target packet file (including the packet-specific invariants in Safety / Invariants) + the project-universal Invariants/Anti-direction of `.intent/intent-compass.md` (do not read the full Tree or other packets. Only when direction is needed, reference a summary of Tree L0–L1).

### Step 3: Generate the draft
- Write the drafts under the per-packet directory `.intent/cc-sdd/<slug>/`. The slug derivation and collision handling follow the "Output layout" section of `rules/map-cc-sdd.md`.
- Write the condensed Project Description (the cc-sdd input body) into `.intent/cc-sdd/<slug>/requirements.md`.
- Write design hints (bullets) into `.intent/cc-sdd/<slug>/design.md`, and an "Intent-derived constraints" section + tasks check items into `.intent/cc-sdd/<slug>/tasks.md`.
- Do not complete the cc-sdd main body. Always leave parent intent and invariant references in the tasks hints.
- Once the drafts are generated, append one row to `.intent/export-log.md`: `| <packet name> | <export datetime (ISO 8601 UTC)> | <commit hash> |` (do not erase past rows). Obtain the commit hash by running `git rev-parse --short HEAD` (read-only) with Bash; if it cannot be obtained (not a git repository, etc.), record `-` and continue the export. If export-log.md is absent, create it anew with the same table header as the scaffold (`| packet | exported_at | commit |`).

### Step 4: Guide the handoff (natural-language led)
- The lead of the output is natural-language guidance: show the path of the target packet's `.intent/cc-sdd/<slug>/requirements.md` and confirm "may this be handed to cc-sdd as is".
- When the user instructs to proceed, read the body of the target packet's `.intent/cc-sdd/<slug>/requirements.md` and invoke `/kiro-spec-init` with that body as the argument (use `Skill`. Do not force the user to copy-paste).
- As a fallback, also include a newline-minimized copy block for `/kiro-spec-init` (not the lead).
- **Delegation goes only up to invoking `/kiro-spec-init`**. The subsequent requirements → design → tasks follow cc-sdd's 3-phase approval, waiting for the user's instruction to proceed at each phase. Do not push ahead automatically.

## Output Description
- Proposed update to the target packet's `.intent/cc-sdd/<slug>/{requirements, design, tasks}.md`
- One export-record row appended to `.intent/export-log.md`
- The target packet file's `state` update and the regeneration of `.intent/packets/index.md` when a draft was activated (omitted when none apply)
- The source → destination list when legacy drafts were migrated (omitted when none apply)
- Confirmation result for unanswered `[by export]` questions (the questions presented and the user's decision; omitted when none apply)
- Confirmation of whether it may be handed to cc-sdd (natural-language guidance; the lead)
- Copy block for `/kiro-spec-init` (fallback; secondary)
- Points to confirm before implementation

## Safety & Fallback
- If `.intent/packets/` is absent (or `active/` is empty), stop and guide the user to `/intent-packets`.
- The absence of index.md does not stop; build the candidates directly from the files under `active/`, continue, and prompt regeneration of the index.
- The only canonical write is the draft-guard activation (`state` update + `index.md` regeneration), and only with the user's approval. Never rewrite intent-tree / intent-compass / packet bodies.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- The enforcement check is fail-open: even when intent-check cannot run, do not block the export. The export stops only when enforcement is gate and the verdict line says `block=yes`, or when the unrunnable fallback finds pending deltas under gate; even then the user's explicit instruction to proceed lets it run.
- The Open Questions check is a confirmation, not a stop; the user's explicit instruction to proceed lets the export run.
- Legacy draft migration runs unattended only when `## Source Packet` identifies the owning packet; files that cannot be identified are never moved without user confirmation.
- Do not complete the main body of cc-sdd's requirements/design/tasks (drafts/hints only).
- Do not auto-invoke cc-sdd phases beyond `/kiro-spec-init`.
- Do not change application code (INV6. Invoking other skills is a concept distinct from INV6 and is allowed).
