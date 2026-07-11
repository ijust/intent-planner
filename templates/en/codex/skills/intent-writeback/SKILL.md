---
name: intent-writeback
description: After implementing an exported packet, record the learnings gained from the implementation into deltas.md as a delta, and promote only the approved items into the canonical deliverables (intent-tree / intent-compass / packets). Never edits the canonical deliverables directly.
---

# intent-writeback Skill

## Core Mission
- **Success Criteria**:
  - The target packet is identified as exactly one via the 5-tier priority (argument → latest row of export-log → Source Packet heading → direct-implementation route [explicit exit record `format=direct` primary, 3-condition AND inference fallback] → text matching + confirmation)
  - Learnings from the 5 perspectives are extracted and presented by cross-checking the implementation reality against the packet definition and the compass
  - The learnings are first recorded into deltas.md as a delta, and the canonical deliverables are not edited directly
  - Only the approved items are reflected into the canonical deliverables, with Status and reflection targets recorded in the delta
  - Declined items carry one of the two tags "rejected (no re-proposal) | on-hold (re-propose at the next writeback)"
  - The completed packet has state: done, closed_at, and spec_refs filled in, has been moved to archive/<year>/, and index.md has been regenerated
  - No application code has been changed at all

## Execution Steps

### Step 1: Identify the target packet
- Read `rules/writeback-protocol.md` and identify exactly one target via the 5-tier priority (1. argument → 2. packet name in the latest row of export-log.md (canonical) → 3. "## Source Packet" heading in the drafts (only when exactly one packet directory exists) → 4. direct-implementation route [for cases that bypass cc-sdd/openspec: use the explicit exit record `format=direct` as the primary signal, else fall back to the 3-condition AND inference of `spec_refs empty + no export-log row + state=done` and uniquify by `name` matching] → 5. text matching + user confirmation). When a fallback (tier 3 or later) identified the target, announce that fact; if the target still cannot be identified, ask for a specification and stop (see rules).
- Identify the target packet's file by matching `name` in index.md / under `active/` of `.intent/packets/`. If it is not under `active/`, refer to `archive/` explicitly to identify it and report the fact that the packet is done / superseded (the only explicit exception to the principle of normally never reading archive/; see rules).
- Read `.intent/mode.md`. If absent, continue with the standard default and announce it.
- Present the list of past delta entries of the target packet (including declined items with the "on-hold" tag). Writing back the same packet again creates a new entry (see rules).

### Step 2: Extract and present the learnings
- Cross-check the implementation reality (the codebase, tests, and `.kiro/specs/`; all read-only) against the packet definition (the target packet file), the cc-sdd drafts, and intent-compass.md.
- Extract learnings via the 5 perspectives of the rules ([decision] / [invariant-violation] / [implicit-behavior] / [deferred-resolved] / [question]) and present them as a tagged list. Show each learning as `[tag] <a plain one-sentence summary (REQUIRED)>` (a plain sentence an approver can read directly and grasp), adding an optional `解説 (note):` only when background, rationale, or implications are needed (the note is not required; a summary-only learning is the normal form; see rules §2/§9).

### Step 3: Record the delta (canonical untouched)
- Record the extracted learnings into `.intent/deltas.md` as a new entry (Status: pending).
- If deltas.md is absent, create it anew from the canonical template embedded in the rules (never overwrite an existing file).
- At this stage, do not edit the canonical deliverables (intent-tree.md / intent-compass.md / the files under `.intent/packets/`) at all.

### Step 4: Confirm promotion (vary the approval granularity)
- Vary the approval granularity by the kind of learning (rules §3 Stage 2). Do not ask about every item uniformly, one at a time. The primary information for approval is each learning's plain one-sentence summary; the note is secondary, supplied only when needed.
- **Gated items** (`[invariant-violation]` and `[decision]` that changes Decision Rules) are confirmed item by item.
- **Everything else** (L3-append kind and `[question]` transcription) is presented as a list of reflection targets; ask whether there is any item to hold back, and promote in bulk if none is named.
- For items held back (not approved), confirm one of "rejected (no re-proposal) | on-hold (re-propose at the next writeback)".
- Following the canonical promotion, confirm **promotion into the personal ledger (constraint-library)** (rules §3 Stage 3). Among `[decision]` / `[invariant-violation]` learnings, ask read-only whether to keep a reusable constraint in `.intent/constraint-library.md` (show a schema draft, the user decides, do not re-surface what is already there, do not auto-write, skip if the ledger is absent).

