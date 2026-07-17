# Intent Planning Workflow

This directory is a lightweight Intent Planning workflow for large refactors and architecture changes.

Intentionally, it is neither a CLI nor a full IDD state machine. It exists so that, before implementation, the human and Claude align on "the overall intent" and "a unified design policy" at good moments, and to prevent Claude from escaping into locally-optimal quick fixes. It complements the step just before cc-sdd creates a spec for an individual feature.

## Purpose

Before implementation, clarify the following.

1. Intent Tree (`intent-tree.md`; the history of completed features — Impact Analysis, shipped L4, etc. — is archived into `intent-tree.history.md`)
2. Intent Compass (`intent-compass.md`; superseded Decision Rules are moved into `compass-archive.md`, and the premortem-derived Anti-directions of completed features into `compass-history.md`)
3. Packet Plan (`packets/` — the packet files under `active/` plus `plan.md` and `index.md`; 1 packet = 1 file, and completed packets move to `archive/`)
4. cc-sdd requirements / design / tasks drafts (per-packet `cc-sdd/<slug>/` directories; local drafts untracked by Git, except the README)

### Experience-design frame suggestions

`.intent/design-frames.md` is the installed catalog for selecting established frames that fit the case. Before adoption it generates nothing. Only after adoption does it create a derived draft at `.intent/nl-spec/design-frame-<frame-id>.md`.

The draft header states that it is inferred, derived, regenerable, and not a source of truth. Generation does not automatically change the Intent Tree, Intent Compass, or packet.

Images or diagrams, analytics measurement, experience stages, numeric priorities, date commitments, and progress percentages are out of scope.

### Screen-design probing and draft

Only for cases that include user-facing screens (UI) and chose deep or "the perspective that designs the screens", `/intent-discover` probes each screen's purpose, information priority, key states, and visual direction in dialogue, and generates a derived draft with inference markers at `.intent/nl-spec/screen-design-brief.md`. The reference to the draft is recorded in the intent-tree's "Screen Rough Reference", and the spec generation and exports carry it through the existing route. Automatic generation of images, finished mockups, a design system, or a brand guide is out of scope.

## Workflow

1. Run `/intent-discover`
2. Review `intent-tree.md` (the mode and the designer-questions delegation are also confirmed)
3. Run `/intent-compass`
4. Review `intent-compass.md`
5. Run `/intent-packets`
6. Review `packets/` (`plan.md` and the packet files under `active/`)
7. Run `/intent-export-cc-sdd`
8. Review the cc-sdd deliverables before proceeding to implementation

## Lifecycle (keep growing the intent)

The workflow above is the "planning" phase. After export, the intent is not disposable; keep growing it through the following cycle.

- Plan: `/intent-discover` → `/intent-compass` → `/intent-packets` → `/intent-export-cc-sdd`
- Implement: implement with cc-sdd
- Maintain: `/intent-writeback` (feed learnings back per packet), and `/intent-improve` at milestones (re-align the whole)
- Anytime: `/intent-status` (where you are and the next move), `/intent-validate` (verification before export)

Learnings from `/intent-writeback` are recorded into `deltas.md` as deltas (the canonical deliverables are never edited directly), and `/intent-status` and `/intent-improve` refer to them.

### When to use which skill

| Skill | Timing | Role |
|--------|-----------|------|
| `/intent-status` | Anytime (when unsure) | Recommend a summary of where you are plus exactly one "next move" (read-only) |
| `/intent-validate` | Before export (recommended) | Report contradictions, coverage gaps, and boundary inconsistencies across deliverables with severity (read-only) |
| `/intent-writeback` | After a packet's implementation is done | Record the learnings gained from the implementation into `deltas.md`, and promote only the approved items into the canonical deliverables |
| `/intent-improve` | At milestones (e.g. after implementing several packets) | Re-align `.intent/` with the implementation reality on the three axes of completeness / correctness / coherence |

For the four planning-phase skills (`/intent-discover`, `/intent-compass`, `/intent-packets`, `/intent-export-cc-sdd`), see "Workflow" above.

## Mode (the Intent-working algorithm)

How to work out the Intent is switchable as a "mode". The selected mode is recorded in `mode.md`, and each command reads it to operate with a consistent strategy. Mode definitions live in `modes/`, and new modes can be added (see `modes/README.md`).

