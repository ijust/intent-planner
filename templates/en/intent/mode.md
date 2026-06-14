# Active Mode

> Updated when `/intent-discover` confirms the mode. This is the only state shared across the intent-* skills.

- **mode**: (undetermined — running `/intent-discover` will recommend and confirm it)
- **selected**: (confirmation date, ISO 8601)
- **reason**: (why this mode was chosen)
- **definition**: (e.g. `.intent/modes/standard.md`)
- **designer-questions**: (undetermined — on / off. Delegates the designer-role questions. `/intent-discover` explains, confirms, and records it)
- **purpose**: (undetermined — poc / product. When designer-questions is on, `/intent-discover` confirms and records it)

## How this file is handled (shared convention across skills)

- `/intent-discover` recommends a mode → the user confirms → the confirmed result is written here.
- `/intent-compass` / `/intent-packets` / `/intent-export-cc-sdd` read this file and operate according to the mode definition in `definition`.
- **When this file is undetermined / absent**: each skill does not stop; it continues with `standard` as the default mode and adds "the mode is undetermined. Confirming the mode via `/intent-discover` is recommended" to the output's Open Questions.
- This is distinct from "guiding to stop when the prior deliverables (tree/compass/packets) are missing". The absence of mode.md alone does not stop.
- **When designer-questions / purpose is unrecorded or the line itself is absent (an older scaffold)**: each skill does not stop; it continues with them treated as undetermined and notes it in the output's Open Questions. Readers always evaluate designer-questions first (the value of purpose is not consulted unless designer-questions is recorded as on). Only `/intent-discover` writes designer-questions / purpose.

## Enforcement (user-managed)

> Only the user edits this section. Skills, including `/intent-discover`, never modify it (read-only).

- **enforcement**: off
- **enforcement-threshold**: 5
- **enforcement-exclude**: 

- **enforcement** — strength of the writeback enforcement. Three values: `off` | `remind` | `gate`:
  - `off` (default): no checks are performed. Behavior stays as before.
  - `remind`: when a missed writeback is detected, only a warning is shown. Nothing stops.
  - `gate`: when a missed writeback is detected, export / push stops (escape hatches remain: an explicit instruction to continue, or `--no-verify`).
- **enforcement-threshold** — the commit-count threshold for judging staleness (a missed writeback). Positive integer (default: 5).
- **enforcement-exclude** — paths excluded from the staleness count (comma-separated relative path prefixes; may be left empty). `.intent/` is always implicitly excluded.
- Switch values by editing this file directly. When unspecified or invalid, values are treated as off / 5 / no excludes, and nothing stops.

## Drift-watch (user-managed)

> Only the user edits this section. Skills, including `/intent-discover`, never modify it (read-only).

- **drift-watch**: off

- **drift-watch** — strength of drift monitoring. Two values: `off` | `on`:
  - `off` (default): does nothing. Behavior stays as before.
  - `on`: runs terrain diagnosis in discover, shows compass-matching warnings at the export waterline, and records detections in drift-log.md. **Both are warnings only and never stop** (a separate concept from enforcement's gate; nothing stops because false positives are assumed).
- Switch values by editing this file directly. Only the two values off|on exist; there is no stopping (gate-equivalent) value. When unspecified or invalid, the value is treated as off, and nothing stops.
