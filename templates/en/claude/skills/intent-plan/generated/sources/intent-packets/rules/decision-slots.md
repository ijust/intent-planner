# Decision Slots Catalog (completeness schema)

The **single canonical source of the completeness schema** that lists easy-to-miss topics as a "table of contents". Instead of leaving coverage to free-form requirement prose, it structurally bounds the kinds of omissions. `intent-discover` (posture check), `intent-packets` (slot seeding), and `intent-validate` (satisfaction check) all read this catalog as the single reference.

This catalog is a "sample (a table of contents of easy-to-miss topics)", not a fixed net. Filling gaps for a project type is delegated to discover's posture check and the mode-specific deltas.

## Value range and status

Each slot takes one of the value range `decided value | undecided (with reason) | not applicable`, and **must be closed** with one of the following 4 statuses (structurally preventing "silently skipping").

| Status | Meaning | What to record alongside |
|--------|---------|--------------------------|
| Answered | A decided value exists | The decided value (in the packet's `## Decisions` or the closing section) |
| Undecided | Not yet decided (deferred) | Reason, a downstream caveat, and a revisit condition (Revisit when) |
| Not applicable | This slot does not apply to this packet | The rationale for non-applicability (do not silently drop it) |
| Send to ADR candidate | An architecture-significant decision | Send it to the compass's Decision Rules (the target of up-front fixing) |

- `Answered` corresponds to the value range `decided value`, `Undecided` to `undecided (with reason)`, and `Not applicable` to `not applicable`. `Send to ADR candidate` is a declaration until the value is decided on the compass side.
- For a slot whose "closes in" is an existing section (`## Validation` / `## Expected Behavior`, etc.), you may declare in `## Decisions` that it "is closed in the existing section" rather than duplicating the value (do not define it twice).

### Ready condition for an important undecided slot

When an important decision remains undecided under the classification in `CONTRACT.md`, do not mark the affected packet `ready`. Present the affected packet and the evidence for the effect, and obtain one of these outcomes for the item: **a decision, out-of-scope for this work, or scope-limited explicit continuation**. Record the outcome, recheck the affected artifacts, and then resume only the affected scope for ready/export.

When a slot is not an important decision, its undecided status is not by itself a reason to stop. Unrelated packets may continue to become ready and remain candidates for export. Never stop all packets solely because a slot has the `Undecided` status.

## Common core slots (seeded in all modes)

8 slots seeded into every packet. The first 4 (centered on ④) stem from "decision-making under constraints"; the latter 4 fill gaps that existing artifacts did not cover.

| ID | Slot name | What to confirm | Completion condition | Closes in | Up-front/deferred door | Rationale |
|----|-----------|-----------------|----------------------|-----------|------------------------|-----------|
| `decision-consistency` | Consistency model | On data change, strong (immediate) or eventual consistency | Which consistency model is declared and downstream can rely on it | packet `## Decisions` (new) | Up-front (one-way: costly external impact if overturned later) | Irreversible, binds multiple packets. ISO/IEC/IEEE 42010 decision/rationale |
| `decision-idempotency` | Idempotency & retry | Preventing inconsistency on write retry (idempotency keys, etc.) | The behavior on retry is declared | packet `## Decisions` (new) | Deferrable (two-way: discretionary if localizable and reversible) | Affects the acceptance oracle; a retry-premised quality attribute |
| `decision-error-semantics` | Error semantics & boundary validation | Boundary validation and error return when input is empty/unexpected (Fail-Fast, etc.) | The return contract on abnormal input is declared | packet `## Decisions` (new) | Deferrable (two-way) | Affects the acceptance oracle and external contracts |
| `decision-authz` | Authorization | Which actors may act, and row-level permission to accessible data | Who can access what is declared | packet `## Decisions` (new) | Up-front (one-way: security/regulatory floor) | Irreversible, security floor. A high-cost decision |
| `decision-quality-priority` | Quality-goal prioritization | Among performance/reliability/maintainability/security, the load-bearing top 2-3 attributes | The top attributes are declared with a ranking | packet `## Decisions` (new; may link with compass Invariants) | Deferrable (two-way) | A quality trade-off point. ISO/IEC 25010 quality vocabulary |
| `decision-fit-criterion` | Numeric/fit criterion | How acceptance is measured (fit criterion / SLO / test oracle) | The numeric/observable acceptance condition is declared | Reference packet `## Validation` (existing). If undecided, declare in `## Decisions` | Deferrable (two-way) | Affects the acceptance oracle. Volere's fit criterion |
| `decision-exception-flow` | Exception flow | Whether representative abnormal-path flows are defined, not only the happy path | Representative abnormal-path flows are declared | Reference packet `## Expected Behavior` (existing). If missing, declare in `## Decisions` | Deferrable (two-way) | Fills the happy-path-bias gap (PBR test/operations viewpoints) |
| `decision-downstream-trace` | Downstream trace | Links to the work/tests that realize/verify this packet (realized-by / verified-by) | Downstream links are declared (or judged minimally-sufficient and left empty) | packet `## Verification protocol` / trace links (new, optional) | Deferrable (two-way) | Bidirectional trace (fills the pre-RS gap) |

- Because `decision-fit-criterion` / `decision-exception-flow` close in existing sections, if they are closed in the existing section, place only a reference in `## Decisions` stating it "is closed in the existing section" (do not define it twice).
- The common core is seeded in all modes. `intent-validate`'s `decision-slot-unsown` check detects "none of these 8 IDs is seeded in `## Decisions`" (common core unsown).

## Mode-specific delta slots (added per mode)

Delta slots **added** to the common core according to the mode in `.intent/mode.md`. The slot definitions are canonical in this table and are not hardcoded into the skill body (riding on the Mode/Algorithm/Skill three-layer separation).

### standard

| ID | Slot name | What to confirm | Completion condition | Closes in | Up-front/deferred door |
|----|-----------|-----------------|----------------------|-----------|------------------------|
| `decision-perf-budget` | Performance budget | The allowable envelope for latency/throughput/resources | The performance envelope is declared | packet `## Decisions` | Deferrable (two-way) |
| `decision-data-ownership` | Data ownership | Where this data's source of truth is and who may modify it | The data's source of truth and the modifying party are declared | packet `## Decisions` | Up-front (one-way: large external impact if overturned later) |

### refactor

| ID | Slot name | What to confirm | Completion condition | Closes in | Up-front/deferred door |
|----|-----------|-----------------|----------------------|-----------|------------------------|
| `decision-characterization` | Behavior to preserve / characterization tests | Test points that pin the current observable behavior exactly as it is | The observed behavior is pinned | Reference the existing `algo-characterization-test.md` (do not define it twice) | Up-front (one-way: pin the safety net first) |
| `decision-change-boundary` | Change boundary | How far it is OK to change, and what must not be touched | The changeable range and the untouchable range are declared | packet `## Decisions` | Up-front (one-way) |
| `decision-rollout-safety` | Rollout safety | How to revert and what to observe when rolling out the change in stages | The rollout strategy and how to revert are declared | packet `## Decisions` / reference `## Rollback` (existing) | Deferrable (two-way) |

### behavior-unknown

| ID | Slot name | What to confirm | Completion condition | Closes in | Up-front/deferred door |
|----|-----------|-----------------|----------------------|-----------|------------------------|
| `decision-observed-facts` | Observed facts and their source | What was observed and where its source is | The observed facts and their source are declared | packet `## Decisions` / reference `## Expected Behavior` (existing) | Up-front (one-way: pin the facts first) |
| `decision-hypothesis-confidence` | Distinguishing hypothesis from confidence | Which are facts and which are hypotheses, and to what degree of confidence | Facts/hypotheses and confidence are distinguished | packet `## Decisions` | Deferrable (two-way) |
| `decision-current-vs-future` | Separating current behavior from future intent | Whether "it behaves like this now" and "we want it to behave like this" are conflated | Current behavior and future intent are declared separately | packet `## Decisions` | Deferrable (two-way) |

### feature-growth

| ID | Slot name | What to confirm | Completion condition | Closes in | Up-front/deferred door |
|----|-----------|-----------------|----------------------|-----------|------------------------|
| `decision-existing-boundary` | Consistency with existing boundaries | Whether it is consistent with existing module boundaries/contracts | The policy for consistency with existing boundaries is declared | packet `## Decisions` | Up-front (one-way) |
| `decision-backward-compat` | Backward compatibility | Whether it breaks existing users / existing data | The backward-compatibility policy is declared | packet `## Decisions` | Up-front (one-way: a high-cost decision) |
| `decision-data-migration` | Data migration | How to migrate existing data and consistency during migration | The migration strategy is declared | packet `## Decisions` | Up-front (one-way: irreversible) |
| `decision-staged-rollout` | Staged rollout | How to run old and new in parallel and how to switch over | The staged-rollout strategy is declared | packet `## Decisions` | Deferrable (two-way) |
| `decision-legacy-impact` | Impact on legacy features | The side effects this extension has on existing features | The impact on legacy features is declared | packet `## Decisions` | Deferrable (two-way) |

## Product slots (second group; seeded in all modes; role-aware-planner)

Four slots that complement the product judgments easily left unasked (whose problem, how we will know value materialized, what is out of scope, which alternatives were considered). Seed them in all modes, like the common core (a purely engineering packet with no product judgment involved may close them cheaply as "not applicable + a one-line reason"). The `decision-slot-unsown` check in `intent-validate` keeps judging **only the 8 common-core IDs** as before; this table is not part of that judgment (backward compatible; existing packets are not retroactively flagged).

| ID | Slot name | What to confirm | Completion condition | Closing destination | Front-load/defer door | Grounds |
|----|-----------|-----------------|----------------------|---------------------|-----------------------|---------|
| `decision-target-user` | Target user | Whose problem, in what situation, is being solved | The target user and the problem to solve are declared | Refer to tree L1 (Actor) or the packet's value description; declare in `## Decisions` if absent | Front-load (one-way: with the "whose problem" left vague, neither acceptance nor value can be measured) | Complementing product-judgment silence (C31) |
| `decision-success-signal` | Success signal | How we will know, after release, that value materialized (with the means of observation) | A success signal with the means of observation is declared | Refer to the tree L1 measurement criteria (and the outcome yardstick, once introduced); declare in `## Decisions` if absent | Deferrable (two-way; but think it through once before export) | Separating acceptance (built correctly) from outcome (value materialized) (C31) |
| `decision-out-of-scope` | Out of scope made explicit | Whether the range deliberately not done this time is made explicit | The range not done is declared | packet `## Non-scope` (refer to the existing section; do not duplicate) | Front-load (one-way: unspoken expectations swell downstream) | Preventing silent scope creep (in line with DR9) |
| `decision-alternatives` | Alternatives considered | Whether the options not taken and the reasons remain on record | The alternatives considered are declared (send architecture-significant ones to the compass as ADR candidates) | Refer to the compass Decision Rules (Alternatives considered); declare packet-local ones in `## Decisions` | Deferrable (two-way) | Correctability of decisions (in line with A29) |

- All four slots refer to existing containers as their closing destinations wherever possible (create no new container — the extension convention). For `decision-out-of-scope`, when `## Non-scope` already exists, place only a "closed in the existing section" reference.

## Three disciplines

A skill applying this catalog observes the following three disciplines.

1. **Place no single recommended anchor (anchoring avoidance; DR199)**: do not present **just one** "reasonable default" or "recommended value" first for a slot and drag the judgment (avoiding the anchoring bias where judgment is dragged toward the first value presented). **Presenting multiple options as equals is fine** — line up the substantively different options for that decision point as equals, with grounds, inference-tagged, and if you have a favorite, say "my pick" explicitly (the hidden anchor is the violation).
2. **The tool does not infer applicability or values**: do not infer or auto-fill whether a slot applies, or which value it takes, from the artifact contents. People declare them (the same declaration-based discipline as not inferring `depends_on`). `intent-validate` only checks the slots/statuses actually declared.
3. **Do not fix the ceiling (How)**: a slot declares "what to decide (what + constraints + oracle)" and does not make the packet carry the implementation How. The local search inside the rules is delegated to the agent's discretion zone.

## Packets-specific question coverage

Use the shared contract's "Question coverage and completion conditions" in `CONTRACT.md`. Treat touched L2/L3 branches and each packet as targets, adding **decision slot, Expected Behavior, and Validation**, plus Non-scope, dependencies, and rollback as packets-stage perspectives. The slot table and Example Mapping discover concerns; they are not a fixed questionnaire or overall completion condition.

- Do not redefine the shared depth, batches, additions, completion, or stop scope. Decide packet readiness from the mapped shared state below, not from a slot-local status name alone.
- `answered` maps to shared `answered`; `n/a` maps to shared `out of scope for this case`.
- `undetermined` maps to shared `deferred with a reason` only when the reason, Revisit when, and grounds for non-impact until then are all explicit. If any is missing, it maps to shared `unconfirmed`.
- `send to ADR candidate` maps to shared `unconfirmed` until the ADR decision is resolved and reflected in the packet. Sending a candidate does not close question coverage.

## Deep questioning-through lane (only when question-depth=deep; A46; DR86; INV58)

At the default `question-depth=standard`, important slots in the shared coverage are still closed through confirmation of an inferred proposal or a question. Only when the user explicitly chooses **deep** does this lane question through the additional coverage.

- **Firing condition**: read `question-depth` in the inherited issue directory's `mode.md` (recorded by `/intent-discover`; treated as standard if absent) and fire only when it is **`deep` and `designer-questions=on`**. Do not fire on standard / absent / off (the default sowing and closing behavior is entirely unchanged = backward compatible).
- **Form of questioning-through**: among the slots sown on the packet, take the load-bearing undetermined ones and **present them grouped by related slot**, letting the user choose "answer / later / n/a". Do not interrogate each slot one by one (guardrails below). Record answers in the existing slot statuses, then use the mapping above to determine the shared state. "Later" does not permit ready unless its reason, revisit condition, and non-impact grounds are all present.
- **Guardrails (INV58; strictly)**: keep each group small under the shared contract's display limit and do not fire one by one; give a one-line reason per question (not an interrogation); always allow "later / unsure / n/a"; do not force an answer.
- **Anchoring avoidance is unchanged even in deep (inherits discipline ① of the 3; DR199)**: even in the questioning-through lane, do not present a "reasonable default / recommended value" first as a single recommended anchor. **Ask, but place no single anchor** (presenting multiple options as equals is fine). What deep widens is the scope of questioning, not the pushing of a single recommendation.
- **Separate the lane from A30 decision-probe**: this lane goes from the AI to the human (eliciting intent). It is the reverse direction from the intent-side Self-Probing in `intent-packets/rules/decision-probe.md` (the AI judging its own hypothesis against the ledger's evidence = AI→ledger); do not raise the same question twice.

## How to extend

- **Extension completes by just adding a row to the table** (no structural change to other files needed — the "table is canonical" pattern). To grow the common core, add a row to the common-core table; to grow a mode delta, add a row to that mode's table.
- **For a slot covered by an existing artifact, reference the "closes in" and do not create a new container**. Intent/scope/stakeholders/constraints/acceptance evidence, etc. are covered by the existing tree / compass / packet existing sections, so do not recreate them in `## Decisions`; reference their closing section.
- For a slot with the same subject as an existing rule (e.g. `decision-characterization`), keep it as a reference to the existing file (`algo-characterization-test.md`) and do not duplicate the definition.
