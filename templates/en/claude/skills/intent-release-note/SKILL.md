---
name: intent-release-note
description: Outward projection skill that reads git commit history read-only, matches each commit against intent to thicken "why it changed," and derives a release note under `.intent/release-note/`.
allowed-tools: Read, Glob, Grep, Bash, Write
argument-hint: <git range / format> (default range = latest tag..HEAD; `<from>..<to>` may be given; if no format is given, the default (changelog) is used and the output states which format was generated)
---

# intent-release-note Skill

## Core Mission
- **Success Criteria**:
  - Read the git log of the given range (default = latest tag..HEAD; `<from>..<to>` may be given via argument, with fallback) **read-only** (no commit / tag creation / push).
  - **Text-match** each commit against intent (packet name / parent intent / deltas / milestones) and, for matched ones, attach the "why (for which intent it changed)."
  - List unmatched commits as thin changelog lines, **surfacing the gap between intent and reality** (do not silently drop them).
  - Derive output under `.intent/release-note/` following a format (select `rules/format-changelog.md` / `rules/format-github-releases.md` / `rules/format-changelog-customer.md` / `rules/format-pr-description.md` by argument) by full replacement.
  - Change neither the canonical intent (intent-tree / compass / packets) nor the git state (INV16 / INV17).

## Execution Steps

### Step 1: Range interpretation (fix the range)
- When the user runs `/intent-release-note`, first interpret the range argument per `rules/source-scope.md`.
- The default (no range given) is **latest tag..HEAD** (find the latest tag with `git describe --tags --abbrev=0` and use `<tag>..HEAD`). If `<from>..<to>` is given, use it.
- If there is no latest tag and the default cannot be resolved, **fall back** to the full history and note this in the output (Fail-Soft). An invalid range argument is an explicit error and does not generate a release note.
- Once the range is fixed, proceed to Step 2 (the range is uniquely determined by argument + default + fallback, not dependent on interactive completion).

### Step 2: Read-only reading of the git log
- Per the **read-only allowlist** in `rules/source-scope.md`, read the commits of the fixed range read-only.
- Only read-only `git log` / `git tag` (listing) / `git describe` / `git rev-list` / `git rev-parse` / `git show` may be used.
- **Never invoke writing operations** (`git commit` / `git tag <name>` creation / `git push` / `git checkout` / `git switch` / `git reset` / `git restore` / `git merge` / `git rebase` / `git cherry-pick`, etc.) (INV16).
- Read each commit's hash, subject, body, author, and date as material.

### Step 3: Matching commits against intent (distinguish solid link = trailer / guess = text-match)
- **Read the Intent trailer as a solid link first (top priority; INV63)**: read the `Intent:` trailer at the end of each commit message (form `Intent: <packet name> (<packet_id>)`; it appears verbatim in the `git log` body). If the packet name or packet_id the trailer points to matches a packet under `.intent/packets/` (`active/` or `archive/`), treat that commit as a **solid link** to the intent and attach the "why (for which intent that packet, it changed)." A match on either the name or the id counts as solid.
  - **Trailer with an unknown target**: when a trailer is present but the packet it points to is not found under `.intent/packets/`, do not fill in by guessing — state "trailer present, target unknown" and fall back to the text-match (guess) below.
- **When there is no trailer, fall back to text-match (guess)**: commits without a trailer are **text-matched** against intent as before. The priority of matching material is (1) packet name → (2) parent intent → (3) deltas → (4) milestones. Match the contents under `.intent/` (`packets/` / `intent-tree.md` / `intent-compass.md` / `deltas.md` / `milestones.md`) and the commit messages, **within what is mechanically observable from files**. When multiple apply, take the highest-priority material.
- **Distinguish solid links from guesses (INV63; do not conflate)**: make the trailer-derived link (solid = the correspondence the committer stated) and the text-match-derived link (guess = the correspondence the tool inferred afterward) distinguishable in the output. Do not pass off a guess as a solid link.
- Matching follows the same temperature as the existing `intent-status`: **carry no machine scoring, threshold, or new discriminator** (AD23), and when confidence in a text-match (guess) is low, **propose as a candidate rather than asserting** (unmatched is the norm; tolerate false detections). Trailer matching is the mechanical observation of a packet name / packet_id match and carries no scoring.
- Commits that match none (no trailer and no text-match either) are **kept as thin changelog lines** (do not silently drop them; AD22).
- **The presence or absence of a trailer is not a commit's merit**: do not emit output that blames a commit for lacking a trailer or warns about the omission (the trailer is optional; INV63). The distinction is an information display of "solid link vs guess," not a penalty for a trailer-less commit.

