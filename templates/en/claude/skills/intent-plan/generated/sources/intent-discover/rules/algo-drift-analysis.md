# Algorithm: Drift Analysis

Makes the gap (drift) between the current implementation/structure and the intended design observable. Used together with GORE-lite in the discover phase of `refactor` mode to surface, among L0–L4, the divergence between the current state and especially L3 (behavioral / design intent).

## Procedure

1. **Inventory the current state (input)**
   - Grasp the target repository's structure, dependency direction, key behaviors, and whether tests exist. Exhaustiveness is not required, but **thicken the drift to a depth sufficient for the downstream Migration Slicing to cut practical slices** (a thin inventory yields a thin drift list and slices that become guesswork). Use a granularity that can be matched against intent as the guide.
   - Keep at hand the implicit design intent (L1–L3 drawn out via GORE-lite). If the intended design cannot be recovered from the current state (the spec has been fully lost), `behavior-unknown` mode may fit better than refactor; if that signal surfaces during discover, note the mode reconsideration in Open Questions.

2. **Match with a Reflexion worksheet**
   - For the matching, use a lightweight worksheet borrowing the structure of Software Reflexion Models (Murphy & Notkin). Narrow the key components to **5–15 elements per analysis** (not broad and shallow — important spots, narrow and deep), and for each element lay out:
     - **Intended responsibility / dependency** (from the Intent: the corresponding L1 Desired Outcome / L2 Capability / L3 Behavioral / Architectural Intent)
     - **Observed responsibility / dependency** (from code reading: reading imports/references, directory structure, and call direction is sufficient) and its **evidence** (file / code location)
   - Classify each element as **convergence (matches) / divergence (deviates) / absence (in the intent but not found in the implementation)**.
   - This turns the drift list from "an enumeration of things that bother you" into a diff list defined in relation to the intent model.

3. **Enumerate the drifts**
   - Raise the worksheet's divergence / absence entries as drifts. Write each drift as a "current → intended" pair, attaching **diff kind (divergence / absence), evidence, and confidence (whether the evidence is direct or includes inference)**. Do not delve into speculative causes.
   - As interpretation, distinguish the types: deviation (design that contradicts intent), decay (boundaries / dependencies that have eroded over time), and accumulated local optima (point optimizations that encroach on the overall intent).

4. **Classify each drift under a parent intent**
   - Identify "which Intent each drift deviates from" and tie it to the corresponding L1/L2/L3.
   - Send any whose tied Intent is ambiguous or undetermined to Open Questions.

## Discipline

- **A planning technique, not execution**: capturing drift is the structuring of intent; do not perform refactoring or code changes here.
- **Separate facts from guesses**: record the observed current state as fact, and separate conjecture about causes / response direction into `Assumptions`.
- **Send undetermined items to Open Questions**: anything where you cannot judge which intent it deviates from, do not fill with guesses; write it into Open Questions.

## Output

A list of drifts (current → intended, diff kind and type of deviation, evidence and confidence, corresponding parent intent). Reflect them (present as a proposal) into the L3 and Open Questions / Assumptions of GORE-lite's `intent-tree.md`.
