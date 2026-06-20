---
name: intent-release-note
description: An outward projection skill that reads the git commit history read-only, text-matches each commit against intent (packet name / parent intent / deltas / milestones) to thicken the "why it changed," and derives a release note under `.intent/release-note/` in a format (changelog-style / github-releases-style). It never modifies git or the canonical intent (read-only). Unmatched commits are kept as thin lines, surfacing the gap between intent and reality.
---

# intent-release-note Skill

## Core Mission
- **Success Criteria**:
  - Read the git log of the given range (default = latest tag..HEAD; `<from>..<to>` may be given via argument, with fallback) **read-only** (no commit / tag creation / push).
  - **Text-match** each commit against intent (packet name / parent intent / deltas / milestones) and, for matched ones, attach the "why (for which intent it changed)."
  - List unmatched commits as thin changelog lines, **surfacing the gap between intent and reality** (do not silently drop them).
  - Derive output under `.intent/release-note/` following a format (select `rules/format-changelog.md` / `rules/format-github-releases.md` by argument) by full replacement.
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

### Step 3: Text-matching commits against intent (propose candidates, do not assert)
- **Text-match** each commit against intent. The priority of matching material is (1) packet name → (2) parent intent → (3) deltas → (4) milestones. Match the contents under `.intent/` (`packets/` / `intent-tree.md` / `intent-compass.md` / `deltas.md` / `milestones.md`) and the commit messages, **within what is mechanically observable from files**.
- For a commit that text-matches any of them, attach the "why (for which intent it changed)." When multiple apply, take the highest-priority material.
- Matching follows the same temperature as the existing `intent-status`: **carry no machine scoring, threshold, or new discriminator** (AD23), and when confidence is low, **propose as a candidate rather than asserting** (unmatched is the norm; tolerate false detections).
- Commits that match none are **kept as thin changelog lines** (do not silently drop them; AD22).

### Step 4: Format mapping (state the format if default)
- Fix the format per `rules/format-select.md`. With argument `changelog` / `github-releases`, or the default (changelog) if unspecified, and **state in the output which format was generated**.
- Hand the chosen format's output-structure rule (`rules/format-changelog.md` or `rules/format-github-releases.md`) the matched material from Step 3 (matched commits with their "why" + unmatched commits as thin lines) and assemble it.
- Do not hardcode the target format into the body (delegate to rules; AD24). The output structure itself is the format-* rule's responsibility; this SKILL owns git reading, matching, and delegation.

### Step 5: Derived Write (full replacement into `.intent/release-note/`)
- Write the assembled release note to `.intent/release-note/release-note.md` by **full replacement** (derived, regenerable).
- Confine the write destination to under `.intent/release-note/`. Change neither the canonical intent (intent-tree / compass / packets) nor the git state (INV16 / INV17).
- When the target range contains no commits, state in the output that it is empty and change neither the canonical files nor git.

## Output Description
- At the top of the output, show the target range (with a note if it fell back) and the format (stating it if the default was used).
- The body follows the chosen format's output structure (changelog-style = per-kind categories / github-releases-style = narrative + change list) (the layout of `rules/format-*.md`).
- List intent-matched commits with a "why" and unmatched commits as thin lines, so that the gap is readable.

## Safety & Fallback
- **Read-only ownership boundary**: git is only read (only the Step 2 allowlist). Do not commit / create tags / push / change the working tree or refs (INV16).
- **Derived-output ownership boundary**: writes go only under `.intent/release-note/`. Do not rewrite the canonical intent (INV17).
- **Matching ownership boundary**: text-matching only (no machine scoring; AD23). Do not drop the gap (keep thin lines; AD22).
- **Format ownership boundary**: delegate the output structure to `rules/format-*.md` and do not hardcode it into the body (AD24). Do not change the format-* output structure (fixed at the seam).
- **Error cases**: no tag → fallback + note. invalid range → explicit error, do not generate. empty range → state empty. In all cases, change neither git nor the canonical files.
