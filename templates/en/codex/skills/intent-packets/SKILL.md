---
name: intent-packets
description: From the Intent Tree and Intent Compass, build the Packet Plan before handing off to cc-sdd. Each packet has a parent intent and is behavior-preserving / testable / rollbackable. Does not implement.
---

# intent-packets Skill

## Core Mission
- **Success Criteria**:
  - There are 3–7 packet candidates, and each packet references a parent intent
  - Each packet has Scope / Non-scope / Expected Behavior / Safety(Invariants) / Validation / Rollback / cc-sdd Mapping
  - Each packet is at a behavior-preserving / testable / rollbackable granularity
  - No application code has been changed at all

## Execution Steps

### Step 1: Read the prerequisites
- Read `.intent/intent-tree.md` and `.intent/intent-compass.md`. If either is missing, guide the user to "run the corresponding command first" and stop.
- Read `.intent/mode.md`. If absent, default to standard and announce it in Open Questions (do not stop).

### Step 2: Apply the mode definition's algorithm
- Open the mode definition that `.intent/mode.md`'s `definition` points to, and read and apply the algo rule (`rules/algo-*.md`) assigned to the Packet decomposition phase (standard → `rules/algo-example-mapping.md`; refactor → `rules/algo-migration-slicing.md`; behavior-unknown → `rules/algo-example-mapping.md` + `rules/algo-characterization-test.md`). The examples are not exhaustive; the mode definition's table is always authoritative.

### Step 3: Decompose into Packets
- Following Example Mapping, expand each L2/L3 capability into "rules, examples, questions, deferred".
- Derive Expected Behavior, Validation, and Rollback from the examples.
- Consolidate into 3–7 packets. Always give each packet a parent intent (a reference to L0/L1/L2/L3).
- Reflect the Compass invariants into each packet's Safety.

### Step 4: Present priorities and splits
- Indicate the packets' priority.
- Read `rules/walking-skeleton.md` and apply it according to the rule's applicability conditions.
- Present split proposals for packets that are too large.
- Do not make implementation changes.

## Output Description
- Proposed update to `.intent/packets.md` (3–7 packets, each with a parent intent)
- Packet priorities
- Split proposals for packets that are too large
- The packet to export next
- The command to run next: `/intent-export-cc-sdd`

## Safety & Fallback
- If there is no Intent Tree / Compass, stop and guide the user to the corresponding command.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- Do not drop packets too far down into implementation tasks (above an Issue, before a spec).
- Do not change application code.
