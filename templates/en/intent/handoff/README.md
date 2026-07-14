# handoff briefs (local-only, disposable)

This directory holds **handoff briefs for switching sessions**. The generator is in transition (externalization GO 2026-07-12; DR157 — once the external tool is installed, it derives briefs here). A brief is a short document, built from the current state of `.intent/` (active packets, plan, assignment declarations, issue directories, recent records), that lets the next session start working.

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

- Generate: the external tool (once installed) owns this. In an environment without it, no skill emits a generation-trigger guidance (graceful degradation).
- Nudge at switch time: the completion report of `/intent-packets` or `/intent-writeback` may, at a work break, add material for deciding "continue or switch over" (guidance, not enforcement).
