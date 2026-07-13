# intent-planner

[![npm version](https://img.shields.io/npm/v/intent-planner.svg)](https://www.npmjs.com/package/intent-planner) ![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg) ![node](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen)

README: [日本語](README.md) | [English](README.en.md)

You ask an AI to "just handle this nicely," and each individual change looks fine — yet the whole thing slowly heads somewhere other than what you had in mind. Sound familiar?

intent-planner is a tool for putting "what you want to do" and "what you can't compromise on" into words together with the AI, **before** you ask it to work. Aligning the direction up front keeps things from drifting bit by bit along the way.

What you do is simple: you take the fuzzy idea in your head and organize it by answering the AI's questions. No special knowledge required.

Installing it only adds a few commands and one folder, `.intent/`. **It never rewrites your files or code** (all it writes is notes inside `.intent/`).

> 📌 In more technical terms: intent-planner is a **"Pre-spec Steering Layer" for AI coding agents (Claude Code / Codex / Gemini CLI)**. It slots in one stage before you write the spec, keeping cross-cutting intent and design direction in effect as steering context throughout implementation. The detailed engineer-facing story is in the [later half](#sec-prespec).

---

## Which one is you?

There are roughly three ways to use it. They get more technical from top to bottom, so read from whichever is closest to you.

| If you're… | How you use it | Section |
|---|---|---|
| 📝 **Not writing code** (planning, research, document-making) | As a tool to organize your thinking and produce a readable deliverable (article outline, manual, research notes, etc.) | [① If you don't write code](#sec-no-code) |
| 💻 **Asking the AI to implement** (everyday development) | Insert one stage **before** writing the spec, to organize intent before handing off | [② Asking the AI to implement (Pre-spec Steering Layer)](#sec-prespec) |
| 🔁 **Wanting it fully automated** | Let an outer loop (`/loop`, etc.) **self-drive** the intent → implement → reflect cycle | [③ Run the whole thing automatically (full IDD)](#sec-full-idd) |
| 🧭 **Deciding or planning what to build** (anyone, any role, thinking through a product or feature solo) | Stay out of implementation detail and start from the intent questions, reader-facing one-pagers, and the bird's-eye view | [For people deciding or planning a product](#sec-decider) |

> The detailed feature usage (modes, command list, enforcement, drift-watch, etc.) is collected in [docs/guide.en.md](docs/guide.en.md). This README focuses on "how to start in your situation."

---

## To begin: the whole picture in 3 minutes

intent-planner is one round-trip loop: organize the intent **before** asking the AI to implement, and write the learnings back into the documents **after**.

```
1. Organize intent        2. Hand off        3. Implement      4. Write back
discover → compass        export             (AI implements)    writeback
  → packets                                                     → improve
        └────── when in doubt, status (where you are + one next move) ──────┘
```

Each step's deliverable is Markdown under the `.intent/` folder. Review it before moving on. **When in doubt, `/intent-status`** tells you where you are and recommends exactly one "next move".

**Where to start (pick one of two entrances)**:

- You can say what you want to build → **`/intent-discover`** (start organizing the intent)
- Resuming mid-way, or not sure where things stand → **`/intent-status`** (where you are + exactly one next move)

### Requirements

- **Claude Code** / **Codex** / **Gemini CLI** (selected via `--agent`)
- **Node.js** (only to run the installer; zero runtime dependencies)
- [cc-sdd](https://github.com/gotalab/cc-sdd) or [OpenSpec](https://github.com/Fission-AI/OpenSpec) (optional; if you use them as the handoff target)

### Install

```bash
# At the root of your project (defaults to Claude Code)
npx intent-planner --lang en

# If you use Codex
npx intent-planner --lang en --agent codex

# If you use Gemini CLI
npx intent-planner --lang en --agent gemini

# To check first what will happen
npx intent-planner --lang en --dry-run
```

Note: `--lang en` places the English templates and shows the main CLI messages in English. Without it, the default language is Japanese (`ja`).

Running it looks like this (excerpt from real output):

```
Placed (149):

Agent: claude
  skills: .claude/skills/intent-*/
  root doc: CLAUDE.md was placed.

What to do next:
  1. Open Claude Code
  2. Type /intent-discover at the prompt and run it (this is where pinning down intent begins)
```

**⏱ First time?** There is a [10-minute walkthrough](docs/walkthrough.en.md) that goes once from install to a handoff draft, with real terminal output and generated files.

On install, a "thin entry that teaches how to use it" (`CLAUDE.md` for Claude Code, `AGENTS.md` for Codex, `GEMINI.md` for Gemini CLI) and a scaffold `.intent/` folder are placed for the AI you use. An existing `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` is never overwritten — instead, after confirmation, the quickstart is appended non-destructively (existing content is left unchanged: Claude Code / Gemini CLI place the body in a separate file and add a one-line reference, while Codex appends a section at the end). In non-interactive environments the append is skipped; pass `--yes` to consent up front. For detailed options, see [the installation section of docs/guide.en.md](docs/guide.en.md#installation-options).

Only if you also want term-drift, accept its interactive prompt or pass `--with-term-drift`; intent-planner then installs the compatibility-verified term-drift 0.2.1 for the selected agent. `--yes` consents only to the root-document append and is not term-drift consent. Status is reported as `not-installed`, `ready`, or `inconsistent` (split into `additive-compatible`, where the official installer can perform a safe additive completion, and `blocked`, where automatic repair is refused). `install-failed` describes the current attempt separately from filesystem health. intent-planner does not perform automatic updates of an existing installation or independently repair or overwrite term-drift-owned files. Once `ready`, start the full terminology inspection from the dedicated term-drift skill in the selected agent.

**If you are upgrading from an older version**, see [docs/migration.en.md (the migration guide)](docs/migration.en.md). While your existing `.intent/` deliverables are not overwritten, it explains — per Claude Code / Codex / Gemini CLI — how to pull the newly introduced mechanisms (history archive files, search tags) into an existing project.

**For engineers who write code**: after working out the intent, the recommended path is to bridge into [cc-sdd](https://github.com/gotalab/cc-sdd) or [OpenSpec](https://github.com/Fission-AI/OpenSpec) (`/intent-export-openspec`), or into [GitHub Spec Kit](https://github.com/github/spec-kit) via `/intent-export-speckit`, and proceed with the spec-driven implementation flow (intent is the upstream layer; these spec tools are downstream). When only existing code remains and no spec survives, `/intent-from-code` reads the code and drafts intent candidates marked as inferred.

---

<a id="sec-no-code"></a>

## ① If you don't write code

intent-planner was originally for people building programs with AI, but you can also use it as a tool to **organize the ideas in your head into a "readable deliverable"**. Outlining an article, summarizing what you researched, drafting a proposal — that's the path here.

It's easy to use. When you run `/intent-discover`, the AI asks you "what do you want to do?", and you just answer. The AI sees "this is document-making" and switches to a way of working that pulls your writing together (`non-code` mode). It may also offer a question pack — a set of probing questions matched to the kind of work (a proposal, a research summary, an article outline, an event plan) — and whether to use it is your call.

```
/intent-discover    ← organize what you want to do / think through (the AI asks you questions)
  → /intent-compass ← decide what you "can't compromise on"
  → /intent-to-spec ← pull it into a readable form (article outline, manual, research notes, etc.)
```

- The final `/intent-to-spec` pulls what you organized into one readable document. Parts without a clear basis get an "inferred" mark, so you can tell whether the AI has padded the story on its own.
- The finished document goes into the `.intent/nl-spec/` folder.

> If you don't write code, this is enough. The sections below are for people building programs, so feel free to skip them.

---

<a id="sec-prespec"></a>

## ② Asking the AI to implement (Pre-spec Steering Layer)

From here on it's for engineers. The most basic use of intent-planner is to insert just one stage **before** writing the spec, organizing intent before handing off to implementation. The organized intent flows straight into the spec-driven flow of [cc-sdd](https://github.com/gotalab/cc-sdd) or [OpenSpec](https://github.com/Fission-AI/OpenSpec).

As the name "Pre-spec" and "Steering" suggests, the criteria you set here keep steering the AI throughout implementation.

### How to proceed

Run these in order, reviewing each step's deliverable.

```
/intent-discover   →  /intent-compass  →  /intent-packets  →  /intent-export-cc-sdd
(organize the picture)  (criteria to uphold)  (decompose into units)  (hand off to the tool)
```

1. **`/intent-discover`** — the AI asks questions about your problem or idea and builds the overall picture of the intent. When the solution space is still broad, it offers provisional hypotheses, counterexamples, and alternative problem framings so the human can set decision boundaries in the next compass.
2. **`/intent-compass`** — builds the decision criteria: "the state to aim for", "directions not to take", "invariants that must not break". This becomes the steering handed to the AI on every implementation run.
3. **`/intent-packets`** — splits into work units (packets) that can be handed to implementation. It recommends one unit to start with, with a reason. It also picks the exit (how to implement) by looking at which tools are actually set up in that repository (cc-sdd / OpenSpec / Spec Kit): the set-up ones are listed first, the others follow with a "needs setup" note. Nothing is dropped from the candidates, so setting one up later remains an option.
4. **`/intent-export-cc-sdd`** (or `/intent-export-openspec`, `/intent-export-speckit`) — converts the selected work unit into a draft for the implementation tool. The draft carries the acceptance material (expected behavior and how acceptance is measured), so the downstream requirements generation doesn't come out thin.

After that you run the cc-sdd / OpenSpec spec flow (requirements → design → tasks → implementation). intent-planner produces only the draft; the spec body is generated by the implementation tool, and you review it at each phase.

When a work unit involves database design, `/intent-db-design` reads the intent, invariants, and existing schema together and drafts table definitions, constraints, and indexes as a **starting point** (a read-only draft to consult before handing off downstream, not requirements themselves). You launch it manually.

### What's good about this (Before / After)

An example of how a vague one-line request gets concrete when run through intent-planner (subject: a login feature).

**Before** — the request to the AI is just this:

```
Just build the login feature nicely
```

The interpretation of "nicely" is left to the AI, which tends to fall into stopgaps — growing its own password auth, going down an implementation that doesn't fit the existing auth foundation.

**After** — running discover → compass → packets turns the same request into this:

- **Goal (with measurable criteria)**: a first-time user can complete login within 2 minutes (measured from start to dashboard display)
- **Invariant (to uphold)**: don't break compatibility with the existing OAuth providers (Google / GitHub)
- **Direction not to take**: don't add your own password auth
- **Work units**:
  1. **P1: OAuth callback E2E** — thread the thinnest path through first
  2. **P2: error states and retry UI**
  3. **P3: audit log**

The first recommendation is P1. Threading the thinnest path first lets you clear the biggest uncertainty (redirect config, session management) at the start.

Because this goal / invariant / direction-not-to-take keeps being handed to the AI on every run from P2 onward, the criteria "don't grow your own auth" and "don't break the existing providers" keep working.

### After implementation (keep growing it)

So it isn't "build once and done", write the learnings from implementation back into the intent documents.

- **`/intent-writeback`** — records what you learned during implementation (newly decided things, invariant violations, implicit behavior) and reflects only what you approve into the documents.
- **`/intent-improve`** — at a milestone after several units, detects and fixes the gaps between documents and implementation in bulk.
- **`/intent-validate`** — reports contradictions, coverage gaps, and boundary mismatches across the intent documents with severity, read-only (it only proposes fixes; it never rewrites on its own). Running it once before export is a good safety check.

With this, `.intent/` becomes a living decision criterion that stays in sync with implementation reality.

---

<a id="sec-full-idd"></a>

## ③ Run the whole thing automatically (full IDD)

In ②, a human looked at `/intent-status` and advanced each next move by hand. Instead, delegating the driving to an outer loop like `/loop` lets you **self-drive the whole intent → implementation → write-back cycle**. This is using intent-planner to run a full round as **Intent Driven Development (IDD)**.

intent-planner itself records "which stage it's at (state)", but embeds no mechanism (a state machine) to advance that state automatically. That's why the driving can be pushed outside.

```
/loop /intent-status
  → the outer loop picks up the "next move" status emits,
    advances export of the next work unit → implementation → writeback,
    and returns to status — repeating this
```

The only difference from ② is **who holds the driving**. Either way, what decides the next thing to build is the Intent (the organized intent, and the "next move" status emits).

### Adding new intent (handing a request to the loop)

`/loop` is not a mechanism for injecting requests from outside — it **just re-runs the same command repeatedly**. So where does "the next thing to build (= the request)" come from? The packets sitting in `.intent/packets/` *are* the requests. Each round, the loop's `/intent-status` reads them and picks up a not-yet-implemented packet as the "next move".

So, to add something new to build while it's self-driving, **you just add one more packet**. Concretely, in a **separate session** from the loop, a human drives the addition:

```
Separate session (human driving): /intent-discover → /intent-compass → /intent-packets
   → a new packet appears in .intent/packets/ (= a request placed as a file)

The loop session, still running: the next round's /intent-status picks up that packet
   → export → implementation → writeback, self-driven
```

In other words, **"creating a packet in a separate session" *is* injecting a request into the loop.** Both sessions see the same `.intent/` in the same repo, so it's handed over via the file. There's no need to stop the loop.

Adding intent (`discover` / `compass` / `packets`) is done **by a human in a separate session** for a reason: these commands rewrite documents and assume human approval (see the warning below). Keep the self-driving loop running as-is, and do just the approval work of adding new intent calmly elsewhere — that's the separation.

> ### ⚠️ The cost of self-driving (make sure you understand it)
>
> The commands that rewrite documents (discover / compass / packets / writeback / improve / export) **intentionally assume human approval** — a brake against unsupervised development (vibe coding). Skipping approval with `/loop` trades speed for losing the following:
>
> - **The chance to notice drift** — fewer chances to notice "this drifts from the intent" at each stage
> - **Protection of the documents** — a wrong learning could be reflected into the intent documents as-is
> - **Review of heavy branches** — filling in questions a human should settle, without approval, could fix a guess as a settled fact
>
> **The recommendation is hybrid.** Delegate the inner "implement → test → fix" to `/loop` to spin fast, and have a human cut in at the seams (compass confirmation, packet decomposition, writeback approval, settling heavy questions). The read-only commands (status / validate / overview) need no approval, so they keep emitting decision material safely inside `/loop`. Rather than "running everything approval-less", "concentrating approval on the one point that matters" is the way to balance lightness and safety.
>
> The self-driving mechanism and caveats are in [the "running it on a loop" section of docs/guide.en.md](docs/guide.en.md#notes-when-running-it-on-a-loop-loop); the theoretical background is in [the "state, yes — state machine, no" section of docs/theory.md](docs/theory.md).

---

## When to use it

You can also enter from a concrete situation.

| Situation | What intent-planner does | How |
|---|---|---|
| Pull together documents, research, planning (no code) | Organize the intent and generate a readable deliverable directly | [①](#sec-no-code) |
| Start a new product or feature AI-first | Verbalize the intent and criteria before implementation, so steering works from the first line | [②](#sec-prespec) |
| Build a PoC or personal project solo | Opt in at the entry to the designer-role questions (measurable success criteria, walking skeleton, hypothesis and falsification criteria) | [②](#sec-prespec) |
| Ask for a large refactor | Build the criteria first that prevent changes that "work correctly but drift from the design intent" | [②](#sec-prespec) |
| Legacy code whose specs are unknown | Reverse-engineer the intent from observable behavior and document it | [②](#sec-prespec) |
| Add features to a running system | Decompose into addition units that account for the impact on what exists | [②](#sec-prespec) |
| Self-drive from planning through implementation and write-back | Delegate the driving to an outer loop; the human approves only the one point that matters | [③](#sec-full-idd) |

---

## Safe to adopt

- **It does not change your application code.** All it writes is Markdown under `.intent/` (writeback / improve reflect only what you approve).
- **It does not overwrite existing files** (except when you pass `--force`). You can check first with `--dry-run`.
- **The check layers (enforcement / drift-watch) default to off**, and nothing changes unless you configure them. A git hook is placed only when you explicitly pass `--enforce`.
- **Zero runtime dependencies** (Node standard modules only). No resident process, no sending anything to an external service.

---

<a id="sec-decider"></a>

## For people deciding or planning a product

A reading path for anyone — any role — thinking through "what to build" on their own (deciding a product, planning a feature, designing a service). You stay out of the implementation detail (packet decomposition, the downstream export flow) and use only the part that **clarifies intent and communicates it to readers**.

- **Sharpen the intent with questions** — answering `/intent-discover` surfaces the questions at the heart of a plan: "whose problem, and what problem" and "how will we know it worked". Even just this turns a fuzzy idea in your head into something readable.
- **Turn it into a reader-facing one-pager or report** — the sharpened intent can become a readable document for stakeholders with `/intent-to-spec`, or a bird's-eye view of scattered intent with `/intent-overview` (both just write Markdown under `.intent/`; they never touch your application code). `/intent-to-spec` has reader-specific shapes (a **stakeholder one-pager**, a **status report**, and a **decision memo** — the first two bottom-line-up-front, the decision memo leading with "adopted / rejected, and why" for a choice you weighed, comparison table included), plus a choice of **how deeply to write** (brief / standard / detailed; if unspecified it asks once before generating), and `/intent-release-note` has a **customer-facing changelog** (leading with what changes for the user) and a **PR description draft** (assembling "why this change", "what to review first", and the commit-to-intent mapping from a commit range; it never writes to GitHub — you paste it yourself), each opening up the jargon to match the reader. `/intent-overview` also has a **decision inbox** (open questions not yet settled, learnings awaiting approval, and warnings gathered onto one screen), a **roadmap** (the order of work and "what blocks what", with no dates), **Mermaid figures** that GitHub / VSCode render as-is for the whole picture of intent and the order of work, an **assignment view** that shows who is implementing which work in parallel and whether the same work is being double-booked, and a **handoff brief** to pass to the next session at a break in a long session (a disposable document gathering where you are, remaining tasks, the canonical sources to read, traps, and repo state from the state of `.intent/`; it does not read the conversation log), which you can emit by specifying "decision inbox", "roadmap", "mindmap", "assignment", or "handoff". Note that the `/intent-packets` plan file has an optional **work plan** field where you can write the order you want to build things in (the **grouping and priority** of "login first, then …") in your own words; when written, the recommendation of what to start first follows that order (a separate axis from dependencies; the order is not enforced).
- **See the whole** — `/intent-status` tells you, as a single "next step", what is decided and what is still open.

This is a third entry point, alongside [① If you don't write code](#sec-no-code) (making deliverables) and [② Asking the AI to implement](#sec-prespec) (engineer-facing). The intent you sharpen here can also be handed straight to an engineer's spec-driven flow.

---

## Connecting external tools (Notion / Jira / Slack, etc.)

Going back and forth between a PRD in Notion and your intent, or pasting a finished one-pager into Slack, works **with no extra install or setup** — just the reading and writing your usual agent (Claude Code / Codex / Gemini CLI) already does.

- **What you can do (reading is two-way)**: have the agent read an external document and hand it to intent (a Notion PRD, a Jira issue, or scattered fragmentary notes → `/intent-from-spec` or `/intent-discover`), or paste intent's Markdown deliverables out to an external tool (`/intent-to-spec` / `/intent-overview` output → Notion / Slack).
- **What it doesn't do (two-way write sync)**: intent and external tools are **never auto-synced two-way** (permanently). That would put the burden of tracking which side is authoritative, and resolving conflicts, onto the product. Integration stays as the two one-way flows: a person or agent reads and hands off, or emits and pastes.
- **One check before you paste**: content pasted into an external service can persist in copies or search indexes even after you delete it. Check for confidential or personal data before you paste.

The concrete steps (Notion → from-spec, one-pager → Slack examples) and why two-way sync is not done are in [docs/integration.md](docs/integration.md) (Japanese).

---

## Want to know more

- **⏱ Prefer to see it run first** — one full loop from install to right before implementation, with real screens → [docs/walkthrough.en.md](docs/walkthrough.en.md)
- **How each feature works** — modes, command-by-command, file layout, enforcement, drift-watch, coined-term management, constraint starters, etc. → [docs/guide.en.md](docs/guide.en.md)
- **Already buried in coined terms?** — a standalone tool that finds suspicious terms in your documents and fixes them using only the rewordings you approved, one term at a time (it works on its own, without intent-planner) → [term-drift](https://github.com/ijust/term-drift)
- **Connecting external tools** — patterns for wiring Notion / Jira / Slack to intent one-way (with the reason two-way sync is not done) → [docs/integration.md](docs/integration.md) (Japanese)
- **Why this procedure** — the term-drift integration boundary in English → [docs/theory.en.md](docs/theory.en.md), and the full correspondence to requirements engineering and software architecture research → [docs/theory.md](docs/theory.md) (Japanese)

It's designed so that, even without knowing the theory, following the flow and answering the questions fills in the deliverables you need. The docs are for reference when you want one more level of detail.

---

## License

MIT © Yoshishige Tsuji

This project's development uses tooling derived from [cc-sdd](https://github.com/gotalab/cc-sdd) (MIT, © 2025 gotalab). The distributed artifacts (the npm package and this repository's `templates/`, etc.) contain no cc-sdd-derived files.
