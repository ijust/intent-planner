# DB-specific inspection oracle: five inspection axes · invariant-conformance check · irreversibility warning (warn-only · read-only)

The canonical source for how the `intent-db-design` skill inspects the **quality of the draft itself** — the projected DB design (table definitions, constraints, indexes, naming) — along DB-specific inspection axes and emits severity-tagged findings alongside the projection output. SKILL.md only references this rule from its inspection Step (Step 3.5); "which axes, machine vs. semantic, what severity, and how to output" is closed inside this rule.

This inspection is a **quality check of the draft itself** produced by the projection skeleton (seam), not a diff against the implementation schema (migration/DDL) (drift detection · a separate spec). What is inspected here is "the draft itself"; it holds no diff against the implementation. All inspection is **warn-only (not a gate · false-positives assumed · does not stop) and read-only (presents findings only · does not modify on its own)**, and never modifies any canonical artifact (intent-tree / intent-compass / packets), the existing schema, or export drafts.

## Positioning of the inspection (warn-only · same shape as intent-validate)

- This inspection is aligned with intent-validate's manner of "severity-tagged report · suggestions only for fixes · read-only" — the **same shape**. It does not invent its own inspection output contract and does not add a separate file mechanism. Findings run alongside the seam's projection output (`.intent/db-design/<packet-slug>/`).
- All inspection is **warn-only**. No inspection result stops the projection or output (it is not a gate). The irreversibility warning and the quality checks assume false-positives; their purpose is to let the user **notice**, not to direct and correct (a finding says "this design could break this way," never "fix it this way"). Do not confuse this with an enforcement gate (stopping).
- The inspection is a **semantic comparison**, not a reimplementation of machine judgment (INV2/A1 · INV35(4)). It is not embedded into machine-inspection scripts such as `intent-check.mjs`, and semantic judgments such as normalization validity are not dropped into brittle grep. The inspection is closed within the natural-language conventions of the skill/rule and the LLM's semantic judgment.
- Read-only. It never modifies the projection sources (target packet / compass / existing schema · migration) or any canonical artifact (inviolable). The inspection presents findings only and does not modify the schema on its own.

## Five inspection axes

Inspect the projection output (table definitions, constraints, indexes, naming) along the following five axes.

1. **Normalization break**: inspect structures where the same fact is held redundantly across multiple tables/columns, a transitive functional dependency breaks third normal form, or repeating columns (`tag1`/`tag2`/`tag3`, etc.) break first normal form. However, since denormalization can be an **intentional performance design**, do not assert — keep it as a prompt for consideration (semantic axis).
2. **Missing index**: inspect places where a foreign-key column or a frequently-searched column (a column likely used in WHERE/JOIN/ORDER BY) has no index. A missing index on an FK column directly affects JOIN performance, so fall to the side of flagging it.
3. **N+1-inducing schema**: inspect schema structures that tend to induce N+1 queries on the application side — e.g., a parent-child 1:N fetch where the child table has no index on the parent ID, or an intermediate-table design that forces sequential fetches (a prompt for consideration rather than an assertion · semantic-leaning axis).
4. **Missing constraints (NOT NULL · UNIQUE · FK · CHECK)**: inspect the absence of constraints that directly bear on data integrity. Specifically: (a) a column that holds a reference has no **FK constraint**, (b) a column that should be required has no **NOT NULL**, (c) a column that should be unique (email, login ID, etc.) has no **UNIQUE**, (d) a value range or state transition has no **CHECK**. **Because this axis directly bears on data integrity, dislike misses and set sensitivity high.**
5. **Naming consistency**: inspect inconsistency in the naming conventions of tables/columns. `userId` vs. `user_id` (camel/snake mixing), inconsistent plural/singular of table names (`users` vs. `order`), inconsistent suffix of ID columns (`user_id` vs. `userKey`), etc. **This axis can be picked up mechanically.**

## Machine axis / semantic axis split (INV2 · INV35(4))

Split each inspection axis into "pickable mechanically" or "left to the LLM's semantic judgment." Do not drop semantic judgment into brittle grep.

| Inspection axis | Class | Basis of the split |
|---|---|---|
| Naming consistency | **Machine axis** | Inconsistency in identifier notation (camel/snake · plural/singular · suffix) is pickable mechanically by string comparison. The finding may assert ("detected mixing"). |
| Missing constraints (structural absence) | **Machine-leaning** | "A column name that signals an FK has no FK constraint", "a `*_at` column has no NOT NULL", etc., are pickable mechanically. But "whether that constraint is **really needed**" is a semantic judgment. |
| Missing index | **Machine-leaning** | "An FK column has no index" is pickable structurally. Whether it is a "frequently-searched column" is semantic (inferring query patterns). |
| N+1-inducing schema | **Semantic axis** | A judgment that infers the application's access pattern; cannot be asserted from structure alone. Keep it as a prompt for consideration. |
| Normalization break (validity) | **Semantic axis** | Whether third normal form should be broken (intentional denormalization vs. an accident) is a context-dependent semantic judgment. Do not assert — keep it as a prompt for consideration, and do not correct the user with false-positives. |

- Machine-axis findings may assert ("detected `userId` and `user_id` mixing").
- Semantic-axis findings are prompts for consideration rather than assertions ("the normalization policy may be wavering between `orders` and `order_item`; no problem if denormalization is intentional").

