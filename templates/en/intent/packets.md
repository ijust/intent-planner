# Packet Plan

> Updated by `/intent-packets`. Manages the work units before handing off to cc-sdd. Each packet must have a parent intent and be behavior-preserving / testable / rollbackable.

## Packet: <packet-name>

### Parent Intent

The L0 / L1 / L2 / L3 this packet supports.

### Why

Why this packet is needed.

### Scope

What is included.

### Non-scope

What is not included.

### Expected Behavior

The behavior observable after completion.

### Safety / Invariants

The constraints to uphold.

### Validation

How to verify. Tests, manual check, log check, type checking, etc.

### Rollback

How to revert on failure.

### cc-sdd Mapping

How to convert this packet into cc-sdd's requirements / design / tasks.

## Walking Skeleton (fill in when designer-questions: on)

> Updated by `/intent-packets` when designer-questions=on.

- **Top-priority packet**: (packet name)
- **E2E verdict**: (spans end-to-end / does not span)
- **Confirmation result**: (what the user confirmed. If walking-skeleton conversion is deferred, also record the reason under Deferred)

## Recommended First Packet

> Updated by `/intent-packets`. Records exactly one packet to start with, together with qualitative reasons.

- **Recommended packet**: (packet name)
- **Reasons**: (qualitative criteria: risk reduction / unblocking dependencies / ease of rollback / size of learning / (when poc) cheapness of refuting the hypothesis)
- **Alignment with Walking Skeleton**: (aligned / if not aligned, the reason / Walking Skeleton not recorded)

## Deferred

Rules / examples intentionally excluded from the current packets, and drifts explicitly deferred with a reason. Record them rather than silently dropping them; they become seeds of follow-up packets or Open Questions.
