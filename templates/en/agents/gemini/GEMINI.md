# intent-planner (quickstart for Gemini CLI)

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

These `intent-*` skills live at `.agents/skills/intent-*/SKILL.md` (Gemini CLI reads `.agents/skills/` as Agent Skills).

## Active prompts (imperative, short)

- Before implementing anything, run `/intent-discover` first.
- When unsure where you are, run `/intent-status`.
- While implementing, JIT-read only the relevant **packet**, related **Invariant** / Decision Rule, and `.intent/execution-contract.md` — not the whole Compass or Tree. If the contract is absent, continue with the existing inputs.

## Pull discipline (don't full-load)

Before implementing, read only the relevant **packet** and the **Invariant** / Decision Rule that touch it. Do not constantly load the full Compass or full Tree. Do not transcribe Spec/Invariant bodies here; point to the source instead (`.intent/intent-compass.md`, `.intent/intent-tree.md`, the relevant packet under `.intent/packets/`).

## Steering is not recommended

Do not generate cross-cutting `steering` (especially steering custom) every time a responsibility is added. The constraints you need are supplied per-spec by intent through `export` (just-in-time, JIT), so prefer pulling the exact constraint over standing up new steering.

## .intent/ scaffold

The Intent intelligence (mode definitions, algorithm rules, cc-sdd bridge) and the planning deliverables live in `.intent/` and are agent-independent.

- `intent-tree.md` — Intent Tree (L0–L4)
- `intent-compass.md` — North Star / Anti-direction / Invariants
- `packets/` — the Packet Plan (`plan.md`) and the packet files (1 packet = 1 file under `active/`; `index.md` lists the active packets, and completed packets move to `archive/`)
- `mode.md` / `modes/` — the Intent-working mode (the selected mode, the `designer-questions` / `purpose` records, and the mode definitions)
- `cc-sdd/` — drafts of cc-sdd requirements / design / tasks to hand off (kept per packet in `<slug>/` directories)

See `.intent/README.md` for details. To learn more, see the detailed feature guide (https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md) and the theoretical background (Japanese: https://github.com/ijust/intent-planner/blob/main/docs/theory.md).

## cc-sdd integration

Hand the target packet's `.intent/cc-sdd/<slug>/requirements.md` (a condensed Project Description) produced by `/intent-export-cc-sdd` to cc-sdd's `/kiro-spec-init`, and the Intent Planning results carry smoothly into cc-sdd's spec-driven flow. intent-planner only goes as far as drafts; cc-sdd generates the body, and a human reviews each phase.

## Rules

- Do not change application code during the Intent Planning phase.
- Do not propose local refactors that do not support a parent intent.
- Each packet must always reference a parent intent, and each task must preserve the invariants.
- When intent is unclear, do not edit code; write it into Open Questions.
- Treat inferred intent as provisional until a human reviews it.
- If an implementation request exceeds the exported packet's Scope, do not keep implementing — go back to intent: open a new packet for the new area with `/intent-packets` (or widen the packet's scope and supersede it), then re-export. This prevents missing the new area's decisions (authorization, consistency, idempotency, error semantics) and packet-specific invariants.
- In conversations with the user, speak in plain language. Do not aim insider symbols, shorthand, or unexplained jargon at the user (identifiers may stay, but add a one-line gloss on first use). **Check right before you send output**: does it make sense to a first-time reader on its own? If not, rewrite it. This discipline lapses most when you are deep in internal design, so check it on every output.
- Do not coin new terms; use the canonical vocabulary in `.intent/glossary.md`. For a concept the glossary lacks, first check whether plain existing words can express it — if they can, do not invent a term.
