# intent-planner

![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg) ![node](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen)

README: [日本語](README.md) | [English](README.en.md)

You ask an AI to "just handle this nicely," and each individual change looks fine — yet the whole thing slowly heads somewhere other than what you had in mind. Sound familiar?

intent-planner is a tool for putting "what you want to do" and "what you can't compromise on" into words together with the AI, **before** you ask it to work. Aligning the direction up front keeps things from drifting bit by bit along the way.

What you do is simple: you take the fuzzy idea in your head and organize it by answering the AI's questions. No special knowledge required.

Installing it only adds a few commands and one folder, `.intent/`. **It never rewrites your files or code** (all it writes is notes inside `.intent/`).

> 📌 In more technical terms: intent-planner is a **"Pre-spec Steering Layer" for AI coding agents (Claude Code / Codex)**. It slots in one stage before you write the spec, keeping cross-cutting intent and design direction in effect as steering context throughout implementation. The detailed engineer-facing story is in the [later half](#sec-prespec).

---

## Which one is you?

There are roughly three ways to use it. They get more technical from top to bottom, so read from whichever is closest to you.

| If you're… | How you use it | Section |
|---|---|---|
| 📝 **Not writing code** (planning, research, document-making) | As a tool to organize your thinking and produce a readable deliverable (article outline, manual, research notes, etc.) | [① If you don't write code](#sec-no-code) |
| 💻 **Asking the AI to implement** (everyday development) | Insert one stage **before** writing the spec, to organize intent before handing off | [② Asking the AI to implement (Pre-spec Steering Layer)](#sec-prespec) |
| 🔁 **Wanting it fully automated** | Let an outer loop (`/loop`, etc.) **self-drive** the intent → implement → reflect cycle | [③ Run the whole thing automatically (full IDD)](#sec-full-idd) |

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

### Requirements

- **Claude Code** / **Codex** / **Gemini CLI** (selected via `--agent`)
- **Node.js** (only to run the installer; zero runtime dependencies)
- [cc-sdd](https://github.com/gotalab/cc-sdd) or [OpenSpec](https://github.com/Fission-AI/OpenSpec) (optional; if you use them as the handoff target)

### Install

```bash
# At the root of your project (defaults to Claude Code)
npx intent-planner

# If you use Codex
npx intent-planner --agent codex

# If you use Gemini CLI
npx intent-planner --agent gemini

# To check first what will happen
npx intent-planner --dry-run
```

On install, a "thin entry that teaches how to use it" (`CLAUDE.md` for Claude Code, `AGENTS.md` for Codex, `GEMINI.md` for Gemini CLI) and a scaffold `.intent/` folder are placed for the AI you use. An existing `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` is respected and never overwritten. For detailed options, see [the installation section of docs/guide.en.md](docs/guide.en.md#installation-options).

**For engineers who write code**: after working out the intent, the recommended path is to bridge into [cc-sdd](https://github.com/gotalab/cc-sdd) or [OpenSpec](https://github.com/Fission-AI/OpenSpec) drafts via `/intent-export-cc-sdd` and proceed with the spec-driven implementation flow (intent is the upstream layer; cc-sdd / OpenSpec is downstream).

---

<a id="sec-no-code"></a>

## ① If you don't write code

intent-planner was originally for people building programs with AI, but you can also use it as a tool to **organize the ideas in your head into a "readable deliverable"**. Outlining an article, summarizing what you researched, drafting a proposal — that's the path here.

It's easy to use. When you run `/intent-discover`, the AI asks you "what do you want to do?", and you just answer. The AI sees "this is document-making" and switches to a way of working that pulls your writing together (`non-code` mode).

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

1. **`/intent-discover`** — the AI asks questions about your problem or idea and builds the overall picture of the intent.
2. **`/intent-compass`** — builds the decision criteria: "the state to aim for", "directions not to take", "invariants that must not break". This becomes the steering handed to the AI on every implementation run.
3. **`/intent-packets`** — splits into work units (packets) that can be handed to implementation. It recommends one unit to start with, with a reason.
4. **`/intent-export-cc-sdd`** (or `/intent-export-openspec`) — converts the selected work unit into a draft for the implementation tool.

After that you run the cc-sdd / OpenSpec spec flow (requirements → design → tasks → implementation). intent-planner produces only the draft; the spec body is generated by the implementation tool, and you review it at each phase.

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

## Want to know more

- **How each feature works** — modes, command-by-command, file layout, enforcement, drift-watch, coined-term management, constraint starters, etc. → [docs/guide.en.md](docs/guide.en.md)
- **Why this procedure** — its correspondence to requirements engineering and software architecture research, with references → [docs/theory.md](docs/theory.md) (Japanese)

It's designed so that, even without knowing the theory, following the flow and answering the questions fills in the deliverables you need. The docs are for reference when you want one more level of detail.

---

## License

MIT © Yoshishige Tsuji

This project's development uses tooling derived from [cc-sdd](https://github.com/gotalab/cc-sdd) (MIT, © 2025 gotalab). The distributed artifacts (the npm package and this repository's `templates/`, etc.) contain no cc-sdd-derived files.
