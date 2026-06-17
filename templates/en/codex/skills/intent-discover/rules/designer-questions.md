# Designer Questions

The procedure for confirming and recording whether to delegate the designer-role questions (designer-questions), and for the additional questions asked when it is on. Used in `/intent-discover` after the mode is confirmed (Step 1) and when presenting the Tree update proposal (Step 4). All dialogue is done as confirmation with the user (the means of confirmation follows the conventions in SKILL.md).

## Procedure

### After the mode is confirmed (Step 1)

1. **Confirm whether to delegate the designer-role questions**
   - Read `designer-questions` in `.intent/mode.md`. The canonical values are the two tokens `on` / `off`.
   - If undetermined, first explain what the designer-role questions confirm (list these 4 points: making the L1 (outcomes) success criteria measurable / confirming whether the first packet (unit of work) is a walking skeleton (a minimal implementation that runs end to end from input to output) / the existence of a screen rough when there are user-facing screens / the hypothesis and completion judgment in the case of validation (PoC)), then, without recommending, present the two choices (`on` = wanted / `off` = not wanted) and confirm with the user.
   - If already recorded, present the recorded content (designer-questions / purpose) and confirm only whether it should change.
   - If the user defers the decision, do not fill it in by guessing; record "whether to delegate the designer-role questions is undetermined" in Open Questions and continue.

2. **Record the confirmed designer-questions**
   - Write the confirmed token to the `designer-questions` line in `.intent/mode.md`. Downstream skills (intent-packets / intent-validate) refer to this line.
   - **Non-destructive append for older scaffolds**: if mode.md has no designer-questions / purpose line, append the missing lines while keeping the existing mode / selected / reason / definition lines. If intent-tree.md has no "PoC Experiment Definition" / "Screen Rough Reference" section, append them while keeping the existing sections, then record.

2.5. **Affirm the purpose, success, and intended users (fires regardless of the designer-questions value)**
   - Affirm with the user the L0 purpose and the definition of success derived by inference: present the inferred content placed in L0 (Product Purpose) and L1 (Desired Outcomes) of `.intent/intent-tree.md`, and confirm "whether this reading of the purpose and success is correct".
   - Affirm with the user the inferred intended users and usage context (Actor): present "who, in what situation, is assumed to use this", and confirm whether it is correct.
   - Present each confirmation in a form that lets the user choose "not applicable / unknown / check later", and do not force an answer. This is an affirmation grounded in the infer + confirm philosophy, and does **not** expand into a full active questioning of the functional requirements (rather than eliciting L2–L4 one by one, it only checks that the reading of the root purpose, success, and intended users is not mistaken).
   - Content the user affirms is fixed as canonical directly under that L0/L1. The intended users are recorded as the L1 Actor directly under L1. If the user corrects it, replace the canonical with the corrected content.
   - For items the user defers or chooses "check later", do not fill them in by guessing; route them to Open Questions of `.intent/intent-tree.md` (with the `[by export]` tag if an answer is required by export) or to Assumptions (when placed as a tentative premise) and continue. Do not stop planning.

2.6. **Judge the solution convergence and do the aim-the-solution confirmation (fires regardless of the designer-questions value)**
   - Immediately after step 2.5, read the user's request (the idea and target scope) and the Intent Tree being built, and judge the **solution convergence** of the target architecture the request aims at. The judgment is done by LLM reading and does not depend on external analysis tools or mechanical scoring.
   - Handle it with three branches — convergent / divergent / undecidable:
     - **Convergent** (the request implies a specific architecture almost uniquely; it matches an established pattern) → proceed to the aim-the-solution single-question confirmation below.
     - **Divergent** (multiple valid solutions hold) → do not aim the solution first; proceed via the conventional route (apply the anchoring avoidance of step 7, the Impact Analysis stocktake and neutral option presentation).
     - **Undecidable** → do not finalize by guessing; **treat it as divergent**, and record that it cannot be judged in Open Questions of `.intent/intent-tree.md` and continue.
   - Keep the examples of established patterns to a few and do not enumerate them exhaustively (e.g. cron-ization, CLI-ization, one-shot-ization, etc.; avoiding fixation — examples are cues, not the space of solutions).
   - **Aim-the-solution single-question confirmation when convergent**:
     - **Before** the Impact Analysis stocktake and neutral option presentation, confirm the inferred architecture in **a single question** — "the architecture you are aiming for is this, right?" (do not break it into neutral multiple options).
     - Present the confirmation in a form that lets the user choose "not applicable / unknown / check later", and do not force an answer.
     - Handle the result with the same recording discipline as step 2.5: **affirmed** → record the inferred target architecture as canonical in `.intent/intent-tree.md` (record it directly under the relevant L3 (architectural intent), or as an architecture policy directly under L1/L2, using an existing section; do not add a new section). **corrected** → replace the canonical with the corrected architecture. **deferred / check later** → do not finalize by guessing; route it to Open Questions (with the `[by export]` tag if an answer is required by export) and continue (do not stop planning).
     - Aiming the solution goes only as far as **confirming and recording** the architecture; do not implement or generate code.

3. **Confirm the validation nature (only when designer-questions=on)**
   - Confirm with the user whether this development is "validation that verifies something (PoC = `poc`)" or "production / continuous development (= `product`)", and record it on the `purpose` line in `.intent/mode.md`.
   - Do this confirmation not only immediately after on is confirmed, but also on a re-run when designer-questions is already recorded as on and purpose is undetermined.
   - If the user defers the decision, do not fill it in by guessing; record "purpose undetermined" in Open Questions and continue.

