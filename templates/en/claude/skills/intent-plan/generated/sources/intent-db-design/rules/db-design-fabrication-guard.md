# Fabrication suppression: DB design statements ↔ projection source matching (trace · inferred/unverified marking)

The canonical reference for how the `intent-db-design` skill matches whether the projected DB design (table definitions, constraints, indexes, naming) has **fabricated beyond its projection sources (target packet / compass invariant / existing schema)**, and guarantees each statement is followable to a projection source. SKILL.md holds only the procedure and report format; "how to bind each statement to a projection source, what to mark as `inferred`, what to mark as `unverified`, and what to present for confirmation" defers to this rule. This rule is responsible for the **matching** of the generated DB design against the projection sources and never modifies the projection sources (intent-tree / compass / packets / existing schema) (reading is the limited input scope, layout is the projection format spec, writing is SKILL.md's derived-Write responsibility).

The load-bearing problem of DB design is **fabrication suppression**. It lies in suppressing the confabulation of fluently filling in columns, constraints, indexes, or naming conventions that are not in the projection sources, as design. Because it reads as DDL or a table, the presence or absence of basis cannot be told from reading the body alone. This rule provides that discrimination as matching that pits each statement of the generated DB design against the projection sources. This lets one verify after the fact "why this normalization / key design", and excludes baseless design (R2).

## The matching idea is isomorphic to intent-to-spec's fabrication-guard (artifact ↔ projection source)

- This matching is **isomorphic** to `intent-to-spec/rules/fabrication-guard.md` (matching a projected natural-language Spec against Intent / packet / constraints). That one takes the three layers (intent-tree / compass / packets) as projection sources, but this rule adds **the existing schema (Grep/DDL)** to the source and makes the target a **DB design (tables/constraints/indexes/naming)**.
- The basis for matching is **the three-layer material itself** (the target packet's intent · Scope / the compass's Invariants · Anti-direction / the existing schema · migration) that the limited input scope (db-design-input rule) read read-only. Carry no new structure; follow that source information to confirm each statement's basis.
- Matching is **semantic pitting**, not a machine decision (INV2/A1). Do not call machine inspections such as `intent-check.mjs`; pit each statement against the projection sources semantically. Lean toward catching a suspicious statement (a column / constraint / index that has no apparent basis in a projection source yet has blended into the DB design).
- Read-only. Never modify the canonical artifacts (intent-tree · intent-compass · packets) or the existing schema (inviolable).

## Procedure

1. **Trace each statement to its projection source (R2.1)**
   - For each statement of the generated DB design (table definition, column, constraint, index, naming convention), attach a followable "source" note for which projection source it derives from (**target packet**'s demand · Scope / **compass invariant** / **existing schema**).
   - The note is based on the material the limited input scope read read-only. Rather than re-reading the projection sources anew, follow the three layers already read to drop in the source.
   - When one statement derives from multiple projection sources, list them all. Do not leave an untraced statement as confirmed.

2. **Mark inferred and unverified distinctly (R2.2 / R2.3 / R5.3 · the core of this rule)**

   Mark a statement whose attribution to a projection source cannot be confirmed, not mixed with confirmed (source-derived) ones, **distinguishing the two kinds inferred and unverified**. Do not lump them together.

   - **`inferred` = inference after confirming there is no basis in any projection source.** Mark as `inferred` a statement (a column, constraint, index, or premise supplemented for fluency) confirmed to have no corresponding match in any of the target packet, compass invariant, or **existing schema (the identified range)**.
   - **`unverified` = a statement that could not be confirmed because the existing schema could not be fully identified.** When part of the existing-schema read scope (diverse expressions such as ORM, SQL DDL) could not be identified by Grep (R5.3), mark a statement related to that unidentifiable schema range as `unverified` (unconfirmed because unidentified · may exist), not lumped with `inferred`.
   - **Why not lump them**: if something that **actually exists** in the existing schema gets treated as `inferred` due to an identification miss, an existing thing is mislabeled as "not in any projection source" (an error in the opposite direction of fabrication suppression). Splitting `inferred` (= confirmed to have no basis) from `unverified` (= to-confirm because unidentified, but may exist) lets downstream gap detection treat the two distinctly.
   - The decision landing: if a statement corresponds to neither the identified schema nor a packet/invariant, **and does not relate** to an unidentifiable schema range, it is `inferred`. If it relates to an unidentifiable schema range, it is `unverified`. When you cannot be sure either way, fall to the side that does not deny existence = `unverified` (so as not to mistakenly treat an existing thing as fabrication).
   - Do not mix `inferred` · `unverified` statements with confirmed (traceable, source-derived) statements within the DB design body. Place them as a separate marking identifiable by the "source" note.

3. **Satisfy a 100% trace rate (R2.3)**
   - Attribute **every statement** of the generated DB design to **one of** `target packet` / `compass invariant` / `existing schema` / `inferred` / `unverified`. Leave no statement of unknown attribution.
   - Each table · each column · each constraint · each index · naming convention carries a source note. Do not leave a statement with an empty source note or an untraced statement as confirmed.
   - A 100% trace rate is satisfied by "every statement is attributed to one of the above 5 categories".

4. **Present the inferred / unverified list for confirmation (R2.2)**
   - Present **a list, in a form the user can confirm, at the end of the output** of the statements supplemented beyond the projection sources (those marked `inferred` / `unverified` in step 2).
   - The list names which statement (which table's which column/constraint/index) — for which reason — is not attributable to a projection source (`inferred` = confirmed to have no basis / `unverified` = unconfirmed because unidentified · may exist), at a granularity that lets the user decide whether to accept or reject the supplement. List `inferred` and `unverified` distinctly even on the list.
   - The presentation is a warning for confirmation, not something that stops the projection. The accept/reject of a supplement is left to the user's judgment. Downstream gap detection treats this list's `inferred` (= subject to confirmation) and `unverified` (= to-confirm because unidentified, but may exist) distinctly.

## Invariants

- Do not re-read and reinterpret the projection sources (intent-tree / compass / packets / existing schema) · do not modify them (matching only. Reading is the limited input scope, layout is the projection format spec's responsibility). Read-only · canonical inviolable.
- Attribute every statement to one of `target packet` / `compass invariant` / `existing schema` / `inferred` / `unverified` (100% trace rate · leave no statement of unknown attribution).
- Distinguish `inferred` and `unverified` (do not lump them). `inferred` = inference after confirming there is no basis in any projection source. `unverified` = could not be confirmed because the existing schema could not be fully identified (may exist). Do not mislabel an existing thing as `inferred` due to an identification miss.
- Do not mix `inferred` / `unverified` statements with confirmed (source-derived) ones (do not break the separate marking).
- Always present the supplemented items (`inferred` / `unverified`) as a confirmation list at the end of the output (do not dissolve them silently into the DB design body).
- Matching is semantic pitting, not a machine decision (INV2/A1). Do not call machine inspection tools (intent-check.mjs, etc.). When in doubt, lean toward catching.
</content>
