---
name: intent-compass
description: From the Intent Tree, build the decision criteria for this change (North Star / Anti-direction / Invariants / Decision Rules). Prevents Claude from escaping into local optimizations. Does not implement.
---

# intent-compass Skill

## Core Mission
- **Success Criteria**:
  - North Star / Current Drift / Direction / Anti-direction / Invariants / Decision Rules / Evidence / Open Questions are all present
  - The local optimizations Claude tends to make are explicitly enumerated in Anti-direction
  - Invariants are distinguished into two layers: project-universal / packet-specific
  - No application code has been changed at all

## Execution Steps

### Step 1: Read the prerequisites
- Read `.intent/intent-tree.md`. If absent, guide the user to "run `/intent-discover` first" and stop.
- Read `.intent/mode.md`. If absent, default to standard and add "mode undetermined; `/intent-discover` recommended" to the Open Questions (do not stop).
- If an existing `.intent/intent-compass.md` exists, read it.

### Step 2: Apply the mode definition's algorithm
- Open the mode definition that `.intent/mode.md`'s `definition` points to, and read and apply the algo rule (`rules/algo-*.md`) assigned to the Compass construction phase (currently `rules/algo-qoc.md` for every mode).

### Step 3: Build the Compass
- Following QOC, draw the North Star, and condense the Decision Rules into "question → option taken → why".
- Explicitly enumerate the local optimizations / quick-fix refactors Claude tends to make in Anti-direction (most important).
- Fix the Invariants in two layers:
  - **Project-universal invariants** (common to all work, small in quantity) → recommend placing them in `.kiro/steering/` via `/kiro-steering-custom` so they take effect across all work (do not place automatically; keep them small to avoid increasing startup context).
  - **Packet-specific invariants** (a specific work unit) → baked into cc-sdd's tasks at export time.

### Step 4: Present
- Present the proposed update to `.intent/intent-compass.md`. Do not make implementation changes.

## Output Description
- Proposed update to `.intent/intent-compass.md`
- The local optimizations to avoid this time (Anti-direction)
- Universal invariants recommended for steering placement (if any)
- Open Questions needed for decisions
- The command to run next: `/intent-packets`

## Safety & Fallback
- If there is no Intent Tree, stop and guide the user to `/intent-discover`.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- Do not change application code.
