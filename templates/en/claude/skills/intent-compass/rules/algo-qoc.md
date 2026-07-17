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
   - **Record the premise a rule stands on**: when you write an Invariant / Decision Rule / Anti-direction, also record **what must be true for that rule to hold (its premise)** in the existing prose (around a Decision Rule's Context, or an Anti-direction's supporting notes). When a premise collapses, the rule stays correct yet fires at nothing — and because the rule is still correct, wrong fixes keep being blocked by it, so the friction shows up furthest from the cause. A recorded premise gives you the foothold to notice "this rule is no longer landing." **Do not add a new required field or a new section** (let it ride alongside the existing prose). If no premise comes to mind, leave it out rather than filling it in by guesswork (recording it is not mandatory).

3. **Explicitly enumerate Anti-direction**
   - Write the directions to avoid. In particular, concretely enumerate **the local optimizations / quick-fix refactors Claude tends to make**. This is the most important section of the Compass.
   - Use a **pre-mortem** to generate the list: **assume** this change has been implemented and the overall design ended up broken or off-intent — then ask "what did the agent do?" Looking back from that imagined future (prospective hindsight) surfaces failure paths to record as Anti-direction. It detects failure factors better than ad-hoc enumeration.
   - Examples: "fix some other processing while at it", "bulk replacement without tests", "push domain logic into the UI".
   - **Deep questioning lane (only when question-depth=deep; A46; DR86; INV58)**: read `question-depth` in the inherited issue directory's `mode.md` (recorded by `/intent-discover`; treated as standard if absent). **Only when it is `deep`**, do not complete the pre-mortem / impact-list derivation by the AI alone; **also turn them into questions for the user** (e.g., "if this approach were to fail, what do you think the cause would be?", "which existing behavior would hurt most if this change broke it?", "if this design became a burden months from now, where do you think it would bite?"). Fold the answers into Anti-direction / Invariant candidates by hand. On standard / absent / `designer-questions=off`, **this lane does not fire** (as before, AI derivation + omission recap only = the default experience is unchanged). Guardrails (INV58; strictly): few at a time (do not fire one by one); a one-line reason per question (not an interrogation); "later / unsure / n/a" always selectable; **do not present values first** (ask, but do not put a "reasonable default" that drags the judgment = isomorphic to the anchoring avoidance in the Invariants procedure). This questioning goes from the AI to the human (eliciting intent), the reverse direction from the intent-side Self-Probing in `intent-packets/rules/decision-probe.md` (the AI judging its own hypothesis against the ledger's evidence = AI→ledger); do not raise the same question twice.

