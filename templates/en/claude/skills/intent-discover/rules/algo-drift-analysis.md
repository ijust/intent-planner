# Algorithm: Drift Analysis

Makes the gap (drift) between the current implementation/structure and the intended design observable. Used together with GORE-lite in the discover phase of `refactor` mode to surface, among L0–L4, the divergence between the current state and especially L3 (behavioral / design intent).

## Procedure

1. **Take a light inventory of the current state (input)**
   - Roughly grasp the target repository's structure, dependency direction, key behaviors, and whether tests exist. Not exhaustive; a granularity that can be matched against intent is enough.
   - Keep at hand the implicit design intent (L1–L3 drawn out via GORE-lite).

2. **Match against the intended design**
   - Compare each observation of the current state with the corresponding Intent (L1 Desired Outcome / L2 Capability / L3 Behavioral / Architectural Intent).
   - Lay out, as facts, the gap between "how it is now" and "how it should be".

3. **Enumerate the drifts**
   - Distinguish the types: deviation (design that contradicts intent), decay (boundaries / dependencies that have eroded over time), and accumulated local optima (point optimizations that encroach on the overall intent).
   - Write each drift as a "current → intended" pair. Do not delve into speculative causes.

4. **Classify each drift under a parent intent**
   - Identify "which Intent each drift deviates from" and tie it to the corresponding L1/L2/L3.
   - Send any whose tied Intent is ambiguous or undetermined to Open Questions.

## Discipline

- **A planning technique, not execution**: capturing drift is the structuring of intent; do not perform refactoring or code changes here.
- **Separate facts from guesses**: record the observed current state as fact, and separate conjecture about causes / response direction into `Assumptions`.
- **Send undetermined items to Open Questions**: anything where you cannot judge which intent it deviates from, do not fill with guesses; write it into Open Questions.

## Output

A list of drifts (current → intended, type of deviation, corresponding parent intent). Reflect them (present as a proposal) into the L3 and Open Questions / Assumptions of GORE-lite's `intent-tree.md`.