### Step 4: Format mapping (state the format if default)
- Fix the format per `rules/format-select.md`. With argument `changelog` / `github-releases` / `changelog-customer` (customer-facing) / `pr-description` (PR description draft), or the default (changelog) if unspecified, and **state in the output which format was generated**.
- Hand the chosen format's output-structure rule (`rules/format-changelog.md` / `rules/format-github-releases.md` / `rules/format-changelog-customer.md` / `rules/format-pr-description.md`) the matched material from Step 3 (matched commits with their "why" + unmatched commits as thin lines) and assemble it.
- Do not hardcode the target format into the body (delegate to rules; AD24). The output structure itself is the format-* rule's responsibility; this SKILL owns git reading, matching, and delegation.

### Step 5: Derived Write (full replacement into `.intent/release-note/`)
- Write the assembled release note to `.intent/release-note/release-note.md` by **full replacement** (derived, regenerable). Only for the `pr-description` format, the output destination is `.intent/release-note/pr-description.md` (per the format rule's destination — never overwrite the generated changelog).
- Confine the write destination to under `.intent/release-note/`. Change neither the canonical intent (intent-tree / compass / packets) nor the git state (INV16 / INV17).
- When the target range contains no commits, state in the output that it is empty and change neither the canonical files nor git.

## Output Description

> **The output target is the terminal.** Use no raw HTML (`<details>` / `<summary>`, etc., collapsible UI) in the output; separate details with plain Markdown headings instead (in a terminal the raw tags are shown literally and become unreadable). Internal notations such as `[[...]]` (wikilinks for memory / delta) are legitimate in records written to delta / memory files, but in human-facing terminal output do not emit them raw — open them into ordinary words (spell the linked name out in plain prose).

- At the top of the output, show the target range (with a note if it fell back) and the format (stating it if the default was used).
- The body follows the chosen format's output structure (changelog-style = per-kind categories / github-releases-style = narrative + change list / customer-facing changelog = user-impact first / PR description draft = bottom-line-up-front 4 parts with one modest tool-attribution line at the end) (the layout of `rules/format-*.md`).
- List intent-matched commits with a "why" and unmatched commits as thin lines, so that the gap is readable.
- Show the link with a **distinction between solid link (from an Intent trailer = stated by the committer) and guess (from text-match = inferred by the tool afterward)** (do not conflate solid links and guesses; INV63). The distinction is an information display and does not blame a commit that lacks a trailer (the trailer is optional).

## Safety & Fallback
- **Read-only ownership boundary**: git is only read (only the Step 2 allowlist). Do not commit / create tags / push / change the working tree or refs (INV16).
- **Derived-output ownership boundary**: writes go only under `.intent/release-note/`. Do not rewrite the canonical intent (INV17).
- **Matching ownership boundary**: solid-link matching of the Intent trailer (a packet name / packet_id match) plus the guess of text-matching (no machine scoring; AD23). Do not conflate solid links and guesses (INV63). In a repo with no trailers, trailer matching finds nothing and it runs on text-matching alone = identical to the previous output (behavior-preserving). Do not drop the gap (keep thin lines; AD22). The trailer is optional and its presence or absence is not blamed.
- **Format ownership boundary**: delegate the output structure to `rules/format-*.md` and do not hardcode it into the body (AD24). Do not change the format-* output structure (fixed at the seam).
- **Error cases**: no tag → fallback + note. invalid range → explicit error, do not generate. empty range → state empty. In all cases, change neither git nor the canonical files.
