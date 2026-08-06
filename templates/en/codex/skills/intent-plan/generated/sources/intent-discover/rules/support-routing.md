# Support Routing

A rule used by `intent-discover` to decide what support this case needs before mode selection. Do not select support from a fixed table of professions. Guide the user only to a user-facing skill or process that is currently available; never present this rule or another internal rule as a support destination.

## Inputs

Combine 目的 (purpose), 成果物 (artifact), 指定資料 (specified material), and 次の判断 (next decision) according to the meaning of the whole request, including negation and surrounding context. A profession, experience, keyword, or file name alone do not determine the support.

For the first important decision, handle only the scope needed from the material. All materials' read completion is not a prerequisite for starting questions. Separate readable content from an unreadable constraint, and do not infer unreadable content.

## Outcomes

From the following four outcomes, return exactly one.

1. `AvailableSupport`: only support whose availability is verified in the current installation, and that is a user-facing skill or process, may be `AvailableSupport`. Include the target, selection reason, the user's next action, and where to return afterward.
2. `SupportCandidate`: return this when the needed specialist domain is clear but no corresponding process can be verified. Do not claim or present `SupportCandidate` as available. Show the needed support candidate, the missing process, and the existing flow that can proceed now.
3. `ClarificationQuestion`: only when candidates would make the outcome differ and available information cannot select one, return `ClarificationQuestion` with one question. Include the result that the answer would change. When input is empty, or required material cannot be read and support cannot be selected, do not guess; show only a small number of missing items at once.
4. `ExistingFlow`: when no new support guidance is needed, use `ExistingFlow` to continue the existing mode selection or existing flow unchanged. When support can be selected, do not ask another classification question.

Do not put unverified specialist support or an unimplemented later process in `AvailableSupport`. Do not load detailed specialist rules here; leave them to the selected user-facing support. For a non-procurement case, procurement questions and an RFP format are out of scope; do not add them.

## Material Ingestion Guidance

Only when detailed material ingestion is needed, explain its purpose, the existing flow to use, the user's next action, and the return point afterward. The existing process is `intent-from-spec`, and it is guidance only for returning to support routing. Do not auto-run material ingestion.

When there is no material, or detailed ingestion is not needed for support selection and an important question, detailed instructions are out of scope; do not load them. Do not read material or select support from a file name alone.

## Re-evaluating the Same Material

- Treat material as the same only when the readable conversation or existing artifacts confirm the same source and same version. Reuse existing selection results, questions, and change candidates without adding the same items again.
- A version change or a reported content change makes it a different material; re-evaluate the changed portion. Do not require reading all materials again.
- When identity is unknown, do not assume that it was already processed or that it is different material. Only when the version or change report would make the support outcome or next question change, ask one question. Otherwise, continue the existing flow without asking about identity.
- Prevent duplication only within the readable conversation and existing artifacts whose source can be traced. Do not create a new fingerprint ledger or persistent routing state.

## Prohibitions

A user attribute database, fixed role classification, machine score, or persistent question ledger: do not create or require them. Do not require every material, expose an internal rule as available support, or perform material ingestion or specialist processing on the user's behalf.
