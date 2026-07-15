# Perspective Review Rule

This rule supplies concerns to the existing deep-review conversation from the specialist perspectives a project needs. It separates the decisions each perspective is responsible for without acting out professional personas or staging a fictional meeting.

## Applicability boundary

- Apply this detailed review only when designer questions are enabled and `deep` is selected.
- Do not apply the detailed review when designer questions are not enabled or the selected depth is `standard`; keep the existing lightweight perspective check unchanged.
- Treat the product-decision perspective, delivery-coordination perspective, and experience-design perspective as built-in examples. These three perspectives are examples, not a closed list; allow other specialist perspectives needed by the project, such as legal, medical, sales, or education.
- Close an irrelevant perspective as `not applicable` and add no questions for that perspective. A job title alone does not justify more questions; decide from what the project needs.
- Use plain language that tells a first-time reader what is being checked, such as “product-decision perspective.” Keep professional abbreviations as optional explanations.

## Product-decision perspective

When this perspective is relevant, make each of the following a separate concern.

- The problem to solve and the evidence supporting that judgment.
- The target users, their context of use, and current alternatives.
- The value offered and how to recognize that it has been achieved.
- The priority, in-scope work, out-of-scope work, and trade-offs of the choice.

If evidence is missing, mark it `unverified`; do not claim research was completed or treat the judgment as a researched fact. Do not claim that market research, user interviews, or usage-data analysis were performed when they were not.

## Delivery-coordination perspective

These conditions use OR: any one is enough to trigger the delivery-coordination perspective. Do not wait for multiple conditions.

| Condition | Independent result | State |
|---|---|---|
| Multiple people | Sufficient on its own | `trigger` |
| Multiple workstreams | Sufficient on its own | `trigger` |
| External dependency | Sufficient on its own | `trigger` |
| Deadline | Sufficient on its own | `trigger` |
| Approval | Sufficient on its own | `trigger` |
| Handoff | Sufficient on its own | `trigger` |
| Release coordination | Sufficient on its own | `trigger` |

Even for a solo project, any one condition is enough to trigger this perspective. If all seven conditions are absent and this can be confirmed, close it as `not applicable` and add no questions from the delivery perspective. If the available material cannot determine whether any condition is present, neither trigger the perspective nor close it as not applicable; instead create one `unverified` concern asking whether the delivery-coordination perspective is needed.

When triggered, make each of the following a separate concern.

- The decision-making role, dependencies between work and decisions, execution order, and approval points.
- Handoffs, known risks, alternatives, release conditions, and rollback.

Treat an unknown decision-making role, cyclic dependencies, an approval that is pending, and an undecided rollback plan as separate unresolved delivery concerns.

This perspective checks what is needed to make the specification executable. It does not commit to dates or expand into Gantt charts, velocity measurement, utilization management, or automatic numeric prioritization. Do not create a separate question loop, state model, persistent ledger, CLI, or persona; pass the concerns to the existing deep-review list.

## Experience-design perspective

When this perspective is relevant, make each of the following a separate concern.

- The main journey from before use through after use, and user touchpoints.
- The user-visible parts and the backstage work or mechanisms that support them.
- Waiting, handoffs, failures, drop-off, and resumption.
- Accessibility, user-facing language, and tone.

Even without adopting a specific service-design method, do not omit touchpoints, failures, and backstage support. Existing experience-design frames or derived documents may be read as ordinary project material, but their existence or adoption is not a prerequisite.

This rule does not decide information priority within screens, navigation between screens, layout, or visual direction; keep those concerns separate for later visual-design work.

## Owners and evidence

When a perspective has an owner, direct the necessary questions to that owner. When a perspective has no owner, explicitly state that AI is standing in for that perspective and provide a provisional answer with its basis. For every provisional answer, name the conversation, existing artifact, code, or other available material that supports it.

Use exactly these four evidence states.

| State | Treatment |
|---|---|
| `confirmed fact` | Treat it as a fact or decision confirmed by a person. |
| `grounded inference` | Treat it as an inference drawn from the stated basis but not yet approved by a person. |
| `unverified` | There is no basis, the answer is unknown, or it must be checked later. |
| `not applicable` | Confirm that it is irrelevant to the project and close it within the conversation. |

If no basis can be shown for an AI provisional answer, classify it as `unverified`; do not classify it as a `confirmed fact` or `grounded inference`. Do not claim to have performed market research, user interviews, or usage-data analysis when those activities were not actually performed.

Human-confirmed facts and decisions go to the corresponding L1–L3; grounded but unapproved inferences go to Assumptions; deferred, unknown, and unresolved conflicts go to Open Questions. `not applicable` items close within the conversation without creating a new artifact. Shared canonical artifacts retain only the decision-making role; do not record personal names or whether an owner is present or absent.

## Conflicts between perspectives

When perspectives call for different judgments, show perspective A, judgment A, and basis A, and perspective B, judgment B, and basis B separately. Also show the unresolved information needed for a conclusion and either the decision-making role or that the decision-making role is undecided.

Before a human decision is obtained, do not automatically merge the alternatives into one confirmed specification. Deduplicate only semantically equivalent conclusions; do not discard different judgments or bases as duplicates. If the decision remains unresolved, route it to Open Questions.
