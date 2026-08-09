# intent-planner

![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg) ![node](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen)

README: [日本語](README.md) | [English](README.en.md)

[Demo video](https://youtu.be/WT3WVFk-iL0) · [10-minute walkthrough](docs/walkthrough.en.md) · [Full guide](https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md)

When you ask an AI agent to build something, each individual change may look reasonable while the whole project gradually moves away from what you intended. intent-planner is a lightweight planning layer for clarifying what you want to achieve and what must not be broken before handing work to specification or implementation.

It also works for proposals, research, and other documents. It supports Claude Code, Codex, and Gemini CLI, and can hand the result to cc-sdd, OpenSpec, or Spec Kit, or use it directly as small implementation units.

It is most useful for **high-risk work**, where design drift and rework are costly. For a short prototype or a change where vibe coding is enough, this process can be **overkill**. Use the `direct` route from a work unit, or skip intent-planner.

## When to use it

| What you want to do | How intent-planner helps |
|---|---|
| Prepare a proposal, research note, or guide | Organize intent through questions and turn it into a readable document |
| Ask an AI agent to implement a change | Align the purpose, decision criteria, and implementation units before writing a spec |
| Recover intent from existing code | Extract candidates from code, label them as inferred, and ask for confirmation |
| Correct drift after implementation | Record what was learned and return only approved changes to the plan |

You do not need to choose a professional category or project type first. Start with any one of these: your purpose, the deliverable you want to create, materials you already have, or the next decision you need to make.

### When you are not writing code

You can organize a proposal, article outline, research result, or operating procedure in the same way. The agent confirms the purpose, audience, and necessary decisions, then `intent-to-spec` turns the result into one readable document. Claims without settled evidence remain visibly inferred.

### When an AI agent will implement the change

Before writing a specification, align the problem to solve and the criteria that remain active during implementation. Then either:

- create a draft for cc-sdd, OpenSpec, or Spec Kit; or
- use the `direct` route when the work unit is already small and clear.

intent-planner owns the draft and decision criteria. It does not automatically start downstream specification or implementation, and it does not manage the downstream tool's state.

### When you are deciding what to build

You can start before choosing an implementation. Clarify whose problem matters, how success will be judged, and what will not be decided in this work. Specialist perspectives such as screen or service design are suggested only when they fit the case; the user decides whether to adopt them.

For example, consider “reduce support requests about subscription cancellation.” intent-planner can examine the same request from several perspectives.

| Perspective | Example questions and guidance |
|---|---|
| **Product manager (product-decision perspective)** | What evidence explains the support requests? Whose situation should improve? Is success measured by request volume, completion rate, or re-subscription? Are there options besides adding a cancellation button? |
| **Service designer (experience-design perspective)** | From considering cancellation through completion, which touchpoints, waits, and handoffs occur? Which people and backstage processes support the visible journey? How should failure, drop-off, and resumption work? |
| **Screen-design perspective** | In what order should information appear? How should loading, failure, insufficient permission, and completion be communicated—not only the happy path? Is the next action clear? |
| **Engineering practices** | Can repeated actions avoid duplicate effects? How are authorization and audit records protected? How should payment failure, retries, data migration, and regression tests work? |

These perspectives do not role-play professions or settle the answer for you. Only strong fits are suggested; unsupported answers remain unverified, and only what a person adopts enters the plan. See the [perspectives and practices overview](https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md#available-perspectives-and-practices) for the available perspectives, frames, and practice areas.

### When combining it with automation

Another automation loop can run the inner “implement → test → fix” cycle. Keep human review for settling the purpose, decision criteria, work scope, and post-implementation learnings. Read-only status and validation can still be used inside an automated run.

## A five-minute end-to-end example

```
intent-plan (runs the following four stages as one journey)
Clarify intent           Align decisions          Split the work          Hand off to specs
discover        →       compass         →        packets        →        export
```

For example: “Add order cancellation to an online shop, but avoid refund incidents.” The agent asks only about points that can change the outcome, then creates:

1. `.intent/intent-tree.md` — the problem and intended outcome
2. `.intent/intent-compass.md` — decision criteria that remain active during implementation
3. `.intent/packets/` — implementation order and verification approach
4. a handoff draft for the selected specification tool

That completes one intent-planner cycle. **Application-code implementation has not started.** Review the artifacts before asking for specification or implementation.

**Where to start (pick one of two entrances)**

- Start new work: `intent-plan`
- Resume work or find your current position: `intent-status`

The invocation differs by agent:

- **Claude Code**: run a slash command such as `/intent-plan`.
- **Codex / Gemini CLI**: do not add a slash; ask naturally, for example, “start with `intent-plan`.”

## Keep using it after the first cycle

intent-planner is not limited to a single pre-implementation pass.

| Situation | Feature | What it does |
|---|---|---|
| You do not know the current position | `intent-status` | Shows the current position and exactly one next move |
| Before handing work to a spec | `intent-validate` | Read-only checks for contradictions, omissions, and scope drift |
| Implementation is complete | `intent-writeback` | Records learnings and returns only approved changes to the plan |
| At a broader review point | `intent-improve` | Compares the plan with implementation reality and proposes corrections |

An optional monitor can also record signs of drift during implementation. It warns but does not stop the work. See the [guide](https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md) for details.

## What it produces—and what it does not

**It produces**

- an Intent Tree organizing purpose and outcomes
- decision criteria that remain available during implementation
- small work units with a parent purpose and verification approach
- drafts for specification tools or direct implementation
- records of implementation learnings

**It does not produce or do**

- turn unconfirmed inference into a settled requirement
- modify application code during planning
- complete the specification body owned by cc-sdd, OpenSpec, or Spec Kit
- run without bounds by silently removing human approval
- force the same process weight onto every project

## Install

Choose one route that matches the restrictions on your machine. All routes provide the same intent-planner features after installation.

### 1. npx — shortest route

When Node.js, npm, and npx are available:

```bash
npx intent-planner --lang en --agent codex --dry-run
npx intent-planner --lang en --agent codex
```

`--agent` accepts `claude`, `codex`, or `gemini`. The default is Claude Code.

### 2. npm — when only npx is restricted

When Node.js, npm, and the npm registry are available:

```bash
npm install --save-dev intent-planner
./node_modules/.bin/intent-planner --lang en --agent codex
```

On Windows, replace the final line with:

```powershell
.\node_modules\.bin\intent-planner.cmd --lang en --agent codex
```

### 3. Windows Portable ZIP — when Node.js or npm is unavailable

Download these two files from the [latest GitHub Release](https://github.com/ijust/intent-planner/releases/latest):

- `intent-planner-v<version>-win-x64-portable.zip`
- its matching `.sha256` file

Extract the ZIP and run the bundled command against your target project. You do not need to install Node.js, npm, or npx on the host.

```powershell
<extract-directory>\intent-planner.cmd --lang en --agent codex --dry-run
<extract-directory>\intent-planner.cmd --lang en --agent codex
```

If GitHub is also blocked on the target machine, copy the ZIP and `.sha256` from another machine using an organization-approved transfer method. See the [Portable ZIP guide](https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md#windows-portable-zip-route) for SHA-256 verification.

### Safe installation defaults

- A normal rerun does not overwrite existing guidance or user-authored `.intent/` artifacts.
- `--dry-run` writes no files and shows only the planned actions.
- `--force` can overwrite user data; do not use it for normal installation.
- Git hooks and CI are added only when `--enforce` or `--with-ci` is specified.

See [installation details](https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md#installation-options) for destinations, updates, helper tools, and every option.

## Before / After

**Before**

> “Add order cancellation.”

Implementation can begin while the cancellation deadline, shipped-order behavior, and refund responsibility remain undecided.

**After**

> “Recover from buyer mistakes. Do not cancel automatically after shipment, preserve the existing payment contract, and start with unshipped orders only.”

The purpose, constraints, and first scope are separate, so the specification and implementation can be reviewed against the same criteria.

## FAQ

### Is it needed for a small change?

No. If the purpose and impact are already clear and a failure is easy to reverse, the `direct` route—or skipping intent-planner—is appropriate.

### Does it replace spec-driven development?

No. It aligns the overall direction before specification and passes only the relevant intent to the selected specification tool.

### Can it work when only the existing code remains?

Yes. It can ingest intent candidates and their evidence from code, but inferred content is not settled until a person confirms it.

### Can I resume later?

Yes. `intent-status` reads the existing `.intent/` artifacts and shows the current position and next move.

## What it protects

- Inferred intent remains inferred until a human confirms it.
- Planning does not modify application code.
- A short “OK” does not silently settle an important decision.
- Implementation learnings return to the plan only within the scope the user approves.
- User-facing documents follow **Precision-first writing**.

## Read next

- [Feature guide](https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md) — detailed features, helper tools, updates, and external integrations
- [10-minute walkthrough](docs/walkthrough.en.md) — first installation through handoff draft
- [Migration guide](docs/migration.en.md) — projects with an older version installed
- [Theory](docs/theory.en.md) — how intent drift is addressed
- [cc-sdd integration](docs/integration.en.md) — handoff to spec-driven development
- [Recover intent from existing code](https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md#recover-intent-from-existing-code)
- [Screen-design probing and draft](https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md#screen-design-probing-and-draft)
- [Experience-design frame suggestions](https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md#experience-design-frame-suggestions)
- [Record post-release outcomes](https://github.com/ijust/intent-planner/blob/main/docs/guide.en.md#record-post-release-outcomes)

The guide also covers existing-code ingestion, screen and service design, **Supplementing a missing specialist perspective**, terminology review, and post-implementation writeback—features you can use only when needed.

## License

MIT
