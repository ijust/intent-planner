# Algorithm: GORE-lite

A lightweight version of Goal-Oriented Requirements Engineering. It progressively decomposes implicit intent into an L0–L4 goal hierarchy. Used in the Intent Tree construction phase common to all modes (standard / refactor / behavior-unknown all build on this algo).

## Procedure

1. **L0: Fix the Product Purpose in 1–2 sentences**
   - "What does this product/subsystem exist for". Write the reason for existing, not the means.

2. **L1: Draw out the Desired Outcomes**
   - To satisfy L0, whose state / what state do you want to change and how. Perspectives: user / business / operations / developer experience.
   - Write in terms of "the state change you want to cause", not "features".

3. **L2: Decompose into Capabilities**
   - List the capabilities that support each Desired Outcome. Write them as responsibilities/capabilities, not feature names.
   - The unit of "able to do X". Do not delve into implementation means.

4. **L3: Derive the Behavioral / Architectural Intents**
   - The behavior / design intent that makes each Capability hold. Include boundaries, dependency direction, side effects, data consistency, and UI/UX constraints.
   - This is the intent of "why this design", not the implementation itself.

5. **L4: Produce the Candidate Packets**
   - Candidate work units just before implementation. A granularity above an Issue and before a spec.
   - Be mindful of which L1/L2/L3 each candidate supports (this becomes the parent intent at packet-ization time).

## Discipline

- **Do not mix canonical and inferred**: put confirmed intent in the body and separate guesses into the `Assumptions` section. Do not assert without grounds.
- **Send undetermined items to Open Questions**: anything that requires a decision during decomposition but lacks the information, do not fill with guesses; write it into Open Questions.
- **Do not change code**: discover is the structuring of intent, not implementation.

## Output

Update (present as a proposal) the `L0 / L1 / L2 / L3 / L4 / Open Questions / Assumptions` sections of `intent-tree.md`.
