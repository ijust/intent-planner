# Intent Tree

> Updated by `/intent-discover`. Do not mix canonical (confirmed) and inferred (guessed = Assumptions). L0–L4 are the levels of the intent hierarchy (Level; L0 = purpose … L4 = candidate work units).

## L0: Product Purpose

What does this product / app / subsystem exist for.

> Record here, as canonical, the purpose confirmed with the user after acknowledging the inferred purpose (the settled purpose). Put unconfirmed / guessed ones in Assumptions.

## L1: Desired Outcomes

What state change do you want to cause for users, business, operations, developer experience. When designer-questions is on, add a `Measurement criteria:` line (how achievement is observed and judged) to each L1 item.

`Outcome measure:` is an optional, independent line on each L1 for the condition and observation source that show whether user value appeared after release. Existing `Measurement criteria:` must not be automatically reused as an outcome measure or filled in by inference. `Outcome learning:` is another optional line for the current human-approved result, with at most one line per L1. Do not put an unapproved result here; keep the three-way result, summary, and record reference in this form:

`Outcome learning: <value delivered | value not delivered | not known yet> — <summary without raw data> (record: <delta reference>)`

> Example of keeping the lines together on one L1 (use only the lines that apply):
> - L1: The state change intended for users
>   - Measurement criteria: How achievement is checked during development
>   - Outcome measure: The condition and observation source that show user value after release
>   - Outcome learning: value delivered — First-time users completed the intended action (record: deltas/observation.md)

`Outcome measure:` checks whether user value appeared. `Verification oracle:` describes how to notice when a protected promise is broken; it is a separate field and the two must not be mixed.

> Record here the confirmed intended users (Actors) and the definition of success (whose state change, and what change). Put anything not yet confirmed in Assumptions / Open Questions.

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

> Hold here any purpose, definition of success, or intended user that could not be confirmed, until it is settled (move it to L0 / L1 once settled).

> You can answer at any time (planning can proceed even while questions remain unanswered). Edit this file directly, or tell the agent in conversation and it will be reflected on the next skill run. Add the `[by export]` tag only to questions that must be answered by export (questions without the tag can be answered at any time).

## Assumptions

Premises the AI inferred. Do not mix guesses with canonical intent.
