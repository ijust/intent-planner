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

## Three disciplines

A skill applying this catalog observes the following three disciplines.

1. **Do not offer defaults (anchoring avoidance)**: do not present a "reasonable default" or "recommended value" for a slot. This avoids the anchoring bias where judgment is dragged toward the first value presented. Symmetric side-by-side presentation of multiple options is reserved as a future extension candidate.
2. **The tool does not infer applicability or values**: do not infer or auto-fill whether a slot applies, or which value it takes, from the artifact contents. People declare them (the same declaration-based discipline as not inferring `depends_on`). `intent-validate` only checks the slots/statuses actually declared.
3. **Do not fix the ceiling (How)**: a slot declares "what to decide (what + constraints + oracle)" and does not make the packet carry the implementation How. The local search inside the rules is delegated to the agent's discretion zone.

## How to extend

- **Extension completes by just adding a row to the table** (no structural change to other files needed — the "table is canonical" pattern). To grow the common core, add a row to the common-core table; to grow a mode delta, add a row to that mode's table.
- **For a slot covered by an existing artifact, reference the "closes in" and do not create a new container**. Intent/scope/stakeholders/constraints/acceptance evidence, etc. are covered by the existing tree / compass / packet existing sections, so do not recreate them in `## Decisions`; reference their closing section.
- For a slot with the same subject as an existing rule (e.g. `decision-characterization`), keep it as a reference to the existing file (`algo-characterization-test.md`) and do not duplicate the definition.
