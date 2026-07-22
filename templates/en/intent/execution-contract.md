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

Limit selection input to the target Packet and related candidates only. Do not inject the full text of unrelated Intent Tree, Intent Compass, or archive material into selection input or downstream text as a defense against omissions.

When a split canonical store exists, first semantically compare the derived index's status, area, impact, and summary with the Packet's explicit references, Scope, Safety, and Validation. Use the following as selection grounds; a keyword match alone is not a selection ground.

- An explicit reference from the Packet
- An area match or impact relation between the Packet and candidate
- The cross-cutting rule of an active area `always`
- A relation decision already confirmed by a human

Only after narrowing the candidates, read the target symbol file's `## Law` and the `Revisit when` corresponding to that decision. Even when the area is `always`, do not select a `superseded` or archived candidate. If the index or whole split store is absent, permanently fall back to the legacy Intent Compass; if only some target symbols are absent, combine readable split symbols with the legacy form. Set no removal deadline for this fallback, and do not automatically migrate, overwrite, or reclassify all existing data.

Classify each candidate into one of three outcomes.

| Outcome | Conditions | Reader behavior |
|---|---|---|
| `pull` | status is `active` **and** (the candidate is relevant to the work's area or impact **or** its area is `always`) | Include the Law and its corresponding `Revisit when` in the current JIT input |
| `exclude` | status is not `active` (including a `superseded` or archived candidate whose area is `always`), the candidate is irrelevant to the work, or its prerequisite is false | Exclude it from the current pre-implementation gate. Preserve the source and its history |
| `confirm` | status, area, impact, or relevance is missing or ambiguous, so the outcome cannot be determined | Do not infer a value; present the available evidence and the relevance candidate for human confirmation |

The five baseline cases are: active and relevant=`pull`; active and irrelevant=`exclude`; superseded=`exclude`; active and relevant with a satisfied `Revisit when`=`pull` while connecting it to human-led review; unknown relevance=`confirm`. A satisfied `Revisit when` does not automatically exclude or supersede the decision.

Never drop an active decision whose area is `always` during selection. `confirm` is not silent exclusion: keep the item as an unconfirmed candidate until a human checks it. A Preference / Heuristic remains a non-binding candidate even when referenced; do not promote it to a MUST, Invariant, or acceptance criterion. Do not bulk-read unrelated Intent Tree, Intent Compass, or archive material to make this classification.

#### Selection run result

All three exports use the same selection run result for the same Packet input. Each target changes only the placement of this result and does not add candidate-extraction rules or classification meanings.

| Field | Meaning |
|---|---|
| `selected_at` | Selection time in ISO 8601 format |
| `sources` | Canonical references for the target Packet, index, and Laws actually read |
| `selection_status` | `applied` when common selection ran, or `legacy-not-applied` when the contract was absent and the new selection did not run |
| `source_mode` | `split-compass` for split storage only, `mixed-compass` for split plus legacy storage, or `legacy-compass` for legacy storage only |
| `degraded_reasons` | Zero or more applicable reasons among `execution-contract-missing`, `index-missing`, `split-store-missing`, and `symbol-missing` |
| `pull_candidates` | Intermediate set of active constraints with confirmed relevance; do not pass it through unchanged to downstream text or the selection record |
| `selected` | Final set whose required downstream representation is confirmed |
| `confirm` | Final set requiring human confirmation of relevance or a required downstream field |
| `excluded` | Final set of inactive, superseded, archived, irrelevant, or prerequisite-false candidates |

When `selection_status` is `applied`, `selected`, `confirm`, and `excluded` are disjoint and duplicate IDs are forbidden. After checking its downstream representation, move every `pull_candidates` item to exactly one of `selected` or `confirm`; leave none unassigned. Put a candidate with unknown relevance directly in `confirm` for human confirmation, never in `selected`.

Keep the confirmation kinds distinct. Use `relevance` when status, area, impact, or relevance is missing or ambiguous; use `projection` when an item reached `pull_candidates` but a required downstream field cannot be produced uniquely. Do not move a candidate directly to `selected` from the human answer alone. Reflect the answer through the regular path in canonical material—an explicit reference, Scope, or Validation in the target Packet, or the relevant Compass source—then rerun selection and export from the updated canonical material with a new `selected_at`. When the answer does not change canonical material, it does not change the selected set.

Do not use Tree or Compass material, questions, warnings, or verdicts read by the drift check or Open Questions check as input to `sources`, candidate sets, `selected`, `confirm`, `excluded`, downstream constraints, or the internal record. Only when human confirmation updates canonical material may a new run from that updated canonical material reflect the change.

Return these states when degrading:

- When the index is absent, read the existing Compass with `selection_status: applied`, `source_mode: legacy-compass`, and `degraded_reasons: index-missing`.
- When the split store is absent, read the existing Compass with `selection_status: applied`, `source_mode: legacy-compass`, and `degraded_reasons: split-store-missing`.
- When all target symbols are absent, read the existing Compass with `selection_status: applied`, `source_mode: legacy-compass`, and `degraded_reasons: symbol-missing`.
- When only some target symbols are absent, read available symbols from split storage and missing symbols from the existing Compass with `selection_status: applied`, `source_mode: mixed-compass`, and `degraded_reasons: symbol-missing`.
- In a legacy environment where the execution contract is absent, use `selection_status: legacy-not-applied`, `source_mode: legacy-compass`, and `degraded_reasons: execution-contract-missing`; do not claim that the new three-way classification ran, and preserve the existing export output.

#### Projection to downstream constraints

For each `pull_candidates` item, check whether all six fields below can be written uniquely from the Packet and Law without adding a new obligation. Move only a candidate with all six fields to `selected` and pass it to downstream input.

| Field | Content |
|---|---|
| `Identifier` | Constraint ID from Compass |
| `Name` | Short name from the symbol-file heading |
| `Law` | Normative text under `## Law` |
| `Applicability` | Intersection of the conditions stated by Packet Scope and the Law |
| `Verification` | Packet Validation, or an observable target for compliance and a failure condition |
| `Canonical Reference` | Canonical reference to the symbol file read |

Each `Verification` pairs an observable target and a failure condition. Prefer an item that directly corresponds to Packet Validation. When none exists, state where to observe compliance in the downstream draft or implementation result and use absence of a state required by the Law or presence of a state prohibited by the Law as the failure condition. If a field cannot be derived uniquely from Packet Scope, Packet Validation, and the Law without a new obligation, do not fabricate it; move the candidate to `confirm` with kind `projection` and identify the missing field. Until confirmation, do not place it in a downstream MUST, Invariant, or acceptance criterion.

Do not include normal selection reasons such as area match, area `always`, explicit reference, or a human-confirmed relation in downstream requirements, proposal, or spec hints. Do not include any reference to the internal selection record in downstream input. The only exceptions are when the reason itself forms an applicability condition, when downstream must resolve a constraint conflict, or when regulatory, audit, or safety assurance requires the rationale. Even then, include only the minimum summary needed for that decision.

When `selected` contains zero items, do not generate a constraint section or a zero-item explanation solely for this projection.

#### Internal selection record

Generate `constraint-selection.md` in the target Packet output directory. This file is a regenerable derived artifact for reviewing selection; it is not a canonical Packet or downstream specification. Use this format:

```text
# Constraint Selection
selected_at: <selection time in ISO 8601 format>
selection_status: <applied | legacy-not-applied>
source_mode: <split-compass | mixed-compass | legacy-compass>
degraded_reasons:
  - <degraded reason or none>
sources:
  - <canonical reference to the target Packet, index, and each Law actually read>

## Selected
- <ID> <name> — <one-line selection reason> — <canonical path>

## Confirmation Candidates
- <ID> — kind: <relevance | projection> — evidence: <known fact> — missing: <needed information> — <canonical path>

## Legacy Output
- <primary downstream file or not applicable>
```

With `selection_status: applied`, write `none` for an empty Selected or Confirmation Candidates section and `not applicable` for Legacy Output. For zero selected items, writing `none` under Selected makes it observable that selection ran and selected nothing. With `selection_status: legacy-not-applied`, mark Selected and Confirmation Candidates as `not applicable` on the same line and list only the primary downstream file updated by the existing map under Legacy Output. Do not copy the legacy constraint list.

Do not record all excluded candidates. Do not copy any Compass body, including the Law as one part of it, annexes, or legacy-form body text. Do not record a long comparison or alternative analysis, or sensitive case information. Do not copy selection history into the Packet, and do not pass `constraint-selection.md` to downstream input. A Packet body changes only from a human-confirmed canonical decision, not from the selected list or its one-line reasons.

On re-export to the same target, replace the entire file; do not append to the existing record or duplicate a selected constraint or confirmation candidate. Update the downstream draft and internal record from the same run, with the same `selected_at` and selection result. Stage all outputs in temporary storage before replacing existing files, verify that they come from the same selection result and can all be written, then replace them as one set. If preparation, writing, or replacement fails, do not treat the run as successful; discard the new set and leave all previous downstream drafts and the internal record unchanged. Do not establish only one output as the new run.

If a discovery during selection changes Packet Scope, Expected Behavior, Validation, safety, compatibility, data integrity, or another important decision that a human must fix, do not apply it automatically. Stop only the affected scope, obtain human confirmation under “Decisions during implementation,” and return through the regular Packet update path. After updating the canonical artifact, rerun selection and export from that artifact.

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

## Declaration-implementation gap check (oversize-guard)

Run the following check only when the target packet has the optional section "## Expected size"; without the section, do nothing (backward compatible; the declaration is optional).

- **Two checkpoints**: lightly after each task (or commit) completes, and as a summary before the work unit completes, compare the declaration (nature of deliverables, size band) with the implementation reality by meaning. Numbers such as changed lines may support the reasoning but never act as mechanical thresholds or scores for the verdict.
- **Three representative signs**: (1) deliverable kinds absent from the declared nature keep appearing, (2) the change volume keeps exceeding the declared size band by far, (3) realization and checks are thin against the declared behavior. The representatives are cues, not an exhaustive verdict list.
- **Warning shape**: on a suspected sign, show in one to a few lines the target, the grounds (which part of the declaration and which part of reality disagree), and the selectable responses (continue / shrink / an independent review from another perspective). Recommend an independent review (a subagent or another perspective) on signs — never mandatory. Never repeat a warning for the same grounds (at most once per work unit).
- **Strength follows the `oversize-guard` setting in `.intent/mode.md`**: `off` = no check; `warn` (default, including absent or invalid values) = warning only, never stopping the implementation; `gate` = stop only the implementation of the affected work unit until the user responds (other work units and parallel work continue).
- **Recording**: record warnings, non-hits, and user verdicts with the existing nine keys of the drift-log (`pattern: uncatalogued:declaration-gap` (overbuilt side) or `uncatalogued:declaration-gap-thin` (thin side); `stage: export` — keeping the existing three values and noting in `note` that this is an implementation-stage check, per the existing convention; `mechanism: declaration-gap`; `outcome: caught` as a draft finalized by the user's verdict).
- **The check and the warning go only as far as presentation and recording; they never modify, delete, or revert the implementation automatically.** If the check itself fails (e.g. the declaration cannot be read), say "could not check" in one line and never stop the implementation.

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