`mode.md` also records the designer-questions delegation (designer-questions: on / off) as an axis orthogonal to the mode. At the entry point, `/intent-discover` explains what the flow can ask on your behalf and confirms whether you want it. When on, the common additional confirmations (L1 measurement criteria, walking skeleton, screen rough) and the normative checks of `/intent-validate` become active, and the development purpose (purpose: poc / product) is also confirmed — when poc, the hypothesis / falsification criteria / GO-NO-GO confirmations are added. When off, the only increment is that single opt-in question.

## Enforcement (writeback-miss checks, optional)

An optional layer that mechanically detects missed `/intent-writeback` runs. **The default is off**, and nothing changes unless you configure it. Switch it by directly editing the "Enforcement (user-managed)" section of `mode.md` (`off` = default, no checks / `remind` = warnings only / `gate` = stops export / push).

Two things are checked.

- **Neglected pending deltas (the main check)** — deltas recorded in `deltas.md` that remain unapproved and unpromoted
- **Staleness (experimental)** — the state where the number of commits changing anything outside `.intent/` since the last writeback (or export) exceeds the threshold (`enforcement-threshold`, default: 5). Unrelated commits are counted too, so false positives remain. Paths can be excluded from the count via `enforcement-exclude`. Starting with `remind` is recommended

The checks take effect in three places: before export in `/intent-export-cc-sdd`, as warnings in `/intent-status`, and in the pre-push hook placed by the installer's `--enforce`. All judgments are made by the read-only script `scripts/intent-check.mjs` (it never creates, modifies, or deletes files). Even when gate stops you, escape hatches remain: an explicit instruction to continue, or `git push --no-verify`. Enforcement only forces the execution of the procedure; it does not guarantee the correctness of what is written back.

### Claude Code SessionStart hook (optional)

If you want writeback-miss warnings injected into the agent's context at session start, manually add the following to `.claude/settings.json` (intent-planner never writes this automatically).

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "node .intent/scripts/intent-check.mjs" }
        ]
      }
    ]
  }
}
```

### Caveats (known limitations)

- In nvm / volta environments, GUI git clients may not have node on their PATH; in that case the pre-push hook check is skipped (a one-line notice is printed to stderr)
- In environments using `core.hooksPath` (husky etc.), `.git/hooks` is never invoked, so the placed pre-push hook has no effect
- In environments where `.git` is a file, such as git worktrees and submodules, hook placement via `--enforce` fails
- To use enforcement in an environment set up with an older scaffold, manually add the Enforcement section to `mode.md` (copy the section from the latest template)

## Drift-watch (drift monitoring, optional)

Another **optional cross-cutting layer** alongside enforcement. As implementation proceeds after the intent is set, the software tends to "stop being the software you intended" (architectural drift); this layer catches that by name before it drifts away completely. It is **not a mode** (a mode is exclusive — only one is active at a time; drift-watch is an independent `off` | `on` switch).

**The default is off**, and nothing changes unless you configure it. Switch it to `on` by directly editing the "Drift-watch (user-managed)" section of `mode.md`.

When on, `/intent-discover` runs a drift-prone-situation pre-check of the Intent Tree, and `/intent-export-cc-sdd` shows compass-matching warnings at the export waterline. **Both are warnings only and never stop you** (a separate concept from enforcement's `gate`; since false positives are assumed, there is no stopping value). Detections are recorded locally in `.intent/drift-log.md` (nothing is ever sent externally; it stays within `.intent/`).

The basis is `.intent/drift-patterns.md` (a catalog of drift patterns). The distributed seed is not exhaustive; the premise is that **you grow it by adding the drifts you actually hit in your own work** as patterns. Aggregation (the improvement report) adds no new command — it rides on the light summary in `/intent-status` and the pattern×outcome cross-tabulation in `/intent-improve`.

## Rules for Agents

### Planning Phase (when running intent-* skills)

- Do not change application code during the Intent Planning phase.
- Do not propose local refactors that do not support a parent intent.
- Each packet must always reference a parent intent.
- Each task must preserve the invariants.
- When intent is unclear, do not edit code; write it into Open Questions.
- Treat inferred intent as provisional until a human reviews it.

### Implementation Phase (Agent Contract — for agents implementing packets)

The single runtime source is `.intent/execution-contract.md`. Read it just in time with the target packet and related Invariant / Decision Rule; keep implementation discretion inside the boundary and wait for a human only when crossing it. In a legacy environment without the contract, continue with the existing packet plus Compass.
