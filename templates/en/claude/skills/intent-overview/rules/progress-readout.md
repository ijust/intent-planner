# Multi-axis progress readout and concern-separated views

The canonical source the `intent-overview` skill uses to mirror packet progress on three axes instead of a single %, to derive block state read-only from `depends_on`, and to organize concern-separated derived views. This rule is **read-only**: it does **not compute, score, or infer** progress axes or dependencies. The canonical source of progress, dependency, and evidence is the packet (frontmatter + `## Evidence` section) that `intent-planner-packet-progress` maintains, and overview only **mirrors** it. Checks that require computation (dependency health, validate axes) are the responsibility of intent-validate / drift-watch / algo-intent-recovery; this rule only **reads their results**.

## Core principle (read-only mirror)

- The packet canonical source (the 10-key frontmatter of `active/*.md` + the body `## Evidence` section) is the **single source of truth** for progress, dependency, and evidence. Overview only regenerates derived views from it; it does not modify the canonical source and does not duplicate it.
- Do **not compress progress into a single overall %**. Present it split across three axes of differing natures.
- For each axis and each view, state the source explicitly ("which part of which existing artifact was read"). Show that it is based on reading files, not on AI self-report.
- For any axis or view with no corresponding artifact, state "not observed / not filled in / no dependencies" explicitly and **never fill the gap by guessing**.

## Read status in three separate parts

- **Process health**: read packet frontmatter, the progress rail, dependencies, and dangerous notices.
- **Unresolved design decisions**: read only explicit Open Questions or decision candidates. Show "none" when there are none and "unobserved" when evidence is insufficient.
- **User outcomes**: read only explicit evidence that directly describes a user outcome. Evidence of implementation or test completion alone is not outcome evidence; show "unobserved" instead.

These are independent observations. Healthy Process health does not imply successful User outcomes. Never merge them into an **overall PASS**, overall score, or "everything is healthy."

## Progress rail (read-only mirror)

**Before** the three progress axes (the qualitative breakdown), lay out all packets as a single vertical rail so the reader can see at a glance "which stage each packet is in." The rail is not an overall indicator that compresses the three axes; it is the **bird's-eye view that sits in front of** the three axes (grasp the overall position from the rail, then read each packet's breakdown via the three axes — a complementary relationship). The rail is also a read-only mirror: it does **not compute, infer, or score** state. It reads existing artifacts (packet frontmatter `state` / `superseded_by`, `export-log.md`, `deltas.md`) and only **mechanically determines and mirrors** which of the five signals below applies.

### The five signals and their determination (all mechanically observable from `.intent/`)

Cross-check each packet by `state` × whether export-log has a row × whether deltas has a corresponding entry, and assign exactly one signal — **evaluating top-down and taking the first that matches** (first-match).

| Signal | Meaning | Determination | Source |
|--------|---------|---------------|--------|
| ◻ merged | merged into a successor packet and done with its role | `superseded_by` is non-empty | packet frontmatter |
| ✅ reflected | implementation complete and written back into intent | `state: done` **and** deltas has a promoted/closed entry for this packet | packet + deltas.md |
| 🔵 you are here | the one stage currently being worked on (exported, not yet reflected) | of the rows with an export-log row and no corresponding deltas entry, the one that **matches the current Source Packet (the latest export-log row)** | latest export-log row + deltas.md |
| 🔴 unreflected | evidence of implementation exists but not yet reflected into intent (a leftover) | of the rows with an export-log row and no corresponding deltas entry, those other than the current Source Packet | export-log + deltas.md |
| ⚪ not started | not yet exported to cc-sdd | export-log has no row for this packet (active but not exported) | export-log + packets/active |

- **Both 🔵 and 🔴 are "exported, not yet reflected."** The only difference is whether it is "the one currently being worked on (latest row = 🔵)" or "a leftover from the past (anything else = 🔴)". This visually separates the one stage in progress from the N items buried by writeback omission. 🔴 does not add a new separate warning block; it **surfaces as a mismatch on the rail (implementation advanced but reflection lags)**. This is a concretization of "Present axis mismatches as-is" below, not the addition of a new check.

### Annotate each row with `[current stage → next stage(s) to pass through]` (pipeline projection)

