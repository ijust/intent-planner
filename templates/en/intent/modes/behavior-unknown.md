# Mode: behavior-unknown

The mode for legacy code whose behavior is unknown: pin down the observable behavior with examples, lock the unknown behavior with characterization, and then derive intent.

## The algorithms this mode combines

| Phase | Algorithm | Purpose |
|---|---|---|
| Intent Tree construction | **GORE-lite** (lightweight Goal-Oriented Requirements Engineering) | Progressively decompose the goal into L0(purpose)→L1(outcomes)→L2(capabilities)→L3(behavior/architectural intent)→L4(candidate packets). When the spec has been lost, place L3 as inferred (guessed) rather than confirmed, and corroborate it later with characterization |
| Recording decisions | **QOC** (Questions-Options-Criteria) | Preserve design decisions as "question, options, selection criteria" and flow them into the Compass's Decision Rules / Open Questions |
| Concretizing behavior / packet decomposition | **Characterization Test** → **Example Mapping** | For unknown behavior, first lock "this is how it works now" as observation points with Characterization Test, then organize those observed facts into rules, examples, questions, and deferred items with Example Mapping, and derive the packet's Expected Behavior and Validation (Example Mapping may lead only for the already-understood subset) |
| Bridging to spec | **map-cc-sdd** | Convert the chosen packet into cc-sdd's Project Description / design and tasks hints |

The details of each algorithm are in the corresponding skill's `rules/algo-*.md` (map-cc-sdd is in `rules/map-cc-sdd.md`). This mode definition is the combination table of "which phase uses which".

## Application in each command

### intent-discover (GORE-lite)
- L0: why it exists. 1–2 sentences.
- L1: whose state / what state to change and how (user/business/operations/developer experience).
- L2: capabilities supporting L1. Write as responsibilities, not feature names.
- L3: behavior / design intent that makes L2 hold (boundaries, dependency direction, side effects, consistency, UX constraints).
- L4: candidate work units just before implementation. Above an Issue, before a spec.
- For targets where the spec or tests have been lost, the current behavior is not necessarily correct. Place L3 raised from observation as inferred (guessed = Assumptions), not canonical (confirmed), and never mix it with confirmed intent.
- Put branches where "it is unclear whether the current behavior is correct" into Open Questions as seeds for QOC, and corroborate them later by observing with Characterization Test.

### intent-compass (QOC)
- Draw the North Star from the Intent Tree.
- Each Decision Rule is condensed as a lightweight ADR: Context (the question and situation) / Decision (the option taken) / Why (criteria) / Consequences (connection to Invariants and Anti-direction). QOC is the exploration tool for comparing options; the Decision Rule is the canonical record that binds future implementation sessions.
- Anti-direction must always explicitly enumerate the local optimizations Claude tends to make. In particular, call out the tendency to "assume unverified behavior is correct and change it".
- Invariants are behavior/API/data/UX/operational constraints that must not be broken. Distinguish them into two layers: project-universal / packet-specific. For targets with unknown behavior, only promote to an Invariant the behavior that has first been observed and confirmed with Characterization Test.

### intent-packets (Example Mapping + Characterization Test)
- **Execution order (important)**: for a target with unknown behavior, you cannot write "examples" for behavior you do not know. So run **Characterization Test first** to observe and lock the raw current behavior, then feed those observed facts into **Example Mapping afterward** to organize them into rules, examples, questions, and deferred items. Only for the subset of behavior you already understand may Example Mapping lead.
- **How to route (routing)**: if a behavior can already be articulated as a rule, use Example Mapping; if it can only be pinned empirically (the spec has been lost and there is no certainty), use Characterization Test. Both handle observable behavior; the deciding axis is "can it be articulated vs. must it be pinned".
- Characterization Test (first):
  - Feed in the current code, observe "this is how it works now", and lock it as an observation point as-is (defer the judgment of correctness; record the current state). Sort whether each behavior is intentional or accidental, and send anything that cannot be sorted to Open Questions.
  - Use the observed current behavior as the starting point for the packet's Expected Behavior / Validation, and hold the unknown behavior as a regression safety net.
- Example Mapping (afterward / known parts first):
  - Rules: the rules the capability follows (derived from the characterization observations, or from already-known behavior)
  - Examples: observable concrete scenarios → the packet's Expected Behavior
  - Questions: undetermined → the packet's Open Questions / sent back to the Compass
  - Deferred: what you decided not to do this time → record it in the `Deferred` section of `.intent/packets/plan.md` rather than silently dropping it; the seed of a follow-up packet / Open Questions
- Derive Validation (tests/manual/type/logs) and Rollback from the examples and the characterization observation points.
- Packets are 3–7, satisfying testable / rollbackable. Leave a reference to the parent intent and to the observation points locked by characterization in each packet. Here **behavior-preserving means "preserve the current behavior fixed by characterization as the regression baseline"**, not a claim that the current behavior is correct (fixing wrong behavior is stated separately as its own intent).

### intent-export-cc-sdd (map-cc-sdd)
- Convert one packet into cc-sdd's Project Description (condensed) and design/tasks hints.
- Limit the input to the target packet and the Compass's Invariants/Anti-direction.
- Always leave references to parent intent and invariants in the tasks hints.

## Applicable situations
- When the target is legacy code whose behavior is unknown
- When there are no or few tests, lacking a safety net that guarantees the current behavior
- When the spec / design intent has been lost and behavior can only be raised from observing the code
- When it is unclear whether the current behavior is correct, and you want to pin down "how it works now" first before structuring the intent
- **Distinguishing from refactor**: if the current behavior is known and trusted (you can articulate the intended design), use refactor. If the current behavior is unknown or untrusted and you must start by observing and pinning it down, use behavior-unknown.
