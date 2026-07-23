# Mapping: packet → cc-sdd

The rules for converting one chosen packet into a cc-sdd draft. Used by the `intent-export-cc-sdd` skill. This is one of the per-export-target mappings (for cc-sdd). To add another target (e.g. OpenSpec), add `rules/map-<target>.md` and create a corresponding `intent-export-<target>` skill (the seam).

## Input scope (strict / information-source contract)

- When `.intent/execution-contract.md` exists, the cc-sdd placement input is **only the one target packet and `selected` from the common selection result**. The cc-sdd-specific rules do not directly re-read or transcribe Compass Invariants / Anti-direction.
- Only when `.intent/execution-contract.md` is absent, use `selection_status: legacy-not-applied` and fall back to the existing path that directly uses the target packet plus Invariants / Anti-direction from `.intent/intent-compass.md` (fail open).
- Do not use Tree/Compass material read by the drift check or Open Questions check, or their verdicts, as input to the common selection result, downstream constraints, or internal record. If human confirmation updates canonical material, rerun common selection from the updated canonical sources.
- **Do not read** the full Intent Tree or other packets. Only when the overall direction is needed, reference Tree L0–L1 **as a summary** in a pinpoint manner (no body transcription).
- **Exception (carrying the screen-design draft; UI cases only)**: only when the target packet deals with user-facing screens (UI), you may reference the Tree's "Screen Rough Reference" section in the same pinpoint manner as L0–L1. If it holds a reference to a screen-design draft (`.intent/nl-spec/screen-design-brief*.md`), read that draft; if not, read nothing and continue as before.
- This keeps the amount of information passed to cc-sdd to about 1 packet's worth (preventing token explosion).

## Placement of the common selection result in cc-sdd

- Use the common selection result returned by `.intent/execution-contract.md`. With `selection_status: applied`, project only `selected` downstream; do not add cc-sdd-specific candidate discovery or reclassification.
- Every selected constraint carries `Identifier`, `Name`, `Law`, `Applicability`, `Verification`, and `Canonical Reference`. When any field cannot be produced without a new obligation, keep that candidate in `confirm` and do not include it in downstream constraints.
- Use `## Invariants` in `requirements.md` as the primary placement for selected constraints. In `design.md`, copy only design constraints that affect responsibility boundaries, dependency direction, side effects, migration, or technology choices; in `tasks.md`, copy only task constraints tied to individual work and verification. Do not duplicate every constraint into unrelated sections.
- Do not include ordinary selection reasons such as area match, `always`, or explicit reference in downstream prose. Include only the minimum rationale needed when the reason forms an applicability condition, downstream must resolve a constraint conflict, or regulatory, audit, or safety assurance requires grounds.
- Do not promote `confirm` candidates into MUST / SHALL statements, Invariants, or acceptance conditions. Keep their kind, evidence, and missing information only in the internal record.
- Replace `constraint-selection.md` at `.intent/cc-sdd/<packet-slug>/constraint-selection.md` in the same run according to the common internal-record contract. Do not pass `constraint-selection.md` downstream or include it in `/kiro-spec-init` inputs or phase-specific design/tasks handoffs.
- With `selection_status: legacy-not-applied`, preserve the existing packet + Compass input and placement. Do not claim that Selected or Confirmation Candidates were finalized under the new contract; refer to the primary output from Legacy Output in the internal record.
- Preserve the existing Acceptance Material, Revalidation Candidates, the candidate-only status of "Related conventions (candidates, not adopted)", and cc-sdd's three-phase approval.

## Output (drafts of 3 files / do not create the main body)

Write the drafts under the per-packet directory `.intent/cc-sdd/<packet-slug>/` (slug derivation is in the next section, "Output layout").

