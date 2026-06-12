---
name: intent-status
description: Read-only guidance skill that reads the current state of .intent/ and recommends a summary of where you are plus exactly one "next move". Never creates, modifies, or deletes any file.
---

# intent-status Skill

## Core Mission
- **Success Criteria**:
  - The existence and fill state of the deliverables under `.intent/` (mode, intent-tree, intent-compass, packets, the per-packet cc-sdd draft directories, deltas) are read and a summary of the current position is presented
  - Exactly one "next move" is recommended via the first-match of `rules/decision-table.md`, accompanied by the reason and the judgment basis (which state of which deliverable it rests on)
  - The recommendation candidates are selected from discover / compass / packets / export / validate / improve / writeback / "no action needed"
  - When the enforcement in mode.md is remind or gate, a freshness check via intent-check is performed, and on detecting a violation (`result=stale` on the judgment line, or `pending` of 1 or more) a freshness warning quoting the intent-check stdout is included alongside the current-position summary (when off, unstated, an invalid value, or not executable, no warning is shown, as before)
  - No file has been created, modified, or deleted at all (read-only)

## Execution Steps

### Step 1: Confirm that `.intent/` exists
- If `.intent/` does not exist, guide the user through the setup procedure (running `npx github:ijust/intent-planner`) and finish.
- Read `.intent/mode.md`. If absent, continue with the standard default and add "mode undetermined; `/intent-discover` recommended" to the Open Questions (do not stop).

### Step 2: Read the deliverables
- Read `.intent/intent-tree.md` / `.intent/intent-compass.md` / `.intent/packets.md` / `.intent/cc-sdd/<slug>/*.md` (the per-packet draft directories) / `.intent/deltas.md` and grasp, for each, its present/absent/unfilled state and notable points (unresolved Questions, deltas with Status: pending, declined items tagged "on-hold", etc.).
- Identify the current Source Packet (latest export) by taking the packet name on the latest row (the last data row) of `.intent/export-log.md` as canonical. Resolution order: (1) explicit user specification → (2) the latest row of export-log (canonical) → (3) the `## Source Packet` heading of the drafts (adopt it only when exactly one packet directory exists; when multiple exist, list each directory's heading as candidates and do not assert) → (4) text matching between the draft bodies and packets.md (stay at presenting candidates in natural language; do not assert). When export-log.md is absent or its latest row cannot be interpreted and you fall back to (3) or later, include that fact in the Step 5 report.
- Check whether the current packet's directory (`.intent/cc-sdd/<slug>/`) exists. Identification between a packet name and a directory takes "the `## Source Packet` heading in the requirements.md inside the directory matches the packet name" as canonical (slug recomputation stays a fast path for searching; do not identify when the heading does not match).
- Legacy-format detection: when `*.md` files other than README.md exist directly under `.intent/cc-sdd/`, announce "legacy-format drafts remain; they will be migrated automatically into packet directories on the next `/intent-export-cc-sdd` run" (do not treat the coexistence of README.md and the legacy files as a healthy state).
- Read `.kiro/specs/` only when it exists, and use the spec.json and tasks.md check states of each spec as context. The corresponding spec is identified by text matching the Source Packet name against the spec directory names and the body of each spec's requirements.md "Project Description (Input)" (for the detailed matching rules, follow the footnotes of `rules/decision-table.md`).

### Step 3: Check freshness (enforcement-linked)
- Check the `enforcement` value in the `## Enforcement (user-managed)` section of `.intent/mode.md` read in Step 1. When it is `off`, unstated, or an invalid value, do not perform this Step (do not run intent-check and show no freshness warning; current behavior is preserved).
- When it is `remind` or `gate`, run `node .intent/scripts/intent-check.mjs` via Bash. When it cannot run (Bash unavailable, script absent, or exit 2), omit this Step and continue with the existing behavior.
- Trust the judgment line on the first line of stdout — `intent-check: result=<ok|stale|not-applicable> enforcement=<off|remind|gate> commits=<N|-> threshold=<M> grace=<in-implementation|-> pending=<K> block=<yes|no>` — as is, and never re-derive it. Treat it as a violation when `result=stale` or `pending` is 1 or more.
- When a violation is detected, include in the current-position summary of Step 5 a freshness warning quoting the intent-check stdout (the judgment line + the human-readable evidence lines). intent-check is a read-only script (it creates, modifies, and deletes no files), so the read-only nature of this skill is preserved.

### Step 4: Decide on one next move with the decision table
- Read `rules/decision-table.md` and decide exactly one "next move" via first-match (evaluate top-down and adopt only the first matching row).
- Never list multiple candidates side by side (the reason and basis are listed alongside). Even ambiguous cases where multiple recommendations seem visible are folded mechanically into one by the priority order of the decision table.

### Step 5: Report
- (1) Current-position summary: each deliverable's present/absent/unfilled state and notable points. Include the current Source Packet (the packet name based on the latest row of export-log) and whether its directory (`.intent/cc-sdd/<slug>/`) exists. When legacy-format drafts were detected, include the migration guidance; when a violation was detected in Step 3, include the freshness warning quoting the intent-check stdout.
- (2) The next move (exactly one): a skill name or "no action needed" + the recommendation reason + the judgment basis (which state of which deliverable it rests on).
- (3) Open Questions: points that need user confirmation. Confirmation stays at presenting candidates in natural language, leaving the next-action decision to the user (one-way reporting).

## Output Description
- Summary of the current position (existence and fill state per deliverable + notable points; includes the current Source Packet and whether its packet directory exists; when an enforcement violation is detected, includes the freshness warning quoting the intent-check stdout)
- Exactly one next move (with the recommendation reason and judgment basis)
- Open Questions for a human to confirm

## Safety & Fallback
- **Read-only declaration**: never create, modify, or delete any file (Bash is limited to launching the read-only script `node .intent/scripts/intent-check.mjs` and does not change this property).
- When `.intent/` is absent, guide the user through the setup procedure and finish.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- When enforcement is `off`, unstated, or an invalid value, do not run intent-check and show no freshness warning (current behavior). Even under `remind` or `gate`, when intent-check cannot run (Bash unavailable, script absent, or exit 2), omit the freshness check and continue.
- When `.intent/export-log.md` is absent or its latest row cannot be interpreted, fall back in order to the drafts' `## Source Packet` heading and then to text matching against packets.md (text matching stays at presenting candidates; do not assert), and include the fallback fact in the report.
- Works even in environments without `.kiro/specs/` (the applicable row follows the proviso-worded recommendation of `rules/decision-table.md`).
