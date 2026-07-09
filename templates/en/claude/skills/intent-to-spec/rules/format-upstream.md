# format mapping: upstream-facing (why up front)

The mapping rule by which the `intent-to-spec` skill assembles the three-layer material read by source-scope interpretation into an **upstream-facing natural-language Spec** (an RFP / proposal-style layout where why leads). SKILL.md holds only the procedure and reporting format; "which material to place in what order, under which heading" is defined by this rule.

## Responsibility boundary (this is a mapping, not reading or reconciliation)

- This rule is a **format mapping**. It is responsible only for the composition, order, and heading assignment of the material.
- It does **not re-read** the projection source (intent-tree / compass / packets / steering). It holds no custom parser or schema; it merely rearranges the material handed over by source-scope interpretation (which preserves which layer, which heading, and which packet each piece came from).
- Making each description traceable back to the projection source, marking material absent from the projection source as inferred, and preserving invariants without omission or alteration are the **responsibility of the fabrication-guard rule**; this rule does not do them. This rule receives canonical-derived material and inferred-derived material (Assumptions / Open Questions) **kept distinguished**, and only upholds placing them without collapsing that distinction.
- The intermediate format (between upstream and integrated) is treated as the "why up front" degree of this rule shifted toward the integrated side. It holds no separate, independent rule.

## Basic posture (place why up front)

An upstream-facing Spec is a layout that makes the reader read **why it is built (and what must be upheld) before what is built**. The assumed reader is not the implementer but someone judging direction and validity (an upstream decision-maker). Therefore:

- Place purpose, invariants, and decision criteria (the why and constraints) at the **front** of the document.
- Place implementation-near detail such as individual requirements and acceptance criteria **after** the why and constraints, as material supporting them.
- Do not add background or motivation absent from the material for fluency's sake (places that need completion are handled by the fabrication-guard rule as inferred; this rule must not dissolve them into the body).
- When the reader is judged a non-insider (a customer, executive, or other decision-maker who does not read the repo), follow `rules/reader-vocabulary.md`: paraphrase symbols (INV/DR) via the ledger and drop identifiers absent from the ledger (packet ids, skill names, etc.) from the body (for an insider reader, keep symbols as references for tracing, as before; the body of how to open is unified in that rule).

## Composition (top to bottom: why → constraints → decision criteria → individual requirements)

Place the three-layer material handed over by source-scope interpretation in the following order. Hand each section's material over with its origin preserved, so that the downstream fabrication-guard rule can trace which layer and which heading it came from.

| Order | Section | What to place | Main material origin |
|---|---|---|---|
| 1 | Purpose (why it is built) | The direction this Spec heads toward and the problem it solves | Intent's North Star (compass) plus intent-tree's L0–L1 (the upper why) |
| 2 | Invariants / constraints to uphold | Invariants that must not be deviated from, and the direction to avoid | compass's Invariants / Anti-direction (plus steering constraints only when specified) |
| 3 | Decision criteria | The basis for judgment when design / implementation is uncertain | compass's Decision Rules |
| 4 | Individual requirements | The individual requirements to satisfy under the above why and constraints | crossing requirements (packets' individual requirements, dependencies, evidence) |
| 5 | Premises / unsettled (if any) | Premises and open questions placed in a separate slot, **not mixed** with the confirmed material above | intent-tree's Assumptions / Open Questions (inferred-derived) |

- Compose sections 1–4 from canonical-derived material. Do not reorder them (the order why → constraints → decision criteria → individual requirements is the core of the upstream-facing layout).
- Place section 5's inferred-derived material (Assumptions / Open Questions) in a **separate slot at the end**, not dissolved into the canonical body. If there is no such material, omit the section entirely (do not create an empty heading).
- Omit the section for any layer whose material is absent (do not fill in information that is not there). However, purpose (1) and invariants / constraints (2) are the crux of the upstream-facing layout; if their material has been read, always place them.

## Invariants

- Do not re-read or modify the projection source (mapping only; reading is the responsibility of source-scope interpretation, writing is the responsibility of SKILL.md's derived Write).
- Do not break the order that places why (purpose) and constraints (invariants, decision criteria) **before** individual requirements.
- Do not mix canonical-derived material with inferred-derived material (place them with the distinction preserved, and leave the marking itself to the fabrication-guard rule).
- Do not add background, motivation, or detail absent from the material to smooth the prose.
