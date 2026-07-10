# First Packet Recommendation

The procedure for recommending and recording exactly one packet to start with, together with qualitative reasons. Always used at the priority presentation (Step 4) of `/intent-packets`.

## Applicability

- **Always apply.** Does not depend on designer-questions in `.intent/mode.md` (apply even when it is off or unrecorded).
- In SKILL.md Step 4, apply this procedure **after** applying walking-skeleton (apply this procedure even when walking-skeleton was not applied).

## Procedure

1. **Read the materials**
   - Read the packet candidates and their priorities, the "Walking Skeleton" section of `.intent/packets/plan.md` (if recorded), and the purpose in `.intent/mode.md`.

1.5. **If a work plan exists, read it and use the recommended order as input for the candidate (behave as before if the section is absent)**
   - If `.intent/packets/plan.md` has a "Work plan" section (group headings + numbered lists), read it read-only and build the recommended order of work with the following **derivation rule**, using it as input for choosing the packet to start (DR139):
     - Read the section **top to bottom**. The order itself is the priority (no labels or numbers). **Items with the same number rank equally** (either may be started first).
     - **Skip** any packet that is `state=done`, has an unresolved dependency (a `depends_on` entry that is not done), or has another session's assignment declaration in `.intent/assignments/`.
     - When the order and `depends_on` conflict, **`depends_on` (the technical prerequisite) always wins**.
     - If a listed name matches no packet, state "not found" and skip that line (do not guess a mapping).
   - **When the section is absent or empty, do not fire this step and behave as before** (backward compatible). The work plan is an input for narrowing candidates; it does **not replace** the qualitative criteria in step 2 (risk reduction / unblocking dependencies / ease of rollback / size of learning) and introduces no numeric scoring (INV81/INV62). If the work plan was consulted, add to the recommendation reason, qualitatively, that it is "the head of the top-priority group in the work plan".

2. **Choose exactly one packet to start with**
   - For the reasons, cite the applicable ones among the following qualitative criteria: **risk reduction** / **unblocking dependencies** / **ease of rollback** / **size of learning**.
   - When purpose=poc is recorded, always include the criterion "whether it can refute the hypothesis most cheaply" in the reasons (when purpose is unrecorded or product, do not reference purpose).

2.5. **Confirm the priorities and acceptable trade-offs with the user**
   - Before finalizing the recommendation, confirm the priorities and acceptable trade-offs with the user: **which to prioritize, speed vs. quality**, and **which scope may be cut or deferred for this starting point**.
   - This is a confirmation, not a prompt to override the recommendation. The recommendation is a proposal; when the user's priority judgment obtained here conflicts with the recommendation, prefer the user's judgment and revise the recommendation and its reasons.
   - Ask in a form where "not applicable / unknown / decide later" can be chosen, and do not force an answer. When a hold or "decide later" is chosen, do not fill it in by guessing; route the item to the "Open Questions" section of `.intent/packets/plan.md` (appending it while preserving the existing content if the section is absent) and continue the recommendation.
   - **Route this confirmation according to the role lens**: if the inherited issue directory's `mode.md` has a `lens:` line (the role lens = the perspectives this case needs and whether each is held by a person or stood in for; the readers' contract is in CONTRACT.md "State sharing between skills"), direct this confirmation for a **person** perspective to that person, and for a **stand-in** perspective present an inferred answer as provisional and ask only for affirmation. Without the line, behave as before (backward compatible).

3. **Align with the Walking Skeleton**
   - If the decision on the walking skeleton (the minimal implementation that cuts end to end) is recorded, align the recommendation with it. When making a recommendation that does not align, state the reason explicitly.

4. **Record the recommendation**
   - Record in the "Recommended First Packet" section of `.intent/packets/plan.md`: **Recommended packet** (packet name) / **Reasons** (qualitative criteria) / **Alignment with Walking Skeleton** (aligned / if not aligned, the reason / Walking Skeleton not recorded).
   - **Non-destructive append for older scaffolds**: if `plan.md` lacks a "Recommended First Packet" section, append the section while preserving the existing recorded content, then record.

## Discipline

- Do not use numeric scoring (weighted sums, point ratings).
- The recommendation is a proposal; it does not override the user's own priority judgment.
- Do not change code.
