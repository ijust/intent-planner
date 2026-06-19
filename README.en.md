# intent-planner

![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg) ![node](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen)

README: [日本語](README.md) | [English](README.en.md)

**Pre-spec Steering Layer for AI coding agents**
*— intent-aware steering, one stage before your specs.*

Before you ask an AI coding agent (Claude Code / Codex) for a sizable change, this tool helps you and the agent work out "what you want to build" and "what must be protected" — and keeps them from drifting during implementation.

- **Before implementation**: structure your intent and document the decision criteria (invariants to uphold, directions not to take)
- **Into implementation**: hand the organized intent straight into the spec-driven flow of [cc-sdd](https://github.com/gotalab/cc-sdd)
- **After implementation**: write the learnings gained from implementation back into the intent documents, instead of "build once and done"

Installing it only adds a set of slash commands (skills) and an `.intent/` folder. It never touches your application code.

The thinking behind each feature (its correspondence to requirements engineering and software architecture research) is explained in [docs/theory.md](docs/theory.md). The tool is designed to be usable without knowing the theory, but consult it when you want to know "why this procedure".

## When to use it

| Situation | What intent-planner does |
|---|---|
| Starting a new product or feature AI-first | Verbalize the intent and decision criteria before implementation, so steering (always-on guidance context for the whole project) is effective from the very first line |
| Building a PoC or a personal project solo | Opt in at the entry point to delegate the designer-role questions (measurable success criteria, walking skeleton, screen rough, and for validation work the hypothesis / falsification criteria / GO/NO-GO), with pre-export checks that detect gaps |
| Asking for a large refactor | Build the decision criteria first, preventing changes that "work correctly but drift from the design intent" |
| Legacy code whose specs are unknown | Reverse-engineer the intent from observable behavior and document it |
| Adding features to a running system | Decompose the work into addition units that account for the impact on what exists |
| The AI's changes drift slightly off course every time | Put the overall intent into a form the AI can consult every time (steering context) |

## Requirements

- **Claude Code** or **Codex** (selected via `--agent`)
- **Node.js** (used to run the installer; zero runtime dependencies)
- [cc-sdd](https://github.com/gotalab/cc-sdd) (optional; if you use it as the export target)

## Quick start

```bash
# At the root of your project
npx github:ijust/intent-planner

# If you use Codex
npx github:ijust/intent-planner --agent codex
```

On install, a **root convention document** is placed non-destructively for the agent you use (`CLAUDE.md` for Claude Code, `AGENTS.md` for Codex). It is a "thin entry" that actively teaches the agent how to use intent-planner (workflow, entry commands, minimal rules). It does not carry the body of specs or invariants — those are pulled only as needed right before implementation — so installing it does not inflate the always-loaded context cost. An existing `CLAUDE.md` / `AGENTS.md` is respected and never overwritten.

After installing, run these in order in your AI coding agent (Claude Code / Codex).

```
/intent-discover   →  /intent-compass  →  /intent-packets  →  /intent-export-cc-sdd
(overall intent)      (decision criteria)  (split into work units)  (hand off to cc-sdd)
```

Running the first `/intent-discover` makes the agent ask you a few questions about your problem or idea and write the overall picture of the intent to `.intent/intent-tree.md`. Likewise from then on, each step's deliverable is Markdown under `.intent/`. Review it before moving on. **When in doubt, run `/intent-status`** — it tells you where you are and the "next move".

## Commands

### Planning (run these first, in this order)

| Command | What it does |
|---|---|
| `/intent-discover` | Build the Intent Tree (the intent hierarchy L0–L4) from your problem or idea, confirm the working mode, and confirm and record whether to delegate the designer-role questions (designer-questions) |
| `/intent-compass` | Build the decision criteria: North Star (the state to aim for) / Anti-direction (directions not to take) / Invariants, and more |
| `/intent-packets` | Decompose the work into units (packets) that can be handed to implementation. Sows easily-missed technical decisions (consistency, idempotency, error semantics, authorization, etc.) into the packet's `## Decisions` as decision slots, keeping undetermined ones with a reason |
| `/intent-export-cc-sdd` | Convert one selected packet into a cc-sdd draft. When enforcement is configured, check for missed write-backs before export (remind = warn / gate = stop) |
| `/intent-export-openspec` | Convert one selected packet into an OpenSpec proposal draft + delta spec hint, and launch `/opsx:propose` when you instruct it to continue. The enforcement / drift / Open Questions checks are the same shape as the cc-sdd target |

### Maintenance (after implementation; keep growing the intent)

| Command | When | What it does |
|---|---|---|
| `/intent-writeback` | After a packet's implementation is done | Record the learnings gained from the implementation (new decisions, discovered invariant violations, implicit behavior, resolved Deferred items) into `.intent/deltas.md`, and promote only the approved items into the Intent Tree / Compass / Packets |
| `/intent-improve` | At milestones such as after several packets or before a release | Cross-check `.intent/` against the implementation reality on the three axes of completeness / correctness / coherence, and propose corrections for the gaps (applied only after approval). Match milestone events recorded in `.intent/milestones.md` against each Decision Rule's `Revisit when` and re-propose revisiting the matched decisions. On runs where a correction affecting Decision Rules / invariants arises, it also prompts a `/intent-validate` conformance catch-up check |

### Anytime (read-only)

> These read-only skills (`/intent-status` / `/intent-validate` / `/intent-overview` / `/intent-from-spec` / `/intent-to-spec`) can be invoked explicitly with a slash, and the agent may also invoke them automatically from context (because they do not rewrite canonical). Skills that rewrite canonical (discover / compass / packets / writeback / improve / export) are slash-invocation only.

| Command | What it does |
|---|---|
| `/intent-status` | Summarize where you are and recommend exactly one "next move". Leads with a progress rail (all packets listed by the five signals: reflected / you-are-here / not-started / unreflected / merged, each row annotated with `[current stage → next stage(s)]`) so you can see at a glance which packet is you-are-here, what stages remain, and where write-backs are missed. Writes nothing. When enforcement is configured, also shows warnings about missed write-backs. When packets that have not caught up to an updated compass (Invariants / Decision Rules) start to pile up, it recommends running `/intent-validate` as the right moment (a read-only estimate; the definitive diagnosis is validate's). When `.kiro/specs/` has an in-progress / done spec with no corresponding Packet, it presents it as a candidate "suspected to have been implemented without going through a Packet (a skipped drafting)"; when there is no corresponding intent-tree entry, as a candidate "missing intent-tree entry" (a non-asserting warning). It also shows milestone events recorded in `.intent/milestones.md` whose revisit has not yet been digested (outstanding milestone items) |
| `/intent-overview` | Aggregate the Intent Tree, Compass, and packets across the board, and read them out as a Mermaid tree (a tree with L0 at the apex and L4 at the leaves), a progress rail (the five signals plus each row's `[current stage → next stage(s)]` annotation, so remaining work and unreflected items are visible at a glance), the 3 progress axes, and gaps. Writes nothing |
| `/intent-from-spec` | Take an existing natural-language spec (PRD, design spec, issue, etc.) as input and surface the unwritten intent — invariants, anti-directions, implicit assumptions — as gaps measured against the rulers (the inward projection). Extractions are presented as Assumptions (hypotheses) and written as a derived view under `.intent/spec-ingest/`. Does not modify canonical artifacts |
| `/intent-to-spec` | Project the three layers (Intent, steering constraints, requirements) into one natural-language Spec for a chosen source scope and target format (why-front upstream view / requirements-crossing integrated spec) — the outward generation. Attaches traces to the projection source and marks unsupported statements as inferred, writing a derived view under `.intent/nl-spec/`. Does not modify canonical artifacts |
| `/intent-validate` | Before export, report contradictions, coverage gaps, and boundary overlaps across the intent documents — plus missing required records according to the recorded designer-questions / purpose (normative checks) — with severity. Also checks the completeness floor (unfilled decision slots), vague wording (smells), and perspective-based review (four PBR perspectives). Additionally checks compass conformance (whether the constitution is inherited): three read-only axes that verify whether the compass's invariants / Decision Rules are inherited and kept current across each packet — uninherited universal invariants (`invariant-uninherited`), packets not caught up with a compass update (`invariant-stale-vs-compass`), and packet decisions diverging from the Decision Rules (`decision-rule-mismatch`). It additionally checks for unfixed-deferral verbs disguised as the confirmed style (`ambiguous-deferred-phrasing`) and semantic divergence between a Decision Rule's statement and the code implementation (`decision-rule-code-alignment`). Writes nothing |

## Usage story

A concrete flow of advancing one feature area while "growing the intent".

1. With `/intent-discover` → `/intent-compass` → `/intent-packets`, build the overall picture of the intent, the decision criteria, and the work units (packets).
2. Run `/intent-validate` before export. If it raises a must-fix finding such as "packet B contradicts a Compass Invariant", re-run `/intent-packets` to resolve it before moving on.
3. With `/intent-export-cc-sdd`, convert the first packet into a cc-sdd draft and implement it through cc-sdd's spec flow (requirements → design → tasks).
4. When the implementation is done, run `/intent-writeback`. It cross-checks the implementation reality against the packet definition and the Compass, extracts learnings, and first records them as deltas in `.intent/deltas.md`. The original documents are not rewritten at this point.
5. As you approve the presented learnings, the deltas are promoted into the Intent Tree / Compass / Packets. The approval granularity varies by the kind of learning — invariant-violation discoveries and decisions that change the decision criteria (Compass Decision Rules) are confirmed item by item, while everything else (learnings that only append to the Intent Tree, and transcription of open questions) is presented as a list of reflection targets so that naming just the items you want to hold back promotes the rest in bulk. When a change to the decision criteria (Compass Decision Rules) is involved, a new ADR-style entry is added, and the old entry being replaced gets a superseded note. Note that "never rewriting the documents except through a delta" is a discipline **limited to the post-implementation write-back (writeback)**. In the pre-implementation drafting stage — where `/intent-compass` sets the decision criteria and `/intent-packets` lays out the work units — you write the Intent Tree / Compass / Packets directly (with confirmation); that is the normal, intended behavior, not a violation of the writeback discipline.
6. Running `/intent-status` reads the updated `.intent/` and guides you to exactly one "next move" — such as exporting the next packet. Even if you accidentally skipped a write-back, with enforcement (described below) set to `remind` or stronger, it is flagged as a miss here or before the next export.
7. From the second lap on, run `/intent-improve` at milestones after several packets. It detects whole-picture staleness that per-packet write-backs cannot catch (things in the implementation but absent from the intent, things in the intent that contradict the implementation, etc.) and applies corrections on an approval basis.

Learnings accumulate in `.intent/deltas.md`, and only the approved ones are promoted into the intent documents. This keeps `.intent/` a set of decision criteria that stays in sync with the implementation reality.

## Before / After (an applied example)

A contrast of how one vague request line becomes concrete when run through intent-planner (subject: a login feature).

**Before** — the entire request to the agent:

```
Build a nice login feature
```

The interpretation of "nice" is left to the agent, which tends to drift toward local optima — growing a homegrown password authentication, or proceeding to an implementation inconsistent with the existing auth infrastructure.

**After** — run through `/intent-discover` → `/intent-compass` → `/intent-packets`, the same request takes the following shape.

- **L1 goal (with measurement criteria)**: a first-time user can complete login within 2 minutes (measured from login start to dashboard display)
- **Invariant (to uphold)**: do not break compatibility with the existing OAuth providers (Google / GitHub)
- **Anti-direction (not to take)**: do not add homegrown password authentication
- **Packet sequence (units of implementation work)**:
  1. **P1: OAuth callback E2E** — run through login start to session establishment in a minimal configuration (walking skeleton)
  2. **P2: Error states and retry UI** — display and retry on provider rejection / timeout
  3. **P3: Audit log** — record login success / failure

  The first recommendation is P1. Pushing the thinnest path end-to-end first resolves the biggest uncertainties (redirect configuration, session management) within the first packet.

Because this L1 / Invariant / Anti-direction is passed to the agent every time as steering context, the decision criteria — "do not grow homegrown auth", "do not break the existing providers" — keep working through the implementation of P2 and beyond.

## File layout (`.intent/`)

All intent-planner deliverables are Markdown under `.intent/`. The principles: "**1 unit = 1 file; physically separate active from done; separate the shared canonical history from personal working artifacts**".

```
.intent/
├── intent-tree.md        # The intent hierarchy (L0 purpose – L4 packet candidates)
├── intent-compass.md     # Decision criteria: North Star / Anti-direction / Invariants / Decision Rules (active only)
├── compass-archive.md    # Where overturned Decision Rules are moved (history; the compass stays thin with active entries only)
├── packets/
│   ├── index.md          # The list of active packets (generated — do not edit by hand)
│   ├── plan.md           # Plan-level records (Walking Skeleton / Recommended First Packet / Deferred)
│   ├── active/           # Packets in progress. 1 packet = 1 file
│   └── archive/<year>/   # Done / superseded packets. They move here instead of disappearing
├── cc-sdd/<slug>/        # Drafts handed to cc-sdd (per packet; local working artifacts untracked by Git)
├── deltas.md             # Where learnings from implementation land (promoted into the canonical documents after approval)
├── milestones.md         # Record of milestone events (append-only; read by improve's Revisit matching and status's outstanding-items display)
├── export-log.md         # Export history (1 export = 1 row; the canonical record of "the latest packet")
└── mode.md, modes/       # The working-mode record and definitions
```

### What you touch, and what you leave to the commands

| Involvement | Target | What to do |
|---|---|---|
| **Read, review, approve** | packet files (active/), learnings in deltas.md, decision criteria in the compass | Approve or amend what the commands propose. This is the human's main job |
| **You may write directly** | Answers to the Open Questions in the tree / compass | Edit the files directly, or tell the agent in conversation and it will be reflected on the next command run |
| **Do not touch (auto-managed)** | `packets/index.md` (generated), `export-log.md` (auto-appended), drafts under `cc-sdd/` | No manual edits needed |

If you lose track of where you are, run `/intent-status` — it gives you a summary of the whole and exactly one "next move".

### Packets never disappear

A packet (unit of work) is born as one file in `.intent/packets/active/`, becomes active with your approval, and becomes done — moving to `archive/<year>/` — once implementation and write-back are complete. Packets replaced by a plan revision also remain in the archive as superseded. **Nothing is deleted, so no matter how many times you redo planning, past decisions are never lost.** The whole picture is visible in the single `packets/index.md` (the commands also read only the index plus the target packet, so things do not get heavier as packets grow).

### Git: just commit as usual

Almost everything in `.intent/` is meant to be committed (the canonical history shared with your team). Local working artifacts — the drafts under `cc-sdd/` and the mode state (`mode.local.md`) — are covered by the `.gitignore` the installer maintains automatically, so **there is nothing you need to think about in your Git configuration**. No team merge conflicts arise, and "which packet is currently exported" is judged identically by everyone via the committed `export-log.md`.

Mode state (the selected mode, purpose, and other working preferences) is personal and may differ per developer or session, so it is stored locally in `.intent/mode.local.md`. The team-shared Enforcement / Drift-watch policy continues to be committed in `.intent/mode.md` as before. This eliminates mode collisions between parallel sessions.

## Installation details

```bash
npx github:ijust/intent-planner ./my-project          # Into a specific directory
npx github:ijust/intent-planner --dry-run             # Preview what would happen first
npx github:ijust/intent-planner --lang en --agent codex   # English + Codex
```

(Not yet published to the npm registry, hence the direct GitHub reference. After publication it will be `npx intent-planner`.)

| Option | Description |
|---|---|
| `dir` | Target directory (default: current) |
| `--force` | Overwrite even when a file with the same name exists (default: skip) |
| `--dry-run` | Write nothing; only show the list of files to be placed / skipped |
| `--lang <value>` | Language: `ja` (default) / `en` |
| `--agent <value>` | Target agent: `claude` (default) / `codex` |
| `--enforce` | Place a pre-push hook (`.git/hooks/pre-push`) (default: not placed). See the "Enforcement" section |
| `--help`, `-h` | Show help |

What gets placed (existing files with the same name are never overwritten):

```
.claude/skills/intent-*/   The slash commands themselves (with --agent codex: .agents/skills/ + AGENTS.md)
.intent/                   The scaffold (template files to fill in) for the Intent Tree / Compass / Packets / deltas / modes, etc.
```

## Modes (switching how to proceed)

To match your project's situation, the way the Intent is worked out is switchable as a "mode". `/intent-discover` recommends one based on the situation, and it is recorded in `.intent/mode.md`.

- **standard** — the default general-purpose mode. For new products, and for feature areas in an existing project whose intent has not been verbalized yet
- **refactor** — for refactoring / redesigning existing large projects. Includes the procedure for reverse-engineering intent from code
- **behavior-unknown** — for legacy systems with no spec documents and unknown behavior
- **feature-growth** — for adding new features to a running system. Includes impact analysis on what exists and decomposition into addition units

A new mode can be added just by dropping one file into `.intent/modes/` (see `.intent/modes/README.md`).

### Delegating the designer-role questions (designer-questions) — another axis, orthogonal to the mode

At the entry point, `/intent-discover` explains what the flow can ask on your behalf (making the L1 success criteria measurable, the E2E confirmation of the first packet = walking skeleton, a screen rough when there is a UI, and for validation the hypothesis and completion judgment), confirms whether you want it (designer-questions: `on` / `off`), and records it in `.intent/mode.md`. When `on`, the three common questions (L1 measurement criteria / walking skeleton / screen rough) and the normative checks of `/intent-validate` become active; it additionally confirms "validation (PoC) or production" (purpose: `poc` / `product`), and when `poc`, the hypothesis / falsification criteria / GO/NO-GO questions are added. When `off`, the only increment is that single opt-in question. Regardless of this on/off, when it judges that the request matches an established pattern (cron-ification, CLI-ification, one-shot conversion, etc.) so the target architecture is uniquely implied, it does not detour through neutral options but instead pins down the inferred architecture up front with a single confirming question ("this is the architecture you're aiming for, right?") — while still avoiding anchoring on judgments that remain divergent, as before.

## Enforcement (checks for missed write-backs, optional)

If you skip the post-implementation `/intent-writeback` and move on to the next packet, `.intent/` quietly drifts away from the implementation reality. Enforcement is an optional layer that mechanically detects this "missed writeback run". **The default is off**, and nothing changes unless you configure it.

There are three strength levels, switched by directly editing the "Enforcement (user-managed)" section of `.intent/mode.md` (the skills never modify this section).

| Value | Behavior |
|---|---|
| `off` (default) | No checks. Behavior stays as before |
| `remind` | When a missed write-back is detected, only show a warning. Nothing stops |
| `gate` | When a missed write-back is detected, stop export / push |

Two things are checked.

- **Neglected pending deltas (the main check)** — deltas recorded by `/intent-writeback` that remain unapproved and unpromoted. Detecting these is the primary purpose of enforcement
- **Staleness (experimental)** — the state where the number of commits changing anything outside `.intent/` since the last write-back (or export) exceeds the threshold (`enforcement-threshold`, default: 5). Unrelated commits such as dependency updates are counted too, so false positives remain. Paths can be excluded from the count via `enforcement-exclude`, but we recommend trying `remind` first to get a feel for the false positives before considering `gate`

The checks take effect in three places.

1. Before export in `/intent-export-cc-sdd` (remind = warning only / gate = stop)
2. As warnings in `/intent-status`
3. The pre-push hook placed via `--enforce` (the checkpoint right before push)

```bash
npx github:ijust/intent-planner --enforce   # Place the pre-push hook in addition to the normal placement
```

Escape hatches exist for false positives. Even when gate stops you, the export can still run if you explicitly instruct it to continue, and push can pass with `git push --no-verify`.

Enforcement only forces "the execution of the writeback procedure"; it does not guarantee the correctness of what was written back (that is the responsibility of `/intent-improve` and human review). Because false positives structurally remain, the default is off.

## Drift-watch (monitoring for drift, optional)

Even after you set the intent, as you build through the cc-sdd spec flow (requirements → design → impl) the implementation can drift bit by bit away from the original intent (for example, the AI over-fitting to virtues like "split it up and keep it loosely coupled," producing a structure more complex than intended). Drift-watch is an optional layer that **catches this drift before it goes all the way off course**. It is a cross-cutting layer alongside enforcement — not a mode. **The default is off.** You switch it to `on` by directly editing the "Drift-watch (user-managed)" section of `.intent/mode.md` (the value is just `off` | `on`).

When `on`, light hooks are inserted into the existing three steps.

| Step | What it does |
|---|---|
| `/intent-discover` | Before you start, names the "drift-prone terrain" by matching against the pattern catalog (`.intent/drift-patterns.md`), prompting you to write the anti-direction / invariant first (prevention) |
| `/intent-export-cc-sdd` | Just before handing off to cc-sdd, checks against the compass (Invariant / Anti-direction / North Star) and warns if you have drifted (interception) |
| `/intent-improve` | At a milestone, records the drift and produces an improvement report aggregated by `pattern × outcome` (after the fact) |

**All of these only warn; they never stop** (a different concept from enforcement's `gate` — they do not stop because false positives are assumed). Detections are merely recorded locally in `.intent/drift-log.md`, and nothing is ever sent externally. The record is designed to keep both the moments it worked (prevented / caught) and the moments it did not (missed / false positive) symmetrically, structurally avoiding confirmation bias. `/intent-status` also shows a light tally (read-only).

The pattern catalog (`.intent/drift-patterns.md`) is not exhaustive — it is meant to be grown by adding the drift types you hit in your own work. The underlying ideas and references are summarized in [docs/theory.md](docs/theory.md).

## cc-sdd integration

When cc-sdd (`.kiro/`) exists at the target, the installer detects it and lets you know.

Passing the draft generated by `/intent-export-cc-sdd` to cc-sdd's `/kiro-spec-init` flows the results of Intent Planning straight into the requirements → design → tasks flow. Invariants and higher-level intent are handed over in a form that transcribes easily into tasks, so the overall intent keeps working through the implementation phase.

intent-planner only produces drafts. The spec itself is generated by cc-sdd, and you review it at each phase.

## OpenSpec integration

Alongside cc-sdd, [OpenSpec](https://github.com/Fission-AI/OpenSpec) is supported as a second export target.

`/intent-export-openspec` converts one selected packet into an OpenSpec **proposal draft** (`## Why` / `## What Changes` / `## Impact`) and a **delta spec hint** (the `## ADDED/MODIFIED/REMOVED Requirements` skeleton plus `### Requirement:` / `#### Scenario:`), and — when you instruct it to continue — launches `/opsx:propose` to bridge into the change-proposal flow. The compass's Invariants are mapped into normative statements (SHALL / MUST) and `## Impact` constraints, so parent intent and invariants carry over into OpenSpec's generated artifacts too.

As with the cc-sdd target, the input is limited to one target packet plus the compass (a low-token contract), and when enforcement is configured it checks for missed write-backs before export. Delegation stops at launching `/opsx:propose`; it does not automatically proceed to apply / sync / archive (completing the spec itself is left to OpenSpec).

## Safe to adopt

- **It never changes application code**. All it writes is Markdown under `.intent/` (writeback / improve also promote only the items you approved)
- **It never overwrites existing files** (except when `--force` is specified). You can check first with `--dry-run`
- **Enforcement defaults to off**, and nothing in the behavior changes unless you configure it. The git hook is placed only when `--enforce` is explicit, and existing hooks are never overwritten
- **Zero runtime dependencies** (Node standard modules only). No state machines, resident processes, or GitHub integrations

## Background: why "before the spec" is needed

When you ask an AI for refactors or large changes, each file's change can be reasonable while the overall design intent crumbles bit by bit (architectural drift). The cause is the AI escaping into local optimizations without holding cross-cutting intent. intent-planner prevents this by having the human and the AI align on "the overall intent" and "the decision criteria to uphold" before implementation, documenting them, and turning them into a steering context the AI can consult every time.

Note that this is not a full IDD (Intent-Driven Development) framework that runs all of development with Intent as the source of truth; it is a lightweight layer inserted just before a spec-driven flow.

How each feature — the Intent Tree, the Compass, Packets, and writeback — is grounded in requirements engineering (goal-oriented requirements engineering, EARS, measurable requirements) and software architecture research (architectural drift, ADR, the Twin Peaks model) is summarized with references in [docs/theory.md](docs/theory.md).

## License

MIT © Yoshishige Tsuji

The development of this project uses tooling derived from [cc-sdd](https://github.com/gotalab/cc-sdd) (MIT, © 2025 gotalab). The distributed artifacts (the npm package and `templates/` etc. of this repository) contain no files derived from cc-sdd.
