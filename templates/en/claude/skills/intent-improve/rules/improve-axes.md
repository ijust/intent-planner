# Improve: three-axis evaluation and classification criteria

Rules for cross-checking the `.intent/` deliverables against the implementation reality in post-implementation realignment. Used by the `intent-improve` skill. Whereas writeback is the regular per-packet path, improve is the cross-cutting safety net that also catches drift not tied to a packet.

## The three evaluation axes

- **completeness** (whether the intended content has been realized): whether the Expected Behavior / Scope of packets.md appears in the implementation and tests. Detects unrealized or partially realized content.
- **correctness** (whether the realized content matches the intent): whether the implemented behavior matches the packet's Why / Expected Behavior. Detects realizations that differ from the intent and additions outside the intent.
- **coherence** (whether the implementation is consistent with the North Star, Invariants, and Decision Rules): whether the implementation contradicts the North Star / Invariants / Anti-direction / Decision Rules of intent-compass.md. Detects local optimizations and invariant violations. It also detects Decision entries whose Revisit when conditions in the Decision Rules of intent-compass.md can be read as met from the implementation reality and deltas.md. Report such detections with evidence under the existing classification "Decision Rules update recommended" (do not create a new classification).

## Classification (5 kinds; multiple may apply)

- **aligned**: no drift. Consistent on all three axes (no correction needed; still attach the evidence of consistency).
- **intent reinforcement recommended**: the implementation is sound, but the `.intent/` side is thin or left implicit. Present update proposals that add to or clarify the deliverables (intent-tree.md / intent-compass.md / packets.md).
- **corrective packet recommended**: the drift is on the implementation side and code changes are needed. Since improve does not change code, present the corrective work as a new packet proposal (an addition proposal to packets.md → export → the regular path of cc-sdd implementation).
- **Decision Rules update recommended**: a judgment gained in implementation conflicts with the existing Decision Rules, or a new decision criterion is needed. A Decision entry whose Revisit when conditions are detected as met is also reported for review under this classification. Follow the "Decision Rules change convention" below.
- **invariant violation detected**: the implementation violates the Invariants. Report it with top priority and present a corrective packet proposal or a review of the invariant itself (the user's call).

When multiple classifications apply, list them all, and organize the report per classification.

## Handling of evidence

- Sources of the implementation reality: the codebase (Read/Glob/Grep only; changes forbidden), the presence and placement of tests, the progress of `.kiro/specs/`, and `.intent/deltas.md` (promoted / pending). All of them are **read-only**.
- Always attach evidence (file / relevant text) to the evaluation. Do not present an evaluation or correction proposal whose evidence cannot be shown.

## Decision Rules change convention (the same convention as writeback)

- A correction that changes the Decision Rules **adds a new entry** in the existing ADR form of intent-compass.md (**Context** / **Decision** / **Why** / **Alternatives considered** / **Consequences** / **Revisit when**) and annotates the superseded old entry as superseded.
- Do not delete the old entry (history is preserved). Do not introduce custom fields (e.g., Supersedes).
- Old 4-field entries recorded before the introduction of the 6-field format (those without Alternatives considered / Revisit when) remain valid; do not treat the missing fields as an error, flag them, or rewrite them.

## Writeback guidance (division of roles as the safety net)

- When an unrecorded write-back learning is detected — no delta entry in deltas.md corresponding to the current Source Packet (the latest export), or an unrecorded decision that surfaced in the implementation — do not write a delta yourself; prompt the user to run `/intent-writeback`.
- When declined items with the "on-hold" tag remain, only prompt for a re-proposal or a confirmed rejection. The final tag update (promote / confirm rejection / keep on hold) is the responsibility of `/intent-writeback`.
- improve does not write into deltas.md (all recording and state updates of deltas are done by writeback).
