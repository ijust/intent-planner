# Drift Export Check

The matching logic used at Step 1.6 of `/intent-export-cc-sdd`: the target packet's design/tasks hints against the compass. It runs only when `drift-watch: on` (off / absent / invalid values do nothing). It sits after the enforcement gate (Step 1.5, which may stop) and before the Open Questions check (Step 1.7, which does not stop), and warns—right before handoff to cc-sdd, the moment before going-back stops working—whether the packet has drifted from the compass's direction.

## The basis of the matching is the compass

- **The basis of the matching is the North Star / Anti-direction / Invariants of `.intent/intent-compass.md`.** At the export stage the compass already exists, so here the basis is the compass, not the pattern catalog (`.intent/drift-patterns.md`) (the discover terrain diagnosis has neither compass nor packet yet, so it uses the pattern catalog as its basis. Export is its sibling stage, and the difference is that the basis is the compass).
- The export matching is **premised on false-positives**. "Hitting" a compass element is not a confirmation of drift. We build in from the start that a valid design may be wrongly caught (false-positive), and we record swings and misses too.
- **This matching is a direction checkpoint, and it does not stop.** Its inspection target is orthogonal to the enforcement gate (a procedure checkpoint that may stop). We never stop export over a drift detection (only the Step 1.5 enforcement gate may stop).

## Procedure

1. **Obtain the inputs**
   - Take the target packet's **design/tasks hint generation content** (the body of the draft export is about to generate) as the input.
   - Read the **North Star** / **Anti-direction** / **Invariants** (project-universal Invariants) of `.intent/intent-compass.md`.
   - **When the compass is absent / unfilled**: skip the export matching and inform the user of that fact (do not stop / do not write to drift-log either). Do not run the remaining steps.

2. **Match the design/tasks hints against the compass**
   - Hold the design/tasks hints about to be generated against the compass's **Invariants** (do they breach a constraint that must not be broken?), **Anti-direction** (are they leaning toward a direction decided to be avoided?), and **North Star** (have they drifted from the final state?).
   - This is a **semantic match**, not a mechanical decision. Premised on false-positives, pick it up if in doubt.

3. **When there is a conflict**
   - Present a **warning only** to the user—**do not stop export**. Name what was breached (which Invariant / Anti-direction / North Star) and which part of the design/tasks hints is off.
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

## Scope-overflow check (DR9 second defense · packet-scope-overflow)

A second check whose **grounds differ from** the compass check above. Whereas the compass check looks at "did this conflict with a universal compass Invariant", this one looks at "**is an implementation instruction arriving that exceeds the target packet's declared scope (`## Scope` / `## Non-scope`)**". When it does, it warns that the **packet-specific invariants** that newly become necessary in that new territory (authorization, data consistency, transaction boundaries, idempotency) are absent from the cc-sdd artifacts—recorded as drift. It runs only when `drift-watch: on`, and—like the compass check—**warns only, never stops, and assumes false positives**. It is also the instrument that measures whether the first defense (the convention-doc rule "go back to intent on scope overflow"—recall only) is working.

The check is performed at two points (user-confirmed 2026-06-20, "both"):

1. **At the export waterline (this Step 1.6)**: check whether the draft about to be exported exceeds the target packet's `## Scope` and reaches into the `## Non-scope` side. If the draft itself departs from scope, it is caught at export time.
2. **A light cue afterward (re-check at the implementation stage)**: when the **implementation instruction** the user issues after export exceeds the target packet's `## Scope` (e.g., a front-end-only packet being told to implement back-end / authorization / transaction boundaries), re-check lightly and name it. This is the entry point that prompts a return to "go back to intent" (raise a packet for the new territory with `/intent-packets` and re-export); it does not stop.

### Input and discipline of the check

- **The input is only the implementation-instruction text and the packet's `## Scope` / `## Non-scope` declarations.** Do not read code diffs or implementation results (INV5/INV6 · DR14). It is a semantic check, not a mechanical decision.
- The grounds of the check are the **absence of packet-specific invariants**. Do not conflate its logic with the universal compass Invariant check (above). The fact that universal Invariants were transcribed at export does not cover the new territory's specific constraints (a different layer).
- **Abnormal case**: when the target packet is missing / `## Scope` is blank, skip the check and announce it (do not stop · do not write to drift-log).

### When there is a scope overflow

- Present **only a warning** to the user—neither export nor implementation stops. Name what exceeds the packet scope (e.g., front-end), which new territory it reaches (e.g., back-end / authorization / transactions), and which packet-specific invariants (authorization, consistency, transaction boundaries, idempotency) are absent, and advise "raise a packet for the new territory with `/intent-packets` and re-export (go back to intent)".
- Append one entry to `drift-log.md` (same append procedure as above). The value differences are:
  - `mechanism: packet-scope-overflow` (a second-defense origin distinct from the two compass values; separable in tallies)
  - `pattern: uncatalogued:scope-overflow` (the id of a scope-creep type seed if the type catalog has one; otherwise `uncatalogued:scope-overflow`)
  - `stage: export` (when caught at the waterline). When caught at the later implementation stage, use `stage: export` as well, as an extension of the export-origin check, and state "re-check at the implementation stage" in `note` (do not add a new stage value—keep the existing three-value `discover | export | improve` schema unchanged).
  - The other keys (`packet` / `outcome: caught` draft / `user-verdict: unjudged` / `recorded_at` / `commit` / `note`) follow the same discipline as the compass check.
- The confirmation of `outcome` is the same as the compass check (`caught` if the user goes back to intent / `missed` if they push through ignoring it / `false-positive` if it was actually a valid extension and a false alarm).
