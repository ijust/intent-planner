---
name: intent-db-design
description: Projection skill that, for a packet responsible for designing a persistent data model, reads, read-only, the three layers — the intent (packet), the invariants (compass), and the existing schema/migration — and projects table definitions/constraints/indexes/naming into derived output under `.intent/db-design/`, tracing each statement back to its projection source (statements not in any source are marked inferred / unverified). The output is a design draft, not requirements, and never modifies any canonical artifact.
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion
argument-hint: <target packet> (the name of the packet that designs the persistent data model; if the argument does not uniquely determine it, confirm from candidates)
---

# intent-db-design Skill

## Core Mission
- **Success Criteria**:
  - Starting from a single target packet responsible for designing a persistent data model, has read, read-only, the three layers — the target packet's intent / Scope, the compass's Invariants/Anti-direction, and the existing schema/migration (Grep) (R1.1)
  - Has limited the input scope to a single target packet, the compass's Invariants/Anti-direction, and the existing schema/migration, and has not read the full Intent Tree or any out-of-scope packet (R1.3)
  - Has produced a DB design (draft) including table definitions, constraints, indexes, and naming from the three-layer input (R1.2). When the existing schema cannot be identified by Grep (e.g., a new DB), has projected from intent and invariants alone, leaving the existing-schema input empty (R1.4)
  - Attaches to each statement of the generated DB design a trace note showing its attribution to a projection source (target packet / compass invariant / existing schema), marks a statement attributable to none of them as `inferred` and a statement whose existing schema could not be fully identified and thus could not be confirmed as `unverified`, and does not mix these with confirmed (source-derived) statements (R2.1 / R2.2). Has attributed every statement to one of `target packet` / `compass invariant` / `existing schema` / `inferred` / `unverified` (100% trace rate, R2.3)
  - Outputs in a structured form (`## Table:` headings + column tables) that the downstream intent-validate can diff against the implementation schema (migration/DDL) on a per-item basis, in a shape where table definitions, constraints, indexes, and naming are identifiable as diffable units (R4.1 / R4.2)
  - Writes the output only as derived artifacts under `.intent/db-design/<packet-slug>/`, and has not modified any canonical artifact (intent-tree / intent-compass / packets), the existing schema, or export drafts. Has not written the output into `.intent/cc-sdd/` or `.intent/openspec/` (export artifacts) (R3.1 / R3.2 / R3.3)
  - When the target packet can be uniquely identified by argument or by user confirmation, targets only that packet; when it cannot be identified, does not fill in the target by guessing but asks for a target specification and stops (R5.1 / R5.2). When part of the existing schema cannot be identified, uses only the identified range as input and reports that part could not be identified (R5.3)
  - Has no wiring that auto-launches, runs a state machine, or invokes other skills; limits activation to a human's manual operation; and introduces no persistent store and connects to no external service at runtime (R6.4 / R6.5)

## Execution Steps

### Step 1: Identify the target packet · three-layer input (stop if ambiguous/absent)
- When the user runs `/intent-db-design <target packet>`, first identify the target packet and read, read-only, the three layers (intent / invariants / existing schema) per `rules/db-design-input.md`.
- **Target identification (ambiguity gate · R5.1 / R5.2)**: if the argument uniquely determines the target packet, target only that packet. If the argument does not uniquely determine it, present candidates from `.intent/packets/index.md` and confirm via `AskUserQuestion`. When neither the argument nor the dialogue can disambiguate, or the specified packet does not exist, **do not fill in the target by guessing — stop**, name what is ambiguous (or absent), and ask for a target specification. Write nothing while stopped.
- **Three-layer read (limited input scope · R1.1 / R1.3)**: read only the single target packet's intent / Scope / Expected Behavior / Safety, the Invariants/Anti-direction in `.intent/intent-compass.md`, and the existing schema/migration (Grep-identified). Do not read the full Intent Tree or out-of-scope packets.
- **Existing-schema identification (not exhaustive — identified range + report · R1.4 / R5.3)**: search plainly with Grep for migration/DDL/ORM schema, and adopt only the identified range as the existing-schema input. When part cannot be identified, report that it could not be identified and do not fill it in by fabrication. When the existing schema cannot be identified at all (e.g., a new DB), leave the existing-schema input empty and project from intent and invariants alone.
- Once the scope and material are fixed, proceed to Step 2.

### Step 2: Project the DB design (tables/constraints/indexes/naming)
- Map the three-layer material read in Step 1 into a DB design draft per the output format in `rules/db-design-projection.md`.
- Assemble it as a machine-diffable Markdown structure that the downstream validate can diff against the implementation schema on a per-item basis (frontmatter + `## Table: <name>` headings + the fixed 4-column table `| Column | Type | Constraints | Source |` + indexes + naming conventions). A table = a heading, a column = a table row are the diffable units.
- What is embedded in the structure is only diffable identifiers and attribution; semantic judgments such as normalization validity, missing indexes, or naming consistency are not encoded into the structure (INV2). This format is not a frozen contract but a provisional format that satisfies the minimum diffability.

