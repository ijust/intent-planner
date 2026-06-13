# First Packet Recommendation

The procedure for recommending and recording exactly one packet to start with, together with qualitative reasons. Always used at the priority presentation (Step 4) of `/intent-packets`.

## Applicability

- **Always apply.** Does not depend on designer-questions in `.intent/mode.md` (apply even when it is off or unrecorded).
- In SKILL.md Step 4, apply this procedure **after** applying walking-skeleton (apply this procedure even when walking-skeleton was not applied).

## Procedure

1. **Read the materials**
   - Read the packet candidates and their priorities, the "Walking Skeleton" section of `.intent/packets/plan.md` (if recorded), and the purpose in `.intent/mode.md`.

2. **Choose exactly one packet to start with**
   - For the reasons, cite the applicable ones among the following qualitative criteria: **risk reduction** / **unblocking dependencies** / **ease of rollback** / **size of learning**.
   - When purpose=poc is recorded, always include the criterion "whether it can refute the hypothesis most cheaply" in the reasons (when purpose is unrecorded or product, do not reference purpose).

2.5. **Confirm the priorities and acceptable trade-offs with the user**
   - Before finalizing the recommendation, confirm the priorities and acceptable trade-offs with the user: **which to prioritize, speed vs. quality**, and **which scope may be cut or deferred for this starting point**.
   - This is a confirmation, not a prompt to override the recommendation. The recommendation is a proposal; when the user's priority judgment obtained here conflicts with the recommendation, prefer the user's judgment and revise the recommendation and its reasons.
   - Ask in a form where "not applicable / unknown / decide later" can be chosen, and do not force an answer. When a hold or "decide later" is chosen, do not fill it in by guessing; route the item to the "Open Questions" section of `.intent/packets/plan.md` (appending it while preserving the existing content if the section is absent) and continue the recommendation.

3. **Align with the Walking Skeleton**
   - If the decision on the walking skeleton (the minimal implementation that cuts end to end) is recorded, align the recommendation with it. When making a recommendation that does not align, state the reason explicitly.

4. **Record the recommendation**
   - Record in the "Recommended First Packet" section of `.intent/packets/plan.md`: **Recommended packet** (packet name) / **Reasons** (qualitative criteria) / **Alignment with Walking Skeleton** (aligned / if not aligned, the reason / Walking Skeleton not recorded).
   - **Non-destructive append for older scaffolds**: if `plan.md` lacks a "Recommended First Packet" section, append the section while preserving the existing recorded content, then record.

## Discipline

- Do not use numeric scoring (weighted sums, point ratings).
- The recommendation is a proposal; it does not override the user's own priority judgment.
- Do not change code.
