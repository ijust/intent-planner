# intent-planner (quickstart for Claude)

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
- `/intent-validate` — Before export (recommended). Report contradictions, coverage gaps, and boundary inconsistencies with severity (read-only)
- `/intent-writeback` — After a packet's implementation is done. Record learnings into `.intent/deltas.md` as deltas; promote only approved items into the canonical deliverables
- `/intent-improve` — At milestones. Re-align `.intent/` with implementation reality on completeness / correctness / coherence

These `intent-*` skills live at `.claude/skills/intent-*/SKILL.md`.

## Active prompts (imperative, short)

- Before implementing anything, run `/intent-discover` first.
- When unsure where you are, run `/intent-status`.
- While implementing, read only the relevant **packet** plus the related **Invariant** / Decision Rule — not the whole Compass or Tree.

## Pull discipline (don't full-load)

Before implementing, read only the relevant **packet** and the **Invariant** / Decision Rule that touch it. Do not constantly load the full Compass or full Tree. Do not transcribe Spec/Invariant bodies here; point to the source instead (`.intent/intent-compass.md`, `.intent/intent-tree.md`, the relevant packet under `.intent/packets/`).

## Steering is not recommended

Do not generate cross-cutting `steering` (especially steering custom) every time a responsibility is added. The constraints you need are supplied per-spec by intent through `export` (just-in-time, JIT), so prefer pulling the exact constraint over standing up new steering.

## .intent/ scaffold

The Intent intelligence and the planning deliverables live in `.intent/` and are agent-independent.

- `intent-tree.md` — Intent Tree (L0–L4)
- `intent-compass.md` — North Star / Anti-direction / Invariants
- `packets/` — the Packet Plan and packet files (1 packet = 1 file)
- `mode.md` / `modes/` — the Intent-working mode and its records
- `cc-sdd/` — drafts of cc-sdd requirements / design / tasks to hand off

See `.intent/README.md` for details.

## cc-sdd integration

Hand the target packet's `.intent/cc-sdd/<slug>/requirements.md` produced by `/intent-export-cc-sdd` to cc-sdd's `/kiro-spec-init`, and the Intent Planning results carry into cc-sdd's spec-driven flow. intent-planner only goes as far as drafts; cc-sdd generates the body, and a human reviews each phase.

## Rules

- Do not change application code during the Intent Planning phase.
- Do not propose local refactors that do not support a parent intent.
- Each packet must reference a parent intent, and each task must preserve the invariants.
- When intent is unclear, do not edit code; write it into Open Questions.
- Treat inferred intent as provisional until a human reviews it.
- If an implementation request exceeds the exported packet's Scope, do not keep implementing — go back to intent: open a new packet for the new area with `/intent-packets` (or widen the packet's scope and supersede it), then re-export. This prevents missing the new area's decisions (authorization, consistency, idempotency, error semantics) and packet-specific invariants.