The five signals mirror the **reflection progress** (whether it has been exported / whether it has been written back), but that alone does not let the reader see "**which stage of intent-building → implementation → writeback this packet is currently in, and which stages remain after this**". So, following the signal, **annotate each packet row with `[current stage → next stage(s) to pass through]`**. This is not a new observation or computation; it merely **re-reads** the packet frontmatter `state` (the declared value already read on axis 2 of "the three progress axes") **as a position on the fixed pipeline below, and mirrors it** (preserving the read-only mirror discipline of no inference / no scoring).

- **Fixed pipeline (the forward order of stages)**: `discover → compass → packets → export → implement (cc-sdd) → verify → writeback`. This is the same ordering as intent-planner's standard flow (the command order in footnote 5 of status's decision table `decision-table.md`), and is taken as the reference for stage ordering. Read the correspondence between each command stage and packet `state` as follows.
  - `state: draft` = being drafted → **next stages: compass → packets** (the stage that works out the intent and decision criteria)
  - `state: ready` = ready to start (dependencies resolved, awaiting implementation) → **next stages: export → implement**
  - `state: implementing` = under implementation → **next stages: verify → writeback**
  - `state: verifying` = implemented, awaiting verification (Evidence not yet confirmed) → **next stage: writeback** (after Evidence is confirmed)
  - `state: done` = complete → **next stage: none (this lane is complete)**
- **Write the "current stage" as a composite of the five signals and `state`.** Examples: when the signal is 🔵 you are here with `state: implementing`, write `🔵 you are here [implementing → next: verify→writeback]`; ⚪ not started with `state: ready`, write `⚪ not started [ready → next: export→implement]`; ⚪ not started with `state: draft`, write `⚪ not started [draft → next: compass→packets]`. This makes "which P is being worked on, and which stages remain after this" readable on one line.
- **The next stage is a projection from the pipeline definition, not an inference.** It merely **maps `state` onto the next fixed stage and mirrors it**; it does not predict duration, difficulty, or success/failure. For a packet blocked because `depends_on` has an undone dependency, annotate `(blocked, waiting on <packet_id>)` before the next-stage note (block determination follows the read-only derivation of the "Dependency-block view"; do not infer or compute).
- **Backward compatibility**: read the legacy 3-value `state: active` as equivalent to `implementing`, i.e. `[active(=implementing) → next: verify→writeback]`. For a packet whose `state` itself cannot be observed, do not assert the stage annotation; state `[stage: not observed]` explicitly (do not fill by guessing).
- **Do not invent a new matching rule for the deltas correspondence.** Reuse the existing canonical discipline ("current Source Packet = latest export-log row," "text matching by packet name," "the mechanical determination of whether a corresponding delta exists is valid only for the first cycle") from aggregate-sources / the deltas.md operating notes as-is. For the second cycle onward (after re-export / re-implementation), do not determine reflection need mechanically; state "user judgment" explicitly.
- **Bird's-eye view of remaining work**: the ⚪ rows directly represent "the remaining work to start next," and each row's `[current stage → next stage(s) to pass through]` annotation makes "which stages that packet will pass through next" visible at a glance as well. The rail's purpose is to show remaining work and unreflected items at a glance on a single sheet; a packet blocked by a dependency may be annotated on its rail row following the "Dependency-block view" derivation below (do not infer or compute dependencies).
- **Backward compatibility**: treat legacy 3-value `state: active` as "in progress" and determine 🔵/🔴/⚪ by whether export-log has a row. Absent `superseded_by` = "not merged." Absent deltas = "not reflected." For a packet where `state` itself cannot be observed, do not assert a signal; state "not observed" (do not fill by guessing).
- **Declare derived**: the rail is also derived / regenerable and is not the source of truth. The source of truth is the packet frontmatter, export-log, and deltas; the rail is a snapshot at read time.

## The three progress axes (not a single %)

Present progress split across the following three axes. Each axis is **derived** from reading existing artifacts (not computed, not scored). Always annotate each axis with its source (where in which artifact it was derived from).

### Axis 1: Intent stability

An axis that qualitatively mirrors "how settled the upstream intent is".

