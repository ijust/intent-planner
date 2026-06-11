# Designer Questions

The procedure for confirming and recording whether to delegate the designer-role questions (designer-questions), and for the additional questions asked when it is on. Used in `/intent-discover` after the mode is confirmed (Step 1) and when presenting the Tree update proposal (Step 4). All dialogue is done as confirmation with the user (the means of confirmation follows the conventions in SKILL.md).

## Procedure

### After the mode is confirmed (Step 1)

1. **Confirm whether to delegate the designer-role questions**
   - Read `designer-questions` in `.intent/mode.md`. The canonical values are the two tokens `on` / `off`.
   - If undetermined, first explain what the designer-role questions confirm (list these 4 points: making the L1 success criteria measurable / confirming whether the first packet cuts through E2E / the existence of a screen rough when there are user-facing screens / the hypothesis and completion judgment in the case of validation (PoC)), then, without recommending, present the two choices (`on` = wanted / `off` = not wanted) and confirm with the user.
   - If already recorded, present the recorded content (designer-questions / purpose) and confirm only whether it should change.
   - If the user defers the decision, do not fill it in by guessing; record "whether to delegate the designer-role questions is undetermined" in Open Questions and continue.

2. **Record the confirmed designer-questions**
   - Write the confirmed token to the `designer-questions` line in `.intent/mode.md`. Downstream skills (intent-packets / intent-validate) refer to this line.
   - **Non-destructive append for older scaffolds**: if mode.md has no designer-questions / purpose line, append the missing lines while keeping the existing mode / selected / reason / definition lines. If intent-tree.md has no "PoC Experiment Definition" / "Screen Rough Reference" section, append them while keeping the existing sections, then record.

3. **Confirm the validation nature (only when designer-questions=on)**
   - Confirm with the user whether this development is "validation that verifies something (PoC = `poc`)" or "production / continuous development (= `product`)", and record it on the `purpose` line in `.intent/mode.md`.
   - Do this confirmation not only immediately after on is confirmed, but also on a re-run when designer-questions is already recorded as on and purpose is undetermined.
   - If the user defers the decision, do not fill it in by guessing; record "purpose undetermined" in Open Questions and continue.

4. **The 3 hypothesis questions (only immediately after purpose=poc is confirmed)**
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

## When designer-questions is off

The validation-nature confirmation (step 3), the 3 hypothesis questions (step 4), the L1 measurement criteria (step 5), and the screen-rough confirmation (step 6) do not fire. The only increment is the opt-in confirmation in steps 1-2, leaving the existing behavior unchanged. Even if a purpose value remains, it is not consulted unless designer-questions is recorded as on.
