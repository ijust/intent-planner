# Active Mode

> Updated when `/intent-discover` confirms the mode. This is the only state shared across the intent-* skills.

- **mode**: (undetermined — running `/intent-discover` will recommend and confirm it)
- **selected**: (confirmation date, ISO 8601)
- **reason**: (why this mode was chosen)
- **definition**: (e.g. `.intent/modes/standard.md`)
- **purpose**: (undetermined — poc / product. `/intent-discover` confirms and records it)

## How this file is handled (shared convention across skills)

- `/intent-discover` recommends a mode → the user confirms → the confirmed result is written here.
- `/intent-compass` / `/intent-packets` / `/intent-export-cc-sdd` read this file and operate according to the mode definition in `definition`.
- **When this file is undetermined / absent**: each skill does not stop; it continues with `standard` as the default mode and adds "the mode is undetermined. Confirming the mode via `/intent-discover` is recommended" to the output's Open Questions.
- This is distinct from "guiding to stop when the prior deliverables (tree/compass/packets) are missing". The absence of mode.md alone does not stop.
- **When purpose is unrecorded or the line itself is absent (an older scaffold)**: each skill does not stop; it continues with purpose treated as undetermined and notes it in the output's Open Questions. Only `/intent-discover` writes purpose.
