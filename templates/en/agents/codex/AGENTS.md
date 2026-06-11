# intent-planner (quickstart for Codex)

intent-planner is a lightweight **Intent Planning layer** where the human and the agent align on "the overall intent" and "a unified design policy" **before** starting implementation. It prevents architectural drift — where each file looks fine on its own but the overall design intent slowly erodes — by stopping the agent from escaping into local optimization without a cross-cutting intent.

This is not a full IDD framework; it is a pre-spec stage that sits **before** the spec-driven flow (cc-sdd). The intent worked out here is bridged into cc-sdd's requirements → design → tasks flow non-destructively and at low token cost.

## Workflow

Start from `/intent-discover` and run the following in order. Review each step's deliverable (Markdown under `.intent/`) before proceeding.

1. `/intent-discover` — Build the Intent Tree (L0–L4), recommend/confirm the mode for working out the Intent, and confirm/record whether to delegate the designer-role questions (designer-questions)
2. `/intent-compass` — Create decision criteria such as North Star / Anti-direction / Invariants
3. `/intent-packets` — Decompose into work units (packets) before handing off to cc-sdd
4. `/intent-export-cc-sdd` — Convert the chosen packets into cc-sdd drafts

The four above are the "planning" phase. After export, the intent is not disposable; keep growing it as a cycle with the four maintain/anytime skills.

- `/intent-status` — Anytime (when unsure). Recommend a summary of where you are plus exactly one "next move" (read-only)
- `/intent-validate` — Before export (recommended). Report contradictions, coverage gaps, and boundary inconsistencies across deliverables with severity (read-only)
- `/intent-writeback` — After a packet's implementation is done. Record the learnings gained from the implementation into `.intent/deltas.md` as deltas, and promote only the approved items into the canonical deliverables
- `/intent-improve` — At milestones (e.g. after implementing several packets). Re-align `.intent/` with the implementation reality on the three axes of completeness / correctness / coherence

These `intent-*` skills live at `.agents/skills/intent-*/SKILL.md`.

## .intent/ scaffold

The Intent intelligence (mode definitions, algorithm rules, cc-sdd bridge) and the planning deliverables live in `.intent/` and are agent-independent.

- `intent-tree.md` — Intent Tree (L0–L4)
- `intent-compass.md` — North Star / Anti-direction / Invariants
- `packets.md` — Packet Plan
- `mode.md` / `modes/` — the Intent-working mode (the selected mode, the `designer-questions` / `purpose` records, and the mode definitions)
- `cc-sdd/` — drafts of cc-sdd requirements / design / tasks to hand off

See `.intent/README.md` for details.

## cc-sdd integration

Hand the `.intent/cc-sdd/requirements.md` (a condensed Project Description) produced by `/intent-export-cc-sdd` to cc-sdd's `/kiro-spec-init`, and the Intent Planning results carry smoothly into cc-sdd's spec-driven flow. intent-planner only goes as far as drafts; cc-sdd generates the body, and a human reviews each phase.

## Rules

- Do not change application code during the Intent Planning phase.
- Do not propose local refactors that do not support a parent intent.
- Each packet must always reference a parent intent, and each task must preserve the invariants.
- When intent is unclear, do not edit code; write it into Open Questions.
- Treat inferred intent as provisional until a human reviews it.
