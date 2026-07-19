# Bounded Autonomy Contract for Implementation

Read this short shared contract just in time during implementation, export, and writeback. It does not prescribe the AI's implementation steps. It sends only changes that cross an agreed design boundary to a human decision.

## Important-decision check at implementation entry

Before selecting direct implementation, and when a session starts from a packet or implementation, check at implementation entry. Read the target packet and important decisions related to the work. For each unresolved decision, present a provisional answer proposal, rationale, and condition that would change the recommendation. Do not advance the affected scope until the human provides a decision, marks it out-of-scope for this work, or authorizes scope-limited explicit continuation.

Keep explicit continuation unresolved and use it only for the authorized item and scope. An Open Question that is not an important decision is not a reason to stop implementation by itself.

## Binding strength

Read the existing artifact locations as the following four levels. Do not add a new label to every item.

| Strength | Existing location | Treatment |
|---|---|---|
| Invariant | Compass / packet Safety | Must not be violated. When its premise changes, explicitly revise the canonical Invariant before resuming |
| Scope / Acceptance | packet Scope / Expected Behavior / Validation | Required for the current result. Crossing or missing it requires a human decision |
| Decision | Compass Decision Rule / packet Decisions | Current design baseline. Choosing a different design requires human approval |
| Preference / Heuristic | guidance / Agent-discretion / candidate | Non-binding. The AI chooses within the boundary without adding confirmation |

When the binding strength cannot be determined, do not guess or promote it into a stronger rule. Return it to the human as unknown.
Also check related Anti-directions as implementation boundaries, and exclude a Decision explicitly marked superseded from the current baseline. Do not silently rewrite intent when code reality differs; handle the difference as a delta through `/intent-writeback`.

## Classifying JIT inputs

- **Confirmed material**: the target packet's Safety / Invariants, Scope, Expected Behavior, Validation, Human-fixed Decisions, and the active Invariants / Decision Rules related to them. Read these as the material required for this implementation boundary and its acceptance.
- **Implementation-time revalidation candidates**: only entries under the target packet's `## Decisions` Agent-discretion zone that carry both a reason for remaining undecided and the same item's `Revisit when`. Do not collect every Decision Rule's `Revisit when`. The candidate itself is non-binding and serves only as an exploration clue. If it materializes inside the boundary, continue without adding confirmation; connect it to the decision below only when it crosses the boundary.
- **Explicitly excluded information**: the full text of unrelated Tree / Compass / archive material and the bodies of other packets. A single necessary reference may be read, but do not return to bulk input as a defense against omissions. When the target packet has no revalidation candidate, add no extra input or output.

### JIT pull of relevant decisions

When a split canonical store exists, use its derived index to select only candidates whose status is `active` **and** (that are relevant to the work's area or impact **or** whose area is `always`), then read only the target symbols' `## Law` sections. Even when the area is `always`, do not select a `superseded` or archived candidate. If the split store or a target symbol is absent, permanently fall back to the legacy Intent Compass. Set no removal deadline for this fallback, and do not automatically migrate, overwrite, or reclassify all existing data.

Classify each candidate into one of three outcomes.

| Outcome | Conditions | Reader behavior |
|---|---|---|
| `pull` | status is `active` **and** (the candidate is relevant to the work's area or impact **or** its area is `always`) | Include the Law and its corresponding `Revisit when` in the current JIT input |
| `exclude` | status is not `active` (including a `superseded` or archived candidate whose area is `always`), the candidate is irrelevant to the work, or its prerequisite is false | Exclude it from the current pre-implementation gate. Preserve the source and its history |
| `confirm` | status, area, impact, or relevance is missing or ambiguous, so the outcome cannot be determined | Do not infer a value; present the available evidence and the relevance candidate for human confirmation |

The five baseline cases are: active and relevant=`pull`; active and irrelevant=`exclude`; superseded=`exclude`; active and relevant with a satisfied `Revisit when`=`pull` while connecting it to human-led review; unknown relevance=`confirm`. A satisfied `Revisit when` does not automatically exclude or supersede the decision.

Never drop an active decision whose area is `always` during selection. `confirm` is not silent exclusion: keep the item as an unconfirmed candidate until a human checks it. A Preference / Heuristic remains a non-binding candidate even when referenced; do not promote it to a MUST, Invariant, or acceptance criterion. Do not bulk-read unrelated Intent Tree, Intent Compass, or archive material to make this classification.

## Decisions during implementation

- The AI chooses implementation means that stay within the agreed scope, do not change acceptance criteria or an important decision, and are easy to reverse, then continues without asking.
- When a better idea crosses an agreed boundary, do not silently discard it merely because it differs from the design, and do not implement it without approval.
- When a new fact requires an important decision, stop the affected work within the evidence-backed affected scope. Do not stop unrelated work.
- Choose the stage to return to according to what the decision would change.
  - Return a decision that changes the purpose, target user, outcome, or overall scope to discover.
  - Return a policy that constrains multiple work items, or a hard-to-reverse decision, to compass.
  - Return a decision that changes work scope, acceptance criteria, or concrete behavior to packets.
- Present the following decision material and wait for the human's answer: the new fact, affected boundary, benefit, risk, and reasoned answer proposal. When materially distinct options exist, also present their differences and a recommendation.
  - A. Maintain the agreed design
  - B. Approve it as a design change
  - C. Send it to a subsequent packet
- For B, update the relevant Intent artifacts through their normal path and re-export if already exported. Update or recheck the affected downstream artifacts before resuming implementation for the affected scope only.
- Do not manage the session or internal state of an external specification or implementation tool. Treat updated Intent artifacts and rechecked downstream artifacts as the conditions for resuming implementation.

## Direct implementation review

For the direct exit:

1. Before editing, compare the implementation approach with the target packet, related Invariant / Decision Rule, and this contract.
   If the target packet cannot be identified, do not guess; ask the human before editing.
2. Delegate only the review to an independent viewpoint when available. If delegation is unavailable, fall back to self-review and record that fact.
3. After editing, compare the change with the same boundaries. Treat findings inside the boundary as warnings; only boundary crossing waits for the three-way human decision above.
4. When an issue directory exists, update one `direct-review.md` file with whether findings existed, the review method, and whether a boundary was crossed. If no issue directory exists, omit the record and do not stop implementation.

`/intent-validate` checks planning artifacts across phases; it does not replace this direct pre/post implementation review.

## Downstream and legacy environments

- Export drafts carry a reference to this file and the mapping from packet sections to binding strength. They do not copy this contract body.
- In a legacy environment where this file is absent, state that fact and continue with the target packet plus related Invariant / Decision Rule as before. Absence alone does not stop implementation, export, or writeback. Whether or not this contract exists, permanently retain the read fallback to the legacy Intent Compass.
