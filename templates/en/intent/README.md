# Intent Planning Workflow

This directory is a lightweight Intent Planning workflow for large refactors and architecture changes.

Intentionally, it is neither a CLI nor a full IDD state machine. It exists so that, before implementation, the human and Claude align on "the overall intent" and "a unified design policy" at good moments, and to prevent Claude from escaping into locally-optimal quick fixes. It complements the step just before cc-sdd creates a spec for an individual feature.

## Purpose

Before implementation, clarify the following.

1. Intent Tree (`intent-tree.md`)
2. Intent Compass (`intent-compass.md`)
3. Packet Plan (`packets.md`)
4. cc-sdd requirements / design / tasks drafts (`cc-sdd/`)

## Workflow

1. Run `/intent-discover`
2. Review `intent-tree.md` (the mode is also confirmed)
3. Run `/intent-compass`
4. Review `intent-compass.md`
5. Run `/intent-packets`
6. Review `packets.md`
7. Run `/intent-export-cc-sdd`
8. Review the cc-sdd deliverables before proceeding to implementation

## Mode (the Intent-working algorithm)

How to work out the Intent is switchable as a "mode". The selected mode is recorded in `mode.md`, and each command reads it to operate with a consistent strategy. Mode definitions live in `modes/`, and new modes can be added (see `modes/README.md`).

## Rules for Claude

- Do not change application code during the Intent Planning phase.
- Do not propose local refactors that do not support a parent intent.
- Each packet must always reference a parent intent.
- Each task must preserve the invariants.
- When intent is unclear, do not edit code; write it into Open Questions.
- Treat inferred intent as provisional until a human reviews it.