### Step 3: Trace to projection source · mark inferred / unverified (fabrication check)
- Per `rules/db-design-fabrication-guard.md`, check that the projected DB design has not fabricated beyond its projection sources.
- Trace each statement (table definition, column, constraint, index, naming convention) in a form that can be followed back to a projection source (target packet / compass invariant / existing schema) (R2.1).
- Mark a statement confirmed to have no basis in any projection source as `inferred`, and a statement whose existing schema could not be fully identified and thus could not be confirmed as `unverified`, distinguishing them and not mixing them with confirmed (source-derived) statements (R2.2). To avoid mislabeling something that actually exists as `inferred` due to an identification miss, fall to `unverified` when you cannot be sure either way.
- Attribute every statement to one of `target packet` / `compass invariant` / `existing schema` / `inferred` / `unverified`, leaving no statement of unknown attribution (100% trace rate · R2.3). Present a list of the supplemented (inferred / unverified) items at the end of the output for confirmation (a warning that does not stop the projection).

### Step 3.5: DB-specific inspection oracle (warn-only · read-only)
- Per `rules/db-inspect-oracle.md`, apply DB-specific quality checks to the projected DB design (the draft itself). This is a quality check of the draft itself, not a diff against the implementation schema (drift detection).
- **Five inspection axes**: normalization break / missing index (foreign keys · frequently-searched columns) / N+1-inducing schema / missing constraints (NOT NULL · UNIQUE · FK · CHECK) / naming consistency. Split each axis into a machine axis (naming consistency, etc. · may assert) and a semantic axis (normalization validity, etc. · a prompt for consideration), and do not drop semantic judgment into brittle grep (INV2 / INV35(4)).
- **Invariant-conformance check**: if the compass's Invariants (and the target packet's Safety) hold a DB-related intent (immutable · append-only · soft delete, etc.), check whether the projection output schema conforms to it, and mark a conflict as an "invariant-violation candidate" (INV35(3)). Skip when there is no matching invariant.
- **Irreversibility warning**: among the diffs between the existing schema (the Grep input from Step 1) and the projection output, mark changes whose migration cost jumps after data is loaded (type change · adding NOT NULL · column deletion · key change) as a warn. When there is no existing schema (a new DB), skip as "nothing to compare against" and still perform the quality checks.
- Emit the inspection findings **severity-tagged** (the same shape as intent-validate's report), with the inspection axis · severity · basis (table/column name). For axes directly bearing on data integrity (FK/UNIQUE/NOT NULL omissions), set sensitivity high; for subjective axes (whether to normalize), keep it as a prompt for consideration.
- All inspection is **warn-only (not a gate · false-positives assumed · does not stop) and read-only (presents findings only · does not modify on its own = fixes are suggestions)**. An axis undecidable due to insufficient information is "judgment held + reason" and is not mislabeled as a pass (Fail-Safe · do not fabricate).

### Step 4: Derived Write (to `.intent/db-design/<slug>/`)
- Only after all reading, projection, checking, and inspection are done, **finally** write the generated DB design to `.intent/db-design/<packet-slug>/db-design.md`, and run the Step 3.5 inspection findings **alongside** the projection output (severity-tagged · no separate file mechanism). Derive the slug deterministically from the target packet name by the slug rule in `rules/db-design-projection.md` (identical to `packet-format.md` and the export skills).
- **Collision rule (R3.4)**: treat it as a collision only when the slug matches an existing directory and that `db-design.md`'s `source_packet` points to a **different** packet; in that case assign an alternate name with a sequence starting at `-2` and notify the user of the mapping (do not overwrite silently). When it points to the **same** packet name, treat it as regeneration and update the same directory.
- At the head of the output, state explicitly that this DB design is derived, regenerable, and Git-untracked, that it **is a design draft, not requirements**, and that statements marked `inferred` / `unverified` are provisional until the user confirms them.
- Never write to any canonical `.intent/*.md` (intent-tree / compass / packets), the existing schema, export drafts (`.intent/cc-sdd/` / `.intent/openspec/`), or application code. Limit the write target to under `.intent/db-design/<packet-slug>/` (R3.1 / R3.2 / R3.3).

## Output Description

> **The output destination is the terminal.** Do not use raw HTML (collapsible UI such as `<details>` / `<summary>`) in the output; separate details with plain Markdown headings (in a terminal, raw tags are shown as-is and become unreadable).

- `.intent/db-design/<packet-slug>/db-design.md` (derived · regenerable · Git-untracked. States at the head that it is a design draft, not requirements). The structure follows `rules/db-design-projection.md`:
  - **frontmatter**: `source_packet` (target packet name · canonical key) / `generated_at` (ISO 8601) / `projection_sources` (the layers used in the projection).
  - **A `## Table: <name>` heading per table**: source · column table (`| Column | Type | Constraints | Source |`) · indexes (column, kind, source) · naming conventions (convention, source). A table = a heading, a column = a row are the diffable units.
  - **inferred / unverified list**: at the end of the output, as items "to confirm", listing which statements — for which reason — are not attributable to a projection source (`inferred` = confirmed to have no basis / `unverified` = unconfirmed because unidentified · may exist), distinguishing the two.
  - **Trace notes**: each column's "Source" cell and each table/index/naming-convention's source note carry projection-source attribution.
  - **Inspection findings (alongside · severity-tagged)**: emit the findings of the DB-specific inspection per `rules/db-inspect-oracle.md` (five inspection axes · invariant-conformance check · irreversibility warning) alongside the projection output, severity-tagged (the same shape as intent-validate). Each finding carries the inspection axis · severity · basis (table/column name). All are warn-only (do not stop); an undecidable axis is "judgment held + reason".
- Omit a layer that has no material and state the reason (not recorded / not observed / not identified) explicitly (do not fill in by guessing).
- When part of the existing schema could not be identified, include that fact in the report (R5.3).

### Plainness check for reports (user-facing reports; right before output; shared)

Right before emitting a user-facing report (progress, completion, items needing confirmation — including the end-of-turn summary), run this check (INV105, DR208). It applies only to user-facing report text, not to how internal records (canonical files and logs under `.intent/`) are written.

- **Do not transcribe internal documents verbatim**: text you just read or wrote in internal artifacts (tree, compass, packets, Open Questions) is written in internal vocabulary. In the report, restate that content in words a first-time reader understands (without changing facts or meaning).
- **Identifiers must not be the subject of the sentence**: when presenting an item to confirm or a unit of work, first write one sentence that stands on its own ("what and why"), then append identifiers (Open Question numbers, packet names, symbols, stage names) after it as references (e.g. "... please verify this before starting (ref: OQ-xxx-1)"). Do not delete identifiers or references to records for the sake of plainness (the trail back to the record is lost).
- **Signal for overload**: three or more unexplained internal terms in one sentence signal overload (read by meaning, not by mechanical count). If a sentence does not stand on its own, rewrite it in plain words before sending (without changing facts or meaning).
- This check works as a pair with the after-the-fact record (prevention alone is never enough): when a report failed to get through, log the case to the drift log while drift-watch is on, and feed the next prevention.

## Safety & Fallback
- **Write boundary**: the write target is limited to under `.intent/db-design/<packet-slug>/`. The canonical `.intent/*.md` (intent-tree / compass / packets), the existing schema, and export drafts are read-only, and nothing is created, modified, or deleted there (the `Write` in the frontmatter is permitted only for writing under `.intent/db-design/`. R3.1 / R3.2).
- **Do not mix into export artifacts**: do not write the output into `.intent/cc-sdd/` or `.intent/openspec/` (export artifacts · requirements). Because this skill's output **is a design draft, not requirements**, do not mix it into the cc-sdd/openspec export artifacts (R3.3).
- **Derived, not canonical**: the artifact is derived · regenerable, not canonical. State this at the head of the output and do not create a dual canonical alongside the canonical artifacts.
- **Fabrication suppression (load-bearing problem)**: do not leave untraced statements as confirmed (each statement is either followable to a projection source or else marked `inferred` / `unverified`). Distinguish `inferred` (confirmed to have no basis) from `unverified` (unconfirmed because unidentified · may exist), and do not mix them with confirmed statements. Always present the supplemented items as a confirmation list and do not dissolve them silently into the body (R2.x).
- **Read-only**: treat the projection sources (target packet / compass / existing schema · migration) as read-only and do not create, modify, or delete them (R3.2).
- **Inspection is warn-only · read-only** (`rules/db-inspect-oracle.md`): the DB-specific inspection (five inspection axes · invariant-conformance check · irreversibility warning) is all warn-only and not a gate (false-positives assumed · does not stop). The inspection presents findings only and does not modify the schema on its own (fixes are suggestions · the same shape as intent-validate). The inspection is also static and holds no persistent store or external DB connection (INV2). Do not confuse it with an enforcement gate.
- **No persistent store · no external connection**: introduce no persistent store (database, etc.) and connect to no external service at runtime. Hold state with the schema discipline of frontmatter (INV2 / R6.5).
- **Manual activation · does not auto-launch**: activation is limited to a human's manual operation. This skill (1) has no loop that actively launches itself, (2) has no wiring that launches other skills, and (3) has no state machine (R6.4). `/intent-db-design` is a manual path the user launches in conversation; intent-planner never fires db-design automatically. The "recommendations" that another spec's status/packets emit are **text presenting a command string and do not invoke a Skill**, which guarantees no auto-launch.
- **Zero external dependencies** (INV2). Introduce no external packages, AST parsers, or custom schemas; limit to Node standard and natural-language heuristics; and complete the projection within a natural-language workflow. Grep and reading are for the LLM to read and interpret the artifacts/schema; do not reimplement the judgment logic (A1).
- **Do not modify application code** (INV6).
- **When a prerequisite is absent**: when the target packet is ambiguous or absent, write nothing, name the absence/ambiguity, ask for a target specification, and stop (fail-fast. R5.2).
- **On partial gaps**: state explicitly that a layer whose existing schema cannot be partly identified is "not identified" and report it. State explicitly that a layer whose material cannot be read is "not recorded / not observed" and omit it (do not fill in by guessing. R5.3).
</content>
</invoke>
