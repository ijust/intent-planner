# Export Route (exit decision lane)

A **read-only decision convention** that, after the planning phase (discover→compass→packets), chooses which exit to take based on the case type. There are five exits:

- **cc-sdd implementation export** → `/intent-export-cc-sdd`
- **OpenSpec implementation export** → `/intent-export-openspec`
- **Spec Kit implementation export** → `/intent-export-speckit`
- **readable Spec projection** → `/intent-to-spec`
- **direct implementation (no tool)** → implement directly along the packet's Scope without launching a spec tool (no exit command; recording `format=direct` lets `/intent-writeback` use that record as the primary signal for target identification, INV34)

This convention is the **single source of truth in intent-packets**; the exit suggestion in `/intent-packets` and the preflight in the export skills reference this rule (the rule body is not copied into other skills). The decision is semantic and is not pushed onto a mechanical check script such as `intent-check.mjs` (INV2).

## Inputs (all read-only observation)

The decision takes three inputs. Each is observed with Read / Glob and never creates, modifies, or deletes a file (read-only, INV5):

1. **target format**: the value of the `format` line in `.intent/mode.local.md` (or the legacy `.intent/mode.md`), with range `cc-sdd` / `openspec` / `speckit` / `to-spec` / `direct`.
2. **mode**: the `mode` value in the same file (`non-code` / `standard`-family).
3. **setup status**: whether each of the three downstream spec tools has its **setup marker**. A marker is observed by reading whether a directory exists (Read / Glob); the tool itself is never run or modified (A6, INV1).

| tool | setup marker | exit |
|------|--------------|------|
| cc-sdd | `.kiro/` | `/intent-export-cc-sdd` |
| OpenSpec | `openspec/` at the repo root | `/intent-export-openspec` |
| Spec Kit | `.specify/` at the repo root | `/intent-export-speckit` |

When a marker cannot be read or determined, treat it as "not set up" and do not stop the decision (fail-open).

## Decision (first-match, deterministic)

The same inputs always yield the same result (deterministic). Evaluate top-down and take the first matching row.

### A. When format is explicitly set to a valid value (highest priority)

| `format` | recommended exit |
|----------|------------------|
| `openspec` | `/intent-export-openspec` (**for an OpenSpec case, promote OpenSpec**) |
| `speckit` | `/intent-export-speckit` (**for a Spec Kit case, promote Spec Kit**) |
| `cc-sdd` | `/intent-export-cc-sdd` |
| `to-spec` | `/intent-to-spec` |
| `direct` | **direct implementation** (implement directly along the packet's Scope without launching a spec tool; no exit command. `/intent-writeback` uses this record as the primary signal in §1 target identification) |

When set, deterministically recommend that exit (do not override it based on the setup markers; warning about a missing marker is the job of each export skill's preflight warn — DR25, which does not stop).

### B. When format is unspecified (infer from mode + setup status)

When `format` is "unspecified" (any of: (1) the line is absent, (2) a placeholder value `(undetermined — …)`, (3) a value outside the range — per the read contract in mode.local.md), infer and **present candidates** from mode and the setup status.

#### B-1. non-code mode (a readable artifact is the goal)

Put `/intent-to-spec` at the top of the candidates (DR15). If any of the three implementation exports (cc-sdd / OpenSpec / Spec Kit) **is set up**, also list them afterwards using the ordering in B-2 (a non-code case can still have an implementation tool set up, so do not collapse to one).

#### B-2. standard-family mode (implementation case): order by setup status

List the three implementation exports as candidates in this order. **Set-up tools come first; tools that are not set up come last with a "needs setup" note.**

1. List the **tools that are set up** (marker present) first. **When more than one is set up, do not invent a priority** among them — list them as candidates and let the human choose (no ranking among set-up tools).
2. List the **tools that are not set up** (no marker) afterwards, each annotated as "needs setup" (do **not** drop them from the candidates — never foreclose the path of setting one up later).
3. Attach the **one-line fit note** for each exit (fixed short text, table below) so the human can choose.
4. The exits that need no setup (`/intent-to-spec`, direct implementation) remain selectable regardless of setup status (for an implementation case, list them after the above).

| exit | one-line fit note (fixed) |
|------|---------------------------|
| `/intent-export-cc-sdd` | fits a case you want to carry to implementation through three approval stages: requirements → design → tasks |
| `/intent-export-openspec` | fits a case where you want to raise a change proposal and agree on it before implementing |
| `/intent-export-speckit` | fits a case you want to implement through GitHub Spec Kit's specify → plan → tasks flow |
| `/intent-to-spec` | fits a case whose goal is a readable artifact (document, research note) rather than implementation |
| direct implementation | fits a small-to-medium direct edit that does not warrant standing up a spec tool |

Setup status is **observation and annotation, not a gate**: do not exclude a candidate because it is not set up, do not stop the decision or the export, and do not install anything on the user's behalf.

### C. Fallback

Including any case not above: when format is unspecified and the exit cannot be uniquely determined from the inputs, **do not collapse to a single exit — list candidates** (present rather than assert; the exit depends on the user's intent).

## Discipline

- **Do not hardcode a single exit**: the problem is "collapsing to one exit without looking at the case type or the setup status." Do not swap in another fixed destination (a to-spec-only or openspec-only path). When ambiguous, present candidates.
- **Do not invent a priority among set-up tools**: "set-up tools first" is a distinction by setup **state**, not a ranking **between** tools. When more than one is set up, keep listing candidates and let the human choose.
- **Do not turn "not set up" into a gate**: a missing marker never removes a candidate or stops anything (the same warn-only philosophy as DR25; never foreclose setting the tool up later).
- **read-only**: the decision only observes; it does not mutate state (INV5).
- **Do not push onto a mechanical check**: keep the semantic decision in this rule plus context; do not move it into a script such as `intent-check.mjs` (INV2). Do not build a tool registry, a setup-detection script, or an engine that auto-diagnoses case fit (the fixed one-line fit notes in the table above are enough).
- **Do not depend on asking the user back**: settle the exit suggestion via this rule's convention and defaults; do not assume interactive follow-up.
- **Do not touch external tools**: reading whether the setup markers (`.kiro/` / `openspec/` / `.specify/`) exist is observation, not a change to kiro / cc-sdd / OpenSpec / Spec Kit (INV1).