### `.intent/cc-sdd/<packet-slug>/requirements.md`
- The **Project Description body** (condensed text) fed into cc-sdd's `/kiro-spec-init`.
- What to include: (a) whose problem it is, (b) the current state, (c) what you want to change / In·Out scope / invariants to protect / parent intent. If the target packet has a `## Value (what happens for whom)` section, carry its gist into the head as context for (a)/(c) (so that downstream design decisions can assume "what happens for whom"; omit as before if absent = byte-equal).
- **Acceptance material (DR119 / INV75)**: transcribe, **as material**, the gist of the target packet's `## Expected Behavior` and the fit criterion (how acceptance is measured) from `## Validation`. Stay at transcription — do not turn the material into EARS form or complete the acceptance criteria (inside the draft's boundary = do not create the main body). Write the material with words whose requirement level reads unambiguously (mandatory = MUST/SHALL, prohibited = MUST NOT, recommended = SHOULD, optional = MAY; the RFC 2119 usage). This is the injection that lets the downstream requirements generation write acceptance criteria by **transcription + shaping rather than invention**; do not invent acceptance conditions the packet does not state (zero fabrication). For a packet whose Expected Behavior / Validation is thin or absent, do not force-fill; honestly note inside the section that the acceptance material is scarce (do not stop the export).
- **Required headings (output contract)**: always include the five headings `## Source Packet`, `## Parent Intent`, `## Invariants`, `## Acceptance Material`, and `## Execution Contract`. The value of `## Source Packet` is the **exact transcription** of the packet name (the anchor that identifies which packet this directory belongs to). `## Acceptance Material` holds the "acceptance material" above (even when the material is scarce, always place the section with that noted inside).
- **Bounded-autonomy mapping**: under `## Execution Contract`, reference `.intent/execution-contract.md` and briefly map the target packet's sources: Invariant=Safety; Scope / Acceptance=Scope, Expected Behavior, and Validation; Decision=Decisions; Preference / Heuristic=Agent-discretion and candidates. Hand off that a boundary-crossing discovery uses the referenced decision format and waits for the human before changing the design. Do not copy the contract body or its full three-choice menu. If the contract is absent, state "contract absent; continue with existing boundaries" in the section.
- **Implementation-time revalidation candidate mapping**: from the target packet's Agent-discretion zone, take only an undecided item that has both a reason and the same item's `Revisit when`, and transcribe it exactly once as a non-binding candidate under `### Revalidation Candidates` inside `## Execution Contract`. Never promote it into MUST / SHALL, an Invariant, or an acceptance condition. If there is no candidate, omit the subsection; a re-export must not duplicate the same item. Never carry the full text of unrelated Tree / Compass / archive material as candidates.
- **Bundle the language discipline (plainness JIT; DR151)**: at the end of `## Acceptance Material`, always place the following fixed sentence as one line (same wording every time; never omit): "Language discipline: write the documents, tasks, and questions to the user generated from this spec in words a first-time reader understands. Declare who the reader is, open in-group terms and borrowed metaphors into plain words instead of quoting them, and attach a one-line gloss to every identifier at first mention. Do not convey meaning only through metaphors or ungrounded vague qualifiers — pair any metaphor with a precise restatement right after it. Distinguish requirement levels with explicit words (must, must not, should, may)." This is a **generation-time writing discipline**, not acceptance material — do not let it be read as an acceptance criterion (keep it at the end of the section, not mixed into the material). Its downstream survival is cross-checked by `/intent-validate`'s draft-content-dropped.
- With `selection_status: applied`, limit the sources to the target packet (Why/Scope/Expected Behavior/Validation/Safety) and `selected` from the common result. Only with `legacy-not-applied`, directly use the compass's Invariants as before.

### `.intent/cc-sdd/<packet-slug>/design.md`
- **Hints to prevent oversights (bullets)** for when cc-sdd generates the design. Not the main body.
- With `selection_status: applied`, derive these hints only from the packet's Scope/Non-scope/Rollback and applicable technical constraints in `selected`. Cover responsibility boundaries, dependency direction, side effects, migration/rollback, risk, and technical constraints without directly transcribing technology-stack, infrastructure, or license constraints from Compass. Only with `legacy-not-applied`, use the existing Compass technical-constraint Invariants. If the target packet has a `## Risks` section, carry its qualitative risks (what breaks if it happens / early signs / countermeasure / who watches) into the design's risk-perspective hints (omit if absent).
- **The estimate is carried into the design hints as a reference note only** (optional): if the target packet has a `## Estimate` section, you may transcribe its range, grounds, and implementer as a one-line "Intent-side estimate (reference)" at the end of the design hints. But do **not** generate or finalize cc-sdd/kiro task estimates (intent-planner goes only as far as the draft = Non-scope). Do not let the estimate turn into a requirement or acceptance criterion (keep it distinct as reference information).
- **Carrying the screen-design draft (UI cases only; optional)**: when the input-scope exception finds a reference to a screen-design draft (`.intent/nl-spec/screen-design-brief*.md`) in the "Screen Rough Reference", transcribe into the design hints a short digest (each main screen's purpose, information priority, main action, key states, and visual direction, each with its confirmed / inferred distinction) and the reference path. Do not drop the inferred markers and do not promote them to confirmed. When there is no reference, write nothing for this item (as before).

### `.intent/cc-sdd/<packet-slug>/tasks.md`
- Place an **"Intent-derived constraints" section** (a summary of parent intent / invariant / Anti-direction) at the top.
- After that, cc-sdd's tasks-generation check items (characterization test / migration slice / each task's invariant reference).
- With `selection_status: applied`, derive task hints only from the packet's Validation/Rollback, parent intent, and applicable task constraints in `selected`. Only with `legacy-not-applied`, directly use the existing Compass Invariants/Anti-direction.
- **Downstream task-breakdown handoff**: when splitting into multiple tasks, put a check in the task hints that assigns every packet requirement and acceptance item to at least one task, leaving no boundary item unowned. Shared ownership is allowed, but do not leave a state where both sides can read it as "the other task owns this." A single-task case may close this as not applicable.
- **Acceptance counterexample check**: consider once how the requirement could still be broken while the stated acceptance condition passes. When a production-equivalent path such as wiring, configuration, or application startup affects success, include at least one check through that path in the task hints. If no production-equivalent path is meaningful, allow a reasoned not-applicable result. Do not require every test to run in production or invent a test method absent from the packet.

