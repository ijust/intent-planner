# Mode: standard

The standard mode for working out the overall design of new projects or feature sets whose intent has not yet been articulated.

## The algorithms this mode combines

| Phase | Algorithm | Purpose |
|---|---|---|
| Intent Tree construction | **GORE-lite** (lightweight Goal-Oriented Requirements Engineering) | Progressively decompose the goal into L0(purpose)→L1(outcomes)→L2(capabilities)→L3(behavior/architectural intent)→L4(candidate packets) |
| Recording decisions | **QOC** (Questions-Options-Criteria) | Preserve design decisions as "question, options, selection criteria" and flow them into the Compass's Decision Rules / Open Questions |
| Concretizing behavior | **Example Mapping** | Ground abstract capabilities into observable concrete examples (rules, examples, questions) and derive the packet's Expected Behavior and Validation |
| Bridging to spec | **map-cc-sdd** | Convert the chosen packet into cc-sdd's Project Description / design and tasks hints |

The details of each algorithm are in the corresponding skill's `rules/algo-*.md` (map-cc-sdd is in `rules/map-cc-sdd.md`). This mode definition is the combination table of "which phase uses which".

## Application in each command

### intent-discover (GORE-lite)
- L0: why it exists. 1–2 sentences.
- L1: whose state / what state to change and how (user/business/operations/developer experience).
- L2: capabilities supporting L1. Write as responsibilities, not feature names.
- L3: behavior / design intent that makes L2 hold (boundaries, dependency direction, side effects, consistency, UX constraints).
- L4: candidate work units just before implementation. Above an Issue, before a spec.
- Never mix canonical (confirmed) and inferred (guessed = Assumptions).
- Put decision branches that arise during decomposition into Open Questions as seeds for QOC.

### intent-compass (QOC)
- Draw the North Star from the Intent Tree.
- Each Decision Rule is a QOC-format condensation: "question → option taken → why (criteria)".
- Anti-direction must always explicitly enumerate the local optimizations Claude tends to make.
- Invariants are behavior/API/data/UX/operational constraints that must not be broken. Distinguish them into two layers: project-universal / packet-specific.

### intent-packets (Example Mapping)
- For each L2/L3 capability, do Example Mapping:
  - Rules: the rules the capability follows
  - Examples: observable concrete scenarios → the packet's Expected Behavior
  - Questions: undetermined → the packet's Open Questions / sent back to the Compass
- Derive Validation (tests/manual/type/logs) and Rollback from the examples.
- Packets are 3–7, satisfying behavior-preserving / testable / rollbackable.

### intent-export-cc-sdd (map-cc-sdd)
- Convert one packet into cc-sdd's Project Description (condensed) and design/tasks hints.
- Limit the input to the target packet and the Compass's Invariants/Anti-direction.
- Always leave references to parent intent and invariants in the tasks hints.

## Applicable situations
- New product/subsystem
- When you want to articulate a feature set that has grown while its intent remained tacit knowledge
