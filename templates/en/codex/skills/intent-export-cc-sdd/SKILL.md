---
name: intent-export-cc-sdd
description: Convert one chosen packet into a condensed draft that can be handed to cc-sdd without wasting tokens. Does not intrude on cc-sdd's main generation. Can invoke /kiro-spec-init when instructed to proceed.
---

# intent-export-cc-sdd Skill

## Core Mission
- **Success Criteria**:
  - One target packet is converted into a condensed cc-sdd Project Description + design/tasks hints
  - The input is limited to the target packet + the compass's Invariants/Anti-direction, and the full Tree/Compass is not transcribed into cc-sdd
  - The tasks hints carry parent intent / invariant references, forming a propagation structure to impl
  - The output is led by natural-language guidance, and `/kiro-spec-init` can be invoked when instructed to proceed
  - No application code has been changed at all

## Execution Steps

### Step 1: Narrow down to one target packet
- Read `.intent/packets.md`. If absent, guide the user to "run `/intent-packets` first" and stop.
- If a packet is specified by argument, use it; otherwise narrow down to one by priority or by asking the user in natural language and waiting for their answer.
- Read `.intent/mode.md`. If absent, continue with the standard default and announce it.

### Step 1.5: Enforcement gate (writeback freshness check)
- From the `## Enforcement (user-managed)` section of the `.intent/mode.md` read in Step 1, check the value of `enforcement`. If it is off, missing, or an invalid value (including mode.md being absent), skip this check and continue to Step 2 as today.
- When it is remind or gate, run `node .intent/scripts/intent-check.mjs` (a read-only script; it creates, modifies, and deletes no files) and follow its stdout.
- **Interpretation rules for the verdict line**: the stop decision is governed solely by `block=` on the first stdout line (do not re-derive or reinterpret). Whether a warning is needed is decided by `result=stale` or `pending>0`. Even when `result=not-applicable`, use the value of `pending=` from the verdict line as is.
- When gate and `block=yes`: present the grounds (the pending packet names and the elapsed commit count / threshold; quote intent-check's human-readable lines from the second line onward verbatim), stop the export, and guide the user to run `/intent-writeback`. Then ask the user in natural language whether to "proceed with the export anyway" and wait for their answer; only when the user explicitly instructs to proceed, run the export with a warning attached (the escape hatch for false positives).
- When remind and a violation is detected (`result=stale` or `pending>0`): present the same grounds as a warning and continue without stopping.
- Only when intent-check itself cannot run (command execution unavailable, script absent, or exit 2): treat staleness as not-applicable, read `.intent/deltas.md` to check for pending Delta entries (those carrying `- Status: pending`), and enter the same branches above using that result as `pending`.

### Step 1.7: Confirm unanswered Open Questions
- Read and apply `rules/export-questions.md`.

### Step 2: Apply the mapping rules
- Read and apply `rules/map-cc-sdd.md`.
- The input is only the one target packet + the Invariants/Anti-direction of `.intent/intent-compass.md` (do not read the full Tree or other packets. Only when direction is needed, reference a summary of Tree L0–L1).

### Step 3: Generate the draft
- Write the condensed Project Description (the cc-sdd input body) into `.intent/cc-sdd/requirements.md`.
- Write design hints (bullets) into `.intent/cc-sdd/design.md`, and an "Intent-derived constraints" section + tasks check items into `.intent/cc-sdd/tasks.md`.
- Do not complete the cc-sdd main body. Always leave parent intent and invariant references in the tasks hints.
- Once the drafts are generated, append one row to `.intent/export-log.md`: `| <packet name> | <export datetime (ISO 8601 UTC)> | <commit hash> |` (do not erase past rows). Obtain the commit hash by running `git rev-parse --short HEAD` (read-only); if it cannot be obtained (not a git repository, etc.), record `-` and continue the export. If export-log.md is absent, create it anew with the same table header as the scaffold (`| packet | exported_at | commit |`).

### Step 4: Guide the handoff (natural-language led)
- The lead of the output is natural-language guidance: show the path of `.intent/cc-sdd/requirements.md` and confirm "may this be handed to cc-sdd as is" by asking the user in natural language and waiting for their answer.
- When the user instructs to proceed, read the body of `.intent/cc-sdd/requirements.md` and invoke `/kiro-spec-init` with that body as the argument (do not force the user to copy-paste).
- As a fallback, also include a newline-minimized copy block for `/kiro-spec-init` (not the lead).
- **Delegation goes only up to invoking `/kiro-spec-init`**. The subsequent requirements → design → tasks follow cc-sdd's 3-phase approval, waiting for the user's instruction to proceed at each phase. Do not push ahead automatically.

## Output Description
- Proposed update to `.intent/cc-sdd/{requirements, design, tasks}.md`
- One export-record row appended to `.intent/export-log.md`
- Confirmation result for unanswered `[by export]` questions (the questions presented and the user's decision; omitted when none apply)
- Confirmation of whether it may be handed to cc-sdd (natural-language guidance; the lead)
- Copy block for `/kiro-spec-init` (fallback; secondary)
- Points to confirm before implementation

## Safety & Fallback
- If packets.md is absent, stop and guide the user to `/intent-packets`.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- The enforcement check is fail-open: even when intent-check cannot run, do not block the export. The export stops only when enforcement is gate and the verdict line says `block=yes`, or when the unrunnable fallback finds pending deltas under gate; even then the user's explicit instruction to proceed lets it run.
- The Open Questions check is a confirmation, not a stop; the user's explicit instruction to proceed lets the export run.
- Do not complete the main body of cc-sdd's requirements/design/tasks (drafts/hints only).
- Do not auto-invoke cc-sdd phases beyond `/kiro-spec-init`.
- Do not change application code (INV6. Invoking other skills is a concept distinct from INV6 and is allowed).
