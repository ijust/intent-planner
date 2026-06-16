# Silence Gap Readout Procedure (read-only; only reads the rulers; gaps are hypotheses)

The single source of truth by which the `intent-from-spec` skill holds the existing rulers up against the natural-language specification the user provides and surfaces the places where the specification is **silent** as gaps. SKILL.md holds only the procedure and report format; "which rulers to read and how, and which category/slot silence to bind them to" is governed by this rule. This rule only **reads** the rulers' catalogs; it does not define its own check IDs or slot IDs. The source of truth for the decision logic lives in the references, and this rule merely borrows that ID system as a vessel and sorts into it the items the specification fails to satisfy. Observation is limited to Read / Glob / Grep, and it does not modify the input specification, the canonical `.intent/*.md`, or the rulers' sources at all (writes go only under `.intent/spec-ingest/`).

## posture (a proposer, not an accept/reject gate)

State this rule's posture at the top. It is a **different posture** from the adjacent `intent-validate`, and is not a contradiction.

- `intent-packets/rules/decision-slots.md` rules that "a tool (the slot validator) must not infer slot applicability from artifact content." That is because `intent-validate` is an **accept/reject gate (an adjudicator)** — if an adjudicator infers applicability from content, it produces unjust verdicts that stop or pass work on matters that were never declared.
- `intent-from-spec` is a **proposer**, not an adjudicator. Its output is not an accept/reject verdict but **Assumptions (hypotheses)** that require human confirmation.
- Therefore, with this rule, **spec-ingest may infer slot applicability from the specification's silences, but does not finalize it.** validate is forbidden from inferring because it is an adjudicator; for this rule, a proposer, to infer is not an exception to that discipline — it stands on a different posture from the start.
- Every inferred applicability is marked as a hypothesis and treated as provisional until the user confirms and approves it (consistent with the product invariant that inferred intent is treated as provisional until a human reviews it).

## Rulers to read (reference IDs; do not define them)

This rule **reads** the ID catalogs of the following two existing sources of truth. The ranges, firing conditions, and severities of the IDs are owned by the references; this rule does not duplicate or redefine them ("the table is canonical").

1. **The check catalog table in `intent-validate/rules/validate-checks.md`** — read the stable kebab-case ID set in the `ID` column (`invariant-conflict` / `anti-direction-violation` / `requirements-smell` / `decision-slot-empty` / `decision-slot-unsown`, and so on) and the severity-guideline column. Adding or changing checks is owned by that table, and this rule cites the ID column as-is (it does not re-derive them).
2. **The common-core slot table in `intent-packets/rules/decision-slots.md`** — read the 8-slot ID set sown in all modes (`decision-consistency` / `decision-idempotency` / `decision-error-semantics` / `decision-authz` / `decision-quality-priority` / `decision-fit-criterion` / `decision-exception-flow` / `decision-downstream-trace`). The slots' classifications and closing destinations are owned by the reference, and this rule cites those IDs as-is.

> This rule **never defines new** check IDs or slot IDs of its own. It creates no IDs absent from the catalogs above and sorts observed gaps into the existing IDs.

## Gap-enumeration procedure

Once intent-candidate extraction (extract-intent) is complete, read the catalogs above and, holding them up against the input specification, enumerate the **items that go unfilled** as gaps. Each gap shows the following three points in an observable form.

1. **Which ruler's silence** — make explicit which it corresponds to among the stable kebab-case IDs of `validate-checks.md` or the common-core slot IDs of `decision-slots.md` (bind referenceable ones to an ID, and for ones that cannot be bound, omit the ID and state the absence explicitly).
2. **Which category/slot silence** — show which absence in the specification (which check classification, which slot) the gap corresponds to, together with observable evidence (which part of the specification is silent).
3. **Presentation as a hypothesis** — present it not as a confirmed defect but as a **hypothesis** the user should confirm ("there is a suspicion that the specification is silent on this item"). Do not certify confirmed defects.

### Examples of binding (IDs are cited from the reference catalogs)

- The specification is silent on the consistency model at data change → bind it as silence of the `decision-consistency` slot of `decision-slots.md` and present as a hypothesis.
- The specification is silent on the return contract for abnormal input → silence of the `decision-error-semantics` slot.
- The specification is silent on access rights / the executing actor → silence of the `decision-authz` slot.
- Vague, subjective, or comparative wording remains in the requirement statements → bind to `requirements-smell` of `validate-checks.md`, quote it, and leave it to the user's judgment (do not write paraphrases back into the source of truth).
- A statement in a direction that could conflict with the compass Invariants → `invariant-conflict`; a statement in a direction to be avoided → bind to `anti-direction-violation` and present as a hypothesis.

> All of the above are examples, not the definitions of the IDs themselves. The ranges, firing conditions, and severities are owned by the reference catalogs.

## Do not stop processing (warn only; same stance as drift-watch)

- Even while presenting gaps, do **not stop** processing. Because this rule is not an accept/reject gate, the existence of a gap does not stop work or what follows; it stays at presenting warnings and observations (consistent with drift-watch's "warn only; do not stop" stance).
- Every enumerated gap is a hypothesis and is held as an Assumption until the user confirms and approves it. It is neither approved nor rejected, and not discarded.

## Avoid the "silence of silence" (also show what was checked)

- Beyond showing each gap, also present **what was checked (the frame of the rulers read)** to avoid the error of omission caused by the checked frame itself being invisible (summarizing the checked frame and the places that went unfilled is the responsibility of omission-recap, but this rule too makes "which vessel it was held up against" observable by stating the ID system it bound to).
- For places that cannot be referenced (no corresponding ID exists in the catalog; the ruler does not hold that viewpoint), do not fill in by guessing; **omit** the binding to an ID and state the absence explicitly.

## Handling of output

- All outputs are derived, regenerable, and not the source of truth. Nothing is written back to the canonical intent-tree / compass (promotion is by hand, after approval).
- This rule does not modify the rulers' sources of truth (`validate-checks.md` / `decision-slots.md`) at all. It does not run checks or slot validation itself; it merely goes and reads the ID catalogs.
