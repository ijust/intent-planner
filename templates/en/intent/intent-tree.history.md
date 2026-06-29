# Intent Tree History (archived history)

> `/intent-writeback` and `/intent-improve` **move** the **Impact Analysis, shipped L4, and retired feature-addition sections** of completed features out of the `intent-tree.md` body into this file. The reader is a human, referencing it only when needed.
>
> **This is an archive, not a delete target.** Archived content remains greppable as an audit trail of "why the design was made that way" (immutability is delegated to git, but this file preserves current referenceability). The `intent-tree.md` body is kept to only the live L0–L4 skeleton, restoring the premise of the pull discipline (don't load the whole thing) = a light body.
>
> **Archiving is a move, not an edit.** When archiving, move the wording, numbering, and meaning that were in the body into this file **unchanged** (do not "fix old phrasing along the way" or "merge duplicates" = do not mix editing live canonical with archiving history).
>
> **Archiving discipline (same shape as A19's active-surface / history split)**:
> - **What**: the `## Impact Analysis (existing boundaries touched by …)` section of a completed feature, the "shipped (reference)" group of `## L4 Candidate Packets`, and retired `## Feature addition: <slug>` sections.
> - **When**: at the `/intent-writeback` completion of that feature (after learnings are returned to canonical and the feature has settled), or at the `/intent-improve` re-alignment.
> - **How**: cut the section from the body, append it to the end of this file with the frontmatter schema tag `status: archived` (see notation below), and remove it from the body side (move).
> - **When there is no archive target**: if this file is not created / absent, skip archiving and prompt for its creation (do not delete history; leave it in the body and state so).

## Archive notation (append to the end of this file)

Each archived block keeps the original heading and adds a one-line meta line right after it:

```
## Feature addition: <slug> (… / Mode: …)   ← keep the source heading unchanged
> status: archived | archived_at: <ISO 8601> | from: intent-tree.md
(below, the source body verbatim with wording and numbering unchanged)
```

- Grep `status: archived` to pull only the archived ones (live sections in the `intent-tree.md` body carry `status: active`, or are pulled by the backward-compatible read where an absent tag = live).
- Keep archived content behavior-preserving (do not change numbering, identifiers, or wording).