- **Source**: `intent-tree.md` (unfilled spots in L0–L4, `## Open Questions`, `## Assumptions`), `intent-compass.md` (unfilled North Star / Anti-direction / Invariants / Decision Rules).
- **How to read**: Show, **qualitatively**, the unfilled L levels and empty headings, the count of remaining items under `## Open Questions`, and the ratio of `## Assumptions` (inferred = derived by inference) to the canonical settled descriptions. Do not turn the ratio into a strict numeric score (read-only mirror discipline; no quantitative scoring).
- Keep inferred (originating from `## Assumptions` / `## Open Questions`) and canonical (the settled descriptions in L0–L4) **unmixed**, preserving the distinction even in the stability assessment.
- If the source material (tree/compass) is absent, state "not observed" explicitly.

### Axis 2: Realization completeness

An axis that mirrors "how far it has been built (the current position of development)".

- **Source**: the `state` in packet frontmatter.
- **Value set (5 values)**: `draft | ready | implementing | verifying | done`. The values are mutually exclusive; a packet takes exactly one stage.
  - `draft` = being drafted / unsettled; `ready` = ready to start (dependencies resolved, awaiting implementation); `implementing` = under implementation; `verifying` = implemented, awaiting verification (Evidence not yet confirmed); `done` = evidence obtained, complete.
- **Backward compatibility**: For packets that still carry the legacy 3 values (`draft | active | done`), read `active` as "in progress (equivalent to `implementing`)". For an existing packet where the `state` key itself cannot be observed, set "realization completeness: not observed" and do not fill by guessing.
- `state` is a **declarative record**; overview does not judge or advance transitions (it holds no state machine). Mirror the read value as-is.

### Axis 3: Evidence certainty

An axis that mirrors "how strongly the implementation result is backed by verification".

- **Source**: the presence and certainty of the body `## Evidence` section, the `intent-validate` check axes (the stable kebab-case IDs in `validate-checks.md`), and the cross-check against `drift-log.md` (when drift-watch is `on` and it exists).
- **How to read**: Read whether `## Evidence` holds confirmed verification results (date performed, the corresponding check axis ID, the source = intent-validate / drift-watch / human confirmation). Organize the check axis IDs that each Evidence entry references against the ID system of `validate-checks.md`.
- **Reading the check axes**: Because intent-validate does not write its results to a persistent file, read the **check axis ID catalog** in `validate-checks.md` (the stable kebab-case IDs and their severity classification) and organize the evidence perspective using that ID system. Do **not reimplement** the check logic.
- **Backward compatibility**: For an existing packet with no `## Evidence` section, draw "evidence certainty: not filled in", and do not fill the gap by guessing.
- When evidence cannot be read because validate has not run, Evidence is absent, or drift-log is absent, state "not observed" explicitly.

## Present axis mismatches as-is, without flattening

Because the three axes differ in nature, their per-axis values can diverge. **Do not flatten that divergence into a single indicator; surface it as a mismatch.** Annotate the sources so it can be traced to the difference between which artifacts gave rise to the mismatch.

- Example: "`verifying` but Evidence not yet confirmed" — realization completeness (axis 2) has advanced but evidence certainty (axis 3) is not yet confirmed.
- Example: "`done` but a trace hole vs an upper invariant" — evidence certainty (axis 3) is in place but there is a gap vs intent stability (axis 1).

By specification, the `verifying` stage represents the state "realization advanced but evidence not yet confirmed". Therefore, for a `verifying` packet, overview **mirrors the gap as-is** between realization completeness (axis 2) and evidence certainty (axis 3) (it does not round one to match the other).

## Dependency-block view (read-only derivation)

Present inter-packet dependency and block state **by reading the declaration only**.

- **Source**: the `depends_on` in packet frontmatter (a set of the `packet_id`s of dependency packets; default `[]`).
- **Block derivation (read-only)**: Display a packet as **BLOCKED** when "there is a packet in `depends_on` whose `state` is not `done`". Do **not infer or compute** dependencies. Derive it solely by reading the declared `depends_on`, and do not write it back to the packet (consistent with packet-progress R3.3 / R3.5).
- **Stating cycles / unresolved dependencies**: If there is a cycle (A→…→A) or a broken dependency referencing a nonexistent `packet_id`, state it explicitly.
  - If the intent-validate `dependency-cycle` / `dependency-broken-ref` check results are available, present it tied to them (do not reimplement the check logic).
  - Only when the check results are unavailable, a naive read-time detection (a simple traversal of the declared `depends_on` set) may be noted at **caveat level**. State clearly that this is a read-time aid, not a substitute for the check.
