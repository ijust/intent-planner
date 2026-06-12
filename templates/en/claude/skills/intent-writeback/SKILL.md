---
name: intent-writeback
description: After implementing an exported packet, record the learnings gained from the implementation into deltas.md as a delta, and promote only the approved items into the canonical deliverables (intent-tree / intent-compass / packets). Never edits the canonical deliverables directly.
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
argument-hint: <target packet name (optional)>
---

# intent-writeback Skill

## Core Mission
- **Success Criteria**:
  - The target packet is identified as exactly one via the 4-tier priority (argument → latest row of export-log → Source Packet heading → text matching + confirmation)
  - Learnings from the 5 perspectives are extracted and presented by cross-checking the implementation reality against the packet definition and the compass
  - The learnings are first recorded into deltas.md as a delta, and the canonical deliverables are not edited directly
  - Only the approved items are reflected into the canonical deliverables, with Status and reflection targets recorded in the delta
  - Declined items carry one of the two tags "rejected (no re-proposal) | on-hold (re-propose at the next writeback)"
  - No application code has been changed at all

## Execution Steps

### Step 1: Identify the target packet
- Read `rules/writeback-protocol.md` and identify exactly one target via the 4-tier priority (1. argument → 2. packet name in the latest row of export-log.md (canonical) → 3. "## Source Packet" heading in the drafts (only when exactly one packet directory exists) → 4. text matching + user confirmation). When a fallback (tier 3 or later) identified the target, announce that fact; if the target still cannot be identified, ask for a specification and stop (see rules).
- Read `.intent/mode.md`. If absent, continue with the standard default and announce it.
- Present the list of past delta entries of the target packet (including declined items with the "on-hold" tag). Writing back the same packet again creates a new entry (see rules).

### Step 2: Extract and present the learnings
- Cross-check the implementation reality (the codebase, tests, and `.kiro/specs/`; all read-only) against the packet definition (packets.md), the cc-sdd drafts, and intent-compass.md.
- Extract learnings via the 5 perspectives of the rules ([decision] / [invariant-violation] / [implicit-behavior] / [deferred-resolved] / [question]) and present them as a tagged list.

### Step 3: Record the delta (canonical untouched)
- Record the extracted learnings into `.intent/deltas.md` as a new entry (Status: pending).
- If deltas.md is absent, create it anew from the canonical template embedded in the rules (never overwrite an existing file).
- At this stage, do not edit the canonical deliverables (intent-tree.md / intent-compass.md / packets.md) at all.

### Step 4: Confirm promotion item by item
- Present the learnings item by item and confirm promotion approval (do not force bulk approval).
- For items not approved, confirm one of "rejected (no re-proposal) | on-hold (re-propose at the next writeback)".

### Step 5: Promote the approved items and finalize the records
- Reflect only the approved items into the canonical deliverables. A promotion that changes Decision Rules adds a new entry in the ADR form (Context / Decision / Why / Consequences) + a superseded note on the old entry (see rules).
- Transcribe [question] learnings into the Open Questions of intent-tree.md and record the transcription target as the reflection target.
- Record the Status (promoted / closed), the reflection targets, and the two-valued tags of declined items in the delta entry. The final tag updates from re-proposal results of on-hold items (promote / confirm rejection / keep on hold) are also done here.

## Output Description
- The list of extracted learnings (tagged with the 5 perspectives)
- The delta recording result (the entry in deltas.md)
- The promotion proposal (per-item approval confirmation)
- The promotion result (reflection target details and declined-item tags)

## Safety & Fallback
- If the target packet cannot be identified, present the situation, ask the user to specify the write-back target, and stop.
- If deltas.md is absent, create it anew from the template embedded in the rules (never overwrite an existing file).
- Never rewrite the canonical deliverables without approval. If nothing is approved, keep the entry pending and finish.
- `.kiro/specs/` and the codebase are read-only. Never write into `.kiro/`.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- Do not change application code (INV6).
