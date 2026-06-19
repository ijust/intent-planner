# Check Catalog: intent-validate

The canonical source of the checks that the `intent-validate` skill applies. SKILL.md carries only the procedure and the report format; the definition of the checks references this file. To add a check, just add a row to this table (the table is the source of truth). The ID of each check is its stable identifier and is cited alongside the severity in each reported finding (this table is also the source of truth for the list and count of IDs).

## The 3 severity classes

| Severity | Definition |
|----------|------------|
| must-fix | A contradiction or consistency break that should be resolved before starting work. Proceeding to export / implementation as-is becomes a cause of architectural drift |
| recommended | A quality risk. Not severe enough to stop work immediately, but resolving it raises the deliverables' reliability as a basis for judgment |
| info | A heads-up. Action is optional, but the state should be known |

### Demotion rule

- If an intentional, reasoned deferral record (Deferred or Open Questions) exists for a missing item, report that item's severity lowered to "info".

## Check catalog

| ID | Category | Check | Condition | Severity guideline |
|----|----------|-------|-----------|--------------------|
| invariant-conflict | Contradiction | A packet's Scope/Expected Behavior conflicts with the compass Invariants | always | must-fix |
| anti-direction-violation | Contradiction | A packet's direction falls under the compass Anti-direction | always | must-fix |
| l3-intent-mismatch | Contradiction | Mismatch between the intent-tree L3 intent and the packet content (direct contradiction with an explicit L3 statement = must-fix; divergence open to interpretation = recommended) | always | must-fix/recommended |
| goal-without-packet | Coverage | A goal among the tree's L1–L3 goals that corresponds to no packet (including L4) | always | recommended |
| orphan-packet | Coverage | An orphan packet whose Parent Intent traces back to no node of the tree | always | must-fix |
| stale-questions | Coverage | Stagnation of unresolved Questions in tree/compass/packets | always | info |
| stale-assumptions | Coverage | Items remaining in the intent-tree Assumptions that have been neither promoted to canonical nor rejected | always | info |
| dependency-cycle | Consistency | `depends_on` contains a cyclic dependency A→…→A | always | must-fix |
| dependency-broken-ref | Consistency | `depends_on` references a packet_id that does not exist | always | must-fix |
| invariant-uninherited | Consistency | A compass universal invariant is not inherited into the packet `## Safety / Invariants` (silent omission, not a conflict) | always (compass Invariants filled and an active packet exists) | recommended |
| invariant-stale-vs-compass | Consistency | A compass section update date (Invariants section / Decision Rules section) is newer than the packet `updated_at` (a follow-up-lag candidate) | always (compass section update date and packet update date present) | recommended |
| decision-rule-mismatch | Consistency | The packet `## Decisions` violates the compass Decision Rules | always (compass Decision Rules filled and the packet has a `## Decisions` section) | must-fix/recommended |
| decision-rule-code-alignment | Consistency | Grep-read the code module (file name / module name) named by a Decision Rule's main statement / Context, and detect a semantic divergence between the Rule's main statement and the implementation via the AI's limited semantic matching. Matching surface = the meaning of the code implementation (separated from `decision-rule-mismatch`, whose surface = packet slot values). Output carries an "AI semantic-matching estimate" label and is a one-directional report that never asserts | always (a Decision Rule names a code module and the named target exists) | recommended |
| packet-scope-overlap | Boundary | Scope overlap / responsibility conflict between the packet files under active/ (archive/ is not read) | always | must-fix |
| decision-slot-empty | Completeness floor | Among the decision slots (④) sown in the packet's `## Decisions` section, those whose value is empty (unfilled). A reasoned `undetermined` is demoted to info by the demotion rule | a packet that has slots sown in its `## Decisions` section | recommended |
| decision-slot-unsown | Completeness floor | The `## Decisions` section exists but not a single common-core slot (none of the 8 common-core IDs of `decision-slots.md`) has been sown | a packet that has a `## Decisions` section (an old packet with no section at all is skipped as an unverified target) | recommended |
| export-draft-mismatch | Boundary | Consistency between the current export draft (the directory of the packet on the latest export-log row) and the target packet file (under active/) (mismatched transcription of Invariants, divergence from the packet definition, etc.) | always | recommended |
| requirements-smell | Quality | A requirement statement still contains vague words, subjective words, comparatives, weak words, or undefined pronouns (e.g., "appropriately", "fast", "better", "etc.", "as much as possible", an "it" with no clear referent). Detect, quote, and leave the judgment to the user (do not write the rewording back to the source) | always | recommended |
| ambiguous-deferred-phrasing | Quality | In the packet's `## Decisions` section, an unsettled verb (assume/assumed, reuse/divert, planned/TBD, tentative, etc.) that sits outside the Human-fixed / Agent-discretion partition and carries no accompanying Revisit when, hidden in finalized-sounding phrasing. Detect, quote, and leave the judgment to the user (do not write the rewording back to the source) | always (the packet has a `## Decisions` section) | info |
| trace-downstream-missing | Coverage | A packet exists for a tree L1–L3 intent, yet that packet has no downstream link (`verified-by` / verification) so it cannot be traced to verification (the verification side of downward coverage). The packet's own absence is owned by `goal-without-packet`, so do not duplicate it | always | recommended |
| trace-pre-rs-missing | Coverage | The packet frontmatter lacks the upstream link `parent_intents` key, or it is empty (the cut point of intent→requirement pre-RS). An orphan whose `parent_intents` is present but traces back to no node of the tree is owned by `orphan-packet`, so do not duplicate it | always | recommended |
| poc-experiment-missing | Normative | Any of hypothesis / falsification criteria / GO-NO-GO criteria is unrecorded in "PoC Experiment Definition" | designer-questions=on and purpose=poc | must-fix |
| l1-metric-missing | Normative | An L1 item lacks a `Measurement criteria:` line | designer-questions=on | recommended |
| walking-skeleton-missing | Normative | The "Walking Skeleton" section of plan.md is unfilled (when plan.md is filled in) | designer-questions=on | recommended |
| screen-sketch-missing | Normative | The "Screen Rough Reference" section is unfilled (none of a path, a link, "Not applicable", or a reasoned "none" is present) | designer-questions=on | recommended |
| designer-questions-unrecorded | Normative | designer-questions is unrecorded (skip the checks in the Normative category and announce only this row) | designer-questions unrecorded | info |
| purpose-unrecorded | Normative | purpose is unrecorded (skip the hypothesis / falsification criteria / GO-NO-GO check and announce only this row) | designer-questions=on and purpose unrecorded | info |
| coinage-suspect | Quality | Against the mother-set `.intent/glossary.md` (the lightweight canonical-vocabulary ledger), name in a read-only manner any term found nowhere in the ledger as a "suspected coinage". The judgement is semantic (excluding proper nouns, established English terms, and legitimate new terms already given a first-mention one-line explanation), not pushed onto the mechanical check. It stays a candidate suggestion that never asserts, and stays silent when there is no suspected coinage | always (`.intent/glossary.md` present) | info |