- **Backward compatibility**: For an existing packet with no `depends_on` key, draw "no dependencies (equivalent to the empty set)", and do not fill dependencies by guessing.

## Active packet pre-start briefing (optional view)

When the user asks for a "pre-start briefing", "the active packet essentials before reading", or "where to start implementing", `.intent/overview/active-packet-briefing.md` may be generated as a derived view. This is a briefing before starting to read the active packet; it does not decide implementation order or priority.

Limit reads to the active packet frontmatter and body headings. Do not copy long body text; state the evidence heading and summarize briefly.

| Briefing section | Source material | What to show |
|---|---|---|
| Current position | `packet_id` / `name` / `state` / `updated_at` / latest export-log row | The packet being read now and its position on the progress rail |
| Why / Outcome | `summary` / headings equivalent to `## Why` / `## Outcome` | What this packet is meant to achieve. If no heading exists, mark not filled in |
| Scope / Out of Scope | headings equivalent to `## Scope` / `## Non-goals` / `## Deferred` | What is in scope and out of scope |
| Safety / Decisions | relevant Invariants / Decision Rules in `intent-compass.md`, and packet headings equivalent to Safety / Constraints | Decision criteria to preserve. If the mapping is unclear, mark not observed |
| Evidence / Verify | `## Evidence` and validate-check IDs | Evidence used for completion. If absent, mark not filled in |
| Dependencies | `depends_on` and the `state` of dependency packets | State explicitly when waiting on a dependency or blocked |

- When there are multiple active packets or the current Source Packet is ambiguous, list candidates and do not assert.
- The briefing is an aid for starting work and does not advance `state`. Unknowns are emitted only as candidates into "understanding gap sorting" below; they are not written back to Open Questions.

## Understanding gap sorting (optional view)

When the user or agent raises "what is still not understood", "understanding gaps", or "holes in intent", `.intent/overview/understanding-gaps.md` may be generated as a derived view. This is candidate sorting before writeback; it does not directly reflect into canonical Open Questions / packet candidates / compass.

List each gap under the following classes.

| Class | Meaning | Next handling |
|---|---|---|
| session-unread | It may only be that the existing artifact has not been read yet | Show the file and heading to read |
| source-blank | The source of truth is blank or unobserved | Show "not filled in" and do not fill by guessing |
| product-hole | It may be governed by none of intent-tree / compass / packet | Split as packet-candidate or Open-Question candidate, but do not write |
| conflict | Source-of-truth artifacts may conflict | Show which files differ |

- Each gap carries `source` (file/heading read) and `next candidate` (where to verify or what to draft).
- A "product-hole" is written as a candidate, not an assertion. Packeting, prioritization, and appending to Open Questions are left to the user or an explicitly run skill.

## Concern-separated derived views (view-based presentation)

Do not mix the whole picture into a single long document; organize it into concern-separated derived views. At minimum, compose the following three views.

- **Intent view**: derived from aggregate-sources (the aggregation of tree / compass / packets / plan / export-log / deltas). Present canonical and inferred kept distinct.
- **Dependency-block view**: the "Dependency-block view" above. `depends_on` and the block state based on it, plus cycles / unresolved dependencies.
- **Progress view**: the "three progress axes" above. The three axes and the mismatches among them.

For each view, observe the following.

- **Regenerate from the single source of truth**: Regenerate each view from the canonical `.intent/*.md`, and do not duplicate the source of truth across views. Do not hold the same information redundantly in multiple views (each view is a projection of the canonical source).
- **Omit views with no source material**: If the source material for a derived view is absent, **omit that view and state the reason (not observed / not generated / no dependencies)**. Do not fill an empty view by guessing.
- **Declare derived**: For each view, declare that "this is derived / regenerable and is not the source of truth". The source of truth is the original `.intent/*.md`, and the view is a snapshot at read time.

## Backward-compatibility summary

- `depends_on` absent → draw the dependency-block view as "no dependencies" (do not fill the gap by guessing).
- `## Evidence` absent → draw evidence certainty (axis 3) as "not filled in" (do not fill the gap by guessing).
- Legacy 3-value `state` (`active`) → read it as "in progress", equivalent to `implementing`. For a packet where `state` itself cannot be observed, set realization completeness to "not observed".
