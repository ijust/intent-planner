# intent-planner (quickstart for Claude)

intent-planner is a lightweight **Intent Planning layer** where the human and the agent align on "the overall intent" and "a unified design policy" **before** starting implementation. It prevents architectural drift — where each file looks fine on its own but the overall design intent slowly erodes — by stopping the agent from escaping into local optimization without a cross-cutting intent.

This is not a full IDD framework; it is a pre-spec stage that sits **before** SDD tools (cc-sdd, OpenSpec, and Spec Kit). The intent worked out here is bridged into a draft for the selected tool non-destructively and at low token cost.

## Workflow

Normally, start with `/intent-plan`. It moves through the following stages continuously, pausing for human decisions. Run a stage skill individually only when you want that specific stage.

1. `/intent-discover` — Build the Intent Tree (L0–L4) and settle/record the Intent-working mode and the designer-role questions (designer-questions)
2. `/intent-compass` — Create decision criteria such as North Star / Anti-direction / Invariants
3. `/intent-packets` — Decompose into work units (packets) before handing off to an SDD tool
4. `/intent-export-cc-sdd` / `/intent-export-openspec` / `/intent-export-speckit` — Convert the chosen packets into drafts for the matching SDD tool

> **Choose the exit by the kind of work**: implementation work uses the export above that matches the selected SDD tool; work whose goal is a readable artifact (docs, research notes, etc.) without an SDD tool goes through `/intent-to-spec`. Leave the detailed routing to the exit decision.

The four above are the "planning" phase. After export, the intent is not disposable; keep growing it as a cycle with the four maintain/anytime skills: `/intent-status` (anytime — where you are plus exactly one "next move", read-only), `/intent-validate` (before export — check for contradictions and gaps, read-only), `/intent-writeback` (after a packet is implemented — record learnings as deltas and promote only approved items into the canonical deliverables), `/intent-improve` (at milestones — re-align `.intent/` with implementation reality). See the table in `.intent/README.md` for when to use which.

These `intent-*` skills live at `.claude/skills/intent-*/SKILL.md`.

## Active prompts (imperative, short)

- When asking questions during Intent Planning, follow “Minimum quality for question content” and “Question coverage and completion conditions” in the common contract read by the invoked `intent-*` skill. Keep the details in that contract instead of duplicating them in this always-loaded document.

