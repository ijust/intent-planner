# Intent Planning Workflow

This directory is a lightweight Intent Planning workflow for large refactors and architecture changes.

Intentionally, it is neither a CLI nor a full IDD state machine. It exists so that, before implementation, the human and Claude align on "the overall intent" and "a unified design policy" at good moments, and to prevent Claude from escaping into locally-optimal quick fixes. It complements the step just before cc-sdd creates a spec for an individual feature.

## Purpose

Before implementation, clarify the following.

1. Intent Tree (`intent-tree.md`)
2. Intent Compass (`intent-compass.md`)
3. Packet Plan (`packets.md`)
4. cc-sdd requirements / design / tasks drafts (per-packet `cc-sdd/<slug>/` directories; local drafts untracked by Git, except the README)

## Workflow

1. Run `/intent-discover`
2. Review `intent-tree.md` (the mode and the designer-questions delegation are also confirmed)
3. Run `/intent-compass`
4. Review `intent-compass.md`
5. Run `/intent-packets`
6. Review `packets.md`
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

## Rules for Agents

### Planning Phase (when running intent-* skills)

- Do not change application code during the Intent Planning phase.
- Do not propose local refactors that do not support a parent intent.
- Each packet must always reference a parent intent.
- Each task must preserve the invariants.
- When intent is unclear, do not edit code; write it into Open Questions.
- Treat inferred intent as provisional until a human reviews it.

### Implementation Phase (Agent Contract — for agents implementing packets)

1. Treat Invariants as hard constraints.
2. Treat Decision Rules as effective unless explicitly marked superseded.
3. Do not produce an implementation that falls under an Anti-direction.
4. When a packet contradicts the Compass, stop implementing and confirm with the human.
5. When the code reality contradicts the intent, record it as a delta (`/intent-writeback`); do not silently rewrite the intent.