## Invariant-conformance check (intent vs. output schema · INV35(3))

"Writing the intent into an invariant" alone leaves it "written, but whether it was kept is unknown" (INV35(3)). Check whether the output schema conforms to that invariant.

- Read whether the compass's Invariants (and the target packet's own Safety) hold a **DB-related intent** (immutable · append-only · soft delete, etc.).
- If there is a matching invariant, check whether the projection output schema conforms to it. Examples:
  - The invariant intends "this table is immutable (do not change after creation)", yet the projection output is an UPDATE-able schema (column layout that permits updates, an update timestamp, etc.) → mark it as an **"invariant-violation candidate"** with a severity.
  - The invariant intends "append-only", yet the schema presupposes deletes/updates → violation candidate.
  - The invariant intends "soft delete", yet the schema presupposes physical deletion (no `deleted_at` column, etc.) → violation candidate.
- The mark is a "violation candidate", not an assertion (warn-only). Because the intent may be misread, attach the basis (which invariant conflicts with which schema element) and keep it a prompt for consideration.
- **When there is no matching DB-related invariant, skip the invariant-conformance check** (not applicable).

## Irreversibility warning (existing-schema diff · migration cost · warn-only)

A schema has high irreversibility (the migration cost jumps once data is loaded). If the diff between the existing schema (the seam's Grep input) and the projection output contains a change whose cost jumps after data is loaded, mark it as a warning.

- Among the existing-schema vs. projection-output diffs, mark the following changes as an "irreversibility warning":
  - **Type change** (e.g., `varchar` → `int` · requires data reinterpretation or conversion)
  - **Adding NOT NULL** (fails if existing NULL rows exist · requires default backfill or a staged migration)
  - **Column deletion** (data loss · dangling references)
  - **Key change** (PK/UNIQUE/FK change · referential integrity must be rebuilt)
- Attach to the warning the gist "the migration cost jumps once data is loaded" and which existing-schema element the change targets.
- **The irreversibility warning is warn-only, not a gate** (false-positives assumed · does not stop = the same shape as drift-watch's warn). Even when a warning is emitted, the projection/output does not stop.
- **When there is no existing schema (a new DB · nothing to compare against), skip the irreversibility warning as "nothing to compare against."** The quality checks (normalization · index · constraints · naming) are performed against the projection output.

## Inspection-finding output format (alongside the projection output · severity-tagged · same shape as intent-validate)

- Output the inspection findings **severity-tagged**, alongside the seam's projection output (at the end of `.intent/db-design/<packet-slug>/db-design.md` or running alongside it). The severity is aligned with intent-validate's report shape (must-fix / recommended / info, or severity: high / medium / low).
- Each finding carries the **inspection axis · severity · basis (table/column name)**. Examples:
  - `Missing constraint severity: high — orders.user_id has no FK constraint (referential integrity is not guaranteed)`
  - `Missing index severity: medium — users.email has no search index`
  - `Naming consistency severity: low — userId and user_id are mixed`
  - `Invariant-violation candidate severity: high — against compass "this table is immutable", audit_log is an UPDATE-able schema`
  - `Irreversibility warning — adding NOT NULL to users.age (high migration cost after existing data is loaded · does not stop)`
- **Sensitivity policy (fit-criterion initial policy)**: for axes that directly bear on data integrity (FK/UNIQUE/NOT NULL omissions · missing constraints), **dislike misses and set sensitivity high**. For subjective axes (whether to normalize · N+1 induction), keep it as warn/a prompt for consideration and do not correct the user with false-positives. The numeric threshold is revisited in operation (Deferred).
- Findings stay as **suggestions for fixes** and do not modify the schema on their own (the same shape as intent-validate).

## Hold judgment (Fail-Safe · fabrication suppression)

- When an inspection axis is **undecidable due to insufficient information** (e.g., the query pattern is unknown so a missing index cannot be asserted · the existing schema is only partly identifiable so the diff cannot be fixed), output **"judgment held + reason."**
- Do not mislabel a held axis as **"pass"** (Fail-Safe = the safe side is to hold · do not fabricate). Do not write "no problem" for something not confirmed sound.

## Invariants

- All inspection is **warn-only** (not a gate · false-positives assumed · does not stop). Do not confuse it with an enforcement gate (stopping).
- **Read-only · canonical inviolable**. Never modifies the projection sources (target packet / compass / existing schema · migration), canonical artifacts, or export drafts. The inspection presents findings only and does not modify on its own (fixes are suggestions).
- The inspection is a **semantic comparison**, not a reimplementation of machine judgment (INV2/A1). It is not embedded into machine-inspection scripts such as `intent-check.mjs`, and semantic judgments such as normalization validity are not dropped into brittle grep. **Separate** axes pickable mechanically (such as naming consistency) from semantic judgments (such as normalization validity) (INV35(4)).
- **No persistent store · no external connection**. The inspection is static and does not connect to an external DB at runtime. It introduces no persistent store (a database, etc.) (INV2).
- The invariant-conformance check is a "violation candidate" mark, not an assertion. When there is no matching DB-related invariant, skip it.
- The irreversibility warning skips as "nothing to compare against" when there is no existing schema, and the quality checks are still performed.
- An undecidable axis is "judgment held + reason" and is not mislabeled as a pass (do not fabricate).
