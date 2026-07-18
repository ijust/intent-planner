# Domain Scope (domain-scoped execution)

The rule for how `intent-validate` reads compass Invariants / Decision Rules / Anti-directions: partially load only those matching the case's domain plus the cross-cutting (`always`) ones. It solves the problem that scanning every symbol makes execution cost scale with the total symbol count (so run frequency loses to scale as the repo grows), by extending the reader-side JIT (INV47 / compass-category-tag-grep-filter) into the verification layer. It stays effective with grep + inline tags only, without a DB or embeddings (DR71 / INV2). federated-governance / INV101 / C-fed2.

This does **not** change the check catalog's (`rules/validate-checks.md`) set of axes, sections, severities, or temperature at all. What changes is only the *range of compass symbols each axis loads for matching*. The read-only, one-way-report, not-a-gate properties are preserved.

## Trigger (opt-in; unspecified means legacy behavior)

Domain scope fires only when a target domain is determined by one of the following. When none is determined, read the full set as before (backward-compatible; O3; INV101 permanent fallback).

- **Explicit user specification**: a domain name passed as argument (e.g. `並行` / `語彙` / `配布`).
- **Inference from case context**: a single domain readable from the inherited issue directory, or from the symbols named by the checked packets' `parent_intents` / Safety. When a domain is fixed by inference, **do not silently confirm it — surface the inferred domain in the report** (present guesses as guesses).

For a legacy scaffold with no determinable domain and no tags (no `.intent/compass/index.md`, no `[領域: ...]` tags), do not fire this rule; fall back to the legacy full read.

## How to read (grep + inline tags; reuse the INV47 pull discipline as-is)

1. Once the target domain is fixed, do not full-load compass; pull **the case's domain tag together with the `always` tag**:
   ```
   grep -nE '\[領域: (<case domain>|always)\]' .intent/intent-compass.md
   ```
   When the split store `.intent/compass/` (INV80) is present, pull the `[領域: <case domain>]` and `[領域: always]` lines from `index.md` and read the `## Law` of the matched symbol files (absent that, keep the legacy body grep above = DR133 permanent fallback). For symbol-existence checks (`dangling-reference`, etc.), keep the discipline that a symbol counts as existing when reachable in either the split store or the legacy body.
2. **Always pull `always` together.** Dropping cross-cutting Invariants that span domains (INV2 / INV9 / A1, etc.) via the domain filter causes drift (Anti-direction 226). Do not change the grep pattern or the tag format (the INV47 shared contract).

## Do not narrow the axes that inherently need a full scan (most important; do not weaken detection)

Axes that look at "things that don't move / don't show in the diff" inherently need a full scan; narrowing them uniformly with domain scope weakens detection. The following axes target **all symbols** even under a domain specification (do not change these axes' reach as defined in `validate-checks.md`):

- `compass-rule-decay` (decayed / dormant rules; the axis whose SKILL body states "inherently needs a full scan").
- `stale-questions` / `stale-assumptions` (lingering unresolved items).
- Cross-cutting matching axes whose population is the whole compass (e.g. `invariant-uninherited`, which depends on the population being all `always` symbols).

What domain scope may narrow is the **per-symbol integrity matching** of the target domain's packets/deliverables against compass symbols (`invariant-conflict` / `anti-direction-violation` / `decision-rule-mismatch`, etc., which match this domain's symbols against this domain's packets). Keep the two layers: "this domain's matching is as effective as the full scan within the domain, and the axes that inherently need a full scan look at all symbols."

## Do not silently skip tag-less symbols

When a symbol in the split store or compass body lacks a domain tag (`[領域: ...]` / the `area:` line in frontmatter), **do not silently skip it**. Whether to include it as `always` on the safe side or to report it as a missing count is an implementation choice, but either way the missing symbol must appear in the report (no detection gap silently arises under the pretext of domain scope). This is the boundary condition fixed by the PBR test-perspective finding (2026-07-15).

## State the loaded target count in the report

When run under domain scope, state **the number of loaded symbols and the total symbol count** right after the verdict summary (e.g. "並行 + always = 41 symbols / of 829 total"). If any axis targeted all symbols (`compass-rule-decay`, etc.), state that too (e.g. "`compass-rule-decay` scanned all symbols = inherent exception"). When reading the full set with no specification, omit it (as before).

## Temperature

Domain scope is an opt-in execution-cost reduction, not a gate (INV49 / INV101; do not stop, do not seize). When no domain is determined, silently fall back to the full set; do not force the user to specify a domain. Stay effective with grep + inline tags only, adding no helper script (DR71 / INV2/A1).
