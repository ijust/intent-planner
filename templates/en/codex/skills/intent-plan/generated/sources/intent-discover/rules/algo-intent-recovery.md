# Algorithm: Intent Recovery

A technique for recovering intent after the fact from existing code that was written without recording any intent (vibe coding). It sits between GORE-lite and Drift Analysis in the discover phase of `refactor` mode. Drift Analysis measures the gap between an intended design and the current state, but vibe-coded code lacks that baseline entirely. This technique back-derives candidate intent from the observable facts of the code and produces a baseline that Drift Analysis can consume.

## When to use

- The existing code was written without explicit design intent, spec, or design documentation (vibe coding, a prototype pushed into production, the legacy of someone who has left, etc.).
- Even when you try to draw out L0–L3 with GORE-lite, the "how it should be" exists neither in anyone's head nor in documentation, and can only be drawn from the code.
- The behavior itself is observable (so this is not a `behavior-unknown` case), but the **intent that produced that behavior is absent**.

## Procedure

Input = existing code whose intent is absent (structure, dependencies, key behaviors). Output = back-derived candidate intent (L0–L3, all inferred).

1. **Back-derive candidate intent from the code**
   - From the structure, dependency direction, key data flows, and recurring patterns, draw out "what this code appears to be trying to achieve" as L1 (outcomes) / L2 (capabilities) / L3 (behavior / design intent).
   - This is a **conjecture** from the observed code, not the author's true intent.

2. **Always place recovered intent as inferred**
   - Place the back-derived L0–L3 not as canonical (confirmed) but as **inferred (guessed = Assumptions)**. In vibe coding, the distinction between "happened to write it this way" and "designed it this way" is not preserved in the code, so mixing it with the confirmed side falls into the trap of treating fabricated intent as fact.
   - Note the basis for the recovery (which code observation it was drawn from) alongside each inferred intent.

3. **Sort intentional vs. accidental, and send confirmation back to humans**
   - For each recovered intent, sort whether it is "the result of a design decision" or "incidental / by happenstance". Do not finalize unjudgeable ones by guessing; send them to **Open Questions** and seek human confirmation.
   - Only intent that a human has confirmed / endorsed may later be promoted to canonical.

4. **Pass it to Drift Analysis as a baseline**
   - Use the recovered (inferred) candidate intent as the "intended design" side of the input to the subsequent Drift Analysis. This lets Drift Analysis measure the drift of "recovered intent → current code".
   - If the recovered intent is thin, the drift will be thin too, so draw out L1–L3 to a degree sufficient for Drift Analysis to produce a practical drift.

## Discipline

- **Recovery, not justification**: draw out intent from the fact that the code is written as it is; do not endorse "the existing code is correct". Raise even mistaken designs and unnecessary complexity as candidate intent, and handle them via Drift / Open Questions.
- **Always inferred**: do not mix recovered intent with canonical. Do not promote it to confirmed without human endorsement (strictly observe GORE-lite's canonical/inferred separation).
- **A planning technique, not execution**: do not change code here.

## Output

Back-derived candidate intent (L0–L3, all inferred, with recovery basis and intentional/accidental sorting). Reflect it (present as a proposal) into the corresponding L levels and the Assumptions / Open Questions of `intent-tree.md`, and use it as the input to Drift Analysis.
