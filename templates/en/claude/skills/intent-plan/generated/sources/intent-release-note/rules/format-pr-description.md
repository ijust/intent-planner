# Format mapping: pr-description (PR description draft)

Defines the output structure the `intent-release-note` skill uses to assemble the git commit history and intent-matching results into a **draft you can paste directly into a GitHub Pull Request description**. SKILL.md owns the procedure, git reading, and intent matching; "which material goes under which heading, in which order" is defined here. This is the fourth output form alongside the existing `format-changelog.md` (developer-facing, by category), `format-github-releases.md` (narrative + list), and `format-changelog-customer.md` (customer-facing, user-impact first).

## Responsibility boundary (output structure only — no reading, no matching)

- This rule is a **format mapping (output structure definition)**. It defines only the section layout, ordering, and how each item leads.
- Reading git log, matching commits against intent (packet name / parent intent / deltas), and interpreting the range are **SKILL.md's responsibility**, not this rule's.
- **This format never invokes gh** (no `gh pr create`, no direct update of a PR body — no write to GitHub of any kind). The output is a draft; applying it to GitHub (pasting into the PR description field) is **done by a person**. This format carries no external write path.

## Output destination (do not overwrite the existing changelog output)

- Write the output to `.intent/release-note/pr-description.md` with **full replacement** (derived, regenerable).
- Keep the file separate from the default `release-note.md` (the changelog-family output), so generating a PR draft never overwrites and destroys a generated changelog.

## Reader and design constraints (bottom line up front, impact first)

The reader is a **busy reviewer or teammate**. Before a pile of diffs, they want to know "what is this PR for, and where should I look first".

- **Bottom line up front (BLUF)**: lead the draft with the points to judge and the review focus. Do not open with background.
- **Impact first**: lead with "what changes and how it affects the reader", not a list of commits.
- **Plain language (A33)**: when an identifier appears (packet name, packet_id, Invariant / Decision Rule number), add a one-line plain-language gloss on first use. Do not transcribe internal design-document vocabulary as-is.

## Structure (4 parts, top to bottom)

| Order | Section | What goes here |
|---|---|---|
| 1 | **Intent summary** (why this change) | Summarize in a few lines the intent the commits in range serve (the matched "why"). If no intent can be matched, do not pad with speculation: state "no intent recorded", or mark anything written as inferred |
| 2 | **Relevant decision criteria** | References to the Invariants / Decision Rules this change upholds (identifier + one-line gloss). Pull **only what is relevant** (no exhaustive listing from the whole compass) |
| 3 | **Review focus** (what to check first) | (a) checkpoints for whether human-fixed decisions (the packet's Human-fixed slots) are upheld by the implementation (b) the acceptance oracles (the packet Validation's discriminative tests) and where to verify them (c) the Scope / Non-scope boundary (where to watch for scope creep). Every item carries a **reference to an existing statement** in the packet / compass (this draft makes no new claims of its own) |
| 4 | **Commit-to-intent mapping** | List commits distinguishing solid links (from Intent trailers) from guesses (from text matching). **Keep unmatched commits as thin lines** (never drop them silently, never fill them by guessing) |

- When a section has no material, state that in one line (do not silently drop the heading and make the reader hunt).

## Tool attribution at the end (one line only)

- Place one **modest line** at the end of the draft noting it was generated with intent-planner (e.g. `_This PR description was drafted with intent-planner._`).
- The attribution is **one line at the end only** — do not embed it in multiple places, do not make it read like an ad. It is a draft, so a person may delete the line before pasting.

## Confidentiality line (INV67 — strict)

- What leaves is **summary plus identifiers** at most. Do not transcribe paragraphs of packet bodies or compass bodies.
- Do not put `.intent/` / `.kiro/` internal paths, dogfooding development context, customer names, or incident details into the draft (a PR body is part of the history — it can become public).
- The information-design floor: only people who can follow the identifiers (people with repository access) reach the internal details.

## Degraded case (thin draft — this is not an error)

- A range with no Intent trailers and no text-match links is **not an error**: generate a **thin draft** whose mapping section holds only thin lines, and state "no intent recorded" in the intent summary (trailers are optional; their absence is the normal case).
- When the range has no commits, follow the SKILL's default (state explicitly that it is empty).

## Invariants

- Never re-read or modify git / canonical files (reading and matching belong to SKILL.md; writing is SKILL.md's Write into the derived directory).
- Never invoke gh (zero external writes; pasting is done by a person).
- Never transcribe beyond the summary-plus-identifiers line (INV67).
- Never break the thin-line rule for unmatched commits or the solid/guess distinction.
- Never fabricate intent that is not in the material (mark guesses as inferred).
- The tool attribution is exactly one line at the end (neither missing nor inflated).
