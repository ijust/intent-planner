# Format Mapping: Changelog-Style (Keep a Changelog layout)

The output structure used by the `intent-release-note` skill (added in a later packet) to assemble the git commit history and the intent-matching result into a **Keep a Changelog-style release note**. SKILL.md owns the procedure (reading git, matching intent); "which material goes under which heading and in what order" is defined by this rule.

## Responsibility boundary (a structure definition, not reading or matching)

- This rule is a **format mapping (output structure definition)**. It only defines the section layout, categorization, and ordering of the release note.
- Procedures such as reading the git log, matching commits to intent (packet name / parent intent / deltas), and interpreting the range are **SKILL.md's responsibility**; this rule does not perform them (in this seam SKILL.md is not yet present; this rule is placed ahead as a container).
- The **judgment** of attaching a "why (for which intent)" to matched commits and leaving unmatched commits as thin lines (surfacing the gap) belongs to SKILL.md. This rule only defines **which structure that result is poured into**.
- That the output goes to a derived directory (`.intent/release-note/`, git-untracked, read-only) and never rewrites the canonical intent or git is the skill's invariant; this rule provides only the structure under that premise.

## Basic stance (classify changes and stack them chronologically)

The changelog style is a layout that **sorts the changes of one release (or one range) by category**. The reader is assumed to want to quickly grasp "what was added, changed, fixed, and removed in this version." Therefore:

- Under a version (or range) heading, distribute changes into category buckets by kind.
- Each entry is by default a concise single line; for entries tied to intent, append a brief "why" (the wording is prepared by SKILL.md; this rule places it under the relevant Added/Changed category).
- Do not invent changes absent from the material for the sake of layout (leave unmatched commits as thin lines).

## Structure (top to bottom)

| Order | Section | What goes here |
|---|---|---|
| 1 | Heading (version / range and date) | Identifies the target range (default: previous tag..HEAD) and the generation date |
| 2 | Added | Commits that constitute new features / additions |
| 3 | Changed | Commits that change or improve existing behavior |
| 4 | Fixed | Commits that are bug fixes |
| 5 | Removed | Commits that remove a feature or element |
| 6 | Other (uncategorized / unmatched changes) | Commits that cannot be categorized above or are not tied to intent, kept as thin lines (surfacing the gap) |

- Categories (2–5) follow the standard Keep a Changelog categories. Omit any category heading that has no matching commits (do not create empty headings).
- Section 6 is the bucket that keeps unmatched / uncategorizable commits as a thin single line **without silently dropping them**. Omit it if there is no material.
- The "why" note on each entry is the matching result SKILL.md attached; place it as-is within the relevant category (this rule does not re-match).

## Invariants

- Do not re-read or modify git or the canonical intent (reading and matching belong to SKILL.md; writes belong to SKILL.md's Write into the derived directory).
- Do not break the structure that classifies changes into per-kind categories (the core of the changelog-style layout).
- Place both the "why" of intent-matched commits and the thin lines of unmatched commits without dropping either (do not erase the gap).
- Do not add changes or background absent from the material for the sake of layout.
