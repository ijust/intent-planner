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

The criteria when in doubt. Keep each as a lightweight ADR, one decision per entry: **Context** (the question and situation) / **Decision** (the option taken) / **Why** (the criteria) / **Consequences** (connection to Invariants and Anti-direction). When overturning a decision, mark the old entry as superseded.

Examples:
- **Context**: where the aggregation logic lives (inside the UI vs the domain layer) / **Decision**: place it in the domain layer / **Why**: matches the L3 boundary intent (the UI only renders) / **Consequences**: impose the Invariant "do not push domain logic into the UI framework" on all packets
- **Context**: how to carry out a large replacement (bulk replace vs staged migration) / **Decision**: prefer rollbackable slices / **Why**: keeps behavior-preserving observable / **Consequences**: add "large-scale replacement without tests" to the forbidden Anti-direction

## Evidence

The evidence supporting this intent. README, code, tests, logs, user problems, operational problems, etc.

## Open Questions

Questions needed for decisions but still undetermined.
