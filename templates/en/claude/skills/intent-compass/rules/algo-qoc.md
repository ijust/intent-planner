# Algorithm: QOC (Questions-Options-Criteria)

A technique for recording design decisions as "question, options, selection criteria". Used in the Intent Compass construction phase common to all modes. By preserving the grounds for decisions, it prevents drifting into local optimizations later (especially at the impl stage).

## Procedure

1. **Draw the North Star from the Intent Tree**
   - From L0/L1, condense "the final state this change wants to approach" into one.

2. **Expand decision points with QOC**
   - **Question**: the point of hesitation ("how to realize X").
   - **Options**: list multiple options that could be taken.
   - **Criteria**: by what criteria to choose. Check against the Intent Tree's L1 (outcomes) and invariants.
   - Condense the adopted option and its reason (criteria) into `Decision Rules` in the form "question → option taken → why".

3. **Explicitly enumerate Anti-direction**
   - Write the directions to avoid. In particular, concretely enumerate **the local optimizations / quick-fix refactors Claude tends to make**. This is the most important section of the Compass.
   - Use a **pre-mortem** to generate the list: **assume** this change has been implemented and the overall design ended up broken or off-intent — then ask "what did the agent do?" Looking back from that imagined future (prospective hindsight) surfaces failure paths to record as Anti-direction. It detects failure factors better than ad-hoc enumeration.
   - Examples: "fix some other processing while at it", "bulk replacement without tests", "push domain logic into the UI".

4. **Fix the Invariants in two layers**
   - Behavior / API / data / UX / operational constraints that must not be broken.
   - Distinguish **project-universal invariants** (common to all work, small in quantity) and **packet-specific invariants** (a specific work unit).
   - For the project-universal ones, recommend placing them in `.kiro/steering/` via `/kiro-steering-custom` so they take effect across all work (do not place automatically; keep them small to avoid increasing startup context).

5. **Leave Evidence and Open Questions**
   - Put the evidence supporting each decision (README / code / tests / logs / issues) into `Evidence`.
   - Put questions needed for decisions but still undetermined into `Open Questions`.

## Discipline

- A Decision Rule must always include the "why". Do not write only the conclusion.
- Do not leave Anti-direction empty. List at least a few concrete examples of local optimizations.
- Do not change code.

## Output

Update (present as a proposal) the `North Star / Current Drift / Direction / Anti-direction / Invariants / Decision Rules / Evidence / Open Questions` of `intent-compass.md`.