### Step 5: Promote the approved items and finalize the records
- Reflect only the approved items into the canonical deliverables. A promotion that changes Decision Rules adds a new entry in the ADR form (Context / Decision / Why / Consequences) + a superseded note on the old entry + the evacuation of the old entry, with its 6 fields intact, into compass-archive/<rule-slug>.md (a per-rule file; CONTRACT split & archive convention; see rules).
- Transcribe [question] learnings into the Open Questions of intent-tree.md and record the transcription target as the reflection target.
- Record the Status (promoted / closed), the reflection targets, and the two-valued tags of declined items in the delta entry. The final tag updates from re-proposal results of on-hold items (promote / confirm rejection / keep on hold) are also done here.

### Step 6: Complete the packet
- When the writeback completes, perform the packet's completion as one sequence of operations (see rules): (1) fill in `state: done`, `closed_at`, and `spec_refs` (cross-checked against the specs in progress under `.kiro/specs/` and finalized with user confirmation) in the frontmatter → (2) move the file to `archive/<year of closed_at>/` → (3) regenerate index.md from the frontmatter under `active/`.

## Output Description

> **The output target is the terminal.** Use no raw HTML (`<details>` / `<summary>`, etc., collapsible UI) in the output; separate details with plain Markdown headings instead (in a terminal the raw tags are shown literally and become unreadable). Internal notations such as `[[...]]` (wikilinks for memory / delta) are legitimate in records written to delta / memory files, but in human-facing terminal output do not emit them raw — open them into ordinary words (spell the linked name out in plain prose).

**Reader**: a human developer who promotes implementation learnings into intent and closes the packet.
**What this output makes them grasp first**: "**this is what was promoted to canonical / this is what was deferred**. The target packet became done and moved to archive." The process of extracting learnings and recording deltas is detail leading up to the promotion result.

Lead the output with the conclusion (the promotion result and the completion processing).

- **Promotion result (top)**: what was promoted to canonical (intent-tree / intent-compass / packets), with reflection-target details. Show the deferred items distinguished by their declined tag "rejected (no re-proposal) / on-hold (re-propose next time)".
- **Completion processing result (next)**: the target packet's `state: done` / `closed_at` / `spec_refs` entries, the move to `archive/<year>/`, and the index.md regeneration. Phrased so it is clear that "this packet is now closed".
- **Switch-over nudge (optional, one trailing line; INV82-(2)/DR143)**: writeback is a work break, so at the end of the completion report you may add exactly one read-only guidance line to the effect of "You can continue as is, or switch to a new session here; to switch over, you can generate a handoff brief with `/intent-overview`." (Optional; put the conclusion [the choices] first = bluf.) **But add it only when the AI has a qualitative sense that "the context is long"** (a work break AND the sense of length; stay silent in a short session). Before adding it, also weigh the trade-off (DR159): (1) the nature of the remaining work — do design decisions remain, or is it just doing what is already written; (2) how much session-specific tacit knowledge would be lost by handing over; (3) how natural this break point is. If the estimate is that not handing over is the better deal, do not recommend switching — stay silent (or add one line that continuing is the better deal). When you cannot estimate, lean toward staying silent. When you do recommend switching, attach the estimate as one qualitative line (no numbers). Do not read the conversation log or token amount, and emit no numbers (INV82-(2); the INV22 constraint). In an environment where the handoff-brief feature is not installed, do not emit the generation-trigger guidance (do not point at a dangling command). This is a read-only guidance line; it never cuts the session automatically, never writes out a brief on its own, and never corrects "continue" (the role boundary is unchanged).
- **Promotion proposals** (if shown at the stage that asks for approval): gated items (invariant violations / Decision Rules changes) confirmed item by item; the L3-append kind presented as a list + naming the items to hold back.
- **Details**: the list of extracted learnings (tagged with the 5 perspectives [decision]/[invariant-violation]/[implicit-behavior]/[deferred-resolved]/[question]; each line leads with its plain one-sentence summary and adds an optional note only when needed) and the delta recording result (the entry in deltas.md).

## Safety & Fallback
- If the target packet cannot be identified, present the situation, ask the user to specify the write-back target, and stop.
- Never delete packet files (move to archive only). Bash usage is limited to getting the date/time and directory creation (mkdir) and moves to archive under `.intent/packets/` (the invariant of not changing application code stays).
- If deltas.md is absent, create it anew from the template embedded in the rules (never overwrite an existing file).
- Never rewrite the canonical deliverables without approval. If nothing is approved, keep the entry pending and finish.
- `.kiro/specs/` and the codebase are read-only. Never write into `.kiro/`.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- Do not change application code (INV6).
