# intent-planner

![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg) ![node](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen)

README: [日本語](README.md) | [English](README.en.md)

**Pre-spec Steering Layer for AI coding agents**
*— intent-aware steering, one stage before your specs.*

Before you ask an AI coding agent (Claude Code / Codex) for a sizable change, this tool helps you and the agent work out "what you want to build" and "what must be protected" — and keeps them from drifting during implementation.

It is a lightweight implementation of **Intent Driven Development (IDD)**. By treating Why/What (Intent Tree / Compass / packets) as the source and the workflow (discover→compass→packets→export→writeback) as a fixed rail, it lets *intent drive development*. It does record state (the progress stage), but it embeds no state machine to advance that state on its own — the driving is delegated to an outer loop (a human reviewing, or a harness like `/loop`), and even so it is the Intent that decides the next move. Instead of a heavy state machine, it keeps the lightness of a rail where a human can step in to review at any point.

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
npx intent-planner

# If you use Codex
npx intent-planner --agent codex
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

> These read-only skills (`/intent-status` / `/intent-validate` / `/intent-overview` / `/intent-from-spec` / `/intent-to-spec` / `/intent-release-note`) can be invoked explicitly with a slash, and the agent may also invoke them automatically from context (because they do not rewrite canonical). Skills that rewrite canonical (discover / compass / packets / writeback / improve / export) are slash-invocation only.

