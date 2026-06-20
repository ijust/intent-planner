---
name: intent-release-note
description: An outward projection skill that reads the git commit history read-only, text-matches each commit against intent (packet name / parent intent / deltas) to thicken the "why it changed," and derives a release note under `.intent/release-note/` in a format (changelog-style / github-releases-style). It never modifies git or the canonical intent (read-only). [This file is the seam-stage container (placeholder); the real implementation of git-log reading, intent matching, and the transformation logic is added in a later skill packet.]
---

# intent-release-note Skill (seam placeholder)

> **This file is the seam-stage container (placeholder).** The release note feature is stacked by Additive Slicing in the order seam → skill → wire. This seam packet places "the scaffold for the derived output location `.intent/release-note/`," "the output-structure definitions (rules) of `format-changelog` / `format-github-releases`," and "the Git-untracking wiring into the user project (install.mjs)." **The git-log reading, intent matching of commits, transformation logic, and source-scope interpretation are not yet implemented in this file; they are added in a later skill packet.**

## Core Mission (to-be; implemented in the skill packet)

- **Success Criteria (planned)**:
  - Read the git log of the given range (default = latest tag..HEAD; `<from>..<to>` may be given via argument, with fallback) **read-only** (no commit / tag / push).
  - **Text-match** each commit against intent (packet name / parent intent / deltas / milestones) and, for matched ones, attach the "why (for which intent it changed)."
  - List unmatched commits as thin lines, **surfacing the gap between intent and reality** (do not silently drop them).
  - Derive output under `.intent/release-note/` following a format (select `rules/format-changelog.md` / `rules/format-github-releases.md` by argument) by full replacement.

## Invariants (premises already held at the seam stage)

- **Read-only (INV16)**: Only reads git, never rewrites it. Does not rewrite the canonical intent (intent-tree / compass / packets) either.
- **Derived output (INV17)**: The output destination is confined to `.intent/release-note/` (git-untracked, read-only). Never made canonical.
- **Format separation (DR8 / avoid AD24)**: The output structure is separated into `rules/format-*.md` and not hardcoded into the body.
- **Do not drop the gap (AD22)**: Keep unmatched commits as thin lines.

## References

- Output structure definitions: `rules/format-changelog.md` (Keep a Changelog style) / `rules/format-github-releases.md` (GitHub Releases style).
- Nature of the output location: `.intent/release-note/README.md` (derived / untracked / read-only / not the source of truth).
