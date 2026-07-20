# db-design input scope (read-only · three-layer source contract)

The canonical reference for how the `intent-db-design` skill, starting from a single target packet, reads, read-only, the material (intent / invariants / existing schema) for projecting a DB design. SKILL.md holds only the procedure and report format; "which scope to identify how, and what to read from which heading / which file" defers to this rule. This rule **only reads** the projection sources and never modifies any canonical `.intent/*.md`, packets, or existing schema/migration (writing is only under `.intent/db-design/<packet-slug>/` and is outside this rule's responsibility).

## posture (no custom parser — read and interpret `.intent/` and the existing schema)

Scope identification and the three-layer read carry no custom parser, schema, or index; the LLM reads the `.intent/` artifacts and the existing schema directly. Introduce no new structure; treat the existing artifacts' headings, columns, and frontmatter as material as-is. Do not reimplement the judgment logic of inversion, inspection, or drift detection; if they left output behind, only read it. Never modify the canonical (intent-tree / compass / packets), the existing schema, or export drafts.

## Input scope (strict / source contract)

Read only the following three layers. Do not read the full Intent Tree or out-of-scope packets (isomorphic to `map-openspec`'s source contract — prevents token explosion).

| Layer | What to read | Read scope (strict) |
|---|---|---|
| intent (target packet) | a single target packet (`.intent/packets/active/<target>.md`, etc.) | that packet's **intent / Scope / Expected Behavior / Safety** and frontmatter (including `depends_on`). **Only 1 packet**. Do not read other packets |
| invariants (compass) | the **Invariants** / **Anti-direction** of `.intent/intent-compass.md` | read DB-related intents (immutable · append-only · normalization policy, etc.) as invariants / directions to avoid. Reference North Star / Decision Rules only as a summary when needed |
| existing schema | the existing schema / migration (Grep-identified) | per "Grep identification of the existing schema" below, read only the identified range |

- Do not read the full Intent Tree. Only when the overall direction is needed, reference the Tree's **L0–L1 as a summary** pinpoint (no verbatim transcription of the body).
- Do not read artifacts outside the three layers (out-of-scope packets, other packets' directories, export drafts, etc.). This keeps the information flowing into the DB design to about 1 packet's worth.
- Hand off the read material keeping which layer / which heading / which packet (or which existing-schema file) it derives from, so the downstream projection can follow it back to its source.

## Identifying the target packet (ambiguity gate · do not fill in by guessing)

Identify the target packet in the following order. Do not generate a DB design while it remains undisambiguated (R5.1 / R5.2).

1. **Argument first**: if the argument the user gives to `/intent-db-design` uniquely identifies the target packet, target only that packet. Do not do dialogue completion (do not add an unnecessary question).
2. **Present candidates**: if the argument does not uniquely determine it, present candidates from `.intent/packets/index.md` (columns `packet_id | name | state | summary`) and confirm the target via AskUserQuestion. Do not decide on one by guessing.
3. **Stop if absent**: when neither the argument nor the dialogue can disambiguate, or the specified packet does not exist, **do not fill in the target by guessing — stop**. Name what is ambiguous (or absent) and ask for the target packet's specification. Write nothing while stopped.

## Grep identification of the existing schema (not exhaustive — identified range + report)

Identify the existing-schema layer by searching with Grep for diverse persistence-layer expressions. Do not require full coverage; the boundary is **the identified range + a report of what cannot be identified** (R1.4 / R5.3 · OQ-DB5).

- **What to search for**: identify diverse persistence-layer expressions with Grep. Examples: ORM schemas (Prisma's `schema.prisma` / Drizzle's `*.schema.ts` / TypeORM's `@Entity` / ActiveRecord's `db/schema.rb`, etc.), SQL DDL (`CREATE TABLE`, etc.), migration files (under `migrations/`, etc.). Since expression varies per project, do not depend on fixed patterns — search plainly with Grep.
- **Identified range, not coverage**: the identification strategy is not "coverage". Adopt only the identified range as the existing-schema input.
- **Report what cannot be identified, do not fabricate**: when part of the persistence-layer expression cannot be identified, report that it could not be identified. Do not fill in an identification miss by **fabrication** (do not supplement a non-existent schema from imagination). A projection statement related to a schema range that could not be fully identified becomes a subject for `unverified` (unconfirmed because unidentified · may exist), not lumped with `inferred` (no basis in any projection source) (label attachment is the fabrication-guard's responsibility).
- **New DB (no existing schema)**: when Grep cannot identify any existing schema (e.g., a new DB), leave the existing-schema input **empty** and project the DB design from intent (packet) and invariants (compass) alone (R1.4). In this case there are no statements attributable to the existing schema, and each statement is either intent / invariant-derived or `inferred` (it may be all `inferred`).

## Reading boundary (read-only)

- Treat the projection sources (target packet / compass / existing schema · migration) as **read-only**; do not create, modify, or delete them.
- This rule's responsibility runs only as far as "identifying the target packet" and "reading the three layers". Mapping the read material into a DB design is the projection-format rule (`db-design-projection`); trace attachment and inferred / unverified marking are the fabrication-suppression rule (`db-design-fabrication-guard`).
- This rule does not lean toward machine inspection. Grep and reading are for the LLM to read and interpret the artifacts/schema; do not reimplement the judgment logic (INV2 / A1).

## Auxiliary: matching data-layer conventions (read-only candidate surfacing · optional · A40/DR83 host)

DB design is where the "data-persistence technical surface" becomes most concrete, so it is where data-layer conventions (backward-compatible migrations, schema-side integrity constraints, indexing, N+1, connection pools, etc. in `.intent/constraint-starters/code-data.md`) and the personal ledger's means-based constraints apply (A40, DR83 host). After reading the three layers, you may thinly match **only the related conventions** read-only and surface them as candidates (a starter to notice at design time, not projection material).

- **Pull only related domains**: from the parent catalog `.intent/constraint-starters.md`'s domain index, read only the domain files that fit the target packet's technical surface, centered on the data layer (`code-data.md`) (do not always load all domains). If the personal ledger `.intent/constraint-library.md` exists, read its means-based constraints too.
- **Read the decision ledger and do not resurface decided conventions (INV57, DR84)**: read the `constraint-ledger.md` of the inherited issue directory (silence if absent); conventions already decided in the same issue series are not resurfaced (if the purpose/context has changed from decline time, by semantic matching, a declined one may return; no numeric condition; INV2). When a decision is attached, append one row to the ledger (`| convention-id | host=db-design | decision | one-line context | date |`). Skip recording when the ledger / issue directory is absent. Details are owned by "Constraint decision ledger" in `.intent/discovery/README.md`.
- **Gates (same as the existing read-only posture)**: candidate surfacing only (do not auto-modify canonical, the existing schema, or the DB-design output); stay silent if the fit is weak (do not surface unrelated conventions); semantic matching (no mechanical scoring; INV2/A1); in-repo only; absence of catalog/ledger/issue directory is silence (do not stop; backward compatible). **This is auxiliary and does not replace the DB-design projection** (reading the three layers, projection, and fabrication suppression stay as they were).
## Plainness check for questions (right before output; shared)

Right before putting a question or confirmation to the user, check these 5 points (if any fails, rewrite the question in plain words before sending; the rewrite must not change the question's meaning or options):

1. **Does it stand on its own?** Would a first-time reader understand the question by itself? Are you transcribing vocabulary straight from the internal documents you just read (compass, packets, rules, etc.)?
2. **Is it overloaded?** Three or more unexplained technical terms in one question is the sign of overload — split it or reword it.
3. **Did you gloss identifiers?** When you surface an identifier (a command name, a symbol, a packet name), attach a one-line plain-words gloss at first mention.
4. **Are you overloading an ordinary word?** Even when a word looks ordinary (e.g. "stand-in", "delivery"), are you using it with a narrow project- or tool-specific meaning? If you (the tool/AI) loaded that meaning onto it, attach a one-line plain-words gloss at its first mention in the conversation or document (leave ordinary words used in their everyday sense, and established technical terms, alone).
5. **Are you conveying meaning only through a metaphor or a vague qualifier?** The foundation is precision: write so the meaning reads unambiguously (plain language is a means of staying easy to read while preserving it). Do not convey meaning only through an ungrounded vague qualifier (e.g. "significantly", "nicely") or a bare metaphor — if you use a metaphor, pair it immediately with a precise restatement (do not force established technical terms, or ordinary words in their everyday sense, into strained paraphrases — that makes things more ambiguous).

This check is generation-time prevention and works as a pair with the after-the-fact check (`/intent-validate`'s coinage check) — never prevention alone or checking alone.

## Question-content check (right before output; shared)

Right before putting a question or confirmation to the user, check the following in addition to plainness. This check does not increase the number of questions; it keeps only the questions needed at the right time.

1. **Do not re-ask known information**: read the materials the user named, the current issue's Intent artifacts, and directly referenced documents only as far as the next important decision requires. Do not ask when the material or an earlier answer already supplies the answer.
2. **Do not widen exploration without a decision**: do not make reading every document a prerequisite for starting questions. Widen reading only when you can name an important decision whose answer is still missing, and stop when the answer is found or the next document cannot be tied to that decision.
3. **Ask only about important decisions**: ask only when the answer can change the purpose, target user, scope, success criteria, user experience, promises to preserve, architecture, or a hard-to-reverse decision. Do not ask from curiosity or merely to reconfirm.
4. **Update the next question after each answer**: update confirmed facts, withdrawn premises, and remaining unresolved items, then build the next question from that state. Do not rephrase and re-ask what the user already answered.
5. **Separate symptoms from causes**: do not confirm a cause or solution from negative feedback alone. Reconsider the layer outside the current work when there is an intent mismatch, a contradiction with newly found material, or a second attempt to treat the same symptom. A wording correction does not restart questioning from the top-level purpose.
6. **Preserve depth guardrails**: apply this check to both `standard` and `deep`. Deep widens the range of decisions examined; it does not permit re-asking known facts or unbounded exploration. Stop asking when the needed decisions are closed.
