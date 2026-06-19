# Mode: non-code

The mode for working out the intent of non-program deliverables (documents, business processes, research/decisions, and so on). Without assuming code as the deliverable, it treats non-executable artifacts — prose, procedures, decisions — as the deliverable and progressively decomposes and concretizes their intent. It owns only the how-to-elaborate axis; the final output format (target format) is owned by a separate axis (format), so this mode definition does not specify output formatting.

## The algorithms this mode combines

The combination table for how to elaborate (how-to-elaborate) the intent of non-program deliverables (documents, business processes, research/decisions). It reuses the same foundational algorithms as standard, only re-reading the Purpose column for non-program deliverables (documents, business, research). It adds no new algo rule files (reuse).

| Phase | Algorithm | Purpose |
|---|---|---|
| Intent Tree construction | **GORE-lite** (lightweight Goal-Oriented Requirements Engineering) | Progressively decompose the goal into L0(purpose)→L1(outcomes)→L2(capabilities)→L3(behavior/architectural intent)→L4(candidate packets). Here "capabilities/behavior" are re-read not as implementation but as the content, flow, and points-of-decision that non-executable artifacts — prose, procedures, decisions — must satisfy |
| Recording decisions | **QOC** (Questions-Options-Criteria) | Preserve design decisions as "question, options, selection criteria" and flow them into the Compass's Decision Rules / Open Questions. For non-program cases, record decisions of "how to write / how to proceed / what to decide" |
| Concretizing the deliverable | **Example Mapping** | Ground abstract capabilities into observable concrete examples (rules, examples, questions, deferred) and derive the packet's Expected Behavior and Validation. For non-program deliverables, treat "observable" as decidable by acceptance criteria (examples whose pass/fail is clear on reading) |
| Bridging to spec | **map-cc-sdd** | Convert the chosen packet into cc-sdd's Project Description / design and tasks hints (the export path; projection into a non-program target format is owned by the format axis) |

The details of each algorithm are in the corresponding skill's `rules/algo-*.md` (map-cc-sdd is in `rules/map-cc-sdd.md`). This mode definition is the combination table of "which phase uses which". It introduces no new algo and reuses the existing algorithms for non-program deliverables.

## Application in each command

### intent-discover (GORE-lite)
- L0: why this deliverable (document, business process, research/decision) is needed. 1–2 sentences.
- L1: whose state / what state to change and how (readers / business / decision-making / building consensus).
- L2: the responsibilities of the deliverable that support L1. Write it as "what it must satisfy", not as a chapter list or feature name.
- L3: the content, flow, and points-of-decision that make L2 hold (coverage, order, premises, consistency, reader constraints).
- L4: candidate units of work before fair-copy (the chapters to write / procedures to work out / points to decide).
- Never mix canonical (settled) with inferred (Assumptions).

### intent-compass (QOC)
- Draw the North Star from the Intent Tree.
- Condense each Decision Rule as a lightweight ADR: Context / Decision / Why / Consequences. For non-program cases, preserve decisions of "how to write / how to proceed / what to decide" as the binding canonical record.
- Invariants are the content / agreements / formatting / operational constraints you must not break (do not break the meaning or agreements of existing deliverables). Distinguish the two layers: project-wide / packet-specific.

### intent-packets (Example Mapping)
- Run Example Mapping for each L2/L3 capability (rules, examples, questions, deferred). Examples become the packet's Expected Behavior, questions become Open Questions, deferred goes into the Deferred section of `.intent/packets/plan.md`.
- For non-program deliverables, degrade and re-read the Validation/Rollback vocabulary from its code-assuming form (testable→decidable by acceptance criteria / rollback→version control and revert / behavior-preserving→do not break the meaning or agreements of existing deliverables). This re-reading is an optional degrade and does not make the code-assuming vocabulary mandatory. Refer to the packet-format side for the definition of the re-read vocabulary; do not redefine it here.
- Do not skip the packets stage; keep seeding the decision slots.

### intent-export-cc-sdd (map-cc-sdd)
- Convert one packet into cc-sdd's Project Description (condensed) and design/tasks hints. Limit the input to the target packet and the Compass's Invariants/Anti-direction.
- Projection into a readable non-program deliverable format is owned not by this mode (how to elaborate) but by the format axis (target format).

## Applicable situations

- When you want to articulate the intent of a non-code deliverable (documents, specifications, business processes, procedures, records of research/decisions, and so on)
- When you want to decompose and work out "what to write / how to proceed / what to decide" rather than "what to implement"
- When code-assuming modes such as standard do not fit the deliverable — i.e., non-program cases