- The condition "always" does not override the principle of unverified targets (if the target deliverable is missing or unfilled, skip that check).
- The designer-questions / purpose in the conditions refer to the values recorded in mode.md. Do not run a check whose condition is not met. When designer-questions=off is recorded, run none of the checks in the Normative category. The reader judges designer-questions first and does not consult the purpose value unless on is recorded.

## Note on the completeness-floor checks (no inference; declaration-based)

- `decision-slot-empty` / `decision-slot-unsown` carry the "completeness floor" (the cutoff line). They prevent ④ decisions-under-constraints (consistency, idempotency, error semantics, authorization, etc.) from advancing to export/implementation while blank. The canonical source for the slots is `intent-packets/rules/decision-slots.md` (it owns the categories, firing conditions, and value domain).
- **Do not infer applicability from packet content**: these checks target only the slots **actually sown** in the `## Decisions` section. They do not make inferential judgments like "this packet must involve writes, so it needs a slot" (which slot to sow is the responsibility of a human confirming it in discover's elicitation; the same discipline as not inferring `depends_on`).
- An old packet with no `## Decisions` section at all is skipped as an unverified target (no forced immediate bulk migration; the next update flow lazily completes the slots).
- A reasoned `undetermined` is demoted to "info" for `decision-slot-empty` by the demotion rule (deferral is allowed as an intentional postponement; the completeness floor is "prohibition of blanks", not "forcing immediate finalization of every item").

## Note on the dependency-soundness checks (read-only and the reference-resolution scope)

- `dependency-cycle` / `dependency-broken-ref` are **read-only** and do not modify the packet source of truth (frontmatter, etc.) at all.
- The existence check for the referenced packet_id in `dependency-broken-ref` is performed against the **full set of active+archive packet_ids** (an archived packet_id is also considered to "exist").

## Note on the smells / trace checks (read-only, minimally sufficient, no write-back)

- `requirements-smell` **only detects and quotes** vague words, subjective words, comparatives, weak words, and undefined pronouns; it does not write reworded suggestions back to the source. Its severity is "recommended" (not enough to stop work, but resolving it raises reliability as a basis for judgment).
- The trace checks (`trace-downstream-missing` / `trace-pre-rs-missing`) are **read-only** and do not write derived links or filled-in gaps back to the source (the same discipline as not inferring / auto-computing `depends_on`).
- Keep traces **minimally sufficient**: do not connect every artifact pairwise; flag only the gaps that break being able to trace "why it exists (upstream `parent_intents`), where it was realized (`realized-by`), and how it was verified (`verified-by`)". Downstream links are optional (when filled in, check whether verification can be traced).
- Boundary with the existing coverage checks: the packet's own absence is owned by `goal-without-packet`, and an orphan whose `parent_intents` is present but cannot be traced back to the tree is owned by `orphan-packet`. `trace-downstream-missing` focuses on the side where a packet exists but cannot be traced to verification, and `trace-pre-rs-missing` on the cut point where the `parent_intents` key itself is missing or empty, so no duplicate check is created.

## Note on the unsettled-verb check (read-only, strict demotion rule, no write-back)

- `ambiguous-deferred-phrasing` only detects and quotes an unsettled verb (a placeholder hidden in finalized-sounding phrasing) that sits **outside the Human-fixed / Agent-discretion partition** of the packet `## Decisions` section and carries **no accompanying Revisit when**; it does not write reworded or finalized suggestions back to the source (the same read-only pattern as `requirements-smell`). Its severity is **"info"** (do not promote it to must-fix, because the false-positive rate is high).
- **The finalized vocabulary of unsettled verbs** (limit to this list and do not overlap with the `requirements-smell` vocabulary [appropriately / fast / better / etc. / as much as possible / a bare "it", and so on]):
  - assume / assumed, reuse / divert, planned / TBD, tentative.
- **Excluding nominal-idiom false positives (required)**: even for the words above, do not flag nominal or adverbial idioms that do not signal unsettled intent. Concretely, exclude word forms used with a settled connotation such as "as expected" / "as assumed", and **limit detection to verbal usages that signal an unsettled action or intent** such as "assumed to do ~" / "to reuse / divert ~". When in doubt, do not flag it, and do not take the judgment away from the user.
- **Strict application of the demotion rule**: when a detected spot is already recorded as a deferral under Deferred / Open Questions / a reasoned undetermined slot (reason + accompanying Revisit when), suppress that finding by the demotion rule (do not re-list an unsettled item already recorded as a structural deferral). By default its severity is already "info", and it is never promoted to must-fix or recommended.
- Separation from existing axes: this axis looks at unsettled verbs (phrasing match) that sit outside the partition and have no Revisit when, while an empty slot itself is owned by `decision-slot-empty` and a contradiction with the compass Decision Rules is owned by `decision-rule-mismatch`. No duplicate check is created.

## Note on the decision-vs-code divergence check (the sole inference exception in the read-only check layer, with boundary conditions)

- `decision-rule-code-alignment` Grep-reads a code module and detects a **semantic divergence between the Rule's main statement and the implementation via the AI's limited semantic matching**, **only when a Decision Rule's main statement / Context names a code module (file name / module name)**.
- **This is the sole inference exception in the read-only check layer.** All other check axes (including the existing three [`invariant-uninherited` / `invariant-stale-vs-compass` / `decision-rule-mismatch`], `ambiguous-deferred-phrasing`, and the status / improve axes) do not infer. **Only this axis is the exception, and the exception does not spread to other axes** (the other axes keep the prior discipline of reading only the presence of a statement and the presence of a direct contradiction).
- **Boundary conditions (compensating for the reduced reproducibility of false positives; required)**:
  - The output always carries the explicit label **"AI semantic-matching estimate"** and does not assert.
  - The severity stops at **recommended**. It is never promoted to must-fix.
  - It stays a **one-directional report that prompts human confirmation** rather than the user's primary basis (it auto-fixes neither the canonical nor the code).
  - **Limited to a naming origin**: do not flag it when a Decision Rule names no module, the Rule is abstract, or no divergence can be observed ("which module to look at" originates from the Rule's naming, and the semantic matching is limited to "after the target to look at is fixed"). When in doubt, do not flag it, and do not take the judgment away from the user.
- **Separation of matching surfaces (required; avoids duplicate detection)**: the matching surface of this axis is **the meaning of the code implementation**. Because this differs from the existing `decision-rule-mismatch`, whose surface is a text match against the packet `## Decisions` slot values (no inference), even when both axes apply to the same Decision Rule it is not a duplicate detection (the former = code implementation vs. Rule, this axis = packet slot value vs. Rule).
- **Tool invariance (required)**: the intent-validate allowed-tools remain `Read, Glob, Grep` (do not add Write / Bash). Code is only Grep-read and never modified at all (INV6). The AI semantic matching is a judgment in the skill body, not a tool.

## Criteria for classifying the L3 mismatch

- Packet content that **directly contradicts an explicit statement** of the intent-tree L3 = **must-fix**
- **Divergence open to interpretation** (no explicit statement, but the direction looks off, etc.) = **recommended**
- When in doubt, lean toward recommended, attach a quotation of the evidence, and leave the judgment to the user

## Note on the compass-conformance checks (matching inheritance, staleness, and ADR divergence)

- Separation of concerns:
  - `invariant-uninherited` ≠ `invariant-conflict`: the latter detects a "conflict = contradiction", this axis detects a "silent omission". Both may apply to the same packet, but the detection viewpoint differs.
  - `decision-rule-mismatch` ≠ `l3-intent-mismatch`: the latter matches against the intent-tree L3, this axis matches against the compass Decision Rules.
- Classification criteria (`decision-rule-mismatch`, reusing the `l3-intent-mismatch` template): a direct contradiction with an explicit Decision Rules statement = must-fix; a divergence open to interpretation = recommended; when in doubt, lean toward recommended, attach a quotation of the evidence, and leave the judgment to the user.
- **Limiting the matching surface (required)**: an ADR (the 6-field long form: Context/Decision/Why/Alternatives/Consequences/Revisit when) and the packet `## Decisions` (slot value domain) are structurally asymmetric, so limit the matching surface to **"the `Decision` of a Decision Rules entry (the main statement of the option taken)" vs. "the finalized value of each slot in the packet `## Decisions`"**. Use the surrounding fields (Why/Alternatives/Consequences, etc.) as the source of evidence quotations, but not as the main axis of the contradiction judgment.
  - Matching examples: Decision Rules `Decision` = "place aggregation logic in the domain layer", the corresponding packet `## Decisions` slot finalized value = "aggregate in the UI" → direct contradiction = must-fix. `Decision` = "prefer rollback-capable slices" while the packet leans toward bulk replacement but with no explicit negation → open to interpretation = recommended.
- **Separation of axis roles (required)**: only `invariant-stale-vs-compass` carries a time axis (update-date comparison). `invariant-uninherited` (presence of inheritance) and `decision-rule-mismatch` (presence of contradiction with the ADR) are "current state" axes and are not linked to the compass section update dates. These two axes read the compass's current invariants / Decision Rules every time and flag them individually (the value of these axes is to surface "which invariant is missing in which packet").
- **Output granularity**: only the time-axis `invariant-stale-vs-compass` defaults to a **one-line count summary** (e.g., `N packets not following up after the Invariants section update / M after the Decision Rules section update`), expanding the individual packet list only on user request (to avoid crying wolf). Present it as recommended, not asserted as must-fix. The stale comparison targets only pairs where **both the relevant compass section update date and the packet `updated_at` are actually stamped (not `—`)**. `invariant-uninherited` / `decision-rule-mismatch` default to individual findings.
- No inference (required): do not infer applicability from packet content (the same discipline as the `decision-slot` checks). Keep the semantic matching to reading the presence of a statement and the presence of a direct contradiction.
- Backward compatibility: when compass `Updated (...)` is `—` / absent, the packet `updated_at` is absent, the `## Decisions` section is absent, or Invariants is unfilled, **skip that check, stating it as an unverified target with its ID** and do not assert staleness.

## Note on the boundary checks (target selection for the export drafts)

- The export drafts (`.intent/cc-sdd/<slug>/*.md`) **coexist per packet**. The target of the export-draft-consistency boundary check is limited to the directory of the packet on the latest row of `.intent/export-log.md`. Drafts of past packets coexist by design, so their existence itself is not treated as a violation.

## Handling of unverified targets (the verifiable-scope principle)

1. If a deliverable subject to verification is missing or unfilled, skip the checks that require that deliverable.
2. Run the remaining checks within the verifiable scope (do not abort the whole run).
3. Include "unverified targets" in the report, stating the skipped checks and the reason (which file is missing / unfilled).
4. Example: `.intent/packets/` is absent (or active/ is empty) → skip the packet-dependent checks across contradiction/coverage/boundary, and run only the checks possible with the tree/compass alone (e.g., stagnation of unresolved Questions).
