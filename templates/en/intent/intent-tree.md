# Intent Tree

> Updated by `/intent-discover`. Do not mix canonical (confirmed) and inferred (guessed = Assumptions).

## L0: Product Purpose

What does this product / app / subsystem exist for.

## L1: Desired Outcomes

What state change do you want to cause for users, business, operations, developer experience. When designer-questions is on, add a `Measurement criteria:` line (how achievement is observed and judged) to each L1 item.

## L2: Capabilities

The capabilities that support the Desired Outcomes. Write them as responsibilities/capabilities, not feature names.

## L3: Behavioral / Architectural Intents

The behavior / design intent that makes the Capabilities hold. Include boundaries, dependency direction, side effects, data consistency, UI/UX constraints, etc.

## L4: Candidate Packets

Candidate work units before dropping into implementation. A granularity slightly above an Issue and slightly before a spec.

## PoC Experiment Definition (fill in when purpose: poc)

> Updated by `/intent-discover` when purpose=poc. If purpose is not poc, this section may stay empty.

### Hypothesis

What this PoC is meant to verify.

### Falsification Criteria

What, if it cannot be observed, rejects the hypothesis.

### GO-NO-GO Criteria

The conditions for deciding whether to proceed or stop after the PoC completes.

## Screen Rough Reference (fill in when designer-questions: on)

> Updated by `/intent-discover` when designer-questions=on. If the target includes user-facing screens, record the path or link to the rough (wireframe, sketch, etc.); if you decided there is none, write the reason. If no UI applies, record "Not applicable".

## Open Questions

Undetermined items the human should review.

## Assumptions

Premises the AI inferred. Do not mix guesses with canonical intent.
