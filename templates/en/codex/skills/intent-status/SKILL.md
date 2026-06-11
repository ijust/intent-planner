---
name: intent-status
description: Read-only guidance skill that reads the current state of .intent/ and recommends a summary of where you are plus exactly one "next move". Never creates, modifies, or deletes any file.
---

# intent-status Skill

## Core Mission
- **Success Criteria**:
  - The existence and fill state of the deliverables under `.intent/` (mode, intent-tree, intent-compass, packets, cc-sdd drafts, deltas) are read and a summary of the current position is presented
  - Exactly one "next move" is recommended via the first-match of `rules/decision-table.md`, accompanied by the reason and the judgment basis (which state of which deliverable it rests on)
  - The recommendation candidates are selected from discover / compass / packets / export / validate / improve / writeback / "no action needed"
  - No file has been created, modified, or deleted at all (read-only)

## Execution Steps

### Step 1: Confirm that `.intent/` exists
- If `.intent/` does not exist, guide the user through the setup procedure (running `npx github:ijust/intent-planner`) and finish.
- Read `.intent/mode.md`. If absent, continue with the standard default and add "mode undetermined; `/intent-discover` recommended" to the Open Questions (do not stop).

### Step 2: Read the deliverables
- Read `.intent/intent-tree.md` / `.intent/intent-compass.md` / `.intent/packets.md` / `.intent/cc-sdd/*.md` / `.intent/deltas.md` and grasp, for each, its present/absent/unfilled state and notable points (unresolved Questions, deltas with Status: pending, declined items tagged "on-hold", etc.).
- Identify the current Source Packet (latest export) from the "## Source Packet" heading in `.intent/cc-sdd/*.md`. Fallback when the heading is absent/unclear: raise candidates by text matching the cc-sdd draft body against the packet names in packets.md, and stay at presenting candidates in natural language (do not assert).
- Read `.kiro/specs/` only when it exists, and use the spec.json and tasks.md check states of each spec as context. The corresponding spec is identified by text matching the Source Packet name against the spec directory names and the body of each spec's requirements.md "Project Description (Input)" (for the detailed matching rules, follow the footnotes of `rules/decision-table.md`).

### Step 3: Decide on one next move with the decision table
- Read `rules/decision-table.md` and decide exactly one "next move" via first-match (evaluate top-down and adopt only the first matching row).
- Never list multiple candidates side by side (the reason and basis are listed alongside). Even ambiguous cases where multiple recommendations seem visible are folded mechanically into one by the priority order of the decision table.

### Step 4: Report
- (1) Current-position summary: each deliverable's present/absent/unfilled state and notable points.
- (2) The next move (exactly one): a skill name or "no action needed" + the recommendation reason + the judgment basis (which state of which deliverable it rests on).
- (3) Open Questions: points that need user confirmation. Confirmation stays at presenting candidates in natural language, leaving the next-action decision to the user (one-way reporting).

## Output Description
- Summary of the current position (existence and fill state per deliverable + notable points)
- Exactly one next move (with the recommendation reason and judgment basis)
- Open Questions for a human to confirm

## Safety & Fallback
- **Read-only declaration**: never create, modify, or delete any file.
- When `.intent/` is absent, guide the user through the setup procedure and finish.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- When the "## Source Packet" heading is absent, stay at presenting candidates via the text-matching fallback between the draft body and the packet names in packets.md.
- Works even in environments without `.kiro/specs/` (the applicable row follows the proviso-worded recommendation of `rules/decision-table.md`).
