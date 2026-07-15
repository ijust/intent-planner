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
- The default reader is the implementer (an insider), so symbols and identifiers may stay as references for tracing. **When the reader is specified as a non-insider (customer, etc.), follow `rules/reader-vocabulary.md`: paraphrase symbols (INV/DR) via the ledger and drop identifiers absent from the ledger from the body** (the body of how to open is unified in that rule).

## Composition (integrate the crossing requirements, attaching acceptance criteria to each)

Place the three-layer material handed over by source-scope interpretation in the following order. Hand each section's material over with its origin preserved, so that the downstream fabrication-guard rule can trace which layer and which heading it came from.

| Order | Section | What to place | Main material origin |
|---|---|---|---|
| 0 | Intent hierarchy map diagram (at the top, when material exists) | Show the case's intent hierarchy (L0–L4) as a Mermaid diagram, so the reader grasps the whole picture first | intent-tree's L0–L4 heading hierarchy (see "Intent hierarchy map diagram" below) |
| 1 | Overview (what is built) | The scope the integrated spec heads toward and a summary of the purpose it satisfies | Intent's North Star (compass) plus intent-tree's L0–L1 (concise) |
| 2 | Premise invariants / constraints | Invariants and decision criteria to uphold in common across all requirements | compass's Invariants / Anti-direction / Decision Rules (plus steering constraints only when specified) |
| 2.5 | Design-view sections (only when material exists) | Common design-document items (structure / architecture, data, screens / touchpoints, operations / failure handling, etc.), raised as sections **only when the corresponding material has been read** | material per the "Design-view sections" table below (compass's design intents, packets' Scope/Safety, intent-tree's screen-sketch reference, db-design draft, etc.) |
| 3 | Integrated requirements and acceptance criteria | The body that integrates the crossing requirements per functional grouping, attaching to each requirement its acceptance criteria | crossing requirements (packets' individual requirements, dependencies, evidence) plus acceptance criteria |
| 4 | Premises / unsettled (if any) | Premises and open questions placed in a separate slot, **not mixed** with the confirmed material above | intent-tree's Assumptions / Open Questions (inferred-derived) |
| 5 | Coverage table against standard items (at the end, always present) | One row each showing the major items of common design-document standards (arc42 / IEEE 1016) × this spec's coverage (present = section reference / not recorded = no material) | the reconciliation surface in "Coverage table against standard items" below |

- Compose sections 1–3 from canonical-derived material. The body is section 3, which integrates the crossing requirements per functional grouping and attaches the corresponding acceptance criteria to each requirement (do not separate a requirement from its acceptance criteria).
- **Raise section 0 (intent hierarchy map diagram) at the top, and output it only when the material (intent-tree's L0–L4) has been read.** Place it before overview (1) to let the reader grasp the whole picture first. When there is no material / intent-tree is absent, omit the diagram and state the reason (do not output an empty diagram). See "Intent hierarchy map diagram" below.
- Place section 2's why and constraints concisely as premises that support the body (3). The more you bring them to the front, the more it shifts toward upstream-facing (the intermediate format is expressed as the degree between this section and the upstream-facing "why up front").
- **Raise section 2.5 (design-view sections) only when material exists.** Keep the skeleton and order of the existing four sections (1→2→3→4), and insert design views before section 3 (integrated requirements), only the sections whose corresponding material has been read (do not raise a section whose material is absent = do not create an empty heading). See "Design-view sections" below.
- Place section 4's inferred-derived material (Assumptions / Open Questions) in a **separate slot at the end**, not dissolved into the canonical body. If there is no such material, omit the section entirely (do not create an empty heading).
- **Place section 5 (coverage table against standard items) always at the end.** Unlike the design views, output the table itself regardless of whether material exists (visualizing "what is present and what is absent" is what secures coverage). See "Coverage table against standard items" below.
- Omit the section for any layer whose material is absent (do not fill in information that is not there). However, the integrated requirements and acceptance criteria (3) are the crux of the integrated-spec-facing layout; if their material has been read, always place them. The coverage table (5) is always present even without material (the exception).

## Intent hierarchy map diagram (at the top, to grasp the whole picture first)

Embed the case's intent hierarchy (intent-tree's L0–L4) at the top as a **Mermaid diagram**, so the reader can grasp the whole picture before entering the body. Theoretical grounding = adding a diagram to words improves comprehension over words alone (the multimedia principle), and showing the whole before the detail progressively (the C4 model idea).

- **Reference overview's `rules/mermaid-tree.md` for the drawing conventions (DR187 — do not duplicate)**: the drawing conventions — deriving node IDs, forbidden label characters (do not include `(` `)` `[` `]` `"` `/`), not creating orphan nodes (give every node but L0 a parent edge), always attaching a text hierarchy right after the diagram, omitting the diagram with a stated reason when intent-tree is empty/absent — are single-sourced in that rule. This rule only prescribes turning L0–L4 into a diagram per those conventions, and does not duplicate the convention text.
- **Limited to projection of the material (INV100)**: project the diagram's nodes from intent-tree's headings; do not create nodes absent from the material. Make the hierarchy relations drawn in the diagram traceable to the material (the nesting of headings) too (subject to the fabrication-guard rule).
- **Follow the range**: when source scope is a partial specification (a subtree), diagram only the L0–L4 of that range.
- **Do not output a diagram when there is no material**: when intent-tree is unrecorded/absent, omit the top diagram and state the reason ("the intent hierarchy is unrecorded, so the diagram is omitted (it can be filed via `/intent-discover`)") (do not output an empty diagram or guessed nodes).
- Leave rendering the diagram to the reader's viewing environment (a Mermaid-capable Markdown viewer); do not call a rendering/conversion tool at runtime (INV2). The accompanying text hierarchy keeps the read-through from stalling even in an environment where the diagram is not rendered.

## Design-view sections (common design-document items, raised only when material exists)

Raise the common design items a reader expects of an integrated design document as sections **only when the corresponding material has been read**. For an item with no material, do not raise a section; show it as "not recorded" in the coverage table below (do not fill it with generalities or boilerplate = projection of the material only).

| Design-view section | Condition to raise (material) | Main material origin |
|---|---|---|
| Structure / architecture | When there is material on composition policy, boundaries, dependency direction, side effects | intent-tree's L3 (design intent, boundaries, dependency direction) / packets' Scope, Safety |
| Data | When there is material on persistent data / schema (see "Data-section material" below) | packets' Scope/Expected persistent-data descriptions / **db-design draft** (if any) |
| Screens / touchpoints | When there is material on a screen-sketch reference or UI/UX constraints | intent-tree's "screen-sketch reference" (do not raise when out-of-scope) / L3's UI/UX constraints |
| Operations / failure handling | When there is material on failure, degradation, timeout, error semantics | packets' Decisions (error-semantics, etc.), Safety / compass's operational Invariants |
| Major design decisions | When there is decision material (Decisions, the compass DR Annex, the supersede lineage, delta promotions) | the decision material (for the projection method, see "Major design decisions" below) |

- Make the heading names of the sections you raise plain words; do not invent new terms (reconcile against the glossary).
- Each design view's description is likewise limited to projection from the material (do not write design absent from the material = subject to the fabrication-guard rule).

### Major design decisions (systematically summarize the decision/deliberation process)

Project "why the current form was decided" from the accumulated decision/deliberation process (what source-scope read as decision material), **summarizing it systematically rather than enumerating everything**. In the integrated design document, place this section before integrated requirements (3) (the position corresponding to arc42's "Architecture Decisions" chapter). **Reference `rules/format-upstream.md`'s "Major design decisions" section as the single canonical source for the projection method (the three-layer index → summary → detail structure, the selection basis, the boundary of summarization)** (do not duplicate the projection method between upstream-facing and integrated). The only differences in the integrated document are the placement (before integrated requirements) and that the thickness by depth takes effect at the same level as the body (integrated requirements). Do not introduce a numeric score; a summary stays inside the fabrication check (INV73).

### Data-section material (projection of the db-design draft)

- When `.intent/db-design/<slug>/db-design.md` (the `intent-db-design` draft DB design) exists, project its **table definitions, constraints, indexes, and naming** as material for the data section.
- **Keep the draft's inferred / unverified marks and projection-source traces as they are** (do not promote them to confirmed). Do not, on the consuming side, change db-design's output contract that "the draft is a design starting point, not a requirement."
- The reading boundary stays under `.intent/` (do not directly read code migrations/DDL — reconciliation with the real schema is the existing responsibility of `intent-db-design` and `intent-validate`).
- For a case with no db-design draft, keep the data section within the range of the persistent-data descriptions in packets/tree (do not fill in the draft's absence by guessing).

## Coverage table against standard items (at the end, always present, visualizing coverage)

Place a table at the end that shows, row by row, how far this spec covers the major items of common design-document standards. **Visualizing "what is present and what is absent" — not pretending it is all there — is what secures coverage** (do not fill an item with no material with generalities = Anti-538).

- The reconciliation surface (item list) statically holds the major items of **arc42 (12 sections)** and **IEEE 1016 (design viewpoints)** (defined within this rule; no external lookup). arc42 major-item examples: Introduction and Goals / Constraints / Context and Scope / Solution Strategy / Building Blocks (structure) / Runtime View / Deployment View / Cross-cutting Concepts / Architecture Decisions / Quality Requirements / Risks and Technical Debt / Glossary. IEEE 1016 viewpoint examples: context / composition / logical / dependency / information (data) / interface / interaction / state dynamics / algorithm.
- On each item's row, show this spec's coverage: **present** = a reference to the corresponding section (which section covered it) / **not recorded** = that no material existed to raise a section.
- **Add one line of a remediation path to each "not recorded" item**: show which material (which section of intent-tree/compass/packets) to write to fill that item. In particular, when a data item is not recorded, add "for a case involving DB design, running `/intent-db-design` first thickens the data section."
- The coverage table is always present regardless of whether material exists (the visibility of gaps is itself the value). However, rather than mechanically transcribing every item, you may narrow to the major items in light of the case's nature (it is a reconciliation surface for coverage, not a mandate to transcribe every section).

## Thickness by output depth

Within the same integrated-spec shape, vary the **thickness of the integrated requirements and acceptance criteria (the body = section 3)** according to the confirmed output depth (brief / standard / detailed). Depth is an axis orthogonal to the shape (DR111) and does not add a new format — the composition (overview → prior constraints → integrated requirements and acceptance criteria) is common to all three levels; how far the body writes the material down changes.

- **brief**: keep the overview (1) and prior constraints (2) short. Integrated requirements (3) stay the requirement names per functional cluster, with a one-line acceptance criterion if present.
- **standard**: on top of brief, attach to each requirement its acceptance criteria (the key points of the conditions to satisfy) — the core of not separating a requirement from its acceptance criteria holds at every depth.
- **detailed**: on top of standard, write each requirement down to packet-body-derived material (the range in Scope, the constraints to uphold, the observable acceptance criteria), with dense tracing of dependencies and grounds.

What thickens is the **density with which the material is written down**, not inventing acceptance criteria absent from the material (INV73). Requirements whose material is not read stay marked "not recorded / not observed" at every depth.

**Design-view sections and the coverage table also follow depth**: the design-view sections (2.5) vary in thickness — at brief, 1–2 lines of the key points of each view; at standard, up to the key points of the material; at detailed, writing the material down (the density of projecting the material, not adding design absent from the material). The coverage table (5) is always present at every depth, and its row count may be narrowed to the major items by depth (the visualization of present/not-recorded itself holds at every depth).

## Invariants

- Do not re-read or modify the projection source (mapping only; reading is the responsibility of source-scope interpretation, writing is the responsibility of SKILL.md's derived Write).
- Do not separate the crossing requirements from their acceptance criteria (do not break the integrated composition that attaches its acceptance criteria to each requirement).
- Express the intermediate between upstream-facing and integrated-facing as a degree; do not create a separate rule (this rule and format-upstream are the two poles). Output depth (thickness) is a **separate axis from that upstream/integrated intermediate degree**, and works independently in either shape (DR111).
- Do not mix canonical-derived material with inferred-derived material (place them with the distinction preserved, and leave the marking itself to the fabrication-guard rule).
- Do not add detail or acceptance criteria absent from the material to smooth the prose (the same at higher depth = deepen by material, INV73).
- Raise design-view sections (2.5) only for sections whose material has been read; do not create empty headings. Keep the skeleton and order of the existing four sections (overview → premise constraints → integrated requirements → premises/unsettled) (design views are an insertion before section 3 and an appended coverage table at the end, not a rearrangement of the existing sections).
- The coverage table against standard items (5) is always present even without material, and does not fill a not-recorded item with generalities (visualizing gaps is what secures coverage = Anti-538). The reconciliation surface (arc42/IEEE 1016 item list) is held statically within this rule; no external lookup (INV2).
- When projecting the db-design draft into the data section, do not drop the inferred/unverified marks and projection-source traces (do not promote the draft to confirmed). The reading boundary stays under `.intent/` (do not directly read code migrations).
- Raise the intent hierarchy map diagram (0) at the top only when the material (intent-tree's L0–L4) exists, and reference overview's `mermaid-tree.md` for the drawing conventions (do not duplicate — DR187). Project the diagram's nodes from the material; do not create nodes absent from the material (INV100). If there is no material, omit the diagram and state the reason (do not output an empty diagram). Do not create a shared framework for diagram generation (Anti-537).