4. **Fix the Invariants in two layers**
   - Behavior / API / data / UX / operational constraints that must not be broken.
   - **Route the confirmations according to the role lens**: if the inherited issue directory's `mode.md` has a `lens:` line (the role lens = the perspectives this case needs and whether each is held by a person or stood in for; the readers' contract is in CONTRACT.md "State sharing between skills"), direct the confirmations below for a **person** perspective to that person, and for a **stand-in** perspective switch to filling in an inferred draft first and asking only for affirmation (standing in for an absent perspective). Without the line, behave as before (backward compatible).

   - **Before deriving anything by inference, confirm with the user using a fixed set of categories**. Establish user-supplied constraints as canonical first, then add inference-derived constraints afterward only to fill the gaps (complement, not replacement). Present the following categories **in order of importance** (to control cognitive load):
     1. Data / personal information (PII) — what data must never be deleted or leaked.
     2. External dependencies / existing contracts — what behavior must hold even if they go down or change.
     3. Operations / failure-mode behavior — what to protect first under failure, high load, or partial outage.
     4. Security / privacy / legal — what conventions or regulations are fatal to violate.
     5. Performance / availability — whether there is a threshold below which it counts as failure.
     6. Technical constraints — whether there is a technology stack / language / framework / platform / license that must be used or must not be used. For this category, loss-reverse reasoning is unnatural, so ask in the **affirmative (direct form)** rather than the negative ("is there any technology that must be used or must not be used?"). Run whatever surfaces through an **over-promotion filter**: is it a constraint that becomes an external problem when broken (a requirement-level How), rather than a preference or default choice (a solution-level How)? Turn only the former into an Invariant. Note that this is distinct from the design decisions (L3) derived by this change; place here only external, change-independent boundaries (do not duplicate with L3).
     7. Invariants / prohibitions — anything else that "must never be the case".
     8. Experience promise — when the experience does not proceed normally, what part of the experience promised to users would break? Ask from a failure premise across four perspectives: tone and voice, accessibility, stance during errors, and perceived speed and processing-state feedback.
   - Route "Experience promise" through the existing role lens in procedure 4: ask a person directly, or ask for affirmation of an inferred draft for a stand-in. Do not create another route or classification.
   - Before presenting "Experience promise", cross-check the shared starters `accessibility-wcag`, `ui-non-happy-states`, `system-status-feedback`, and `experience-language-recovery` in that order, read-only. Reuse rather than duplicate obligations already covered by those starters, and surface only a case-relevant gap as a candidate. Do not automatically adopt a starter itself as a requirement or Invariant.
   - For "Experience promise", from the read case context generate 2–3 weak cues of differing nature on the spot. Do not embed fixed examples; explicitly say "this is not exhaustive; raise anything else". If the context cannot support examples, present only the category frame.
   - For "Experience promise", allow "not applicable / unknown / confirm later" and do not force an answer. Do not fill deferred content by inference.
   - Send only content the human adopts to the following "Binding classification contract" for assessment as an Invariant candidate. Do not automatically promote declined, deferred, or Preference / Heuristic content into a project-universal Invariant.
   - For each category, attach **2–3 weak cues of differing nature, generated on the spot** from the read project context (tech stack / domain / existing code / README) — do not embed fixed example strings. Always state that the examples are **not exhaustive ("this is not a complete list; raise anything else")** so thinking is not fixated on the shown examples.
   - When no concrete examples can be generated from the context, present only the category frame (the heading) so the user can fill it in from their own context (fallback).
   - Phrase the question not in the affirmative ("is X needed?") but as a **failure premise / in the negative** (e.g. "what is the worst that happens if this is completely ignored", "what must be protected even if an external dependency goes down", "what data must never be deleted"). Turn only what truly must be protected into an Invariant, from the loss scenario; do not mix in excessive assumptions (the technical-constraints category uses the direct form; see that category for the reason).
   - For each category, present it so the user can choose "not applicable / unknown / confirm later"; do not force an answer. For items the user defers or marks "confirm later", do not fill them with guesses — escape them to `Open Questions` (with the `[by export]` tag where appropriate) and do not halt compass construction.

   - Sort the collected constraints into the **two Invariant layers**. **Project-universal invariants** (common to all work, small in quantity) are fixed into the compass `## Invariants`. **Packet-specific invariants** (constraints limited to a specific work unit) are held in `## Open Questions` as "packet-specific constraints (candidates)", since during the compass phase packets are normally not yet drafted (later `/intent-packets` transcribes them into the relevant packet's Safety/Invariants). Among the non-functional requirements, those that are **target values** (performance / availability thresholds, etc.) are sorted into `Decision Rules` or the Intent Tree's L1 (measurement criteria).
   - For the project-universal ones, recommend placing them in `.kiro/steering/` via `/kiro-steering-custom` so they take effect across all work (do not place automatically; keep them small to avoid increasing startup context).

### Binding classification contract

Before fixing a constraint candidate in canonical artifacts, quote its source and assess these three axes together with the QOC grounds.

- **External harm if broken**: would breaking it cause a problem for users, data, external contracts, operations, law, or another concern that cannot be reduced to an implementer's preference?
- **Universality**: does it apply across the project's work, beyond one case, period, or implementation approach?
- **Choice versus local solution**: is it a decision among multiple viable options that binds future work, or only a local means, default, or preference for this case?

Return exactly one of the following outcomes, with its grounds and existing destination.

| Outcome | Basis | Existing destination |
|---|---|---|
| Invariant | Breaking it causes external harm and it must hold beyond a case or local solution | Compass `Invariants` |
| Decision | A reasoned choice among multiple viable options binds future work | Compass `Decision Rules` |
| packet-specific constraint | It must hold within one packet but is not project-universal | The packet's Safety / Invariants; before packet creation, a candidate in `Open Questions` |
| Preference / Heuristic | It is a preference, default, or local solution whose violation does not by itself cause external harm | Evidence or non-binding guidance; do not fix it as an Invariant or Decision |
| `unknown` | Missing or conflicting evidence about source, external impact, scope, or options prevents classification | Put the evidence and a confirmation question in `Open Questions`; do not fix it in canonical artifacts before human confirmation |

- When a human confirms an Invariant or Decision, preserve the **reason, alternatives considered, and revisit condition** in QOC / Evidence so the judgment remains traceable. Record a Decision in the existing six-field form, including Why / Alternatives considered / Revisit when.
- Do not promote `unknown`, Preference / Heuristic, or a packet-specific constraint into a stronger classification without human confirmation.
- This is an authoring-time judgment contract. It does not add a new required field such as strength to every artifact or existing Invariant.

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
## Plainness check for questions (right before output; shared)

Right before putting a question or confirmation to the user, check these 4 points (if any fails, rewrite the question in plain words before sending; the rewrite must not change the question's meaning or options):

1. **Does it stand on its own?** Would a first-time reader understand the question by itself? Are you transcribing vocabulary straight from the internal documents you just read (compass, packets, rules, etc.)?
2. **Is it overloaded?** Three or more unexplained technical terms in one question is the sign of overload — split it or reword it.
3. **Did you gloss identifiers?** When you surface an identifier (a command name, a symbol, a packet name), attach a one-line plain-words gloss at first mention.
4. **Are you overloading an ordinary word?** Even when a word looks ordinary (e.g. "stand-in", "delivery"), are you using it with a narrow project- or tool-specific meaning? If you (the tool/AI) loaded that meaning onto it, attach a one-line plain-words gloss at its first mention in the conversation or document (leave ordinary words used in their everyday sense, and established technical terms, alone).

This check is generation-time prevention and works as a pair with the after-the-fact check (`/intent-validate`'s coinage check) — never prevention alone or checking alone.
