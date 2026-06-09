# Intent Compass

> Updated by `/intent-compass`. Manages the decision criteria for preventing local optimizations.

## North Star

The final state this change wants to approach.

## Current Drift

How and from which intent the current state is drifting.

## Direction

The direction to strengthen in this work.

## Anti-direction

The direction to avoid this time. Also explicitly enumerate here the local optimizations / quick-fix refactors Claude tends to make.

## Invariants

Behavior / API / data / UX / operational constraints that must never be broken.

Distinguish into two layers:

- **Project-universal invariants**: a small set of constraints to uphold across all work regardless of feature. Placing them in `.kiro/steering/` via `/kiro-steering-custom` makes them effective across all work (keep them small to minimize the increase in startup context).
- **Packet-specific invariants**: constraints upheld only within a specific work unit. Baked into cc-sdd's tasks at export time.

## Decision Rules

The criteria when in doubt (question → option taken → why).

Examples:
- Do not push domain logic into the UI framework
- Build only the boundary first, without changing existing behavior
- Prefer rollbackable slices over bulk replacement
- Avoid large-scale replacement without tests

## Evidence

The evidence supporting this intent. README, code, tests, logs, user problems, operational problems, etc.

## Open Questions

Questions needed for decisions but still undetermined.
