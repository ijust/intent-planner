# format mapping: non-program target (documents, operations, research, etc.)

The mapping rule by which the `intent-to-spec` skill assembles the three-layer material read by source-scope interpretation into a **non-program-target natural-language Spec** (a readable artifact for paths that use neither cc-sdd nor openspec — documents, business processes, research / decision-making). SKILL.md holds only the procedure and reporting format; "which material to place in what order, under which heading" is defined by this rule.

## Responsibility boundary (this is a mapping, not reading or reconciliation)

- This rule is a **format mapping**. It is responsible only for the composition, order, and heading assignment of the material. It does not re-read the projection source (intent-tree / compass / packets / steering) and holds no custom parser or schema; it merely rearranges the material handed over by source-scope interpretation (which preserves which layer, which heading, and which packet each piece came from).
- Making each description traceable to the projection source, marking inferred material, and preserving invariants are the **responsibility of the fabrication-guard rule**; this rule does not do them. It receives canonical-derived and inferred-derived material kept distinguished and places them without collapsing that distinction.
- This rule holds **no packing strategy (mode)**. Packing intent is the responsibility of `intent/modes/` (DR16); it must not be mixed into this rule, which is the output-layout container.

## Basic posture (let the reader read the artifact in their own words)

A non-program-target Spec is a layout that lets a reader who writes no code (the document's agreeing party, the operations owner, the research / decision stakeholders) read straight through **what is decided, why it is so, how to judge, and what must be satisfied**. It does not bring implementation vocabulary (APIs, modules, test cases, etc.) to the front; it presents the artifact in the words of the target domain. Therefore:

- Show the background and purpose (the why) and the bar to reach (the what) at the head of the artifact, in the reader's words.
- Place the promises to uphold and the basis for judgment (invariants, decision criteria) before the individual content.
- State the acceptance basis (was it agreed, or sent back) in **words of agreement / acceptance**, not in code's testable vocabulary (the degrade vocabulary is re-read on the packets side; this rule places that already-re-read material as is).
- Do not add background or detail absent from the material for fluency's sake (places that need completion are handled by the fabrication-guard rule as inferred; this rule must not dissolve them into the body).

## Composition

Place the three-layer material handed over by source-scope interpretation as a single generic artifact, in the following order (do not cover per-domain count / granularity here). Hand each section's material over with its origin preserved, so that the downstream fabrication-guard rule can trace which layer and which heading it came from.

| Order | Section | What to place | Main material origin |
|---|---|---|---|
| 0 | Intent hierarchy map diagram (at the top, when material exists) | Show the case's intent hierarchy (L0–L4) as a Mermaid diagram, so the reader grasps the whole picture first | intent-tree's L0–L4 heading hierarchy (see "Intent hierarchy map diagram" below) |
| 1 | Background and purpose | The direction this artifact heads toward and the problem it solves (in the reader's words) | Intent's North Star (compass) plus intent-tree's L0–L1 |
| 2 | Promises / premises to uphold | Invariants that must not be deviated from, and the direction to avoid | compass's Invariants / Anti-direction (plus steering constraints only when specified) |
| 3 | Basis for judgment | The basis for what to prioritize when uncertain | compass's Decision Rules |
| 4 | Content (the individual bars to reach) | The individual requirements / agreements to satisfy under the above | crossing requirements (packets' individual requirements, dependencies, acceptance grounds) |
| 5 | Acceptance basis | The acceptance vocabulary (already degraded) for judging whether it is agreed or sent back | packets' verification vocabulary (re-read for non-code: testable→judgeable by acceptance criteria, etc.) |
| 6 | Premises / unsettled (if any) | Premises and open questions placed in a separate slot, **not mixed** with the confirmed material above | intent-tree's Assumptions / Open Questions (inferred-derived) |

- **Raise section 0 (intent hierarchy map diagram) at the top, and output it only when the material (intent-tree's L0–L4) has been read.** Place it before background and purpose (1) to let the reader grasp the whole picture first. When there is no material / intent-tree is absent, omit the diagram and state the reason (do not output an empty diagram). See "Intent hierarchy map diagram" below.
- Compose sections 1–5 from canonical-derived material. Do not reorder them (the order background & purpose → promises → basis for judgment → content → acceptance is the core of the non-program-target layout).
- Place section 6's inferred-derived material (Assumptions / Open Questions) in a **separate slot at the end**, not dissolved into the canonical body. If there is no such material, omit the section entirely (do not create an empty heading).
- Omit the section for any layer whose material is absent (do not fill in information that is not there). However, background and purpose (1) and promises / premises to uphold (2) are the crux of this layout; if their material has been read, always place them.
- Even when steering has not been read (steering is opt-in), sections 1, 2, 4, and 5 can be composed from the Intent and packets two layers. Do not drop the artifact for the sole reason that steering is absent.

## Thickness by output depth

Within the same non-program-artifact shape, vary the **thickness of the content (4) and acceptance basis (5)** according to the confirmed output depth (brief / standard / detailed). Depth is an axis orthogonal to the shape (DR111) and does not add a new format — the composition (background & purpose → promises → decision criteria → content → acceptance) is common to all three levels; how far the content and acceptance are written down changes.

- **brief**: center on background & purpose (1) and the promises to uphold (2). Content (4) stays an enumeration of the goals to satisfy; acceptance (5) stays the main acceptance viewpoints.
- **standard**: on top of brief, add to content (4) the key points of "what/how to satisfy," and to acceptance (5) the viewpoints for judging agreement/send-back.
- **detailed**: on top of standard, write content (4) down to packet-body-derived material (scope, promises to uphold, acceptance grounds) in the reader's words, and make the acceptance (5) criteria concrete to an observable form.

What thickens is the **density with which the material is written down**, not adding background or detail absent from the material (INV73). Layers whose material is not read stay marked "not recorded / not observed" at every depth.

## Intent hierarchy map diagram (at the top, to grasp the whole picture first)

Embed the case's intent hierarchy (intent-tree's L0–L4) at the top as a **Mermaid diagram**, so the reader can grasp the whole picture before entering the body. Theoretical grounding = adding a diagram to words improves comprehension over words alone (the multimedia principle), and showing the whole before the detail progressively (the C4 model idea).

- **Reference overview's `rules/mermaid-tree.md` for the drawing conventions (DR187 — do not duplicate)**: the drawing conventions — deriving node IDs, forbidden label characters (do not include `(` `)` `[` `]` `"` `/`), not creating orphan nodes (give every node but L0 a parent edge), always attaching a text hierarchy right after the diagram, omitting the diagram with a stated reason when intent-tree is empty/absent — are single-sourced in that rule. This rule only prescribes turning L0–L4 into a diagram per those conventions, and does not duplicate the convention text.
- **Limited to projection of the material (INV100)**: project the diagram's nodes from intent-tree's headings; do not create nodes absent from the material. Make the hierarchy relations drawn in the diagram traceable to the material (the nesting of headings) too (subject to the fabrication-guard rule).
- **Follow the range**: when source scope is a partial specification (a subtree), diagram only the L0–L4 of that range.
- **Do not output a diagram when there is no material**: when intent-tree is unrecorded/absent, omit the top diagram and state the reason ("the intent hierarchy is unrecorded, so the diagram is omitted (it can be filed via `/intent-discover`)") (do not output an empty diagram or guessed nodes).
- Leave rendering the diagram to the reader's viewing environment (a Mermaid-capable Markdown viewer); do not call a rendering/conversion tool at runtime (INV2). The accompanying text hierarchy keeps the read-through from stalling even in an environment where the diagram is not rendered.

## Invariants

- Do not re-read or modify the projection source (mapping only; reading is the responsibility of source-scope interpretation, writing is the responsibility of SKILL.md's derived Write). Output is limited to derived artifacts under `.intent/nl-spec/`, and canonical material (intent-tree / compass / packets) is treated read-only.
- Keep each description traceable to the projection source, and mark material absent from the projection source as inferred (leave the marking itself to the fabrication-guard rule; this rule only upholds placing them without collapsing the distinction).
- Do not break the order that places background & purpose (why) and promises / decision criteria **before** the individual content.
- Do not mix canonical-derived material with inferred-derived material (place them with the distinction preserved).
- Do not add background, motivation, or detail absent from the material to smooth the prose (the same at higher depth = deepen by material, INV73).
- Do not mix packing strategy (mode) into the output-layout (format) container (DR16: responsibility separation).
- Raise the intent hierarchy map diagram (0) at the top only when the material (intent-tree's L0–L4) exists, and reference overview's `mermaid-tree.md` for the drawing conventions (do not duplicate — DR187). Project the diagram's nodes from the material; do not create nodes absent from the material (INV100). If there is no material, omit the diagram and state the reason (do not output an empty diagram). Do not create a shared framework for diagram generation (Anti-537).
