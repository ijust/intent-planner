---
name: intent-writeback
description: After implementing an exported packet, record the learnings gained from the implementation into deltas.md as a delta, and promote only the approved items into the canonical deliverables (intent-tree / intent-compass / packets). Never edits the canonical deliverables directly.
---

# intent-writeback Skill

## Core Mission
- **Success Criteria**:
  - The target packet is identified as exactly one via the 4-tier priority (argument → latest row of export-log → Source Packet heading → text matching + confirmation)
  - Learnings from the 5 perspectives are extracted and presented by cross-checking the implementation reality against the packet definition and the compass
  - The learnings are first recorded into deltas.md as a delta, and the canonical deliverables are not edited directly
  - Only the approved items are reflected into the canonical deliverables, with Status and reflection targets recorded in the delta
  - Declined items carry one of the two tags "rejected (no re-proposal) | on-hold (re-propose at the next writeback)"
  - The completed packet has state: done, closed_at, and spec_refs filled in, has been moved to archive/<year>/, and index.md has been regenerated
  - No application code has been changed at all

## Execution Steps

### Step 1: Identify the target packet
- Read `rules/writeback-protocol.md` and identify exactly one target via the 4-tier priority (1. argument → 2. packet name in the latest row of export-log.md (canonical) → 3. "## Source Packet" heading in the drafts (only when exactly one packet directory exists) → 4. text matching + user confirmation (ask the user in natural language and wait for the answer)). When a fallback (tier 3 or later) identified the target, announce that fact; if the target still cannot be identified, ask for a specification and stop (see rules).
- Identify the target packet's file by matching `name` in index.md / under `active/` of `.intent/packets/`. If it is not under `active/`, refer to `archive/` explicitly to identify it and report the fact that the packet is done / superseded (the only explicit exception to the principle of normally never reading archive/; see rules).
- Read `.intent/mode.md`. If absent, continue with the standard default and announce it.
- Present the list of past delta entries of the target packet (including declined items with the "on-hold" tag). Writing back the same packet again creates a new entry (see rules).

### Step 2: Extract and present the learnings
- Cross-check the implementation reality (the codebase, tests, and `.kiro/specs/`; all read-only) against the packet definition (the target packet file), the cc-sdd drafts, and intent-compass.md.
- Extract learnings via the 5 perspectives of the rules ([decision] / [invariant-violation] / [implicit-behavior] / [deferred-resolved] / [question]) and present them as a tagged list.

### Step 3: Record the delta (canonical untouched)
- Record the extracted learnings into `.intent/deltas.md` as a new entry (Status: pending).
- If deltas.md is absent, create it anew from the canonical template embedded in the rules (never overwrite an existing file).
- At this stage, do not edit the canonical deliverables (intent-tree.md / intent-compass.md / the files under `.intent/packets/`) at all.

### Step 4: Confirm promotion (vary the approval granularity)
- Vary the approval granularity by the kind of learning (rules §3 Stage 2). Do not ask about every item uniformly, one at a time.
- **Gated items** (`[invariant-violation]` and `[decision]` that changes Decision Rules) are confirmed item by item: ask the user in natural language for promotion approval and wait for the answer.
- **Everything else** (L3-append kind and `[question]` transcription) is presented as a list of reflection targets; ask the user in natural language whether there is any item to hold back, wait for the answer, and promote in bulk if none is named.
- For items held back (not approved), ask the user in natural language for one of "rejected (no re-proposal) | on-hold (re-propose at the next writeback)" and wait for the answer.

### Step 5: Promote the approved items and finalize the records
- Reflect only the approved items into the canonical deliverables. A promotion that changes Decision Rules adds a new entry in the ADR form (Context / Decision / Why / Consequences) + a superseded note on the old entry + the evacuation of the old entry, with its 6 fields intact, into compass-archive.md (see rules).
- Transcribe [question] learnings into the Open Questions of intent-tree.md and record the transcription target as the reflection target.
- Record the Status (promoted / closed), the reflection targets, and the two-valued tags of declined items in the delta entry. The final tag updates from re-proposal results of on-hold items (promote / confirm rejection / keep on hold) are also done here.

### Step 6: Complete the packet
- When the writeback completes, perform the packet's completion as one sequence of operations (see rules): (1) fill in `state: done`, `closed_at`, and `spec_refs` (cross-checked against the specs in progress under `.kiro/specs/` and finalized with user confirmation) in the frontmatter → (2) move the file to `archive/<year of closed_at>/` → (3) regenerate index.md from the frontmatter under `active/`.

## Output Description
- The list of extracted learnings (tagged with the 5 perspectives)
- The delta recording result (the entry in deltas.md)
- The promotion proposal (gated items confirmed item by item; L3-append kind presented as a list plus naming any item to hold back)
- The promotion result (reflection target details and declined-item tags)
- The completion result (state: done / closed_at / spec_refs entries, the move to archive/<year>/, and the index.md regeneration)

## Safety & Fallback
- If the target packet cannot be identified, present the situation, ask the user to specify the write-back target, and stop.
- Never delete packet files (move to archive only). Shell command usage is limited to getting the date/time and directory creation (mkdir) and moves to archive under `.intent/packets/` (the invariant of not changing application code stays).
- If deltas.md is absent, create it anew from the template embedded in the rules (never overwrite an existing file).
- Never rewrite the canonical deliverables without approval. If nothing is approved, keep the entry pending and finish.
- `.kiro/specs/` and the codebase are read-only. Never write into `.kiro/`.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- Do not change application code (INV6).
