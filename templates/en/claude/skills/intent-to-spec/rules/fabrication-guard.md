# Fabrication suppression: generated↔projection-source reconciliation (trace, inferred marking, invariant preservation)

The canonical rule by which the `intent-to-spec` skill reconciles whether the natural-language Spec assembled by the format mapping **fabricates beyond the projection source (Intent / packet / constraint)**, and guarantees that the generated output traces back to the projection source. SKILL.md holds only the procedure and reporting format; "how to bind each description to its projection source, what to mark as inferred, what to preserve, and what to present for confirmation" is defined by this rule. This rule is responsible for the **reconciliation** of the generated output against the projection source, and it never modifies the projection source (intent-tree / compass / packets / steering) (reading is the responsibility of source-scope interpretation, placement of the format mapping, and writing of SKILL.md's derived Write).

The outward load-bearing problem is **fabrication suppression**. Whereas the hard problem inward (spec-ingest) is "silence detection," the hard problem outward is suppressing the hallucination of fluently filling in detail absent from the projection source. Precisely because it reads as prose, whether a basis exists cannot be told from reading the body alone. This rule supplies that determination as a reconciliation that checks each description of the generated output against the projection source.

## The reconciliation idea is homologous to drift-export-check (generated↔projection-source)

- This reconciliation is **homologous** to `drift-export-check.md` (the export-time water's-edge reconciliation that checks the design/tasks hints against the compass's direction). That one checks the just-before-export draft against the compass's North Star / Anti-direction / Invariants; this rule directs the same "generated↔projection-source" reconciliation idea at the **whole generated Spec**.
- The basis of the reconciliation is the **three-layer material itself** that source-scope interpretation read and the format mapping placed while preserving provenance (the intent-tree's L0–L4 / the compass's North Star, Invariants, Anti-direction, Decision Rules / the packets' individual requirements, dependencies, evidence / (only when specified) steering). Hold no new structure; trace that provenance information to confirm the basis of each description.
- The reconciliation is a **semantic check**, not a mechanical decision. Lean toward catching suspect descriptions (detail that has no findable basis in the projection source yet is blended into the body).

## Procedure

1. **Trace each description back to the projection source (Req 3.1)**
   - For each description in the generated Spec, attach a traceable reference for which projection source it derives from (which Intent L-level / which compass section / which packet / which constraint).
   - The reference is based on the provenance information (which layer, which heading, which packet it came from) that source-scope interpretation and the format mapping have preserved. Do not build it by re-reading the projection source anew; map the handed-over provenance straight into the reference.
   - When one description derives from multiple projection sources, list all of them. Do not leave a description with no attached trace as confirmed.

2. **Mark descriptions with no projection-source basis as inferred (Req 3.2)**
   - Descriptions for which no correspondence to a projection source is found in Step 1 (detail / acceptance criteria / premises supplemented for fluency) are **marked as inferred**.
   - Do **not mix** inferred descriptions **with confirmed ones** (descriptions that are canonical-derived and carry a trace). Do not blend them into the body; place them in a separate slot / under a separate marking that is distinguishable from confirmed descriptions.
   - Material that has been distinguished as inferred from the reading stage on, such as the intent-tree's Assumptions / Open Questions, is likewise placed on the inferred side without mixing with confirmed material (do not collapse here the distinction the format mapping has preserved).

3. **Preserve invariants and constraints without omission or alteration (Req 3.4)**
   - Reconcile whether the **invariants and constraints** present in the projection source (the compass's Invariants / (only when specified) steering's constraints-to-uphold / those among the packets' dependencies and acceptance criteria that amount to constraints) are **omitted or altered** in the generated Spec.
   - The generated Spec preserves the projection source's invariants and constraints as they are. Do not drop them for the sake of summary, do not change their meaning by rephrasing, and do not loosen or tighten them. Adjusting phrasing for readability is permitted, but a rewrite that changes the content of a constraint is not.
   - When an omitted invariant or constraint is found, supplement and preserve it (the generated output must not delete what exists in the projection source).

4. **Present supplemented places for confirmation (Req 3.3)**
   - Present the **list** of places where detail was supplemented beyond the projection source (the descriptions marked as inferred in Step 2) **in a form the user can confirm**.
   - The list names which descriptions, and for what reason, have no basis in the projection source (were supplemented), at a granularity that lets the user judge whether to accept or reject the supplementation.
   - The presentation is a warning; it does not stop generation. Whether to accept the supplementation is left to the user's judgment.

## Invariants

- Do not re-read and reinterpret the projection source (intent-tree / compass / packets / steering), and do not modify it (reconciliation only; reading is the responsibility of source-scope interpretation, placement of the format mapping).
- Do not leave a description with no attached trace as confirmed (each description is either traceable back to the projection source or else marked as inferred).
- Do not mix inferred descriptions with confirmed (canonical-derived) ones (do not collapse the separate slot / separate marking).
- Do not omit or alter the projection source's invariants and constraints (neither dropping by summary, nor changing meaning by rephrasing, nor loosening/tightening).
- Always present supplemented places as a list for confirmation (do not silently blend them into the body).
