# handoff briefs (local-only, disposable)

This directory is the **official derived output location for handoff documents used when switching sessions**. The external `handoff-bridge` owns generation and writes only to a complete, unused destination explicitly supplied by the user. A handoff is a short document that helps the next session consult canonical sources and take its first action.

```
.intent/handoff/
  README.md            ← this file (tracked, explanatory)
  <generated brief>.md ← a handoff brief (git-untracked, disposable)
```

## Why git-untracked

The core value of a brief is **the local situation at that moment** — uncommitted changes, cautions about other sessions running in parallel, the information the person switching over needs right now. Tracking these in git would leave quickly-stale information in the team's shared assets. So the brief bodies stay in this directory but **git-untracked** (the installer appends to `.gitignore`), and only the README is tracked.

## The nature of a brief (assumptions when reading)

- **It is derived, not canonical.** The generation time is noted at the top. When resuming work, do not treat the brief as self-sufficient — always pull the canonical sources (the relevant packet, the related symbols in compass, the plan). **When they disagree, the canonical source always wins.**
- **It is disposable.** If lost, it can be regenerated from the state of `.intent/`. Delete it when stale.
- **Sensitive content is not written raw.** Details are shown as references (pull pointers) to the canonical sources.

## How to use it

- Generate: when a compatibility-verified `handoff-bridge` skill is available, invoke it explicitly and provide a complete, unused destination under `.intent/handoff/<name>.md`. When it is not installed, incompatible, or verification fails, no skill emits generation guidance.
- Receive: inspect `source` and `read_for`, read the canonical locator, and reconcile it with `authority` and `provenance`. If the source is unavailable, state that receiving condition without treating the generated handoff as a producer failure.
- Nudge at switch time: the completion report of `/intent-packets` or `/intent-writeback` may, at a work break, add material for deciding "continue or switch over" (guidance, not enforcement).
