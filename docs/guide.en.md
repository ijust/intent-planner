# intent-planner Feature Guide

This document is a plain reference to what each intent-planner feature is for and how to use it. The README is kept to an overview and situation-based entry points, so open this when you want one more level of detail on an individual feature.

> When you want the "why this procedure" with theory and references, see [docs/theory.md](theory.md) (Japanese). This document covers "how to use it"; theory.md covers "why it is the way it is".

## Table of contents

- [The overall flow](#the-overall-flow)
- [Command cheat sheet](#command-cheat-sheet)
- [What each command does](#what-each-command-does)
- [The files it creates (`.intent/`)](#the-files-it-creates-intent)
- [Modes (switching how to proceed)](#modes-switching-how-to-proceed)
- [Designer-questions](#designer-questions)
- [Enforcement (checks for missed write-backs, optional)](#enforcement-checks-for-missed-write-backs-optional)
- [Drift-watch (monitoring for drift, optional)](#drift-watch-monitoring-for-drift-optional)
- [Coined-term management (optional)](#coined-term-management-optional)
- [Constraint starters (supplying and accumulating conventions, optional)](#constraint-starters-supplying-and-accumulating-conventions-optional)
- [Handoff to cc-sdd / OpenSpec](#handoff-to-cc-sdd--openspec)
- [Notes when running it on a loop (`/loop`)](#notes-when-running-it-on-a-loop-loop)
- [Installation options](#installation-options)

## The overall flow

intent-planner is one round-trip loop: before you ask the AI for a sizable implementation, you and the AI work out "what to build / what to protect"; after implementation, you write the learnings back into the documents.

```
1. Organize intent       2. Hand off       3. Implement      4. Write back
discover → compass        export           (in cc-sdd, etc.)  writeback
  → packets                                                   → improve
        └────────────── when in doubt, status / validate ──────────────┘
```

- **1. Organize** — `/intent-discover` (the big picture) → `/intent-compass` (criteria to uphold) → `/intent-packets` (decompose into work units)
- **2. Hand off** — `/intent-export-cc-sdd` (or `/intent-export-openspec`) converts a selected work unit into a draft for the implementation tool
- **3. Implement** — hand the draft to cc-sdd / OpenSpec (intent-planner only goes as far as the draft)
- **4. Write back** — `/intent-writeback` (record and reflect the learnings), and at milestones `/intent-improve` (re-align the whole)

Each step's deliverable is Markdown under the `.intent/` folder. Review it before moving on. **When in doubt, run `/intent-status`** — it tells you where you are and recommends exactly one "next move".

## Command cheat sheet

| Command | When | In one line |
|---|---|---|
| `/intent-discover` | First | Build the overall picture of what you want to make |
| `/intent-compass` | After discover | Build the criteria to uphold (invariants, directions not to take) |
| `/intent-packets` | After compass | Split into work units (packets) that can be handed to implementation |
| `/intent-export-cc-sdd` | When handing off | Convert a work unit into a cc-sdd draft |
| `/intent-export-openspec` | When handing off | Convert a work unit into an OpenSpec draft |
| `/intent-writeback` | After implementation | Record the learnings and reflect them into the documents |
| `/intent-improve` | At a milestone | Fix the gaps between documents and implementation in bulk |
| `/intent-status` | Anytime you're lost | Tell you where you are and one "next move" (read-only) |
| `/intent-validate` | Before handoff | Check contradictions / gaps / overlaps across documents (read-only) |
| `/intent-overview` | To see the whole | Aggregate scattered deliverables onto one page (read-only) |
| `/intent-from-spec` | When you have an existing spec or fragmentary notes | Surface "unwritten intent" from a spec or notes (read-only) |
| `/intent-to-spec` | When you want a readable doc | Write the intent out as one natural-language spec (read-only) |
| `/intent-release-note` | At release | Build a release note that supplies "why it changed" from git history (read-only) |
| `/intent-db-design` | When DB design is involved | Build a DB design draft from intent, invariants, and the existing schema, and inspect it along DB-specific axes (manual activation) |

The "read-only" commands change nothing, so the AI may run them automatically from context. The commands that rewrite documents (discover / compass / packets / writeback / improve / export) only run when you invoke them explicitly with a slash.

## What each command does

### Planning phase (run these first, in order)

**`/intent-discover` — build the big picture.**
The AI asks you a few questions about your problem or idea, organizes the intent into a hierarchy (L0 purpose … L4 work candidates), and writes it to `.intent/intent-tree.md`. It also recommends and confirms how to proceed (the [mode](#modes-switching-how-to-proceed)) and confirms and records how far to pin things down at the entry point (the [designer-questions](#designer-questions)).

**`/intent-compass` — build the criteria to uphold.**
It builds the rulers in `.intent/intent-compass.md`, mainly four kinds:
- **North Star** — where this project is headed
- **Anti-direction** — what you've decided not to do
- **Invariants** — properties that must never break no matter what
- **Decision Rules** — records of decisions that keep "compared to what, and why we chose it"

These become criteria handed to the AI on every implementation run, preventing changes that "work correctly but drift from the design intent".

**`/intent-packets` — split into work units.**
It decomposes the work into units (packets) that can be handed to implementation. Each packet is one file, with a reference to its parent intent, its scope, and the invariants to uphold. It plants easily-missed technical decisions (consistency, idempotency, error behavior, authorization, etc.) as "slots to decide", keeping undecided ones with a reason. It also recommends one packet to start with, with a reason.

### Hand off to implementation (either one)

**`/intent-export-cc-sdd`** — convert one selected packet into a [cc-sdd](https://github.com/gotalab/cc-sdd) draft. The requirements draft includes the packet's expected behavior and fit criterion (how acceptance is measured) as "acceptance material" (the `## Acceptance Material` section), so the downstream requirements generation can write acceptance criteria without inventing them. The handoff guidance also covers handing over the phase-specific hint files (design.md / tasks.md) when you proceed to the design / tasks phases (even without steering set up, the draft supplies the context).
**`/intent-export-openspec`** — convert one selected packet into an [OpenSpec](https://github.com/Fission-AI/OpenSpec) proposal draft + hints.

Which one is chosen depends on the case (it is not hardcoded). The "next move" from `/intent-packets` proposes the exit from the case's exit setting, mode, and prerequisites (presence of `.kiro/` or `openspec/` folders). If it cannot be uniquely determined, it lists candidates. If enforcement is configured, it checks for missed write-backs before handing off.

### Maintenance phase (after implementation)

**`/intent-writeback` — write the learnings back.**
The learnings from implementation (newly decided things, invariant violations, implicit behavior, resolved deferrals) are first recorded in `.intent/deltas.md` as "deltas" (candidate diffs). At this point the original documents are not rewritten. Only items you approve are reflected into the Intent Tree / Compass / Packets. The approval effort varies by the kind of learning: only heavy learnings that change decision criteria are confirmed one by one; for the rest, "specify only the items to stop, and the remainder is applied in bulk".

**`/intent-improve` — re-align the whole.**
At a milestone after several packets or before a release, it cross-checks `.intent/` against implementation reality on three axes — completeness / correctness / coherence — and proposes corrections for the gaps. Corrections are applied only after approval. It catches the "in the implementation but not in the documents / in the documents but at odds with the implementation" that per-packet writeback cannot.

### Read-only commands (anytime)

They change nothing, so they're safe to use.

- **`/intent-status`** — summarizes where you are and recommends exactly one "next move". The default output is kept slim: it foregrounds the progress rail (all packets by five signals — reflected / you-are-here / not-started / unreflected / merged, each row annotated with "which stage now, and which stage next") and the one-line summary of the "next move". It also permanently shows not-yet-packeted candidates (Candidate Packets) by count + names, while frozen candidates (the Ice box) are hidden by default and expanded with "show me the icebox". Dangerous notices — missed write-backs, integrity violations, unreflected items — stay in the default; other details are pushed to the folded side. It also warns about packets suspected of being implemented without going through a packet.
- **`/intent-validate`** — before handoff, reports contradictions / gaps / boundary overlaps across documents with severity. It also checks vague wording and whether the Compass criteria reach every packet.
- **`/intent-overview`** — aggregates the deliverables across the board and shows a tree diagram, a progress rail, progress, and gaps on one page.
- **`/intent-from-spec`** — takes an existing spec (PRD, issue, etc.) or fragmentary notes / scribbles / voice transcripts and surfaces the unwritten intent (invariants, assumptions) as "gaps" measured against the rulers. Fragments are first bundled by topic and sorted into "decided / undecided" before extraction, so you can step into the intent entrance even while your head is still scattered. Extractions are presented as hypotheses.
- **`/intent-to-spec`** — writes the intent out as one readable natural-language spec. Statements without support are marked "inferred" to prevent fabrication. You can choose how deeply to write (output depth: brief / standard / detailed); if unspecified it asks once before generating (an axis orthogonal to range and shape — choosing "detailed" produces a deep document that draws on the packet body as material; reader-narrowed shapes — one-pager, status report, decision memo — are thickness-fixed and do not apply output depth).
- **`/intent-release-note`** — reads the git commit history, matches each commit against intent to supply "why it changed", and builds a release note. Commits not tied to intent are kept as thin lines to surface the gap between documents and implementation.

### DB-design view (manual activation)

- **`/intent-db-design`** — for a packet that designs a persistent data model, reads the three layers of intent, invariants, and the existing schema (migration/DDL), and builds a DB design **draft** under `.intent/db-design/` — table definitions, constraints, indexes, and naming — tracing each statement back to its projection source (statements without support are marked "inferred" / "unverified"). The output is a design draft, not requirements, and is not mixed into the export (requirements). It also inspects DB-specific axes (normalization breaks, missing indexes, N+1-inducing schema, missing constraints, naming consistency), conformance to invariants (immutable, etc.), and irreversibility (the migration cost after data lands) — all warn-only, non-stopping, non-modifying. After implementation, `/intent-validate` finds the drift between "draft vs. the actual schema" and `/intent-writeback` records "why the design ended up different". Activation is manual; `/intent-status` may recommend this command but never runs it automatically.

## The files it creates (`.intent/`)

All of intent-planner's deliverables are Markdown under the `.intent/` folder. The principles: "one unit = one file", "separate active from done", "separate the team-shared canonical history from personal work artifacts".

```
.intent/
├── intent-tree.md        # the intent hierarchy (L0 purpose … L4 work candidates)
├── intent-compass.md     # criteria: North Star / Anti-direction / Invariants / Decision Rules
├── compass-archive.md    # where overturned decision rules go (history; one of the split records below)
├── packets/
│   ├── index.md          # list of in-progress packets (auto-generated; don't edit by hand)
│   ├── plan.md           # plan-level records
│   ├── active/           # in-progress packets. 1 packet = 1 file
│   └── archive/<year>/   # done / superseded packets. they move here, never deleted
├── cc-sdd/<slug>/        # drafts handed to the implementation tool (local, Git-untracked)
├── deltas.md             # the catch-all for learnings (reflected into documents after approval; one of the split records below)
├── export-log.md         # history of handoffs (1 line = 1 handoff; one of the split records below)
└── mode.md, modes/       # records and definitions of how to proceed
```

> **The append-only records (deltas / export-log / drift-log / compass-archive) are split.** The single files like `deltas.md` above are the "thin current projection (a generated mirror)"; the actual entries split by natural key into **one file per unit** (e.g. `deltas/<unit>.md`), and finalized past entries move to `deltas/archive/`. This structurally removes tail-write collisions during concurrent work, delegating history to git and `archive/`. Reading the scattered records as a whole is machine-generated by `/intent-overview`, which shows the active side and archive split (no need to aggregate by hand).

### What you touch, and what you leave to the commands

| How you're involved | Target | What you do |
|---|---|---|
| **Read and approve** | packets in active/, learnings in deltas.md, criteria in compass | Approve/edit the proposals the commands present. This is the human's main job |
| **You may write directly** | answers to Open Questions in tree / compass | Edit directly, or tell it in conversation and it's reflected on the next command run |
| **Don't touch (auto-managed)** | index.md, export-log.md, drafts in cc-sdd/ | No manual editing needed |

### Packets never disappear

A packet is born as one file in active/, becomes in-progress on your approval, and moves to archive/ when implementation and writeback are done. A packet replaced by a plan revision remains as "superseded". **Nothing is deleted, so no past judgment is lost no matter how many times you redo planning.**

### Git: just commit as usual

Almost all of `.intent/` is committed (the team-shared canonical history). The local artifacts (drafts under cc-sdd/ and the issue directories under `.intent/discovery/`) are handled by the installer setting up `.gitignore` automatically, so **you never have to think about Git config**. "Which packet was handed off" is decided identically for everyone by the committed `export-log.md`, and no merge conflicts occur.

The selected mode and how you're pinning the work down (state that varies per person and per session) is saved locally in an **issue directory** that `/intent-discover` creates on each run: `.intent/discovery/<slug>-<rand>/mode.md`. discover prints that issue directory's name, and the later skills (`/intent-compass`, `/intent-packets`, etc.) **carry that name forward** to read their own `mode.md` (parallel sessions get separate directories, so modes never collide). The old single-file form `.intent/mode.local.md` remains as a backward-compatible read fallback (used only if no issue directory is found). Only the team-shared enforcement / drift-watch settings are committed in `.intent/mode.md`.

## Modes (switching how to proceed)

You can switch how you pin down the intent as a "mode" to match the project situation. `/intent-discover` looks at the situation, recommends one, and records it.

- **standard** — the default general-purpose mode. For new products, and for not-yet-verbalized feature areas inside an existing project
- **refactor** — for refactoring / redesigning an existing large project. Includes steps to reverse-engineer intent from code
- **behavior-unknown** — for legacy with no spec documents and unknown behavior
- **feature-growth** — for adding features to a running system. Includes impact analysis and decomposition into addition units
- **non-code** — for non-program deliverables (documents, operations, research). Switches to a path that produces a readable deliverable without going through cc-sdd/openspec

A new mode can be added by dropping one file into `.intent/modes/` (see `.intent/modes/README.md`).

If you choose `non-code` and run `/intent-to-spec` with a non-program exit, a readable deliverable (article outline, operations manual, research brief, etc.) is produced under `.intent/nl-spec/` without going through cc-sdd/openspec.

## Designer-questions

As an axis separate from the mode, you can choose **how far to pin things down** at the entry point. `/intent-discover` explains what the flow will ask on your behalf (measurable success criteria, whether to thread an E2E first = walking skeleton, a screen rough if there's UI, and for validation cases the hypothesis and GO/NO-GO), then confirms and records whether to enable them.

- Turning it **on** enables the three common questions (measurable criteria, walking skeleton, screen rough) and the checks. It also confirms "PoC or production", and for a PoC adds questions about "what observation would reject the hypothesis (falsification criteria)" and the GO/NO-GO criteria.
- When **off**, the only addition is one question asking whether to enable it.

Regardless of on/off, when it judges that the request nearly uniquely determines the target shape (turning it into a cron job, a CLI, etc.), it doesn't make you detour through neutral options — it confirms in one question: "the shape you're aiming for is this, right?"

## Enforcement (checks for missed write-backs, optional)

If you skip the post-implementation `/intent-writeback` and move on, `.intent/` quietly drifts from implementation reality. Enforcement is an **optional** layer that mechanically detects this "missed write-back execution". **The default is off**, and nothing changes unless you configure it.

There are three strengths. Switch by directly editing the "Enforcement" section of `.intent/mode.md`.

| Value | Behavior |
|---|---|
| `off` (default) | No check |
| `remind` | Warn only on detecting a miss. Doesn't stop |
| `gate` | Stop export / push on detecting a miss |

What's checked is mainly "learnings recorded but left unapproved / unreflected (pending deltas)". If you want a checkpoint at push, adding `--enforce` at install time also places a pre-push hook.

> Enforcement guarantees only that "the write-back **procedure** was executed", not the correctness of what was written back (that's the job of `/intent-improve` and human review). Because false positives structurally remain, the default is off. Even if it stops, an explicit instruction to continue lets export run, and push can pass with `git push --no-verify`.

## Drift-watch (monitoring for drift, optional)

Even after you set the intent, the more you implement, the more it can drift from the original intent (e.g. the AI over-fitting to virtues like "split it and decouple it" and producing a structure more complex than the intent). Drift-watch is an **optional** layer that catches this drift **before it fully derails**. **The default is off.** Setting the "Drift-watch" section of `.intent/mode.md` to `on` enables it.

When `on`, light hooks are inserted into three stages.

| Stage | What it does |
|---|---|
| `/intent-discover` | Before starting, match the "situation prone to drift" against a type catalog, name it, and have you write the directions to uphold first (prevention) |
| export time | Just before handoff, check against the Compass criteria and warn if off. Also check whether the implementation instruction exceeds the handed-off packet's scope (interception) |
| `/intent-improve` | At a milestone, record the drift and produce a report tallying what worked / didn't (after the fact) |

**All of these warn only; they don't stop** (because false positives are assumed). Detections are merely recorded locally in `.intent/drift-log.md` and are never sent externally. The records keep "prevented / caught" and "missed / false-positive" symmetrically, structurally avoiding the confirmation bias of keeping only convenient records.

The type catalog (`.intent/drift-patterns.md`) is not exhaustive — it's meant to be grown by adding the drift types you hit in your own work.

## Coined-term management (optional)

The more you use it, the more the AI tends to invent words not in "the agreed correct vocabulary" (coined terms); a fractured vocabulary breaks the very intent alignment. intent-planner manages coined terms by **prevention, detection, and rephrasing**.

- **The canonical glossary** — `.intent/glossary.md` (correct terms + spelling variants + a one-line explanation) collects "this is the correct term". It's a glossary you grow; no command ever rewrites it on its own (a tool may only write on your behalf what you approved, one term at a time).
- **Term status (optional)** — each row can record how far the team has agreed on the term: `approved` (a common term the team agreed on) / `provisional` (someone's provisional term) / `rejected` (a term you decided not to adopt). **Everything works as before if you write no status** (a row without one is read as provisional, and older 3-column glossaries stay valid as they are). Keeping a rejected term in the glossary — instead of deleting the row — lets you notice when the same word gets invented again ("a reinvention of a term we already turned down"). Registering a term, and promoting it from provisional to approved, happen **one term at a time, after checking its one-line explanation** (there is no bulk approval).
- **Detection and rephrasing** — `/intent-validate` names words not in the glossary as "suspected coined terms" and attaches a rephrasing suggestion to a canonical term. **It warns only; it doesn't stop.** Proper nouns, existing English technical terms, and legitimate new words with a one-line explanation on first use are excluded. Rephrasing is reflected only after your approval.
- **Prevention** — the distributed convention document (CLAUDE.md / AGENTS.md) includes the discipline "don't invent words not in the glossary; if you do, attach a one-line explanation on first use". On top of that, there is a check **right before a question goes to you** (does it stand on its own? is it overloaded with jargon? did every identifier get a plain-words gloss?) and a line **bundled into the draft handed to the downstream spec tool** ("write the documents and questions generated from this spec in words a first-time reader understands"). Instructions fade as the context deepens, so prevention is always paired with an after-the-fact check.
- **If your terminology is already full of coinages (optional, a separate tool)** — [term-drift](https://github.com/ijust/term-drift) finds suspicious terms in your documents — not only words missing from the glossary, but also ordinary words borrowed into an in-group meaning — and fixes them using **only the rewordings you approved, one term at a time**. Install it with `npx term-drift init` (it places `.term-drift/` in the target repo). Once installed, the coinage check of `/intent-validate` reads its detection rules and runs them, and both tools share the same glossary (`.intent/glossary.md`). **intent-planner keeps working exactly as before without it** — installing it is optional, and `npx intent-planner` never installs it for you.

## Constraint starters (supplying and accumulating conventions, optional)

Writing Anti-directions / Invariants (what to protect, what you don't want done) from scratch every time in `/intent-compass` is hard work. intent-planner offers domain conventions (e.g., "always build SQL with placeholders," "write slides conclusion-first") as **draft candidates** up front, and lets you keep the ones you adopt for next time. This **does not replace** building your judgment criteria (C2); it **supplements** it by adding candidates ahead of the derivation.

- **Surfacing candidates** — before the derivation in `/intent-compass`, it reads the bundled convention catalog (`.intent/constraint-starters.md`, with sources) and the ledger you've grown (`.intent/constraint-library.md`), and surfaces conventions that may fit the current case as "how about this as a starter?". It **does not auto-write into the compass.** You decide whether to adopt; only adopted ones are taken in by hand (if the fit is weak, it stays silent).
- **Adopt, then accumulate into the ledger** — among the candidates, constraints you adopt as "this is my standard" can be appended to the personal ledger `.intent/constraint-library.md`, so next time they surface as candidates alongside the bundled catalog (your own conventions grow over time). **Appending happens by your hand or under your explicit approval only**; it never accumulates on its own. When the ledger is absent or you adopt nothing, it silently does nothing.
- **Stays inside this project only** — accumulated constraints are kept only inside that project's `.intent/`. There is no cross-project sharing and no carrying them outside the repository (so a confidential project's constraints don't leak out — cross-project accumulation is deliberately not provided). The personal ledger is not overwritten on reinstall.

## Handoff to cc-sdd / OpenSpec

What intent-planner produces is **only the draft**. The spec body is generated by the downstream implementation tool, and you review it at each phase.

**cc-sdd** — if cc-sdd (`.kiro/`) is present at the install destination, the installer detects it and guides you. Handing the draft from `/intent-export-cc-sdd` to cc-sdd's `/kiro-spec-init` flows the organized intent straight into the requirements → design → tasks flow. Invariants and the upper intent are passed in a form easy to carry into tasks, so the overall intent keeps working at implementation time.

**OpenSpec** — supported as another exit, [OpenSpec](https://github.com/Fission-AI/OpenSpec). `/intent-export-openspec` converts the selected packet into a proposal draft (Why / What Changes / Impact) + delta spec hints, and on your instruction to continue launches `/opsx:propose` to bridge into the change-proposal flow. As with the cc-sdd target, the input is limited to one target packet + compass (a low-cost contract), and it stops at the launch (completing the spec body is left to OpenSpec).

## Notes when running it on a loop (`/loop`)

intent-planner's stages are by default advanced by a human receiving the "next move" via `/intent-status`, but you can also delegate the driving to a harness like `/loop` to make it self-advance.

However, the commands that rewrite documents (discover / compass / packets / writeback / improve / export) **intentionally assume human approval** — a brake against unsupervised development (vibe coding). Skipping approval with `/loop` trades speed for losing the following:

- **The chance to notice drift** — fewer chances for a human to see the deliverable and notice "this drifts from the intent"
- **Protection of the documents** — a wrong learning could be reflected into the intent documents as-is
- **Review of heavy branches** — filling in questions a human should settle, without approval, could fix a guess as a settled fact

**The recommendation is hybrid.** Delegate the inner "implement → test → fix" to `/loop` to spin fast, and have a human cut in at the seams (compass confirmation, packet decomposition, writeback approval, settling heavy questions). The read-only commands (status / validate / overview) need no approval, so they keep emitting decision material safely inside `/loop`. Rather than "running everything approval-less", "concentrating approval on the one point that matters" is the way to balance lightness and safety.

## Installation options

```bash
npx intent-planner                       # into the current directory
npx intent-planner ./my-project          # into a specified directory
npx intent-planner --dry-run             # check first what will happen
npx intent-planner --lang en --agent codex   # English + Codex
npx intent-planner --enforce             # also place the pre-push hook
```

| Option | Description |
|---|---|
| `dir` | Destination directory (default: current) |
| `--force` | Overwrite every file even if it exists (your data under `.intent/` is lost too; interactive terminals ask for confirmation first. Default: skip; root docs are appended to) |
| `--update-shared` | Also refresh the shared files (CLAUDE.md / AGENTS.md / GEMINI.md / pre-push) to the distributed version (saved to `<file>.bak` first; your `.intent/` data is never touched) |
| `--dry-run` | Don't write; only show the list of files to place/skip (full list) |
| `--verbose` | List every placed/skipped file one by one (default: counts only) |
| `--lang <value>` | Language: `ja` (default) / `en` |
| `--agent <value>` | Target agent: `claude` (default) / `codex` / `gemini` |
| `--enforce` | Place the pre-push hook (default: don't) |
| `--yes`, `-y` | Consent to appending to an existing root doc without prompting (non-interactive: skipped by default) |
| `--help`, `-h` | Show help |

What's placed:

```
.claude/skills/intent-*/   the actual slash commands (with --agent codex / gemini: .agents/skills/ + AGENTS.md / GEMINI.md)
.intent/                   scaffold for the Intent Tree / Compass / Packets / deltas / modes
CLAUDE.md / AGENTS.md / GEMINI.md  a thin entry that teaches the AI how to use it
```

An existing root doc (`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`) is **never overwritten** — after confirmation it is **appended to non-destructively** (the existing bytes are left unchanged). Claude Code / Gemini CLI place the quickstart body in a separate file (`CLAUDE_intent.md` / `GEMINI_intent.md`) and add a one-line reference (`@CLAUDE_intent.md` / `@./GEMINI_intent.md`), which is loaded via recursive import. Codex appends the quickstart section directly to the end of `AGENTS.md` (since Codex has no `@import` syntax). Re-running never appends twice (idempotent). In non-interactive environments (CI, etc.) the append is skipped and you're guided instead; pass `--yes` to consent up front.
