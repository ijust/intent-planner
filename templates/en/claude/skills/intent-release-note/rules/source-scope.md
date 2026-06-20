# Source Scope Interpretation (git range interpretation, read-only)

The source of truth by which the `intent-release-note` skill interprets the user-specified range (git range) and reads the commits in that range read-only. SKILL.md owns only the procedure and reporting format; "how to interpret the range and which read-only git commands to read with" is defined by this rule. This rule only **reads** the git history; it never modifies the git state (commit / tag / branch / working tree) or the canonical `.intent/*.md` (writes go only under `.intent/release-note/`, and that is SKILL.md's responsibility).

## Posture (no custom parser; read git and interpret)

Range interpretation and commit reading carry no custom parser, schema, or index; they read the output of read-only git commands directly. No new structure is introduced; git's commit messages, tags, and dates are treated as material as-is.

## Range interpretation (argument + default + fallback)

Starting from the range argument the user gave to `/intent-release-note`, the target range is interpreted as follows.

| Input | What it means | Resolution |
|---|---|---|
| No range given | Use the default range | **latest tag..HEAD** (from the latest reachable tag to HEAD). Find the latest tag with `git describe --tags --abbrev=0` and target `<tag>..HEAD` |
| `<from>..<to>` given | Use the explicit range | Target the given `<from>..<to>` as-is |

- If the argument uniquely determines the range, perform no interactive completion (do not add unnecessary questions; do not depend on prompting the user back, and uniquely determine via default + fallback).

## Error cases (Fail-Soft and explicit error)

| Situation | Behavior |
|---|---|
| No latest tag exists and the default range cannot be resolved | **Fallback**: target the full history (first commit..HEAD) and note in the output that "the full history was targeted because there is no tag" (Fail-Soft). If a range is given, fall back to that range |
| The given range argument is invalid (uninterpretable) | **Explicit error**: report that the range cannot be interpreted and do not generate a release note (do not output with a wrong range) |
| The target range contains no commits | State in the output that it is empty and change neither the canonical files nor git |

## Read-only git command allowlist (writes strictly forbidden)

Use **only the following read-only commands** to resolve the range and read commits.

- Allowed (read-only usage only): `git log` / `git tag` (listing only; creating usages such as `-a` / `-m` are not allowed) / `git describe` / `git rev-list` / `git rev-parse` / `git show`.
- **Forbidden (never invoke)**: `git commit` / `git tag <name>` (creation) / `git push` / any writing fetch / `git checkout` / `git switch` / `git reset` / `git restore` / `git merge` / `git rebase` / `git cherry-pick` / any other operation that changes the working tree, refs, or remote.

Do not change the git state (INV16). This rule only resolves the range and hands the material to read to SKILL.md; it does not perform matching, format mapping, or the destination Write.

## Invariants

- Only re-reads git, never modifies it (read-only; writes are SKILL.md's responsibility into `.intent/release-note/`).
- Do not break the interpretation rules for the default range (latest tag..HEAD), the argument range, fallback, and the invalid-range error.
- Do not add commands outside the read-only allowlist (do not introduce writing operations).
- Do not bring custom machine scoring or thresholds into range interpretation (matching is the responsibility of SKILL.md's Step 3; this rule does range resolution only).