4. **The 3 PoC questions (hypothesis / falsification criteria / GO-NO-GO; only immediately after purpose=poc is confirmed)**
   - Ask the user in this order: Hypothesis (what this PoC is meant to verify) → Falsification Criteria (what, if it cannot be observed, rejects the hypothesis) → GO-NO-GO Criteria (the conditions for deciding whether to proceed or stop after the PoC completes).
   - Record the answers as canonical in "PoC Experiment Definition" of `.intent/intent-tree.md`. For items the user cannot answer, do not fill them in by guessing; record them in Open Questions and continue.
   - **When purpose is not poc, do not fire these questions.**

### When presenting the Tree update proposal (Step 4, designer-questions=on only)

5. **Confirm L1 measurement criteria**
   - For each L1 item, confirm with the user "how achievement is observed and judged", and record it as a `Measurement criteria:` line on that L1 item.
   - For items where the criteria cannot be settled, keep the L1 item itself and record "criteria undecided" in Open Questions.

6. **Confirm whether a screen rough exists**
   - First, judge whether L2/L3 includes user-facing screens.
   - If it does, confirm the existence of a screen rough with the user: exists → record the reference (file path or link) in "Screen Rough Reference". Does not exist → recommend creating one. If the user defers, record that decision with the reason in Open Questions or "Screen Rough Reference" and continue.
   - If it does not, do not confirm with the user; **always** record "Not applicable" in "Screen Rough Reference" (so that intent-validate can judge without inference).
   - Do not create or generate the rough itself (only confirm existence, recommend, and record the reference).

6.5. **Confirm omissions and excess with the tree-level omission recap**
   - Before finalizing the Tree update proposal, return a short summary of the inferred and collected L0–L3 (purpose, success, intended users, and the main outcome and feature branches), and confirm with the user "whether anything is missing or, conversely, whether any premise is excessive" (presented as material for a human to correct the LLM's oversights and hallucinations). This is an omission recap applied to the functional requirements as well, not an eliciting of L2–L4 one by one.
   - If the user points out a **missing** item, reflect it into the relevant section of `.intent/intent-tree.md` and re-present: a missing purpose / success → directly under L0 (Product Purpose) / L1 (Desired Outcomes); a missing intended user → directly under L1 as the L1 Actor; a missing outcome / feature branch → the branch directly under the relevant L1.
   - If the user points out something **excessive**, after confirming, remove that item from the canonical (the relevant section of intent-tree.md). If unsure, do not remove it but demote it to Assumptions of `.intent/intent-tree.md` (keep it as a tentative premise). Always confirm with the user before removing.
   - Present each confirmation in a form that lets the user choose "not applicable / unknown / check later", and do not force an answer. For points the user defers or chooses "check later", do not fill them in by guessing; route them to Open Questions of `.intent/intent-tree.md` (with the `[by export]` tag if an answer is required by export) and continue.
   - Keep the re-editing to at most one round trip (do not converse endlessly in the recap). Route any remaining points to Open Questions of `.intent/intent-tree.md`.

7. **Confirm the posture for decisions-under-constraints (④)**
   - Among the L2/L3 capabilities, briefly summarize those that involve mutating data, external input / system boundaries, or access control, and confirm **all at once, just once**: "in this set of features, which places should we decide on — consistency, idempotency, behavior on error, who may access". (Do not turn each ④ item into an active question one by one; do this as the same "confirm nothing is missing" as the omission recap.)
   - This is not a step that fills in the decisions here and now; it is a step that **captures the posture of which capabilities should have decision slots (④) sown**. **Only for design decisions whose solution is divergent**, do not present a reasonable default value (avoiding anchoring bias). Conversely, for an architecture request judged **convergent** in step 2.6, do not apply anchoring avoidance — aim the inferred solution first (see the aim-the-solution step in 2.6). The list and firing conditions of the slots are owned by `intent-packets/rules/decision-slots.md` (its anchoring-avoidance discipline is unchanged regardless of this step's scoping).
   - For what the user points to as "this should be decided", record it directly under the relevant L3 in `.intent/intent-tree.md` as "a point requiring a decision (④)" (do not write concrete values yet; the actual slot sowing and value finalization are done by intent-packets per packet).
   - **Prompt consider-the-opposite only for high-cost decisions**: only when the user has chosen a stance on a high-cost decision (authorization, consistency, error semantics, backward compatibility), prompt them to name at least one condition under which that stance could become inappropriate (a threat, edge case, or out-of-scope situation) (mitigating confirmation bias). Record the named conditions alongside that "point requiring a decision (④)" in `.intent/intent-tree.md`.
   - Impose this falsification prompt only on high-cost decisions. Do not impose friction on every slot and weigh the dialogue down (avoiding decision fatigue).
   - Present each confirmation in a form that lets the user choose "not applicable / unknown / check later", and do not force an answer. Do not fill in deferrals by guessing; route them to Open Questions and continue.

## When designer-questions is off

When off, the only things that fire are the opt-in confirmation in steps 1-2, step 2.5 (affirming the purpose, success, and intended users), and step 2.6 (judging the solution convergence and the aim-the-solution confirmation). Steps 3-7 (validation-nature confirmation, the 3 hypothesis questions, L1 measurement criteria, screen rough, the ④ posture) and step 6.5 (the tree-level recap) do not fire. The L0 purpose, success, and intended users, and the form of the solution (target architecture), differ in nature from the PoC-only information (steps 3-6) and are needed as the root of intent even in product development, so they are included in the minimal off configuration (the effect of preventing detours on requests with an obvious solution holds even when off). Even if a purpose value remains, it is not consulted unless designer-questions is recorded as on.
