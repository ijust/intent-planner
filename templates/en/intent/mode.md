# Shared Policy

> This file holds **team-shared (git-tracked)** policies: `Enforcement` (writeback enforcement) and `Drift-watch` (drift monitoring).
> **How the work is framed (`mode` / `designer-questions` / `purpose`) lives in `mode.local.md` (local-only, git-ignored).** They are separated to avoid collisions across a team or parallel sessions.
> **Backward compatibility**: legacy scaffolds kept mode state in this file too. Readers read `mode.local.md` first and fall back to this file's mode-state lines (if present).

## Enforcement (user-managed)

> Only the user edits this section. Skills, including `/intent-discover`, never modify it (read-only).

- **enforcement**: off
- **enforcement-threshold**: 5
- **enforcement-exclude**: 

- **enforcement** — strength of writeback enforcement. One of `off` | `remind` | `gate`:
  - `off` (default): no checks. Same behavior as before.
  - `remind`: warns only when a writeback gap is detected. Does not stop.
  - `gate`: stops export / push when a writeback gap is detected (explicit continue or `--no-verify` escape hatches remain).
- **enforcement-threshold** — the commit count at which a writeback gap is judged stale. A positive integer (default: 5).
- **enforcement-exclude** — path prefixes excluded from the staleness count (comma-separated relative path prefixes; may be left empty). `.intent/` is always implicitly excluded.
- Toggle by editing this file directly. Unspecified / invalid values are treated as off / 5 / no exclusions and do not stop.

## Drift-watch (user-managed)

> Only the user edits this section. Skills, including `/intent-discover`, never modify it (read-only).

- **drift-watch**: off

- **drift-watch** — strength of drift monitoring. One of `off` | `on`:
  - `off` (default): does nothing. Same behavior as before.
  - `on`: drift-prone-situation pre-check at discover, compass-conformance warnings at the export boundary, and logs detections to drift-log.md. **All warning-only; never stops** (distinct from enforcement's gate; assumed to have false positives, so it does not stop).
- Toggle by editing this file directly. Only the two values off|on; there is no stopping (gate-equivalent) value. Unspecified / invalid values are treated as off and do not stop.

## Oversize-guard (user managed)

> Only the user edits this section. Skills and implementation sessions read it and never modify it.

- **oversize-guard**: warn
- **oversize-guard** — strength of the declaration-implementation gap check (mid-flight detection of overbuilding and thinness). Values are `off` | `warn` | `gate`:
  - `off` — no check.
  - `warn` (default) — warn once on a suspected sign and never stop the implementation.
  - `gate` — in addition to the warning, stop only the affected work unit's implementation until the user responds.
- Absent or invalid values are treated as warn. Without an "## Expected size" declaration in the target work unit, nothing happens regardless of the value.
