# Mode: refactor

The mode for refactoring or redesigning an existing large-scale project while preserving behavior. It captures the drift between design intent and implementation and turns it into safe migration slices.

## The algorithms this mode combines

| Phase | Algorithm | Purpose |
|---|---|---|
| Intent Tree construction | **GORE-lite** (lightweight Goal-Oriented Requirements Engineering) + **Intent Recovery** (intent-less code only) + **Drift Analysis** | Progressively decompose the goal into L0(purpose)→L1(outcomes)→L2(capabilities)→L3(behavior/architectural intent)→L4(candidate packets). For code written without recording intent (e.g., vibe coding), use Intent Recovery to back-derive candidate intent from the code first, then observably capture the drift between the current implementation and the intended design |
| Recording decisions | **QOC** (Questions-Options-Criteria) | Preserve design decisions as "question, options, selection criteria" and flow them into the Compass's Decision Rules / Open Questions |
| Concretizing behavior / packet decomposition | **Migration Slicing** | Decompose the diff between the intended design and the current state into behavior-preserving / testable / rollbackable migration slices, and derive the packet's Expected Behavior and Validation |
| Bridging to spec | **map-cc-sdd** | Convert the chosen packet into cc-sdd's Project Description / design and tasks hints |

The details of each algorithm are in the corresponding skill's `rules/algo-*.md` (map-cc-sdd is in `rules/map-cc-sdd.md`). This mode definition is the combination table of "which phase uses which".

## Application in each command

### intent-discover (GORE-lite + Intent Recovery + Drift Analysis)
- Build L0–L4 with GORE-lite. In particular, carefully articulate L3 (behavior / design intent) as the implicit intent of the existing implementation.
- L0: why it exists. 1–2 sentences.
- L1: whose state / what state to change and how (user/business/operations/developer experience).
- L2: capabilities supporting L1. Write as responsibilities, not feature names.
- L3: behavior / design intent that makes L2 hold (boundaries, dependency direction, side effects, consistency, UX constraints).
- L4: candidate work units just before implementation. Above an Issue, before a spec.
- **For code written without recording intent (e.g., vibe coding)**, insert Intent Recovery before Drift Analysis. Back-derive candidate intent from the code's structure and behavior, and place it all as inferred (guessed) — do not mix it with the confirmed side. Without this, no baseline for the "intended design" exists and Drift Analysis spins its wheels. Intent Recovery is unnecessary for code where intent is explicitly present.
- Then, with Drift Analysis, inventory the current structure, dependency direction, and behavior, compare them against each L3 (the recovered inferred intent when Intent Recovery was applied), and enumerate the drift as "this is how it is now → this is how it should be".
- Distinguish each drift by type — deviation / decay / accumulation of local optimizations — and link it to the corresponding parent intent (L1/L2/L3).
- Never mix canonical (confirmed) and inferred (guessed = Assumptions). Send drift whose linked intent is ambiguous to Open Questions.

### intent-compass (QOC)
- Draw the North Star from the Intent Tree.
- Each Decision Rule is a QOC-format condensation: "question → option taken → why (criteria)".
- Anti-direction must always explicitly enumerate the local optimizations Claude tends to make. As refactor-specific examples, at minimum call out "touching unrelated code while fixing drift (scope creep)" and "changing behavior under the guise of being behavior-preserving".
- Invariants are behavior/API/data/UX/operational constraints that must not be broken. Distinguish them into two layers: project-universal / packet-specific. For refactoring, explicitly call out the existing behavior that must be preserved during migration.

### intent-packets (Migration Slicing)
- **Input contract (important)**: Migration Slicing **takes as input the drift list** produced by Drift Analysis in the discover phase. A thin or vague drift list makes the slices guesswork and lowers their quality. Before cutting slices, verify that the drift list is sufficient; if not, go back to discover and thicken the drift list.
- Cut the diff between the intended design and the current state (the drift list) into the smallest migration slices that can be applied without breaking behavior.
- Each slice must be independently deployable and advance the design one step while preserving the existing behavior.
- Order the slices by dependency so that each slice unblocks the next. Confirm that the intermediate state stays consistent (behavior-preserving) wherever you stop.
- Attach to each slice characterization / regression checkpoints (Validation) and a way to roll back on failure (Rollback) (you may reuse the observe-and-pin procedure from `intent-packets/rules/algo-characterization-test.md`).
- **Drift traceability (required)**: every enumerated drift must terminate in one of two ways — (a) become a migration slice (packet), or (b) if not addressed this time, become an Open Question or an explicit deferral (with a reason). Never silently drop a drift you have found (this is the core of the North Star: do not leave the accumulation of local optima ignored).
- Packets are 3–7, satisfying behavior-preserving / testable / rollbackable. Leave a reference to the parent intent in each packet (and the originating drift if it came from drift).

### intent-export-cc-sdd (map-cc-sdd)
- Convert one packet into cc-sdd's Project Description (condensed) and design/tasks hints.
- Limit the input to the target packet and the Compass's Invariants/Anti-direction.
- Always leave references to parent intent and invariants in the tasks hints.

## Applicable situations
- When the target is refactoring or redesigning an existing large-scale project
- When the existing codebase is large and drift between design intent and implementation has accumulated
- When you want to advance the design incrementally while preserving behavior (behavior-preserving)
- When you want to take code written without recording intent (vibe coding, a prototype pushed into production, etc.) into the intent system after the fact (combine with Intent Recovery in discover)
- **Distinguishing from behavior-unknown**: if the current behavior is reasonably understood and you can articulate the intended design, use refactor. If the behavior itself is unknown and needs to be observed and pinned down first, use behavior-unknown. Vibe coding is often a case where "behavior is observable but intent is absent", for which refactor + Intent Recovery is the fit.