- Start a new or unfinished plan with `/intent-plan`.
- When unsure where you are, run `/intent-status`.
- When the user explicitly invokes `handoff-bridge`, and the user did not name a destination, derive an unused `.intent/handoff-bridge/handoff-<date>-<short-case-name>.md` path on the intent-planner side and pass that complete destination to `handoff-bridge`. Do not ask for a destination, overwrite an existing file, or finish with stdout alone. Only an explicit destination from the user takes precedence.
- While implementing, JIT-read only the relevant **packet**, related **Invariant** / Decision Rule, and `.intent/execution-contract.md` — not the whole Compass or Tree. If the contract is absent, continue with the existing inputs.
- In projects where the Graphiti integration is installed, JIT-read the stage-specific search contract (`.intent/graphiti-search-boundary.md`) only when needed (do nothing without it — as before).
- Before selecting direct implementation, and when a session starts from a packet or implementation, check at implementation entry. Read the target packet and `.intent/execution-contract.md`, then check for important decisions related to the work.
- Do not coin new terms; use the canonical vocabulary (ubiquitous language) in `.intent/glossary.md`. When you need to name a concept the glossary lacks, do not invent a word on the spot — check `.intent/glossary.md` for an existing canonical term. Even if none exists, first check whether a combination of existing plain words can express the concept, and if it can, do not register a new term. Only when it cannot, get the new term formally adopted by a human before adding it to the glossary (`/intent-validate`'s `coinage-suspect` check catches suspected coinages after the fact, but the priority is not to invent one in the first place).
- When reporting how files differ from a concurrent session, treat drift in a regenerable derived artifact (a generated file like `.intent/packets/index.md`) as "drift a regenerate fixes" — describe it plainly and do not alarm the user with words like "conflict", "renamed", or "collided" (just note that `/intent-packets` regenerates it). By contrast, concurrent conflicts in canonical files (packet bodies under `active/`, `intent-tree.md`, `intent-compass.md`, `mode.local.md`, append-only records) are real harm — report and avoid them as before. Tell derived from canonical not by filename but by "does a regenerate fix it / does a separate source of truth exist".
- In conversations with the user, speak in plain language (top priority, strictly enforced). The foundation is precision: write so the meaning reads unambiguously; plain language is a means of staying easy to read while preserving that precision (never coarsen the meaning for the sake of easiness). Do not aim insider symbols or shorthand (enumeration markers like `(a)/(b)`, unexplained abbreviations, coined metaphors) at the user without explanation. Identifiers (command names, Invariant/packet ids, etc.) may stay, but on first use add a one-line plain-language gloss. The test is whether the intent of a question comes across on its own. **Check the following right before sending output to the user**: (1) Does this question/text make sense to the reader on its own? (If not, it has too much jargon — rewrite it. Three or more unexplained technical terms in a single question is a sign of overload.) (2) If you use an identifier, did you omit the first-use gloss? (3) Are you transcribing vocabulary straight from internal design documents you just read (compass, the constraint library, rules, etc.)? (Don't write assuming your own understanding — open it into words a first-time reader gets.) (4) Even when a word looks ordinary (e.g. "stand-in", "delivery"), are you using it with a narrow project-specific meaning? (If you — the tool/AI — loaded that meaning onto it, attach a one-line plain-words gloss at its first mention in the conversation or document; leave ordinary words used in their everyday sense and established technical terms alone.) (5) Are you conveying meaning only through a metaphor or an ungrounded vague qualifier (e.g. "significantly", "nicely")? (If you use a metaphor, always pair it immediately with a precise restatement. Conversely, do not force established technical terms or ordinary words in their everyday sense into strained plain-word paraphrases — that makes things more ambiguous.) (6) When reporting work you did, are you stating what was done this time, first, in words the reader understands? (Do not substitute a pile of internal stage names, file paths, or symbol ids, or a transcript of your work log; keep details for when they are asked for, and do not move on to the next question without showing plainly what you did.) When unsure, lead with the conclusion, keep it short, add a concrete example. This discipline lapses most when you are deep in internal design, so check it consciously on every output. This right-before-output check works as a pair with the after-the-fact check (`/intent-validate`'s coinage check) — prevention alone is never enough.
- When you split confirmations or questions to the user across multiple rounds, write 1–3 sentences of visible body text right before the next batch of questions: a concrete acknowledgment of the previous answers (what they settled or changed) and the reason for the next question (your internal reasoning is not shown to the user, so omitting this makes the questions look disconnected). Before the first batch as well, add one sentence on what you are about to confirm.
- What the user settled is only what the user actually said. Treat a short approval with no scope stated ("OK", "approved", "next") as approval of the artifact in front of you and of moving to the next step — not as endorsement of the product direction or the implementation priority (confirm those with an explicit question). Treat a negative reaction ("hard to use", "not this", "not what I expected") as a **symptom**; keep your guess at the cause and your proposed fix separate, as your own inference. Never record a confirmation of the symptom alone as if the cause or the solution had been settled.
- Before you treat a symptom, question whether you have the wrong layer for the cause. (1) On a negative reaction, do not jump straight to a fix inside the current work packet: first check whether the cause lies outside it (input burden, a missing capability, the wrong target user, overfitting to a couple of examples). If it likely does, stop the packet and go back to re-diagnose the upstream intent (Intent Tree, Compass, priorities) — never use an out-of-scope declaration as a reason to refuse re-evaluation. (2) When a test goes red, do not read it only as "this direction is wrong"; weigh just as seriously that "this threshold, or this check itself, is wrong", and confirm its basis before deciding. (3) If you are treating the same symptom a second time, verify the **interpretation** recorded in the earlier failure (why that cause was believed) before acting — when you hit the same wall twice, doubt the map, not the wall. (4) When a symptom spares one variant but not the others, do not dismiss the **asymmetry** as "that one is just special": treat it as the strongest pointer to where the cause lives, and start the diagnosis there.

## Pull discipline (don't full-load)

Before implementing, read only the relevant **packet** and the **Invariant** / Decision Rule that touch it. Do not constantly load the full Compass or full Tree. Do not transcribe Spec/Invariant bodies here; point to the source instead (`.intent/intent-compass.md`, `.intent/intent-tree.md`, the relevant packet under `.intent/packets/`).

When compass has grown heavy, **partially load it by domain tag** (compass-category-tag-grep-filter): pull **the case's domain tag together with the `always` tag** (cross-cutting rules) — e.g. `grep -nE '\[領域: (<the case's domain>|always)\]' .intent/intent-compass.md` — and read only the items that hit (dropping `always` loses the cross-cutting invariants; untagged items fall back to a full read as before; grep and inline tags only — no DB and no helper script). When the split store `.intent/compass/` (one symbol = one file) exists, open the symbol's file from `index.md` and read only its `## Law` (otherwise keep the grep above; the legacy path is a permanent fallback). See `.intent/compass/README.md` for the reading contract.

Before you start implementing, you may thinly match, read-only, **only the conventions** for the technical surface the packet touches (from the domain index in `.intent/constraint-starters.md` to the relevant domain file, plus the personal ledger `.intent/constraint-library.md` if present). Add a one-line candidate note only on a strong fit (adoption is the human's call). **If there is no match, proceed to implementation silently** — do not make the matching a gate for implementation (do not turn it into a checklist or a mandatory step). Do not resurface entries already decided in the issue directory's `constraint-ledger.md` (do nothing if the catalog / ledger is absent).

On a commit that implements a packet, you may optionally add one intent reference (an Intent trailer) at the end of the message (form: `Intent: <packet name> (<packet_id>)` — write both the name and the id). **It is optional and never a condition for committing** (you can commit as before without a trailer, missing one is not blamed, and do not add trailers to past commits retroactively). In a trailer, write only the identifiers (packet name, packet_id) — do not write confidential content or raw details (commit history may become public).

## Pass case-specific constraints through export

Do not duplicate case-specific constraints in each SDD tool's project-wide guidance for every added responsibility. Intent Planner passes only the target packet and necessary constraints through the chosen export, so use that path before adding project-wide guidance.

## .intent/ scaffold

The Intent intelligence and planning deliverables live in `.intent/` and are agent-independent (`intent-tree.md`, `intent-compass.md`, `packets/`, mode, drafts for SDD tools, etc.). See `.intent/README.md` for the full list and details.

## SDD tool integration

The matching `intent-export-*` skill maps the selected packet and necessary constraints into a draft for cc-sdd, OpenSpec, or Spec Kit. intent-planner stops at the draft; the selected SDD tool owns the full specification and human review at each phase.

## Rules

- Do not change application code during the Intent Planning phase.
- Do not propose local refactors that do not support a parent intent.
- Each packet must reference a parent intent, and each task must preserve the invariants.
- When intent is unclear, do not edit code; write it into Open Questions.
- Treat inferred intent as provisional until a human reviews it.
- If an implementation request exceeds the exported packet's Scope, do not keep implementing — go back to intent: open a new packet for the new area with `/intent-packets` (or widen the packet's scope and supersede it), then re-export. This prevents missing the new area's decisions (authorization, consistency, idempotency, error semantics) and packet-specific invariants.

## Learn more

- Detailed feature guide: https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md
- Theoretical background (Japanese): https://github.com/ijust/intent-planner/blob/main/docs/theory.md
