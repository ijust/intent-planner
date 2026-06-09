---
name: intent-export-cc-sdd
description: Convert one chosen packet into a condensed draft that can be handed to cc-sdd without wasting tokens. Does not intrude on cc-sdd's main generation. Can invoke /kiro-spec-init when instructed to proceed.
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Skill
argument-hint: <target packet name (optional)>
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
- If a packet is specified by argument, use it; otherwise narrow down to one by priority or user confirmation.
- Read `.intent/mode.md`. If absent, continue with the standard default and announce it.

### Step 2: Apply the mapping rules
- Read and apply `rules/map-cc-sdd.md`.
- The input is only the one target packet + the Invariants/Anti-direction of `.intent/intent-compass.md` (do not read the full Tree or other packets. Only when direction is needed, reference a summary of Tree L0–L1).

### Step 3: Generate the draft
- Write the condensed Project Description (the cc-sdd input body) into `.intent/cc-sdd/requirements.md`.
- Write design hints (bullets) into `.intent/cc-sdd/design.md`, and an "Intent-derived constraints" section + tasks check items into `.intent/cc-sdd/tasks.md`.
- Do not complete the cc-sdd main body. Always leave parent intent and invariant references in the tasks hints.

### Step 4: Guide the handoff (natural-language led)
- The lead of the output is natural-language guidance: show the path of `.intent/cc-sdd/requirements.md` and confirm "may this be handed to cc-sdd as is".
- When the user instructs to proceed, read the body of `.intent/cc-sdd/requirements.md` and invoke `/kiro-spec-init` with that body as the argument (use `Skill`. Do not force the user to copy-paste).
- As a fallback, also include a newline-minimized copy block for `/kiro-spec-init` (not the lead).
- **Delegation goes only up to invoking `/kiro-spec-init`**. The subsequent requirements → design → tasks follow cc-sdd's 3-phase approval, waiting for the user's instruction to proceed at each phase. Do not push ahead automatically.

## Output Description
- Proposed update to `.intent/cc-sdd/{requirements, design, tasks}.md`
- Confirmation of whether it may be handed to cc-sdd (natural-language guidance; the lead)
- Copy block for `/kiro-spec-init` (fallback; secondary)
- Points to confirm before implementation

## Safety & Fallback
- If packets.md is absent, stop and guide the user to `/intent-packets`.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- Do not complete the main body of cc-sdd's requirements/design/tasks (drafts/hints only).
- Do not auto-invoke cc-sdd phases beyond `/kiro-spec-init`.
- Do not change application code (INV6. Invoking other skills is a concept distinct from INV6 and is allowed).
