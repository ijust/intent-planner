# intent-status recommendation decision table (first-match, evaluated top-down)

The canonical source the `intent-status` skill uses to decide exactly one "next move". SKILL.md holds only the procedure and the report format; the decision is made by referencing this table. Every condition must be mechanically observable from files (status has only Read/Glob/Grep and cannot reference git history, timestamps, or code diffs directly; the sole exception is row 9, which is limited to observation via the judgment line of the read-only script `node .intent/scripts/intent-check.mjs` — see footnote 4).

| # | Condition (observable from files) | Recommendation |
|---|------|------|
| 1 | `.intent/` absent | Setup guidance (then finish) |
| 2 | intent-tree unfilled or mode undetermined | `/intent-discover` |
| 3 | compass unfilled | `/intent-compass` |
| 4 | packets unfilled | `/intent-packets` |
| 5 | An **explicit wording conflict** with Invariants/Anti-direction detected in packets while reading (limited to the "must-fix" class of validate-checks) | `/intent-validate` |
| 6 | Deltas with Status: pending are lingering | `/intent-writeback` (resume promotion) |
| 7 | No delta entry corresponding to the current Source Packet (latest export), **and evidence of implementation completion exists** (all tasks checked in the corresponding `.kiro/specs/` spec. When `.kiro/` is absent this row still applies, but the recommendation wording must append the proviso "implementation completion is the precondition; if unfinished, continue the cc-sdd implementation") | `/intent-writeback` |
| 8 | No delta entry corresponding to the current Source Packet, and the corresponding spec is **implementation in progress** (tasks unfinished) | No action needed (note: continue the cc-sdd implementation; run `/intent-writeback` after completion) |
| 9 | enforcement (the `## Enforcement (user-managed)` section of mode.md) is remind or gate, and the intent-check judgment line is stale with no grace (`grace=-` and `result=stale`) | `/intent-writeback` (clear the staleness) |
| 10 | Declined items tagged "on-hold" remain | `/intent-improve` (prompt re-proposal or confirming the rejection; the final tag update is done by `/intent-writeback`) |
| 11 | packets.md contains a packet without a delta entry, and it does not match the current Source Packet (whether it was exported is determined by whether a row exists in export-log.md → list candidates + with user confirmation) | `/intent-validate` (if no problem is found, the user then chooses `/intent-export-cc-sdd` or `/intent-writeback`) |
| 12 | None of the above | No action needed (standing note: recommend periodic `/intent-improve` at implementation milestones) |

## Footnotes

1. The priority order guarantees "exactly one" via first-match (evaluate top-down and adopt only the first matching row; never list multiple candidates side by side). Every row's condition is judged solely from what is written in `.intent/` (+ the spec.json and tasks.md check states under `.kiro/specs/` when present).
2. The "corresponding spec" in rows 7/8 is identified by text matching the Source Packet name against the **spec directory names under `.kiro/specs/` and the body of each spec's requirements.md "Project Description (Input)"**; when it cannot be identified, fall to the `.kiro/`-absent side of row 7 (the recommendation with the proviso wording). Exports do not record a feature name, so unmatchable cases are designed as the normal state, and the limitation when they are frequent is also included in the known limitations of the deltas.md operating notes.
3. "User confirmation" in row 11 and elsewhere means presenting candidates in natural language and leaving the next-action decision to the user. status is read-only, one-way reporting, and does not use an interactive confirmation tool. Per-packet drafts (`.intent/cc-sdd/<packet-slug>/`, untracked by Git, local-only) persist, and the export history is recorded in `.intent/export-log.md`, so candidates for "a packet that was exported in the past but never written back" can be enumerated mechanically by cross-checking all rows of export-log.md × the surviving `.intent/cc-sdd/<packet-slug>/` drafts × deltas.md (row 11 adds user confirmation to that candidate list). This cross-check procedure is also stated in the deltas.md operating notes.
4. The condition of row 9 is observed solely from the judgment line on the first line of the stdout of `node .intent/scripts/intent-check.mjs` (a read-only script under the Bash-limited exception; it creates, modifies, and deletes no files) and is never re-derived. When enforcement is off, unstated, or an invalid value, or when intent-check cannot run (Bash unavailable, script absent, or exit 2), this row does not match (current behavior). Lingering pending deltas are picked up earlier by row 6, so this row is dedicated to staleness (no grace).
