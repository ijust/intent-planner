# Format Mapping: GitHub-Releases-Style (GitHub Releases layout)

The output structure used by the `intent-release-note` skill (added in a later packet) to assemble the git commit history and the intent-matching result into a **GitHub Releases-style release note**. SKILL.md owns the procedure (reading git, matching intent); "which material goes under which heading and in what order" is defined by this rule.

## Responsibility boundary (a structure definition, not reading or matching)

- This rule is a **format mapping (output structure definition)**. It only defines the section layout, how highlights are surfaced, and the ordering of the release note.
- Procedures such as reading the git log, matching commits to intent (packet name / parent intent / deltas), and interpreting the range are **SKILL.md's responsibility**; this rule does not perform them (in this seam SKILL.md is not yet present; this rule is placed ahead as a container).
- The **judgment** of attaching a "why (for which intent)" to matched commits and leaving unmatched commits as thin lines (surfacing the gap) belongs to SKILL.md. This rule only defines **which structure that result is poured into**.
- That the output goes to a derived directory (`.intent/release-note/`, git-untracked, read-only) and never rewrites the canonical intent or git is the skill's invariant; this rule provides only the structure under that premise.

## Basic stance (the release story on top, details below)

The GitHub-releases style is a layout that **reads one release top-to-bottom as a narrative**. The reader is assumed to first grasp "what is good about this release (highlights)" and then descend into the change list if needed. Therefore:

- Put the release title and a short summary (the gist of this release) at the very top.
- Surface a few noteworthy changes as "Highlights" first, together with the intent-tied "why."
- Place the exhaustive change list after the highlights (as skippable detail).
- Do not invent outcomes absent from the material for the sake of layout (leave unmatched commits as thin lines in the change list).

## Structure (top to bottom)

| Order | Section | What goes here |
|---|---|---|
| 1 | Release title | A title identifying the target range (default: previous tag..HEAD) (tag name, version, etc.) |
| 2 | Summary (the gist of this release) | A short summary of what this release as a whole achieved |
| 3 | Highlights | A few noteworthy changes, surfaced first with the intent-tied "why" |
| 4 | What's Changed | An exhaustive list of changes in the range; intent-tied ones carry a "why," unmatched ones are thin lines (surfacing the gap) |
| 5 | Contributors (if any) | Contributors within the range, only when the material (git author) is available |

- Sections 1–4 are the base structure. Do not reorder them (the title → summary → highlights → change list "narrative" order is the core of the GitHub-releases-style layout).
- For sections 3 (Highlights) and 4 (What's Changed), place what SKILL.md judged "noteworthy" during matching into Highlights and the rest into the change list (this rule does not re-match).
- In section 4, keep unmatched commits as a thin single line **without silently dropping them**.
- Omit section 5 if the material (git author) is unavailable (do not create empty headings).

## Invariants

- Do not re-read or modify git or the canonical intent (reading and matching belong to SKILL.md; writes belong to SKILL.md's Write into the derived directory).
- Do not break the title → summary → highlights → change list "narrative" order (the core of the GitHub-releases-style layout).
- Place both the "why" of intent-matched commits and the thin lines of unmatched commits without dropping either (do not erase the gap).
- Do not add outcomes or background absent from the material for the sake of layout.
