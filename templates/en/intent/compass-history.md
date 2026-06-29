# Compass History (archived history)

> `/intent-writeback` and `/intent-improve` **move** the **feature-specific premortem-derived Anti-direction blocks** (`### <feature>-specific (premortem: …)`) of completed features out of the `intent-compass.md` body into this file. The reader is a human, referencing it only when needed.
>
> **This differs in purpose from `compass-archive.md`.** `compass-archive.md` is the dedicated file for archiving *superseded Decision Rules entries* in their 6-field form. This file `compass-history.md` archives *the premortem-derived Anti-directions of completed features* (and feature-specific supplementary blocks). The two are not mixed.
>
> **This is an archive, not a delete target.** Archived content remains greppable as an audit trail of "what was feared when developing that feature." The `intent-compass.md` body is kept to only the live skeleton — North Star / Direction / universal Anti-direction / universal Invariants / Decision Rules — restoring the premise of the pull discipline.
>
> **Archiving is a move, not an edit.** Move the Anti-direction numbering, wording, and meaning into this file unchanged.
>
> **Archiving discipline (same shape as A19's active-surface / history split)**:
> - **What**: the `### <feature>-specific (premortem: …)` Anti-direction block of a completed feature (a derivation of that feature's collapse scenario at development time, of low value to reference live after completion).
> - **When**: at the `/intent-writeback` completion of that feature, or at the `/intent-improve` re-alignment.
> - **How**: cut the block from the body, append it to the end of this file with the frontmatter schema tag `status: archived` (see notation below), and remove it from the body side (move). Do not archive universal Anti-directions (common to all work) or the Anti-directions of live features.
> - **When there is no archive target**: if this file is not created / absent, skip archiving and prompt for its creation (do not delete history; leave it in the body and state so).

## Archive notation (append to the end of this file)

```
### <feature>-specific (premortem: …)   ← keep the source heading unchanged
> status: archived | archived_at: <ISO 8601> | from: intent-compass.md
(below, the source Anti-direction items verbatim with numbering and wording unchanged)
```

- Grep `status: archived` to pull only the archived ones.
- Keep archived content behavior-preserving (do not change Anti-direction numbering or wording).
