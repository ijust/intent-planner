# Export Route (exit decision lane)

A **read-only decision convention** that, after the planning phase (discover→compass→packets), chooses which exit to take based on the case type. There are three exits:

- **cc-sdd implementation export** → `/intent-export-cc-sdd`
- **OpenSpec implementation export** → `/intent-export-openspec`
- **readable Spec projection** → `/intent-to-spec`

This convention is the **single source of truth in intent-packets**; the exit suggestion in `/intent-packets` and the preflight in the export skills reference this rule (the rule body is not copied into other skills). The decision is semantic and is not pushed onto a mechanical check script such as `intent-check.mjs` (INV2).

## Inputs (all read-only observation)

The decision takes three inputs. Each is observed with Read / Glob and never creates, modifies, or deletes a file (read-only, INV5):

1. **target format**: the value of the `format` line in `.intent/mode.local.md` (or the legacy `.intent/mode.md`), with range `cc-sdd` / `openspec` / `to-spec`.
2. **mode**: the `mode` value in the same file (`non-code` / `standard`-family).
3. **prerequisite**: whether the `.kiro/` directory exists (a hint for whether cc-sdd is set up).

## Decision (first-match, deterministic)

The same inputs always yield the same result (deterministic). Evaluate top-down and take the first matching row.

### A. When format is explicitly set to a valid value (highest priority)

| `format` | recommended exit |
|----------|------------------|
| `openspec` | `/intent-export-openspec` (**for an OpenSpec case, promote OpenSpec**) |
| `cc-sdd` | `/intent-export-cc-sdd` |
| `to-spec` | `/intent-to-spec` |

When set, deterministically recommend that exit.

### B. When format is unspecified (infer from mode + prerequisite)

When `format` is "unspecified" (any of: (1) the line is absent, (2) a placeholder value `(undetermined — …)`, (3) a value outside the range — per the read contract in mode.local.md), infer and **present candidates** from mode and the presence of `.kiro/`. Cover all four quadrants as follows:

| mode | `.kiro/` | result |
|------|----------|--------|
| non-code | absent | `/intent-to-spec` as the top candidate (a readable artifact is the goal, DR15) |
| standard-family | present | `/intent-export-cc-sdd` as the top candidate (implementation case, cc-sdd already set up) |
| non-code | present | **list candidates** (`/intent-to-spec` on top, but also list `/intent-export-cc-sdd`; a non-code case can still have cc-sdd set up, so do not collapse to one) |
| standard-family | absent | **list candidates** (`/intent-export-cc-sdd` [needs setup], `/intent-to-spec`, `/intent-export-openspec`; not uniquely determined) |

### C. Fallback

Including any case not above: when format is unspecified and the exit cannot be uniquely determined from the inputs, **do not collapse to a single exit — list candidates** (present rather than assert; the exit depends on the user's intent).

## Discipline

- **Do not hardcode a single exit**: the problem is "collapsing to one exit without looking at the case type." Do not swap in another fixed destination (a to-spec-only or openspec-only path). When ambiguous, present candidates.
- **read-only**: the decision only observes; it does not mutate state (INV5).
- **Do not push onto a mechanical check**: keep the semantic decision in this rule plus context; do not move it into a script such as `intent-check.mjs` (INV2).
- **Do not depend on asking the user back**: settle the exit suggestion via this rule's convention and defaults; do not assume interactive follow-up.
- **Do not touch external tools**: reading whether `.kiro/` exists is observation, not a change to kiro / cc-sdd / OpenSpec (INV1).