### "Related conventions (candidates, not adopted)" section at the end of `requirements.md` (optional · A40/DR83 host ② · DR85)
You may attach, as an **independent section at the end** of the draft (`requirements.md`), the conventions that plausibly relate to this packet, as candidates (to deliver them JIT to the downstream implementer/agent). **Keep the section separate from adopted Invariants** so the needed constraints are not confused with the spec's requirements.

- **State at the top of the section**: put one sentence saying "these are candidates, not requirements; adoption is the downstream's call" (the boundary that keeps the downstream from misreading them as requirements).
- **Keep the body to references only**: each convention carries only its `id` + name + one-line gist + catalog reference path (`.intent/constraint-starters/<domain>.md`). **Do not transcribe the convention body in full** (the catalog is canonical; this prevents double-maintenance and carrying stale copies).
- **Narrow to a few**: semantically match against the target packet's Scope / Expected Behavior and keep **only strong fits** (about 5). If the fit is weak, do not list it (you may omit the whole section).
- **Reflect the decision ledger (INV57, DR84)**: read the `constraint-ledger.md` of the inherited issue directory (silence if absent); do not list conventions that are **already adopted** (already in the packet's Safety / Invariants) or **declined**. If the purpose/context has changed from decline time (by semantic matching), a declined one may return to the candidates (no numeric condition; INV2). Details are owned by "Constraint decision ledger" in `.intent/discovery/README.md`.
- **Optional · backward compatible**: if there is no match, omit the whole section. The presence/content of the section does not affect the export's success (not even a warn; candidates are simply appended quietly). Do not write to the downstream's shared settings (steering, etc.); stay inside the read-only draft.

## Output layout (slug rule and collision rule)

### Slug rule (deterministic)

Derive the directory name (slug) from the packet name **deterministically** in the following order. The same packet name always yields the same slug.

1. Apply NFC normalization.
2. Trim leading/trailing whitespace.
3. Lowercase ASCII uppercase letters.
4. Replace whitespace and path-dangerous characters (`/ \ : * ? " < > |`) with `-`.
5. Collapse consecutive `-` into one.
6. Strip leading/trailing `-`.

- Non-ASCII characters (Japanese etc.) are preserved as-is.
- If the result is an empty string, use `unnamed-packet` as the slug and notify the user.

### Collision rule

- A collision occurs only when the slug matches an existing directory AND that directory's requirements.md `## Source Packet` heading names a **different** packet. Assign a numbered alternative starting at `-2`, and notify the user of the packet-name → directory-name mapping. Never silently overwrite.
- If `## Source Packet` names the **same** packet, it is not a collision but a re-export: update the drafts in that same directory in place.

## Propagation to impl (strategy X)

- Write the tasks hints at the granularity of "**invariant references tied to individual tasks**".
- Aim: that parent intent and invariants are **transcribed** into each task of the main `tasks.md` that cc-sdd generates. This lets an impl subagent that is invoked in a different session without reading `.intent/` still reference the invariants / Anti-direction via the cc-sdd deliverable (tasks.md).
- **Responsibility boundary**: intent-planner's responsibility goes only as far as "passing hints in a structure that is easy to transcribe". The actual transcription is left to cc-sdd's tasks generation (do not depend on cc-sdd's behavior). Complete transcription is **not a guarantee, but a probability maximized by structure**.

## Handing off Graphiti search conditions (optional; only when the target packet references the search contract)

Only when the target packet's body explicitly references Graphiti search (`graphiti-search-boundary.md` or the stage-specific search contract), add the following to the drafts. Without such a reference, add nothing (the existing draft composition stays as is).

- Place an independent section "## Graphiti Search Conditions" at the end of `requirements.md`, opening with one sentence stating that these are candidates and conditions, not requirements, and that adoption and execution are left to downstream judgment (the same boundary as the "related starters" section).
- The section carries only the following conditions copied from the target packet and the search contract, and never embeds search results, source-document bodies, or secrets into the drafts:
  - requirements: search for the rules and exceptions to apply (naming the target group and knowledge kind).
  - design: search for constraints and their rationale.
  - tasks and implementation: search only for the rules, exceptions, and grounds the work at hand needs (never widening a task's scope implicitly).
  - common: results are unverified candidates traceable to the source path or URL, version or content identity, observation time, Episode, and effective period; confirmation happens with a person opening the current canonical source. Absent, timed-out, stale, provenance-less, or validity-unknown results are never grounds for confirmation — return to the canonical sources. When Graphiti contradicts approved requirements or design, stop only the affected tasks and return to upstream confirmation (no automatic application). Search stays read-only (status checks and search only).
- Add one matching item to the `design.md` hints (searching constraints and rationale) and one to the `tasks.md` hints (searching work-specific grounds, with invariant references).
- Never intervene in cc-sdd itself or the generation and approval under `.kiro/` (the existing division of responsibility stays).

## Invariants

- Do not complete **the main body** of cc-sdd's requirements/design/tasks (drafts/hints only).
- The tasks hints must always include references to parent intent and invariants.
- **Never write into another packet's directory** (write only under the target packet's slug directory).
- Do not intervene in cc-sdd's skills.