| Command | What it does |
|---|---|
| `/intent-status` | Summarize where you are and recommend exactly one "next move". Leads with a progress rail (all packets listed by the five signals: reflected / you-are-here / not-started / unreflected / merged, each row annotated with `[current stage → next stage(s)]`) so you can see at a glance which packet is you-are-here, what stages remain, and where write-backs are missed. Writes nothing. When enforcement is configured, also shows warnings about missed write-backs. When packets that have not caught up to an updated compass (Invariants / Decision Rules) start to pile up, it recommends running `/intent-validate` as the right moment (a read-only estimate; the definitive diagnosis is validate's). When `.kiro/specs/` has an in-progress / done spec with no corresponding Packet, it presents it as a candidate "suspected to have been implemented without going through a Packet (a skipped drafting)"; when there is no corresponding intent-tree entry, as a candidate "missing intent-tree entry" (a non-asserting warning). It also shows milestone events recorded in `.intent/milestones.md` whose revisit has not yet been digested (outstanding milestone items) |
| `/intent-overview` | Aggregate the Intent Tree, Compass, and packets across the board, and read them out as a Mermaid tree (a tree with L0 at the apex and L4 at the leaves), a progress rail (the five signals plus each row's `[current stage → next stage(s)]` annotation, so remaining work and unreflected items are visible at a glance), the 3 progress axes, and gaps. Writes nothing |
| `/intent-from-spec` | Take an existing natural-language spec (PRD, design spec, issue, etc.) as input and surface the unwritten intent — invariants, anti-directions, implicit assumptions — as gaps measured against the rulers (the inward projection). Extractions are presented as Assumptions (hypotheses) and written as a derived view under `.intent/spec-ingest/`. Does not modify canonical artifacts |
| `/intent-to-spec` | Project the three layers (Intent, steering constraints, requirements) into one natural-language Spec for a chosen source scope and target format (why-front upstream view / requirements-crossing integrated spec) — the outward generation. Attaches traces to the projection source and marks unsupported statements as inferred, writing a derived view under `.intent/nl-spec/`. Does not modify canonical artifacts |
| `/intent-release-note` | Read the git commit history read-only, text-match each commit against intent (packet name / parent intent / deltas / milestones) to supply the "why it changed," and derive a changelog-style / GitHub-Releases-style release note under `.intent/release-note/` (the outward projection). The default range is latest tag..HEAD (`<from>..<to>` may be given). Commits not tied to intent are kept as thin lines to surface the gap. git is only read (no commit / tag / push) and canonical is not modified |
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

## Running it as Intent Driven Development (IDD)

The usage story above is a **loop** that goes round: discover → compass → packets → export → implement → writeback → status → (on to the next packet). intent-planner **records this loop as state** (the progress stage), but it does not hold the **driving** force that advances the loop inside the product — it delegates that outward. So there are two ways to run it.

**1. Run it by hand (default — review on every lap)**

```
/intent-discover "your problem"   ← the whole shape of intent
  → /intent-compass               ← decision criteria
  → /intent-packets               ← break into work units
  → /intent-export-cc-sdd {pkt}   ← hand into cc-sdd and implement
  → /intent-writeback {pkt}       ← learnings to deltas; promote only what you approve
  → /intent-status                ← receive exactly one "next move"
  → (back to exporting the next packet)
```

Each stage's output is Markdown under `.intent/`, so you can **step in to review at any time**. What to do next is decided by the single "next move" that `/intent-status` points to — you hold the driving decision.

**2. Delegate the driving to an outer loop (e.g. `/loop`)**

Instead of a human picking up "receive the next move and act on it" every lap, delegate it to a harness like `/loop` and the workflow advances on its own.

```
/loop /intent-status
  → the outer loop picks up the "next move" that status emits,
    carries it through export → implement → writeback for the next packet,
    and returns to status — repeating this.
```

The only thing that changes between the two is **who holds the driving**. Either way, what decides the next thing to build is the Intent (Intent Tree / Compass / packets, and the "next move" that status emits). **Even though the product embeds no autonomously-transitioning state machine, the Intent drives development** — this is intent-planner's form of IDD. Because it holds no state machine, it keeps the lightness of letting a human cut in to review at any moment. The reasoning is explained in [the "state, yes — state machine, no" section of docs/theory.md](docs/theory.md).

> **The cost of letting `/loop` run on its own (be sure you understand it)**
> intent-planner's write commands (discover / compass / packets / writeback / improve / export) **deliberately assume human approval**. This is a design shared across tools that call themselves "intent-driven": the approval gate exists as a brake on development that runs unsupervised (vibe coding). If you delegate the driving to an outer loop with `/loop` and skip approval, you trade the speed of an auto-loop for the following losses:
> - **Chances to catch drift** — fewer moments where a human looks at each stage's output and notices "this has drifted from the intent."
> - **Protection of canonical** — bypassing writeback's approval granularity (invariant violations and Decision Rule changes are confirmed item by item) lets a wrong learning get promoted into the intent documents as-is.
> - **Review of load-bearing branches** — filling in the "Open Questions a human should decide" that discover/compass raise, without approval, can freeze an assumption as if it were settled.
>
> The recommendation is a **hybrid**: delegate the inner implement→test→fix to `/loop` to move fast, but **have a human cut in at the seams between stages (compass settled, packets sliced, writeback approval, load-bearing Open Questions)**. The read-only commands (status / validate / overview) need no approval, so they keep feeding the loop with material to judge by. Rather than "run everything approval-free," **concentrate approval on the few points that matter** — that is how intent-planner balances lightness and safety.
>
> **There are two gates, and you (and your harness) are who removes them.** intent-planner itself has no power to stop you; it only sets up two weirs:
> 1. **The auto-invocation gate** — write skills declare "explicit invocation only (the AI does not start them on its own from context)" in SKILL.md. A user can remove this by editing the declaration, but the distributed files are identity-checked (byte/hash lock) and may be overwritten by a re-install via `npx intent-planner --force`. So removing it is not an intended use.
> 2. **The tool-execution approval** — the permission at the moment a skill actually writes to a file is held not by intent-planner but by the **harness (Claude Code / Codex)**. You can remove it with something equivalent to auto-accept or skip-permissions, but that is the harness's domain.
>
> Running on its own via `/loop` essentially means removing the second gate (the harness's write approval). Remove the first one too and it becomes fully approval-free (vibe coding), and the costs above materialize directly. intent-planner does not forbid this, but **use it knowing which weir you are removing.**

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
npx intent-planner ./my-project          # Into a specific directory
npx intent-planner --dry-run             # Preview what would happen first
npx intent-planner --lang en --agent codex   # English + Codex
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
- **non-code** — for non-program deliverables (documents, operations, research). Switches to a path that produces a readable deliverable without going through the code-oriented cc-sdd/openspec

A new mode can be added just by dropping one file into `.intent/modes/` (see `.intent/modes/README.md`).

Select the non-program mode `non-code` and run `/intent-to-spec` with a non-program target format, and a readable deliverable (article outline, operational procedure, research brief, etc.) is derived under `.intent/nl-spec/` without going through cc-sdd/openspec.

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
npx intent-planner --enforce   # Place the pre-push hook in addition to the normal placement
```

Escape hatches exist for false positives. Even when gate stops you, the export can still run if you explicitly instruct it to continue, and push can pass with `git push --no-verify`.

Enforcement only forces "the execution of the writeback procedure"; it does not guarantee the correctness of what was written back (that is the responsibility of `/intent-improve` and human review). Because false positives structurally remain, the default is off.

## Drift-watch (monitoring for drift, optional)

Even after you set the intent, as you build through the cc-sdd spec flow (requirements → design → impl) the implementation can drift bit by bit away from the original intent (for example, the AI over-fitting to virtues like "split it up and keep it loosely coupled," producing a structure more complex than intended). Drift-watch is an optional layer that **catches this drift before it goes all the way off course**. It is a cross-cutting layer alongside enforcement — not a mode. **The default is off.** You switch it to `on` by directly editing the "Drift-watch (user-managed)" section of `.intent/mode.md` (the value is just `off` | `on`).

When `on`, light hooks are inserted into the existing three steps.

| Step | What it does |
|---|---|
| `/intent-discover` | Before you start, names the "drift-prone terrain" by matching against the pattern catalog (`.intent/drift-patterns.md`), prompting you to write the anti-direction / invariant first (prevention) |
| `/intent-export-cc-sdd` | Just before handing off to cc-sdd, checks against the compass (Invariant / Anti-direction / North Star) and warns if you have drifted (interception). It also checks whether an implementation instruction is arriving that exceeds an exported packet's declared scope (`## Scope`); if it overflows, it warns about and records the absence of the new territory's packet-specific invariants (authorization, consistency, transaction boundaries, idempotency) as `mechanism: packet-scope-overflow` (scope-overflow detection) |
| `/intent-improve` | At a milestone, records the drift and produces an improvement report aggregated by `pattern × outcome` (after the fact). `packet-scope-overflow` is read as an instrument that measures how well the first defense ("go back to intent on scope overflow") is working (the intent-shift rate) |

**All of these only warn; they never stop** (a different concept from enforcement's `gate` — they do not stop because false positives are assumed). Detections are merely recorded locally in `.intent/drift-log.md`, and nothing is ever sent externally. The record is designed to keep both the moments it worked (prevented / caught) and the moments it did not (missed / false positive) symmetrically, structurally avoiding confirmation bias. `/intent-status` also shows a light tally (read-only).

The pattern catalog (`.intent/drift-patterns.md`) is not exhaustive — it is meant to be grown by adding the drift types you hit in your own work. The underlying ideas and references are summarized in [docs/theory.md](docs/theory.md).

When `on`, riding the same gate, **context cost cues** (context-cost-cues) also kick in. It matches "ways of progressing that eat context (tokens)" against `.intent/context-cost-cues.md` (a catalog you grow) and, in discover and improve, makes you **notice** that "this might be eating context." But this is awareness, not a norm: installing many skills or loading full content can be a legitimate choice, so it **neither dismisses nor corrects** them. And because consumption is not measurable, it **records nothing to any log** (unlike drift-log, it keeps no tally either). The judgment is left to you.

## Coined-term management (ubiquitous language)

The more you use it, the more an AI tends to coin new terms that are absent from the canonical vocabulary (the ubiquitous language your project has agreed on). As the vocabulary fragments, the intent alignment that intent-planner exists for erodes. intent-planner manages coined terms — **prevent, detect, suggest a rewrite** — to reduce them.

- **A canonical vocabulary ledger** — `.intent/glossary.md` (canonical term + aliases/synonyms + a one-line explanation) aggregates "these are the correct terms." It is canonical that you grow; the commands only read it and never rewrite it (no bulk translated-term replacement).
- **Detection and rewrite suggestion** — `/intent-validate` names terms absent from the ledger as a "suspected coinage" in a read-only way and attaches a suggestion toward a canonical term. **It only warns; it never stops** (the same temperature as drift-watch, an off-by-default check). Proper nouns, established English technical terms, and legitimate new terms that carry a first-occurrence one-line explanation are excluded. The rewrite is a suggestion only; adoption happens after you approve it.
- **Prevention** — the distributed convention docs (CLAUDE.md / AGENTS.md) include a terminology rule: do not invent terms absent from the canonical vocabulary; if you must, attach a one-line explanation at first occurrence. "Coinage-prone terrain" is also a type in the drift-watch catalog (only when on).

The underlying ideas are summarized in the "Coined-term management" section of [docs/theory.md](docs/theory.md).

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

This is an implementation of **Intent Driven Development (IDD)** — driving development with Intent as the source of truth — but not a heavyweight framework that embeds an autonomous state machine or a resident runtime. It delegates the driving to an outer loop (by hand or via `/loop`) and realizes IDD as a lightweight layer inserted just before a spec-driven flow (see the ["Running it as IDD" section](#running-it-as-intent-driven-development-idd) and [docs/theory.md](docs/theory.md)).

How each feature — the Intent Tree, the Compass, Packets, and writeback — is grounded in requirements engineering (goal-oriented requirements engineering, EARS, measurable requirements) and software architecture research (architectural drift, ADR, the Twin Peaks model) is summarized with references in [docs/theory.md](docs/theory.md).

## License

MIT © Yoshishige Tsuji

The development of this project uses tooling derived from [cc-sdd](https://github.com/gotalab/cc-sdd) (MIT, © 2025 gotalab). The distributed artifacts (the npm package and `templates/` etc. of this repository) contain no files derived from cc-sdd.
