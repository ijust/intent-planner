# Modes — the extension point for Intent-working algorithms

This directory holds "modes". A mode is a strategy that defines how to work out the Intent (a combination of algorithms). `/intent-discover` recommends a mode based on the repository situation, and the confirmed mode is recorded in `../mode.md`. Subsequent commands read `mode.md` and operate according to the corresponding mode definition.

## 3-layer structure

How to work out the Intent is separated into three layers.

1. **Mode** (`modes/*.md`) — the phase → algorithm combination table (this directory)
2. **Algorithm** (each skill's `rules/algo-*.md` / `rules/map-*.md`) — individual Intent extraction/conversion techniques
3. **Skill** (`.claude/skills/intent-*/SKILL.md`) — the entity that loads a mode and executes

## Bundled modes

- `standard.md` — GORE-lite + QOC + Example Mapping + map-cc-sdd. For new products / un-articulated intent.
- `refactor.md` — GORE-lite + Drift Analysis + Migration Slicing + QOC + map-cc-sdd. For refactoring/redesigning large existing projects.
- `behavior-unknown.md` — GORE-lite + Example Mapping + Characterization Test + QOC + map-cc-sdd. For legacy with unknown behavior.

## Adding a new mode

1. Add one `modes/<your-mode>.md` to this directory. Using `standard.md` as a template, write the combination table of which algorithm each phase (discover/compass/packets/export) uses, and the applicable situations.
2. If the existing algorithms (GORE-lite/QOC/Example Mapping/map-cc-sdd) suffice, you may simply reference them.
3. Only when a new algorithm is needed, add `algo-<name>.md` to the corresponding skill's `rules/` and reference it from the mode definition.
4. Add the conditions for recommending the new mode to `/intent-discover`'s mode-recommendation logic (`intent-discover/rules/mode-selection.md`).

`refactor.md` / `behavior-unknown.md` are already bundled. Use the procedure above when you want to add yet another mode.
