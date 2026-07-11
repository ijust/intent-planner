---
name: intent-compass
description: From the Intent Tree, build the decision criteria for this change (North Star / Anti-direction / Invariants / Decision Rules). Prevents Claude from escaping into local optimizations. Does not implement.
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Bash
argument-hint: <focus of this change (optional)>
---

# intent-compass Skill

## Core Mission
- **Success Criteria**:
  - North Star / Current Drift / Direction / Anti-direction / Invariants / Decision Rules / Evidence / Open Questions are all present
  - The local optimizations Claude tends to make are explicitly enumerated in Anti-direction
  - Only project-universal invariants are kept in the compass; packet-specific invariants are canonical in the packet file (Safety / Invariants)
  - No application code has been changed at all

## Execution Steps

### Step 1: Read the prerequisites
- Read `.intent/intent-tree.md`. If absent, guide the user to "run `/intent-discover` first" and stop.
- While reading, when you see an unsettled verb slipped into the settled phrasing of the compass / intent-tree (assume / reuse / planned / TBD / tentative, etc.), do not fix it by guessing; present it as a conversion proposal into Open Questions or an undetermined slot (with the reason and the revisit condition (Revisit when)). Promotion to a fixed value is left to the user's confirmation. Do not re-convert spots already recorded in Open Questions / Deferred / an undetermined slot.
- Read the mode state in order: the inherited issue directory's `discovery/<slug>-<rand>/mode.md` (A34; inherit the issue name that discover output) → else the single `.intent/mode.local.md` (legacy) → else old `.intent/mode.md` (the CONTRACT.md read fallback contract). If both are absent, default to standard and add "mode undetermined; `/intent-discover` recommended" to the Open Questions (do not stop).
- If an existing `.intent/intent-compass.md` exists, read it. If the split store `.intent/compass/` (one symbol = one file; INV80) has the symbol, read `index.md` → that file's `## Law` first; for symbols not in the store, read the legacy body as before (the legacy path is a permanent fallback = DR133).

### Step 2: Apply the mode definition's algorithm
- Open the mode definition that `.intent/mode.local.md` (falling back to `.intent/mode.md`) `definition` points to, and read and apply the algo rule (`rules/algo-*.md`) assigned to the Compass construction phase (currently `rules/algo-qoc.md` for every mode). The examples are not exhaustive; the mode definition's table is always authoritative.

### Step 3: Build the Compass
- As a step before derivation, read and apply `rules/constraint-surfacing.md`. Match the bundled domain-convention catalog read-only and surface draft candidates for Anti-direction / Invariants (candidates only; do not auto-transcribe. Do not replace the existing derivation. Stay silent when the catalog is absent).
- Following QOC, draw the North Star, and condense the Decision Rules as lightweight ADRs (the field structure of an entry is canonically defined by `rules/algo-qoc.md`).
- Explicitly enumerate the local optimizations / quick-fix refactors Claude tends to make in Anti-direction (most important).
- Resolve the Invariants into two layers:
  - **Project-universal invariants** (common to all work, small in quantity) → keep them in the compass Invariants, and recommend placing them in `.kiro/steering/` via `/kiro-steering-custom` so they take effect across all work (do not place automatically; keep them small to avoid increasing startup context).
  - **Packet-specific invariants** (a specific work unit) → draft them directly in the packet file's Safety / Invariants (do not write them in the compass; `/intent-packets` fills them in when drafting the packet).
- Stamp the section update date (the writer's responsibility): when writing the compass, stamp **only the line of the section whose content you actually updated**. If you update the Invariants section, record that moment in `Updated (Invariants):`; if you update the Decision Rules section, record that moment in `Updated (Decision Rules):` (ISO 8601). Do not always stamp both — stamp a line only when its section was updated. Leave a section's line unchanged when its content did not change (idempotent; do not stamp when nothing changed). Replace the initial marker `—` (the scaffold default) with the timestamp at the moment you actually update that section. Obtain the timestamp with the Bash `date`. If you cannot obtain the date/time, do not write a guessed date — report that instead. Stamping is the writer's (this skill's) responsibility and is not given to the read-only verification layer (intent-validate).

### Step 4: Present
- Present the proposed update to `.intent/intent-compass.md`. Do not make implementation changes.

## Output Description

**Reader**: a human developer who is about to head into implementation (and the AI that does the implementing).
**What this output makes them grasp first**: "**these are the local optimizations to avoid in this change (Anti-direction)**. The decision criteria are in place, so next is `/intent-packets`." The core of this skill is making the Anti-direction explicit, so lead with it.

Lead the output with the conclusion.

- **Local optimizations to avoid this time (Anti-direction, top)**: name the quick-fix refactors / local optimizations Claude tends to make (the most important output of this skill).
- **Next move (one line)**: `/intent-packets` (decomposition into work units; carving out packets at a granularity that can be handed to cc-sdd).
- **Details**: the proposed update to `.intent/intent-compass.md` (North Star / Direction / Invariants / Decision Rules), the universal invariants recommended for steering placement (if any), and the Open Questions needed for decisions. In a repo that has the split store `.intent/compass/`, draft new symbols (INV/DR/Anti) as new files in the store (creating the file = the numbering declaration; DR131) and regenerate `index.md` on completion (without the store, write into the body as before; DR133).

## Safety & Fallback
- If there is no Intent Tree, stop and guide the user to `/intent-discover`.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- Do not change application code.
