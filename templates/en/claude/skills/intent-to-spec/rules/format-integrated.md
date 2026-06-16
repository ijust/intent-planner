# format mapping: integrated-spec-facing (crossing requirements integrated)

The mapping rule by which the `intent-to-spec` skill assembles the three-layer material read by source-scope interpretation into an **integrated-spec-facing natural-language Spec** (an implementation-near layout where the crossing requirements and acceptance criteria are integrated into one readable whole). SKILL.md holds only the procedure and reporting format; "which material to place in what order, under which heading" is defined by this rule.

## Responsibility boundary (this is a mapping, not reading or reconciliation)

- This rule is a **format mapping**. It is responsible only for the composition, order, and heading assignment of the material.
- It does **not re-read** the projection source (intent-tree / compass / packets / steering). It holds no custom parser or schema; it merely rearranges the material handed over by source-scope interpretation (which preserves which layer, which heading, and which packet each piece came from).
- Making each description traceable back to the projection source, marking material absent from the projection source as inferred, and preserving invariants without omission or alteration are the **responsibility of the fabrication-guard rule**; this rule does not do them. This rule receives canonical-derived material and inferred-derived material (Assumptions / Open Questions) **kept distinguished**, and only upholds placing them without collapsing that distinction.
- The intermediate format (between upstream and integrated) holds no separate, independent rule. This rule and format-upstream (upstream-facing) represent the two poles, and the intermediate is expressed as a **degree** between those poles (an adjustment of how far the upstream-facing "why up front" is shifted toward the integrated side, without adding another rule).

## Basic posture (integrate the crossing requirements into an implementation-near form)

An integrated-spec-facing Spec is a layout that **integrates the crossing requirements and acceptance criteria into one whole an implementer can read straight through**. The assumed reader is someone about to start implementation. Therefore:

- **Integrate** the scattered individual requirements, arranged per functional grouping, and attach to each requirement its acceptance criteria (the conditions to satisfy).
- Keep the why (purpose) and constraints (invariants, decision criteria) concise as **premises that support** the individual requirements; do not bring them to the front as much as in the upstream-facing layout (the more you bring them to the front, the more it shifts toward upstream-facing — the degree adjustment).
- Do not add detail or acceptance criteria absent from the material for fluency's sake (places that need completion are handled by the fabrication-guard rule as inferred; this rule must not dissolve them into the body).

## Composition (integrate the crossing requirements, attaching acceptance criteria to each)

Place the three-layer material handed over by source-scope interpretation in the following order. Hand each section's material over with its origin preserved, so that the downstream fabrication-guard rule can trace which layer and which heading it came from.

| Order | Section | What to place | Main material origin |
|---|---|---|---|
| 1 | Overview (what is built) | The scope the integrated spec heads toward and a summary of the purpose it satisfies | Intent's North Star (compass) plus intent-tree's L0–L1 (concise) |
| 2 | Premise invariants / constraints | Invariants and decision criteria to uphold in common across all requirements | compass's Invariants / Anti-direction / Decision Rules (plus steering constraints only when specified) |
| 3 | Integrated requirements and acceptance criteria | The body that integrates the crossing requirements per functional grouping, attaching to each requirement its acceptance criteria | crossing requirements (packets' individual requirements, dependencies, evidence) plus acceptance criteria |
| 4 | Premises / unsettled (if any) | Premises and open questions placed in a separate slot, **not mixed** with the confirmed material above | intent-tree's Assumptions / Open Questions (inferred-derived) |

- Compose sections 1–3 from canonical-derived material. The body is section 3, which integrates the crossing requirements per functional grouping and attaches the corresponding acceptance criteria to each requirement (do not separate a requirement from its acceptance criteria).
- Place section 2's why and constraints concisely as premises that support the body (3). The more you bring them to the front, the more it shifts toward upstream-facing (the intermediate format is expressed as the degree between this section and the upstream-facing "why up front").
- Place section 4's inferred-derived material (Assumptions / Open Questions) in a **separate slot at the end**, not dissolved into the canonical body. If there is no such material, omit the section entirely (do not create an empty heading).
- Omit the section for any layer whose material is absent (do not fill in information that is not there). However, the integrated requirements and acceptance criteria (3) are the crux of the integrated-spec-facing layout; if their material has been read, always place them.

## Invariants

- Do not re-read or modify the projection source (mapping only; reading is the responsibility of source-scope interpretation, writing is the responsibility of SKILL.md's derived Write).
- Do not separate the crossing requirements from their acceptance criteria (do not break the integrated composition that attaches its acceptance criteria to each requirement).
- Express the intermediate between upstream-facing and integrated-facing as a degree; do not create a separate rule (this rule and format-upstream are the two poles).
- Do not mix canonical-derived material with inferred-derived material (place them with the distinction preserved, and leave the marking itself to the fabrication-guard rule).
- Do not add detail or acceptance criteria absent from the material to smooth the prose.
