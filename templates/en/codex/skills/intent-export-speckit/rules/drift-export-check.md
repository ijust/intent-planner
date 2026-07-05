# Drift Export Check

The matching logic used at Step 1.6 of `/intent-export-speckit`: the target packet's specify input/spec hints against the compass. It runs only when `drift-watch: on` (off / absent / invalid values do nothing). It sits after the enforcement gate (Step 1.5, which may stop) and before the Open Questions check (Step 1.7, which does not stop), and warns—right before handoff to Spec Kit, the moment before going-back stops working—whether the packet has drifted from the compass's direction.

## The basis of the matching is the compass

- **The basis of the matching is the North Star / Anti-direction / Invariants of `.intent/intent-compass.md`.** At the export stage the compass already exists, so here the basis is the compass, not the pattern catalog (`.intent/drift-patterns.md`) (the discover drift-prone-situation pre-check has neither compass nor packet yet, so it uses the pattern catalog as its basis. Export is its sibling stage, and the difference is that the basis is the compass).
- The export matching is **premised on false-positives**. "Hitting" a compass element is not a confirmation of drift. We build in from the start that a valid design may be wrongly caught (false-positive), and we record swings and misses too.
- **This matching is a direction checkpoint, and it does not stop.** Its inspection target is orthogonal to the enforcement gate (a procedure checkpoint that may stop). We never stop export over a drift detection (only the Step 1.5 enforcement gate may stop).

## Procedure

1. **Obtain the inputs**
   - Take the target packet's **specify input/spec hint generation content** (the body of the draft export is about to generate) as the input.
   - Read the **North Star** / **Anti-direction** / **Invariants** (project-universal Invariants) of `.intent/intent-compass.md`.
   - **When the compass is absent / unfilled**: skip the export matching and inform the user of that fact (do not stop / do not write to drift-log either). Do not run the remaining steps.

2. **Match the specify input/spec hints against the compass**
   - Hold the specify input/spec hints about to be generated against the compass's **Invariants** (do they breach a constraint that must not be broken?), **Anti-direction** (are they leaning toward a direction decided to be avoided?), and **North Star** (have they drifted from the final state?).
   - This is a **semantic match**, not a mechanical decision. Premised on false-positives, pick it up if in doubt.

3. **When there is a conflict**
   - Present a **warning only** to the user—**do not stop export**. Name what was breached (which Invariant / Anti-direction / North Star) and which part of the specify input/spec hints is off.
   - Append one entry to `drift-log.md` (see the append procedure below). The values are:
     - `pattern: <a matching drift-patterns id | uncatalogued:<short name> | ->`（an id if identifiable; `uncatalogued:<short name>` for an actual drift outside the catalog; `-` if undeterminable）
     - `stage: export`
     - `packet: <target packet name>`
     - `mechanism: compass-anti-direction`（when an Anti-direction was breached）or `compass-invariant`（when an Invariant was breached; pick by which compass element was breached）
     - `outcome: caught`（a **draft**. This is drift-watch's estimate; the verdict is decided by the user's `user-verdict` and the resolution below）
     - `user-verdict: unjudged`
     - `recorded_at: <ISO 8601>`
     - `commit: <short hash | ->`
     - `note: <1-2 lines>`（what was breached and what was warned about）
   - If multiple places conflict, append one entry per conflict.

4. **outcome is confirmed by the user's judgment (resolving the draft)**
   - Step 3 only **drafts** `caught` for `outcome`; the final value is decided by the user's judgment:
     - When the user heeds the warning and pulls the design back → `caught` (capture succeeded, the "worked" family)
     - When the user ignores it and passes it through anyway → `missed` (could not prevent it, it got through, the "did not work" family)
     - When the design was actually valid and it was a false alarm → `false-positive` (it was a false alarm, the "did not work" family)
   - `user-verdict` backs the final value: `valid` if the point was sound / `false-alarm` if it was a false alarm / `unjudged` if not judged. Even if the user has not judged it, it stays `unjudged` and remains a target for recording and tallying.

## The append procedure to drift-log

- **Write in split form (CONTRACT "Split and archive convention for append-only records")**: drift-log is event-origin, so instead of appending to the end of a single `drift-log.md`, write one entry to a **per-date+slug split file** `drift-log/<date>-<slug>.md`. `<date>` is the recorded_at date; `<slug>` is derived from the pattern (the event) via the existing slug rule (`intent-packets/rules/packet-format.md`) — do not create new/sequential numbering. Because a different event touches a different file, tail collisions disappear by construction. Never rewrite or delete an existing entry (**append-only**).
- **Always write all 9 keys in fixed order**: `pattern` → `stage` → `packet` → `mechanism` → `outcome` → `user-verdict` → `recorded_at` → `commit` → `note`. Do not write an entry that is missing even one of the 9 keys.
- **recorded_at**: write the recording time in ISO 8601 (transaction time).
- **commit**: write the result of `git rev-parse --short HEAD`. When it cannot be obtained (non-repository, git CLI absent, etc.), use `-` (fail-open; recording continues).
- **When the `drift-log/` directory is absent**: create the directory, then write the split file. An old single `drift-log.md`, if still present, can be read side-by-side by readers (migration is handled by this slice's migration step).
- Follow the sample in the "Entry format" section of `.intent/drift-log.md` (`### drift-log entry`) for the entry format.
