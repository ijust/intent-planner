# load-bearing Sorting Procedure (read-only; only reads the table; holds no numbers)

The single source of truth by which the `intent-from-spec` skill qualitatively prioritizes the extracted intent candidates and surfaced gaps by "whether they are of a kind that, if dropped, damages the correctness of what follows (whether they are load-bearing)," and presents items with a high load-bearing degree in a form distinguishable from low ones. SKILL.md holds only the procedure and report format; "what to read as the discriminating axis and how to sort into high/low" is governed by this rule. This rule does **not invent** a new discriminating axis; it merely **reads and copies** a column of an existing source of truth. Observation is limited to Read / Glob / Grep, and it does not modify the input specification, the canonical `.intent/*.md`, or the rulers' sources at all (writes go only under `.intent/spec-ingest/`).

## The discriminating axis is a read-the-table operation, not a fresh judgment

The core of this rule comes down to "**reading and copying an existing column of `decision-slots.md`**." It does not define or derive the high/low axis in this rule, and it holds no mathematical solver, numeric score, or threshold whatsoever. Sorting is a table-citing operation, not the performing of new weighting or scoring.

- The load-bearing degree per slot is already written in the **"front-load / defer door" column** of `intent-packets/rules/decision-slots.md`. This rule reads that column as the **primary discriminating axis**.
- That column **exists in all of** the common-core slot table and every mode-specific delta table (standard / refactor / behavior-unknown / feature-growth) of `decision-slots.md`. Therefore, whichever slot is cited, that column can be read unambiguously.
- The "rationale" column **exists only in the common-core table**. So it is not made the primary key of discrimination; it is used only as material to **supplement the explanation** of why something was judged high (borrowing only the wording for why dropping it is dangerous, while the high/low discrimination itself is performed on the "front-load / defer door" column).

## The column read and the high/low correspondence

Copy the value of the "front-load / defer door" column of `decision-slots.md` as-is, as follows.

| Value of the "front-load / defer door" column | load-bearing degree | Meaning |
|------------------------------------------------|---------------------|---------|
| front-load (one-way; irreversible; floor of security / legal regulation) | **high** | Overturning it later has large external impact, and if dropped it damages the correctness of what follows. Silence on it is dangerous |
| deferrable (two-way; localizable and reversible) | **low** | It can be re-decided in both directions and is reversible, and can be patched locally later. Even if silent, it is unlikely to directly break what follows |

- Silence on a slot whose column value begins with "front-load" is **high**, and silence on a slot whose value begins with "deferrable" is **low**. No further gradation (intermediate values, numbers) is introduced in this rule.
- The parentheticals of "front-load" / "deferrable" (one-way/two-way, irreversible/reversible, floor of security / legal regulation, and so on) are the places where the table itself explains why that high/low is read so, and this rule cites that wording as-is for the reason of presentation (it does not redefine it).

### Examples of copying (values are cited from the reference table)

- `decision-authz` (authorization) is "front-load (one-way: floor of security / legal regulation)" → silence is **high**. As the reason, append "irreversible; security floor" from the common-core table's "rationale" column as a supplement.
- `decision-consistency` (consistency model) is "front-load (one-way: overturning it later has large external impact)" → silence is **high**.
- `decision-error-semantics` (error semantics) is "deferrable (two-way)" → silence is **low**.
- `decision-data-migration` (data migration; feature-growth) is "front-load (one-way: irreversible)" → silence is **high**.

> All of these are examples of copying the values of the reference table, not re-adjudication in this rule. If a value changes, the reference table is canonical, and this rule merely follows and re-reads it.

## Application to gaps and intent candidates

- For a gap that gap-readout bound to a slot ID of `decision-slots.md`, cite the "front-load / defer door" column of that slot row and attach high/low. For a gap that cannot be bound to a slot ID (one for which the catalog has no corresponding column), do not attach high/low by guessing; state the absence explicitly as **load-bearing unknown**.
- For intent candidates too (invariants, constraints, anti-directions, etc. that extract-intent picked up), if there is a corresponding slot, cite that row's column and attach high/low. In particular, Invariants candidates derived from technical / security requirements often fall on "front-load" slots such as `decision-authz`, and lean toward **high**.
- Both high and low are **hypotheses, not confirmed severities**. They are held as Assumptions until the user confirms and approves them, and this rule's sorting neither discards nor finalizes any item.

## Present high and low distinguishably

- In presentation, distinguish high items from low ones in an **observable** way (e.g., grouping high ones at the top, attaching an explicit label, and so on). Do not pour all gaps out equally; let the user address the dangerous-if-dropped ones first.
- Distinction stays at labeling and does not cut low ones away. Low ones too are held as Assumptions and included in omission-recap's re-confirmation scope.

## Handling of output

- All outputs are derived, regenerable, and not the source of truth. Nothing is written back to the canonical intent-tree / compass (promotion is by hand, after approval).
- This rule does not modify the rulers' source of truth (`decision-slots.md`) at all. It holds no scoring or weighting engine of its own; it merely goes and reads the "front-load / defer door" column.
