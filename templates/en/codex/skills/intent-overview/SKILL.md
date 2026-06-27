---
name: intent-overview
description: Read-only aggregation skill that reads the scattered .intent/ artifacts and generates a formatted read-through/overview view under .intent/overview/ as a derived view. Never modifies any canonical artifact.
---

# intent-overview Skill

## Core Mission
- **Success Criteria**:
  - Reads the existing scattered `.intent/` artifacts (intent-tree / intent-compass / packets index & active / packets/plan / export-log / deltas / mode / drift-log) read-only, and generates a formatted overview view that humans and agents can read through at once at `.intent/overview/overview.md` (R1.1)
  - Treats the output as a derived view and never creates, modifies, or deletes any canonical `.intent/*.md` artifact. Writes are limited to under `.intent/overview/` (R1.2)
  - On re-run, regenerates the overview from the latest artifacts by full replacement, producing no duplication of the source of truth (idempotent regeneration. R1.3)
  - When `.intent/` or a required artifact (e.g. intent-tree) is absent, writes nothing, states the absence explicitly, and guides the user to the skill to run first (e.g. `/intent-discover`) (R1.4)
  - Makes clear that the output is derived / regenerable / not the source of truth (and Git-untracked) (the reader's concern takes priority, so this may be relegated to the end of the view. R1.5)
  - Organizes the whole picture into concern-separated derived views (intent view / dependency-block view / progress view), reflecting progress not as a single percentage but along axes of differing nature
  - Lays out all packets as a single progress rail at the top of the view, annotates each row with the five signals + `[current stage → next stage(s) to pass through]`, so that "which packet is 🔵 you are here now, which stages each will pass through next, and where the ⚪ remaining work / 🔴 unreflected items are" is visible at a glance (only mirroring the five signals and `state` read-only, without computing or inferring state)
  - Aggregates while keeping canonical intent distinct from inferred intent, and design intent distinct from implementation reality; marks gaps and unobserved areas as "unfilled / unobserved" and never fills them in by guessing
  - Does not call other skills directly; coordinates only via read-only access to scaffold files (`.intent/*.md`) and guidance in the output text (R6.5). Has no state machine / autonomous loop / resident process, and maintains zero external dependencies (R6.1 / R6.2)

## Execution Steps

### Step 1: Confirm `.intent/` and required artifacts exist (fail-fast)
- When the user requests generation of an overview view, first confirm that the `.intent/` directory exists.
- If `.intent/` or a required artifact (at minimum `.intent/intent-tree.md`) is absent, **write nothing**, state the absence explicitly, guide the user to the skill to run first (e.g. `/intent-discover`), and stop (fail-fast. R1.4). Do not create or update `.intent/overview/overview.md` at this point.
- Read `.intent/mode.md` (do not stop if absent; the enforcement / drift-watch values are referenced in later steps. Read-only — never modify it).

### Step 2: Read sources and aggregate by delegating to the four rules
- This skill has no analysis / recovery / inspection logic of its own. The exact reading rules for each concern are delegated to the following four rules (referenced by relative path). Follow the exact headings, keys, and column names each rule specifies; keep canonical and inferred distinct; and state gaps and unobserved areas (never fill in by guessing).
- `rules/aggregate-sources.md` — intent-document aggregation (intent-tree L0–L4 / intent-compass North Star, Anti-direction, Invariants, Decision Rules / packets index & active / plan / export-log / deltas). Separate canonical intent from inferred intent (derived from intent-tree's Assumptions / Open Questions). Code recovery is read-only from the refactor-mode `algo-intent-recovery` output; do no AST / scanner recovery of your own. If recovery output is absent, state the absence and guide the user to that algo (R2.x / R4.x).
- `rules/mermaid-tree.md` — render intent-tree's L0→L4 as a pure Mermaid `graph`, with the corresponding text hierarchy alongside it as the source of truth. If intent-tree is empty/ungenerated, omit the Mermaid figure and state why (R3.x).
- `rules/gap-readout.md` — read the drift-log and intent-validate inspection axes **without reimplementing** them, and aggregate them as the "design intent vs implementation reality" gap. Aggregate drift only when `mode.md`'s `## Drift-watch` section is `on` and `drift-log.md` exists; when `off` / unspecified / absent, omit that block and state it as unobserved. Map validate axes to the stable kebab-case ID catalog in `validate-checks.md`. The `## Enforcement` / `## Drift-watch` sections are read-only — never modified (R5.x).
- `rules/progress-readout.md` — split progress not into a single percentage but into 3 axes (intent stability / realization completeness / evidence certainty), deriving each axis from reading existing artifacts and stating its provenance. Present axis-to-axis divergences as-is without collapsing them. Read packet frontmatter `depends_on` to derive block state read-only (dependencies are only read from declarations, never inferred or computed), and surface cycles / unresolved dependencies. Organize into concern-separated derived views (intent / dependency-block / progress). Omit any axis or view whose source artifact is absent, stating "unobserved / ungenerated" (R8.x / R9.x).
- Branching policy: branch on whether inferred intent is present and on drift-watch on/off; when absent, omit the relevant block and state its status (never fill in by guessing). For backward compatibility, read an existing packet without `depends_on` as "no dependencies", without `## Evidence` as "unfilled", and the old 3-value state (`draft|active|done`)'s `active` as "in progress (equivalent to implementing)" (follow the rules' specifications).

### Step 3: Write the overview view last (full replacement, derived)
- Only after all reading and aggregation are complete, **last** write `.intent/overview/overview.md` by **full replacement** (idempotent regeneration. R1.3). Never write to any canonical `.intent/*.md`.
- The composition order of the content follows "Output Description" (the progress rail = the conclusion at the top, then the concern-separated views, **with the derived / not-the-source-of-truth notice at the END**). Prioritize the human reader's "where am I now / what happens next," and do not fill the start of the view with the derived notice.
- That this view is derived, regenerable, not the source of truth, and Git-untracked is made explicit in the end-of-view notice (R1.2 / R1.3 / R1.5). That each derived view is derived and regenerable (not the source of truth) is likewise shown in each view's notice (R9.5).

## Output Description

> **The output target is the terminal.** Use no raw HTML (`<details>` / `<summary>`, etc., collapsible UI) in the output; separate details with plain Markdown headings instead (in a terminal the raw tags are shown literally and become unreadable). Internal notations such as `[[...]]` (wikilinks for memory / delta) are legitimate in records written to delta / memory files, but in human-facing terminal output do not emit them raw — open them into ordinary words (spell the linked name out in plain prose).

**Reader**: a human developer who wants to read through the whole of `.intent/` (and the AI that reads it downstream).
**What this output makes them grasp first**: "of all packets, which one is 🔵 you are here now, which stages each will pass through next, and where the 🔴 unreflected / ⚪ remaining work are." Tool-internal notices such as derived / not-the-source-of-truth are not the reader's concern, so **relegate them to the END**.

Compose the head of the view in the following order (the order that gets a human to "where am I / what happens next" by the shortest path).

1. **Progress rail (top, conclusion)**: lay out all packets vertically and annotate each row with the five signals (✅ reflected / 🔵 you are here / ⚪ not started / 🔴 unreflected / ◻ merged), followed by `[current stage → next stage(s) to pass through]` (per `progress-readout.md` "Annotate each row with `[current stage → next stage(s) to pass through]`"). This makes "which P is you-are-here now and which stages remain after this" and "where the unreflected / remaining work are" visible at a glance on a single sheet.
2. **Concern-separated derived views** (the rail's breakdown):
   - **Intent view**: the Mermaid figure of intent-tree (L0–L4) + the text hierarchy, intent-compass, and the packet list (with plan / export-log / deltas alongside as context). Canonical and inferred kept distinct.
   - **Dependency-block view**: dependency relations based on packets' `depends_on` and the resulting block state (with cycles / unresolved dependencies surfaced if any).
   - **Progress view**: the 3 axes (intent stability / realization completeness / evidence certainty) with each axis's provenance, axis-to-axis divergences, and the design-intent vs implementation-reality gap aggregation (since the progress rail is brought to the top in 1., concentrate here on the breakdown of the 3 axes).
3. **End-of-view notice**: that this view as a whole and each view is derived / regenerable / Git-untracked and not the source of truth (R1.2 / R1.3 / R1.5 / R9.5). Any view or axis without source material is omitted, with the reason (unobserved / ungenerated) stated.

## Safety & Fallback
- **Write boundary**: writes are limited to under `.intent/overview/`. The canonical `.intent/*.md` is read-only — never created, modified, or deleted there (the `Write` in the frontmatter is permitted solely for writing under `.intent/overview/`).
- **Does not call other skills directly**: coordination happens only via read-only access to scaffold files (`.intent/*.md`) and guidance in the output text (R6.5). It holds no decision logic for recovery (`algo-intent-recovery`) / inspection (intent-validate) / drift (drift-watch); it only reads the outputs and definitions they leave behind.
- **Has no state machine / autonomous loop / resident process** (R6.1). The output view itself serves as a snapshot at read time.
- **Zero external dependencies** (INV2 / R6.2). Introduces no external package; limited to Node standard and natural-language heuristics.
- **Does not modify application code** (INV6 / R6.3).
- **When prerequisites are absent**: when `.intent/` or a required artifact is missing, write nothing, state the absence, guide the user to the skill to run first (e.g. `/intent-discover`), and stop (R1.4).
- **On partial gaps**: when inferred intent is unfetched / drift-watch is off / intent-tree is empty, omit the relevant block and state "unfetched / unobserved / ungenerated" (never fill in by guessing). When Mermaid cannot be generated, present the text hierarchy as the source of truth, omit the figure, and note the reason.
