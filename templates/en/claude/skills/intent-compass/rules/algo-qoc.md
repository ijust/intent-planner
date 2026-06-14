# Algorithm: QOC (Questions-Options-Criteria)

A technique for recording design decisions as "question, options, selection criteria". Used in the Intent Compass construction phase common to all modes. By preserving the grounds for decisions, it prevents drifting into local optimizations later (especially at the impl stage).

## Procedure

1. **Draw the North Star from the Intent Tree**
   - From L0/L1, condense "the final state this change wants to approach" into one.

2. **Expand decision points with QOC**
   - **Question**: the point of hesitation ("how to realize X").
   - **Options**: list multiple options that could be taken.
   - **Criteria**: by what criteria to choose. Check against the Intent Tree's L1 (outcomes) and invariants (constraints that must not be broken).
   - Condense the adopted option into `Decision Rules` as a **lightweight ADR** (Architecture Decision Record, Nygard format). One decision per entry, with **Context** (the question and situation) / **Decision** (the option taken) / **Why** (the selection criteria) / **Alternatives considered** (the alternatives examined; transcribe a summary of the Options compared in QOC but not adopted, together with the reasons they were rejected) / **Consequences** (what this decision imposes — explicitly connect to the Invariants it enforces and the Anti-direction it forbids) / **Revisit when** (the conditions under which this decision should be revisited; if the conditions cannot be determined, explicitly record "undetermined" — do not leave the field blank).
   - Division of roles: QOC is the **exploration tool for comparing options**; the ADR-shaped Decision Rule is the **canonical record that binds future implementation sessions**. Keep the comparison process in Evidence, and promote only the adopted decisions into Decision Rules.

3. **Explicitly enumerate Anti-direction**
   - Write the directions to avoid. In particular, concretely enumerate **the local optimizations / quick-fix refactors Claude tends to make**. This is the most important section of the Compass.
   - Use a **pre-mortem** to generate the list: **assume** this change has been implemented and the overall design ended up broken or off-intent — then ask "what did the agent do?" Looking back from that imagined future (prospective hindsight) surfaces failure paths to record as Anti-direction. It detects failure factors better than ad-hoc enumeration.
   - Examples: "fix some other processing while at it", "bulk replacement without tests", "push domain logic into the UI".

4. **Fix the Invariants in two layers**
   - Behavior / API / data / UX / operational constraints that must not be broken.

   - **Before deriving anything by inference, confirm with the user using a fixed set of categories**. Establish user-supplied constraints as canonical first, then add inference-derived constraints afterward only to fill the gaps (complement, not replacement). Present the following categories **in order of importance** (to control cognitive load):
     1. Data / personal information (PII) — what data must never be deleted or leaked.
     2. External dependencies / existing contracts — what behavior must hold even if they go down or change.
     3. Operations / failure-mode behavior — what to protect first under failure, high load, or partial outage.
     4. Security / privacy / legal — what conventions or regulations are fatal to violate.
     5. Performance / availability — whether there is a threshold below which it counts as failure.
     6. Invariants / prohibitions — anything else that "must never be the case".
   - For each category, attach **2–3 weak cues of differing nature, generated on the spot** from the read project context (tech stack / domain / existing code / README) — do not embed fixed example strings. Always state that the examples are **not exhaustive ("this is not a complete list; raise anything else")** so thinking is not fixated on the shown examples.
   - When no concrete examples can be generated from the context, present only the category frame (the heading) so the user can fill it in from their own context (fallback).
   - Phrase the question not in the affirmative ("is X needed?") but as a **failure premise / in the negative** (e.g. "what is the worst that happens if this is completely ignored", "what must be protected even if an external dependency goes down", "what data must never be deleted"). Turn only what truly must be protected into an Invariant, from the loss scenario; do not mix in excessive assumptions.
   - For each category, present it so the user can choose "not applicable / unknown / confirm later"; do not force an answer. For items the user defers or marks "confirm later", do not fill them with guesses — escape them to `Open Questions` (with the `[by export]` tag where appropriate) and do not halt compass construction.

   - Sort the collected constraints into the **two Invariant layers**. **Project-universal invariants** (common to all work, small in quantity) are fixed into the compass `## Invariants`. **Packet-specific invariants** (constraints limited to a specific work unit) are held in `## Open Questions` as "packet-specific constraints (candidates)", since during the compass phase packets are normally not yet drafted (later `/intent-packets` transcribes them into the relevant packet's Safety/Invariants). Among the non-functional requirements, those that are **target values** (performance / availability thresholds, etc.) are sorted into `Decision Rules` or the Intent Tree's L1 (measurement criteria).
   - For the project-universal ones, recommend placing them in `.kiro/steering/` via `/kiro-steering-custom` so they take effect across all work (do not place automatically; keep them small to avoid increasing startup context).

5. **Leave Evidence and Open Questions**
   - Put the evidence supporting each decision (README / code / tests / logs / issues) into `Evidence`.
   - Put questions needed for decisions but still undetermined into `Open Questions`.
   - Attach the `[by export]` tag only to questions that must be answered before export (untagged questions can be answered at any time).

6. **Confirm omissions and excess with an omission recap**
   - Before presenting the `intent-compass.md` update proposal, briefly summarize the collected and inferred constraints / non-functional requirements / invariants and ask the user "is anything missing, or conversely is any assumption excessive?" (present it as material for a human to correct the LLM's oversights and hallucinations).
   - When the user points out a **missing** item, add that constraint to the record location appropriate to its kind and re-present: universal Invariant → `## Invariants` / packet-specific → held in `## Open Questions` as a "packet-specific constraint (candidate)" / target value → `Decision Rules` or L1. Missing purpose/success items are out of compass scope (handled on the Intent Tree side); in this file, correct only the compass constraints.
   - When the user points out an **excess**, after confirmation remove that entry from canonical (`## Invariants`, etc.). If unsure, do not delete it but demote it to `## Open Questions`. Always confirm with the user before deleting.
   - Keep the re-edit to at most one round trip (do not converse endlessly in the recap). Escape any remaining points to `## Open Questions`.

## Discipline

- A Decision Rule must always include the "why". Do not write only the conclusion.
- When overturning a decision, mark the old entry as superseded and add a new entry. Do not silently let contradictory decisions sit side by side.
- Old 4-field entries recorded before the introduction of the 6-field format (those without Alternatives considered / Revisit when) remain valid; do not treat the missing fields as an error, flag them, or rewrite them.
- Do not leave Anti-direction empty. List at least a few concrete examples of local optimizations.
- Do not change code.

## Output

Update (present as a proposal) the `North Star / Current Drift / Direction / Anti-direction / Invariants / Decision Rules / Evidence / Open Questions` of `intent-compass.md`.
