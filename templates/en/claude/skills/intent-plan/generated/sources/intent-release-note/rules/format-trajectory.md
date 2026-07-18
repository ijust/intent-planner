# Format mapping: trajectory (trajectory note)

The output-structure definition by which the `intent-release-note` skill assembles the change history under `.intent/` and the results of intent matching into **an inward-facing single sheet for retracing "when, what was decided, what changed" in chronological order** (a trajectory note). The reader is **your future self** (someone resuming their thinking after days away); this is the fifth output form alongside the existing `format-changelog.md` (developer-facing, per-kind categories) / `format-github-releases.md` (narrative + list) / `format-changelog-customer.md` (customer-facing, user-impact first) / `format-pr-description.md` (PR description draft).

## Responsibility boundary (an output-structure definition, not reading or matching)

- This rule is a **format mapping (output-structure definition)**. It defines only the trajectory note's section composition, ordering, and how each item is written out.
- Reading git log, matching commits against intent (packet name / parent intent / deltas), and interpreting the range are **SKILL.md's responsibilities**; this rule does none of them.

## Material narrowing (the change history under `.intent/` is the primary material; DR117)

- The primary material of this format is, among the matched material, **the commits that changed files under `.intent/`** (intent-compass, intent-tree, packets, deltas, etc.). **Do not read the application-code diff** (reading and summarizing code diffs is the existing changelog-family formats' domain; DR117).
- Commits with an Intent trailer serve as **auxiliary matching** for packet correspondence (the distinction between recorded and guessed correspondences follows the SKILL's existing discipline).

## Output destination (never overwrite the generated changelog)

- Write the output to `.intent/release-note/trajectory.md` by **full replacement** (derived, regenerable).
- Keep the file separate from the default `release-note.md` (the changelog-family formats' destination) so generating a trajectory note never overwrites the changelog output.

## Reader and design constraints (future self; written for humans)

The assumed reader is **your future self resuming interrupted thinking**. This reader wants the fastest path to "why did last-week's me decide this."

- **Chronological, newest first**: order from the most recent decision back into the past (the most recent context is needed first on resumption).
- **Not a commit listing**: bundle changes of the same kind (multiple commits belonging to the same packet or the same decision) into one item.
- **Traceable references**: attach to each item references that lead back to the evidence (commit, packet name, Invariant / Decision Rule numbers).

## Composition (three parts, top to bottom)

| Order | Section | What goes there |
|---|---|---|
| 1 | **Target range** | State the target range and the format (trajectory). Note the fallback if one was used |
| 2 | **Trajectory (newest first)** | A timeline of "date: what was decided, what changed." Attach traceable references to each item, and add a one-line "why" where the reason can be traced from the records. **Items whose reason cannot be traced are marked "no recorded reason"** (never narrativize by guessing) |
| 3 | **Changes not tied to intent** | Thin lines for the `.intent/` change commits that could not be matched (never silently dropped) |

- When a section has no material, state "none" in one line (do not silently remove the heading and make the reader search).

## Non-fabrication of reasons (paramount)

- For a change whose reason cannot be traced from the history or the delta records, **write no guessed motive and no after-the-fact narrative**. List it marked "no recorded reason" (never speak a reason absent from the history).
- If a guess is written at all, mark it inferred and never mix it with a recorded "why."

## Confidentiality line (INV67, inherited)

- Though inward-facing, write on the premise the note may be pasted outside. Include **summary plus identifiers** at most; never transcribe packet or compass body paragraphs as-is.

## Edge cases (what is not an error, and fail-fast)

- In a repo with no change history under `.intent/` at all (right after initialization), generate nothing and say so (fail-fast; do not create an empty note).
- When the range has no commits, follow the SKILL's default (state that it is empty).

## Invariants

- Never re-read or modify git or the canonical artifacts (reading and matching are SKILL.md's responsibility; writing is SKILL.md's Write into the derived directory).
- Do not read the application-code diff (DR117).
- Never fabricate a reason absent from the material for the sake of form (marking "no recorded reason" is the default; a guess carries the inferred marker).
- Do not touch the existing four formats' (changelog / github-releases / changelog-customer / pr-description) output structures or destinations (pure addition).
