# Mode: behavior-unknown

The mode for legacy code whose behavior is unknown: pin down the observable behavior with examples, lock the unknown behavior with characterization, and then derive intent.

## The algorithms this mode combines

| Phase | Algorithm | Purpose |
|---|---|---|
| Intent Tree construction | **GORE-lite** (lightweight Goal-Oriented Requirements Engineering) | Progressively decompose the goal into L0(purpose)→L1(outcomes)→L2(capabilities)→L3(behavior/architectural intent)→L4(candidate packets). When the spec has been lost, place L3 as inferred (guessed) rather than confirmed, and corroborate it later with characterization |
| Recording decisions | **QOC** (Questions-Options-Criteria) | Preserve design decisions as "question, options, selection criteria" and flow them into the Compass's Decision Rules / Open Questions |
| Concretizing behavior / packet decomposition | **Example Mapping** + **Characterization Test** | Pin down observable behavior into concrete examples (rules, examples, questions) with Example Mapping, lock unknown or unclear behavior as observation points ("this is how it works now") with Characterization Test, and derive the packet's Expected Behavior and Validation |
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
- Each Decision Rule is a QOC-format condensation: "question → option taken → why (criteria)".
- Anti-direction must always explicitly enumerate the local optimizations Claude tends to make. In particular, call out the tendency to "assume unverified behavior is correct and change it".
- Invariants are behavior/API/data/UX/operational constraints that must not be broken. Distinguish them into two layers: project-universal / packet-specific. For targets with unknown behavior, only promote to an Invariant the behavior that has first been observed and confirmed with Characterization Test.

### intent-packets (Example Mapping + Characterization Test)
- For each L2/L3 capability, concretize observable behavior with Example Mapping:
  - Rules: the rules the capability follows
  - Examples: observable concrete scenarios → the packet's Expected Behavior
  - Questions: undetermined → the packet's Open Questions / sent back to the Compass
- For places where the spec has been lost and the behavior is unknown, also use Characterization Test:
  - Feed in the current code, observe "this is how it works now", and lock it as a test as-is (defer the judgment of correctness; record the current state).
  - Use the observed current behavior as the starting point for the packet's Expected Behavior / Validation, and hold the unknown behavior as a regression safety net.
- Derive Validation (tests/manual/type/logs) and Rollback from the examples and the characterization observation points.
- Packets are 3–7, satisfying behavior-preserving / testable / rollbackable. Leave a reference to the parent intent and to the observation points locked by characterization in each packet.

### intent-export-cc-sdd (map-cc-sdd)
- Convert one packet into cc-sdd's Project Description (condensed) and design/tasks hints.
- Limit the input to the target packet and the Compass's Invariants/Anti-direction.
- Always leave references to parent intent and invariants in the tasks hints.

## Applicable situations
- When the target is legacy code whose behavior is unknown
- When there are no or few tests, lacking a safety net that guarantees the current behavior
- When the spec / design intent has been lost and behavior can only be raised from observing the code
- When it is unclear whether the current behavior is correct, and you want to pin down "how it works now" first before structuring the intent
