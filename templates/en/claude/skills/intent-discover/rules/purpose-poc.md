# Purpose & PoC Questions

The procedure for confirming and recording the development purpose (purpose), and for the additional questions asked when purpose is poc. Used in `/intent-discover` after the mode is confirmed (Step 1) and when presenting the Tree update proposal (Step 4). All dialogue is done as confirmation with the user (the means of confirmation follows the conventions in SKILL.md).

## Procedure

### After the mode is confirmed (Step 1)

1. **Confirm the development purpose**
   - Read `purpose` in `.intent/mode.md`. The canonical values are the two tokens `poc` / `product`.
   - If undetermined, do not recommend; present the two choices (`poc` = PoC / validation, `product` = production / continuous development) and confirm with the user.
   - If already recorded, present the recorded purpose and confirm only whether it should change.
   - If the user defers the decision, do not fill it in by guessing; record "development purpose undetermined" in Open Questions and continue.

2. **Record the confirmed purpose**
   - Write the confirmed token to the `purpose` line in `.intent/mode.md`. Downstream skills (intent-packets / intent-validate) refer to this line.
   - **Non-destructive append for older scaffolds**: if mode.md has no purpose line, append the purpose line while keeping the existing mode / selected / reason / definition lines. If intent-tree.md has no "PoC Experiment Definition" section, append it while keeping the existing sections, then record.

3. **The 3 PoC questions (only immediately after purpose=poc is confirmed)**
   - Ask the user in this order: Hypothesis (what this PoC is meant to verify) → Falsification Criteria (what, if it cannot be observed, rejects the hypothesis) → GO-NO-GO Criteria (the conditions for deciding whether to proceed or stop after the PoC completes).
   - Record the answers as canonical in "PoC Experiment Definition" of `.intent/intent-tree.md`. For items the user cannot answer, do not fill them in by guessing; record them in Open Questions and continue.
   - **When purpose is not poc, do not fire these questions.**

### When presenting the Tree update proposal (Step 4, purpose=poc only)

4. **Confirm L1 measurement criteria**
   - For each L1 item, confirm with the user "how achievement is observed and judged", and record it as a `Measurement criteria:` line on that L1 item.
   - For items where the criteria cannot be settled, keep the L1 item itself and record "criteria undecided" in Open Questions.

5. **Confirm whether a screen rough exists (only when L2/L3 includes user-facing screens)**
   - Exists → record the reference (file path or link) in "Screen Rough Reference".
   - Does not exist → recommend creating one. If the user defers, record that decision with the reason in Open Questions or "Screen Rough Reference" and continue.
   - If you judge that no UI applies, **always** record "Not applicable" in "Screen Rough Reference" (so that intent-validate can judge without inference).
   - Do not create or generate the rough itself (only confirm existence, recommend, and record the reference).

## When purpose is not poc

The 3 PoC questions (step 3), the mandatory L1 measurement-criteria confirmation (step 4), and the screen-rough confirmation (step 5) do not fire. The only increment is the purpose confirmation in steps 1-2, leaving the existing behavior unchanged. The purpose value set (poc / product) is extensible in the future — when adding a value, revisit the choices in step 1 and the firing conditions here.
