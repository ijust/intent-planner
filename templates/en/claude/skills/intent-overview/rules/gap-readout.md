# Gap Aggregation: Design Intent vs Implementation Reality

The source of truth by which the `intent-overview` skill assembles the "design intent vs implementation reality" gap section. SKILL.md holds only the procedure and report format; what to read, under which conditions, and how is governed by this file. This layer only **reads, never re-implements** the check axes of drift-watch / intent-validate, and holds no judgment logic of its own. All observation is limited to Read / Glob / Grep, and never modifies the canonical artifacts (mode.md / drift-log.md / validate-checks.md).

## Invariant discipline (read-only cross-cutting layer)

- This layer only **reads** the outputs and definitions of drift-watch / intent-validate; it does not run detection or checks itself (Out of Boundary).
- The `## Enforcement（ユーザー管理）` / `## Drift-watch（ユーザー管理）` sections of `mode.md` are **read-only** and never modified (same discipline as intent-status).
- Absent or not-observed blocks are not filled in by guessing; their state (not observed / not obtained) is stated explicitly and the block is omitted.

## Conditional read of drift-log (R5.1 / R5.4)

drift-log is read only when **both conditions hold simultaneously**.

1. The `## Drift-watch（ユーザー管理）` section of `mode.md` is `on`.
2. `.intent/drift-log.md` exists.

Only when both conditions hold, read drift-log with Read / Grep, aggregate the detection entries, and present them in the gap section. If any of the cases applies — `off` / unset / drift-log absent — **omit** the gap-aggregation block and state its status explicitly as "not observed (drift-watch is off, or no drift-log)". The default for drift-watch is `off`; not-observed is treated not as a defect but as the initial state.

### Fixed schema of drift-log (9 keys, fixed order)

Each entry holds the following 9 keys as a fixed-order Markdown list (matching the drift-log.md source of truth). This layer only reads on the premise of this key set and order, and does not alter the format.

```
pattern → stage → packet → mechanism → outcome → user-verdict → recorded_at → commit → note
```

- `packet` is the **3rd** canonical key (after `stage`, before `mechanism`).
- Aggregation is performed from the two columns `outcome` and `user-verdict`.
  - `outcome`: one of the 5 values `prevented` / `caught` / `missed` / `false-positive` / `not-applicable`.
  - `user-verdict`: one of the 3 values `valid` / `false-alarm` / `unjudged`.
- The presentation is at minimum a `pattern × outcome` cross-tabulation (matching the operating notes of drift-log.md), with `user-verdict` (the user's confirmation) shown alongside. `outcome` is the draft made by drift-watch and `user-verdict` is the user's confirmation; the two are not conflated in presentation.

### How to read missed=0 (avoiding confirmation bias)

Do not assert `missed=0` (zero records of "got through without being prevented") as "evidence it worked". Present it as a **"suspected recording gap"** (following the precedent of intent-status and the opening note of drift-log.md). Having only the moments it worked (`prevented` / `caught`) remain is confirmation bias; read on the premise that the moments it did not work (`missed` / `false-positive` / `not-applicable`) are recorded just as evenly.

## Mapping of intent-validate check axes (R5.2 / R5.3)

intent-validate is a read-only skill with `allowed-tools: Read, Glob, Grep` and **writes no check results to a persistent file**. Therefore this layer does not read a "validate result file"; instead it reads the **check-axis ID catalog** in `intent-validate/rules/validate-checks.md`, and organizes the overview's gap observations within that ID system.

- Reference: the check catalog table of `intent-validate/rules/validate-checks.md` (the `ID` column = stable kebab-case IDs, the `深刻度の目安` (severity) column = severity classification). Additions and changes to checks are governed by that table; this layer cites the ID column as-is (does not re-derive).
- Severity classification uses the 3 classes of `validate-checks.md` (`要修正` / `推奨` / `情報`) as-is.
- The dependency-soundness check axes `dependency-cycle` (a cycle A→…→A in `depends_on`) and `dependency-broken-ref` (a reference to a non-existent packet_id) actually exist in this catalog, and both are `要修正`-grade. When a cycle or unresolved dependency is observed in the dependency/block view (progress-readout), present it tied to the corresponding stable ID.
- The check logic itself is **not re-implemented** (R5.2). This layer borrows the vessel that is the ID system and merely distributes the gap observations seen in the overview into that vessel.
- Where check results are referenceable, present them tied to a stable kebab-case ID. Where not referenceable (validate not run, or results not left in an artifact), **omit** the tie to an ID and state the absence explicitly (absorbing R5.3's "where referenceable"-conditional requirement by omission when not referenceable).

## Composition of the output block

The gap section is composed of the following elements (omit elements that have no material and state the reason).

1. **drift aggregation** (only when both conditions hold): a `pattern × outcome` cross-tabulation with `user-verdict` alongside. `missed=0` is annotated as a "suspected recording gap".
2. **Check-axis mapping**: organize the gap observations seen in the overview within the stable kebab-case ID system of `validate-checks.md`. Tie referenceable ones to an ID; omit and state absence for those that are not.
3. **mode status**: show the current values of `## Enforcement` / `## Drift-watch` read-only alongside (never modified).
