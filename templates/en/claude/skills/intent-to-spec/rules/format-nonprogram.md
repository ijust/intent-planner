# format mapping: non-program target (documents, operations, research, etc.)

The container for the **non-program target format (output layout)** in the `intent-to-spec` skill's `source scope × target format` projection. Output layouts for paths that use neither cc-sdd nor openspec — documents, business processes, research / decision-making — belong here. SKILL.md holds only the procedure and reporting format; "which material to place in what order, under which heading" is defined by this rule.

> This file is the **empty container (receptacle)** placed by the seam slice; it holds no mapping logic body (how to rearrange which material and assign it to which heading). The actual format mapping is written by a later add slice (this seam's scope ends at placing the output-layout receptacle and gives it no mapping logic).

## Responsibility boundary (this is a mapping, not reading or reconciliation)

- This rule is a **format mapping**. It is responsible only for the composition, order, and heading assignment of the material. It does not re-read the projection source (intent-tree / compass / packets / steering) and holds no custom parser or schema.
- Making each description traceable to the projection source, marking inferred material, and preserving invariants are the **responsibility of the fabrication-guard rule**; this rule does not do them. It receives canonical-derived and inferred-derived material kept distinguished and places them without collapsing that distinction.
- This rule holds **no packing strategy (mode)**. Packing intent is the responsibility of `intent/modes/` (DR16); it must not be mixed into this rule, which is the output-layout container.

## Basic posture

The basic posture of the non-program output layout is settled by a later add slice.

> (The mapping rule is written in the add slice. This seam gives the posture no body.)

## Composition

The order and heading assignment for the three-layer material handed over by source-scope interpretation is settled by a later add slice.

> (The composition mapping rule is written in the add slice. This seam gives the composition no body. It stays a single generic empty skeleton; splitting into per-domain formats or settling the count / granularity is not done here.)

## Invariants

- Do not re-read or modify the projection source (mapping only; reading is the responsibility of source-scope interpretation, writing is the responsibility of SKILL.md's derived Write).
- Do not mix canonical-derived material with inferred-derived material (place them with the distinction preserved, and leave the marking itself to the fabrication-guard rule).
- Do not add background, motivation, or detail absent from the material to smooth the prose.
- Do not mix packing strategy (mode) into the output-layout (format) container (DR16: responsibility separation).
