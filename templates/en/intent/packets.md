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
