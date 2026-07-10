# Algorithm: GORE-lite

A lightweight version of Goal-Oriented Requirements Engineering. It progressively decomposes implicit intent into an L0–L4 goal hierarchy. Used in the Intent Tree construction phase common to all modes (standard / refactor / behavior-unknown all build on this algo).

## Procedure

1. **L0: Fix the Product Purpose in 1–2 sentences**
   - "What does this product/subsystem exist for". Write the reason for existing, not the means.

2. **L1: Draw out the Desired Outcomes**
   - To satisfy L0, whose state / what state do you want to change and how. Perspectives: user / business / operations / developer experience.
   - Write in terms of "the state change you want to cause", not "features".
   - **Actor pass**: for each Outcome, write one line each for "who benefits / who could block or oppose / who is responsible for realizing it / what environmental assumptions it depends on" (the actor/dependency perspective of the i* family). A goal hierarchy without actors misleads where responsibilities are placed at implementation time. Lines you are not confident about go to Assumptions.

3. **L2: Decompose into Capabilities**
   - List the capabilities that support each Desired Outcome. Write them as responsibilities/capabilities, not feature names.
   - The unit of "able to do X". Do not delve into implementation means.

4. **L3: Derive the Behavioral / Architectural Intents**
   - The behavior / design intent that makes each Capability hold. Include boundaries, dependency direction, side effects, data consistency, and UI/UX constraints.
   - This is the intent of "why this design", not the implementation itself.
   - **Keep the grounds running alongside the conclusion**: when you write a design intent (the conclusion), also keep its **grounds (rationale = reasons, constraints, premises, trade-offs)** running alongside. The conclusion can be re-derived from the grounds, but the grounds cannot be re-derived from the conclusion (asymmetric). An intent that has shed its grounds cannot be corrected when a contradicting fact later arrives (loss of correctability), so leave "why you judged it that way" beside the conclusion. Do not introduce a new required field for the grounds; let them run alongside existing structures (the intent prose in the body, `Assumptions`, and the `Open Questions` below). For grounds that cannot be traced — and that are not self-evident yet not recalled — do not fill them with guesses; send them to `Open Questions`. For self-evident intents (judgments obvious enough to generally need no stated grounds) or intents that reference already-stated grounds, do not force grounds onto them.

5. **L4: Produce the Candidate Packets**
   - Candidate work units just before implementation. A granularity above an Issue and before a spec.
   - Be mindful of which L1/L2/L3 each candidate supports (this becomes the parent intent at packet-ization time).
   - **Optional note of the grouping of work (only when appropriate; not mandatory; DR140-(6))**: if the order in which you want to build the candidate packets, or their grouping (groups), is already visible for the case, you may note it in the candidate-packets section as a "grouping of work" (e.g. auth first, core features later). This is an optional note; the canonical work plan is the "Work plan" section of `.intent/packets/plan.md` (written in the `/intent-packets` phase or by a human). Do not force an order here, do not fix the group names to a fixed vocabulary (Anti 432), do not bring in numeric scores or dates (INV81), and do not write it if it is not yet visible.

## Discipline

- **Do not mix canonical and inferred**: put confirmed intent in the body and separate guesses into the `Assumptions` section. Do not assert without grounds.
- **Hold the conclusion and its grounds separately (correctability)**: do not keep only the conclusion (the intent) while discarding its grounds (reasons, constraints, premises, trade-offs). Only an intent whose grounds run alongside it can be re-evaluated and corrected when a contradicting fact later arrives. Do not establish a dedicated required field for the grounds; let them run alongside existing structures, and send the ones you cannot trace to `Open Questions` (prompting only — the AI must not fabricate grounds to retroactively justify a conclusion).
- **Send undetermined items to Open Questions**: anything that requires a decision during decomposition but lacks the information, do not fill with guesses; write it into Open Questions.
- **Do not change code**: discover is the structuring of intent, not implementation.

## Output

Update (present as a proposal) the `L0 / L1 / L2 / L3 / L4 / Open Questions / Assumptions` sections of `intent-tree.md`.
