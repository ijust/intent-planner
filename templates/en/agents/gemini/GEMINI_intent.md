# intent-planner (quickstart for Gemini CLI)

intent-planner is a lightweight **Intent Planning layer** where the human and the agent align on "the overall intent" and "a unified design policy" **before** starting implementation. It prevents architectural drift — where each file looks fine on its own but the overall design intent slowly erodes — by stopping the agent from escaping into local optimization without a cross-cutting intent.

This is not a full IDD framework; it is a pre-spec stage that sits **before** the spec-driven flow (cc-sdd). The intent worked out here is bridged into cc-sdd's requirements → design → tasks flow non-destructively and at low token cost.

## Workflow

The `/intent-*` forms below are skill names. In Gemini CLI, do not type them as slash commands; ask in natural language, for example, "run `intent-discover`."

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
- Do not coin new terms; use the canonical vocabulary (ubiquitous language) in `.intent/glossary.md`. When you need to name a concept the glossary lacks, do not invent a word on the spot — check `.intent/glossary.md` for an existing canonical term. Even if none exists, first check whether a combination of existing plain words can express the concept, and if it can, do not register a new term. Only when it cannot, get the new term formally adopted by a human before adding it to the glossary (`/intent-validate`'s `coinage-suspect` check catches suspected coinages after the fact, but the priority is not to invent one in the first place).
- When reporting how files differ from a concurrent session, treat drift in a regenerable derived artifact (a generated file like `.intent/packets/index.md`) as "drift a regenerate fixes" — describe it plainly and do not alarm the user with words like "conflict", "renamed", or "collided" (just note that `/intent-packets` regenerates it). By contrast, concurrent conflicts in canonical files (packet bodies under `active/`, `intent-tree.md`, `intent-compass.md`, `mode.local.md`, append-only records) are real harm — report and avoid them as before. Tell derived from canonical not by filename but by "does a regenerate fix it / does a separate source of truth exist".
- In conversations with the user, speak in plain language (top priority, strictly enforced). Do not aim insider symbols or shorthand (enumeration markers like `(a)/(b)`, unexplained abbreviations, coined metaphors) at the user without explanation. Identifiers (command names, Invariant/packet ids, etc.) may stay, but on first use add a one-line plain-language gloss. The test is whether the intent of a question comes across on its own. **Check the following right before sending output to the user**: (1) Does this question/text make sense to the reader on its own? (If not, it has too much jargon — rewrite it. Three or more unexplained technical terms in a single question is a sign of overload.) (2) If you use an identifier, did you omit the first-use gloss? (3) Are you transcribing vocabulary straight from internal design documents you just read (compass, the constraint library, rules, etc.)? (Don't write assuming your own understanding — open it into words a first-time reader gets.) When unsure, lead with the conclusion, keep it short, add a concrete example. This discipline lapses most when you are deep in internal design, so check it consciously on every output. This right-before-output check works as a pair with the after-the-fact check (`/intent-validate`'s coinage check) — prevention alone is never enough.
- When you split confirmations or questions to the user across multiple rounds, write 1–3 sentences of visible body text right before the next batch of questions: a concrete acknowledgment of the previous answers (what they settled or changed) and the reason for the next question (your internal reasoning is not shown to the user, so omitting this makes the questions look disconnected). Before the first batch as well, add one sentence on what you are about to confirm.
- What the user settled is only what the user actually said. Treat a short approval with no scope stated ("OK", "approved", "next") as approval of the artifact in front of you and of moving to the next step — not as endorsement of the product direction or the implementation priority (confirm those with an explicit question). Treat a negative reaction ("hard to use", "not this", "not what I expected") as a **symptom**; keep your guess at the cause and your proposed fix separate, as your own inference. Never record a confirmation of the symptom alone as if the cause or the solution had been settled.
- Before you treat a symptom, question whether you have the wrong layer for the cause. (1) On a negative reaction, do not jump straight to a fix inside the current work packet: first check whether the cause lies outside it (input burden, a missing capability, the wrong target user, overfitting to a couple of examples). If it likely does, stop the packet and go back to re-diagnose the upstream intent (Intent Tree, Compass, priorities) — never use an out-of-scope declaration as a reason to refuse re-evaluation. (2) When a test goes red, do not read it only as "this direction is wrong"; weigh just as seriously that "this threshold, or this check itself, is wrong", and confirm its basis before deciding. (3) If you are treating the same symptom a second time, verify the **interpretation** recorded in the earlier failure (why that cause was believed) before acting — when you hit the same wall twice, doubt the map, not the wall. (4) When a symptom spares one variant but not the others, do not dismiss the **asymmetry** as "that one is just special": treat it as the strongest pointer to where the cause lives, and start the diagnosis there.

## Pull discipline (don't full-load)

Before implementing, read only the relevant **packet** and the **Invariant** / Decision Rule that touch it. Do not constantly load the full Compass or full Tree. Do not transcribe Spec/Invariant bodies here; point to the source instead (`.intent/intent-compass.md`, `.intent/intent-tree.md`, the relevant packet under `.intent/packets/`).

When compass has grown so large that even a full-text grep is heavy, **partially load it by domain tag** (compass-category-tag-grep-filter / INV47). Each group header and item in compass carries a `[領域: <name>]` tag (cross-cutting rules use `[領域: always]`), so pick the case's one domain and pull **the case's domain tag together with the `always` tag** — e.g. `grep -nE '\[領域: (<the case's domain>|always)\]' .intent/intent-compass.md` — and read only the headers/items that hit (do not make a full load the default). Always pull `always` too, so cross-cutting invariants (INV2 / INV9 / A1, etc.) are not dropped by the domain filter (dropping them is drift — Anti-direction 226). Items that still carry no tag fall back to a full read as before (backward compatible). This strengthens the pull discipline with grep + inline tags only — no DB or embedding, and no helper script (DR71). When the split store `.intent/compass/` (one symbol = one file; INV80) exists, open the symbol's file from `index.md` and read only its `## Law` (otherwise keep the grep above; the legacy path is a permanent fallback — DR133).

Before you start implementing, you may thinly match, read-only, **only the conventions** for the technical surface the packet touches (from the domain index in `.intent/constraint-starters.md`, the relevant domain file `.intent/constraint-starters/<domain>.md`, and, if present, the means-based constraints in the personal ledger `.intent/constraint-library.md`). If there is a strong fit, add a one-line candidate note (adoption is the human's call). **If there is no match, proceed to implementation silently** — do not make the matching a gate for implementation (do not turn it into a checklist or a mandatory step). Honor the records in the issue directory's `constraint-ledger.md` for adoption/decline and do not resurface declined ones (do nothing if the catalog / ledger is absent).

On a commit that implements a packet, you may optionally add one intent reference (an Intent trailer) at the end of the message (form: `Intent: <packet name> (<packet_id>)` — write both the name and the id). This is a standard Git trailer; it lets release-note later trace this commit to "which intent it changed for" as a solid link rather than a guess. **It is optional and never a condition for committing** (you can commit as before without a trailer, missing one is not blamed, and do not add trailers to past commits retroactively). In a trailer, write only the identifiers (packet name, packet_id) — do not write confidential content or raw details (commit history may become public).

## Steering is not recommended

Do not generate cross-cutting `steering` (especially steering custom) every time a responsibility is added. The constraints you need are supplied per-spec by intent through `export` (just-in-time, JIT), so prefer pulling the exact constraint over standing up new steering.

## .intent/ scaffold

The Intent intelligence (mode definitions, algorithm rules, cc-sdd bridge) and the planning deliverables live in `.intent/` and are agent-independent.

- `intent-tree.md` — Intent Tree (L0–L4)
- `intent-compass.md` — North Star / Anti-direction / Invariants
- `packets/` — the Packet Plan (`plan.md`) and the packet files (1 packet = 1 file under `active/`; `index.md` lists the active packets, and completed packets move to `archive/`)
- `mode.md` / `modes/` — the Intent-working mode (the selected mode, the `designer-questions` / `purpose` records, and the mode definitions)
- `cc-sdd/` — drafts of cc-sdd requirements / design / tasks to hand off (kept per packet in `<slug>/` directories)

See `.intent/README.md` for details.

## cc-sdd integration

Hand the target packet's `.intent/cc-sdd/<slug>/requirements.md` (a condensed Project Description) produced by `/intent-export-cc-sdd` to cc-sdd's `/kiro-spec-init`, and the Intent Planning results carry smoothly into cc-sdd's spec-driven flow. intent-planner only goes as far as drafts; cc-sdd generates the body, and a human reviews each phase.

## Rules

- Do not change application code during the Intent Planning phase.
- Do not propose local refactors that do not support a parent intent.
- Each packet must always reference a parent intent, and each task must preserve the invariants.
- When intent is unclear, do not edit code; write it into Open Questions.
- Treat inferred intent as provisional until a human reviews it.
- If an implementation request exceeds the exported packet's Scope, do not keep implementing — go back to intent: open a new packet for the new area with `/intent-packets` (or widen the packet's scope and supersede it), then re-export. This prevents missing the new area's decisions (authorization, consistency, idempotency, error semantics) and packet-specific invariants.

## Learn more

- Detailed feature guide: https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md
- Theoretical background (Japanese): https://github.com/ijust/intent-planner/blob/main/docs/theory.md
