# Mode: feature-growth

The mode for safely adding new features to an existing, running system. It inventories and protects the existing boundaries and contracts the new feature touches before implementation, establishes the seam first, and then stacks the feature additively — growing the feature while preserving the existing architectural boundaries.

## The algorithms this mode combines

| Phase | Algorithm | Purpose |
|---|---|---|
| Intent Tree construction | **GORE-lite** (lightweight Goal-Oriented Requirements Engineering) + **Impact Analysis** | Progressively decompose the goal into L0(purpose)→L1(outcomes)→L2(capabilities)→L3(behavior/architectural intent)→L4(candidate packets), appending the new feature's intent to the existing Intent Tree. Then inventory by reading which existing boundaries, contracts, and data flows the new feature touches, and raise the impact list (boundary touched / existing contract depended on / kind of impact) |
| Recording decisions | **QOC** (Questions-Options-Criteria) | Preserve design decisions as "question, options, selection criteria" and flow them into the Compass's Decision Rules / Open Questions |
| Concretizing behavior / packet decomposition | **Example Mapping** + **Additive Slicing** | Ground the new feature's behavior into observable concrete examples (rules, examples, questions, deferred), decompose it into the three-stage additive slices of establish the seam → add → wire, and derive the packet's Expected Behavior and Validation |
| Bridging to spec | **map-cc-sdd** | Convert the chosen packet into cc-sdd's Project Description / design and tasks hints |

The details of each algorithm are in the corresponding skill's `rules/algo-*.md` (map-cc-sdd is in `rules/map-cc-sdd.md`). This mode definition is the combination table of "which phase uses which".

## Application in each command

### intent-discover (GORE-lite + Impact Analysis)
- Start by writing one **simplified Impact Mapping** (Adzic: the one-way tree of Why→Who→How→What) and confirm the connection between the feature addition and the business outcome before moving to GORE-lite. Feature additions tend to lead with "what to build (What)", severing the Why. Deepen the confirmed Impact hierarchy directly into GORE-lite's L0–L2: Why into L0/L1 (purpose, outcomes), Who/How into L1 (whose state / what state to change and how), What into the seeds of candidates at L2 and below.
- With GORE-lite, **append** the new feature's intent to the existing Intent Tree (an incremental update). If no tree exists yet, raise L0–L4 for the scope of the new feature.
- L0: why it exists. 1–2 sentences.
- L1: whose state / what state to change and how (user/business/operations/developer experience).
- L2: capabilities supporting L1. Write as responsibilities, not feature names.
- L3: behavior / design intent that makes L2 hold (boundaries, dependency direction, side effects, consistency, UX constraints).
- L4: candidate work units just before implementation. Above an Issue, before a spec.
- Then, with Impact Analysis, inventory by reading which existing boundaries, contracts, and data flows the new feature touches, and produce the impact list (each item: boundary touched / existing contract depended on / kind of impact, with evidence; details in `algo-impact-analysis.md`). The impact list becomes the input for the Invariants in compass and for the seam design in packets.
- Never mix canonical (confirmed) and inferred (guessed = Assumptions).
- **When you find drift, do not fix it**: if, during the investigation, you discover a structural problem in the existing design (drift: a problem outside feature-growth's purpose), do not fix it within this mode; record it in Open Questions and recommend separate work in refactor mode.

### intent-compass (QOC)
- Draw the North Star from the Intent Tree.
- Raise each boundary in the impact list into an Invariant ("do not change X's existing contract"). Invariants are behavior/API/data/UX/operational constraints that must not be broken. Distinguish them into two layers: project-universal / packet-specific.
- Anti-direction must always explicitly enumerate the local optimizations Claude tends to make. Enumerate the feature-growth-specific patterns as a premortem (anticipating failures up front): "refactoring existing code while you're at it", "embedding directly into existing modules without creating a seam", and "rewriting existing tests to make things add up".
- Each Decision Rule is condensed as a lightweight ADR: Context (the question and situation) / Decision (the option taken) / Why (criteria) / Consequences (connection to Invariants and Anti-direction). QOC is the exploration tool for comparing options; the Decision Rule is the canonical record that binds future implementation sessions.

### intent-packets (Example Mapping + Additive Slicing)
- Concretize the new feature's behavior with Example Mapping:
  - Rules: the rules the capability follows
  - Examples: observable concrete scenarios → the packet's Expected Behavior
  - Questions: undetermined → the packet's Open Questions / sent back to the Compass
  - Deferred: what you decided not to do this time → record it in the `Deferred` section of `.intent/packets/plan.md` rather than silently dropping it; the seed of a follow-up packet / Open Questions
- **Input contract (important)**: Additive Slicing **takes as input the impact list** produced by Impact Analysis in the discover phase. A thin impact list turns the slices into guesswork — if it lacks the depth to design the seams, go back to discover and thicken the impact list.
- With Additive Slicing, decompose the new feature — with the Example Mapping examples flowing in — into the three-stage additive slices of "establish the seam → additively stack the new feature → wire it into the existing system" (details in `algo-additive-slicing.md`).
- **Impact-list traceability (required)**: every item in the impact list must terminate as one of — "protected by the Safety / Invariants of some slice" or "sent to Open Questions". Never silently drop an item.
- Derive Validation (tests/manual/type/logs) and Rollback from the examples, and attach a Toggle Plan to each packet (which scope is off-by-default / under what condition the toggle gets removed).
- Packets satisfy behavior-preserving / testable / rollbackable; the count is variable with the expected change size, with 1–7 as a loose guide (one is fine for very small changes; do not pad the count). Leave a reference to the parent intent in each packet (and the original item if it protects an impact-list item).

### intent-export-cc-sdd (map-cc-sdd)
- Convert one packet into cc-sdd's Project Description (condensed) and design/tasks hints.
- Limit the input to the target packet and the Compass's Invariants/Anti-direction.
- Always leave references to parent intent and invariants in the tasks hints.

## Applicable situations
- When adding a new feature to an existing, running system (extend / integrate / add-to style requests)
- When the target's behavior is known and redesign (resolving drift) is not the goal
- When you want to systematically inventory and protect the boundaries you touch, so new work does not break the existing architectural boundaries and dependency directions
- **Distinguishing from standard / refactor / behavior-unknown**: if you want to change the existing structure (resolving drift / redesign is the goal), use refactor. If the current behavior itself is unknown and must first be observed and pinned down, use behavior-unknown. For a new product or general intent organization, use standard. If the goal is adding onto an existing system, use feature-growth.
