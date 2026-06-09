# Modes — the extension point for Intent-working algorithms

This directory holds "modes". A mode is a strategy that defines how to work out the Intent (a combination of algorithms). `/intent-discover` recommends a mode based on the repository situation, and the confirmed mode is recorded in `../mode.md`. Subsequent commands read `mode.md` and operate according to the corresponding mode definition.

## 3-layer structure

How to work out the Intent is separated into three layers.

1. **Mode** (`modes/*.md`) — the phase → algorithm combination table (this directory)
2. **Algorithm** (each skill's `rules/algo-*.md` / `rules/map-*.md`) — individual Intent extraction/conversion techniques
3. **Skill** (`.claude/skills/intent-*/SKILL.md`) — the entity that loads a mode and executes

## Bundled modes

- `standard.md` — GORE-lite + QOC + Example Mapping + map-cc-sdd. For the overall design of new products or feature sets whose intent has not been articulated.

## Adding a new mode

1. Add one `modes/<your-mode>.md` to this directory. Using `standard.md` as a template, write the combination table of which algorithm each phase (discover/compass/packets/export) uses, and the applicable situations.
2. If the existing algorithms (GORE-lite/QOC/Example Mapping/map-cc-sdd) suffice, you may simply reference them.
3. Only when a new algorithm is needed, add `algo-<name>.md` to the corresponding skill's `rules/` and reference it from the mode definition.
4. Add the conditions for recommending the new mode to `/intent-discover`'s mode-recommendation logic (`intent-discover/rules/mode-selection.md`).

Examples (an image of future extensions):
- `refactor.md` — GORE-lite + Drift Analysis + Migration Slicing (for redesigning an existing app)
- `behavior-unknown.md` — Example Mapping + Characterization Test (for legacy with unknown behavior)

These are templates and are not bundled in this package. Add them as needed.
