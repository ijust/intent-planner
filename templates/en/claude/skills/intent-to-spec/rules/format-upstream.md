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
| 3.5 | Major design decisions (only when decision material exists) | Systematically summarize why the current form was decided (major question → options → outcome and deciding factor → review conditions) | the decision material in "Major design decisions" below (the packet's Decisions, the compass DR Annex, the supersede lineage, delta promotions) |
| 4 | Individual requirements | The individual requirements to satisfy under the above why and constraints | crossing requirements (packets' individual requirements, dependencies, evidence) |
| 5 | Premises / unsettled (if any) | Premises and open questions placed in a separate slot, **not mixed** with the confirmed material above | intent-tree's Assumptions / Open Questions (inferred-derived) |

- Compose sections 1–4 from canonical-derived material. Do not reorder them (the order why → constraints → decision criteria → individual requirements is the core of the upstream-facing layout).
- **Raise section 3.5 (major design decisions) only when decision material exists.** Place it after decision criteria (3) and before individual requirements (4) (read "why this form" just before the requirements). If there is no material, do not raise the section (do not create an empty heading). See "Major design decisions" below.
- Place section 5's inferred-derived material (Assumptions / Open Questions) in a **separate slot at the end**, not dissolved into the canonical body. If there is no such material, omit the section entirely (do not create an empty heading).
- Omit the section for any layer whose material is absent (do not fill in information that is not there). However, purpose (1) and invariants / constraints (2) are the crux of the upstream-facing layout; if their material has been read, always place them.

## Major design decisions (systematically summarize the decision/deliberation process)

A section that projects the accumulated decision/deliberation process (what source-scope read as decision material) by **summarizing it systematically rather than enumerating everything**. The aim is to let the reader trace "why the current form was decided"; draw the thickness of content from the decision process in the material (do not compress the body, do not introduce a numeric score).

### Disclose progressively in three layers (index → summary → detail)

Presenting general design decisions follows the three-layer structure established in practice (do not show every decision at once):

1. **Index layer**: a one-line list of what was decided (the headings of the major questions only). Grasp the whole picture first.
2. **Summary layer**: summarize each major decision as "question → options considered → outcome and deciding factor → (if important) review conditions." This corresponds to the ADR form (Context/Decision/Consequences/Revisit).
3. **Detail layer**: open the detailed comparison of alternatives, consequences, and supersede lineage in a later part, only when the depth is "detailed."

- Follows depth: brief=index layer only / standard=index plus summary layer / detailed=plus detail layer (corresponds to source-scope's reading by depth).
- Linearize the main line into one thread (the sequence of the case's major questions). Place the supersede lineage and crossing decisions as auxiliary in a later part; do not mix them into the main line.

### What to put in the summary layer as "major" (the selection basis)

Put in the summary layer the packet's `## Decisions` that are **Human-fixed / prioritized (fixed up front)** (matching one of the five up-front criteria = irreversible, cross-multiple-module impact, acceptance oracle, security floor, binding multiple packets). Keep Agent-discretion / reversible-and-local decisions to one line in the index layer, or omit them. This is the same as the established basis for "which decisions to keep" in summarizing design decisions (high cost of change, broad impact, high risk); do not invent a new selection basis.

### The boundary of summarization (a summary, not fabrication)

- Summarization is limited to **deletion (dropping the redundant and irrelevant) and generalization (bundling multiple decisions in a form traceable to the actual decisions they subsume)** of decisions present in the material. Do not **synthesize** decisions or outcome rationales absent from the material (fabricating a new decision is fabrication = subject to the fabrication-guard rule / INV73).
- Make each decision traceable to the material (which packet's Decisions, which compass DR, which delta) (trace preservation is the responsibility of the fabrication-guard rule).

## Thickness by output depth

Within the same upstream-facing shape, vary the **thickness of each section** according to the confirmed output depth (brief / standard / detailed). Depth is an axis orthogonal to the shape (DR111) and does not add a new format — the composition (why → constraints → decision criteria → individual requirements) is common to all three levels; only how far each section writes the material down changes.

- **brief**: center on purpose (1) and invariants (2), stating just the direction and the core to uphold, briefly. Individual requirements (4) stay an enumeration of the main requirement names.
- **standard**: on top of brief, add to decision criteria (3) and individual requirements (4) the key points of "what/how to satisfy" (up to the acceptance viewpoint).
- **detailed**: on top of standard, write individual requirements (4) down to packet-body-derived material (the range in Scope, the constraints to uphold, the acceptance-criteria viewpoint), keeping each description traceable to the projection source (the trace density rises).

What thickens is the **density with which the material is written down**, not adding background or detail absent from the material (INV73). Layers whose material is not read stay marked "not recorded / not observed" at every depth.

**Major design decisions (3.5) also follow depth**: brief=the one-line index of decisions only / standard=a summary of the major decisions (question → outcome → deciding factor) / detailed=plus the comparison of alternatives, consequences, and supersede lineage. For a case whose decision material has not been read, do not raise the section (it is a projection of the material, not thickening by fabricating decisions).

## Invariants

- Do not re-read or modify the projection source (mapping only; reading is the responsibility of source-scope interpretation, writing is the responsibility of SKILL.md's derived Write).
- Do not break the order that places why (purpose) and constraints (invariants, decision criteria) **before** individual requirements.
- Do not mix canonical-derived material with inferred-derived material (place them with the distinction preserved, and leave the marking itself to the fabrication-guard rule).
- Do not add background, motivation, or detail absent from the material to smooth the prose (the same at higher depth = deepen by material, INV73).
- Raise major design decisions (3.5) only when decision material exists, placing it after decision criteria (3) and before individual requirements (4) (do not break the order). Summarization is limited to deletion and generalization of decisions present in the material; do not synthesize decisions or outcome rationales absent from the material (a summary, not fabrication — INV73). Do not introduce a numeric readability score.
