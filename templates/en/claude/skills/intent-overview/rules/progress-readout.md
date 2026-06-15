# Multi-axis progress readout and concern-separated views

The canonical source the `intent-overview` skill uses to mirror packet progress on three axes instead of a single %, to derive block state read-only from `depends_on`, and to organize concern-separated derived views. This rule is **read-only**: it does **not compute, score, or infer** progress axes or dependencies. The canonical source of progress, dependency, and evidence is the packet (frontmatter + `## Evidence` section) that `intent-planner-packet-progress` maintains, and overview only **mirrors** it. Checks that require computation (dependency health, validate axes) are the responsibility of intent-validate / drift-watch / algo-intent-recovery; this rule only **reads their results**.

## Core principle (read-only mirror)

- The packet canonical source (the 10-key frontmatter of `active/*.md` + the body `## Evidence` section) is the **single source of truth** for progress, dependency, and evidence. Overview only regenerates derived views from it; it does not modify the canonical source and does not duplicate it.
- Do **not compress progress into a single overall %**. Present it split across three axes of differing natures.
- For each axis and each view, state the source explicitly ("which part of which existing artifact was read"). Show that it is based on reading files, not on AI self-report.
- For any axis or view with no corresponding artifact, state "not observed / not filled in / no dependencies" explicitly and **never fill the gap by guessing**.

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
