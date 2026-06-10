# Algorithm: Impact Analysis

Inventories, before implementation, which existing boundaries, contracts, and data flows a new feature touches. Used together with GORE-lite in the discover phase of `feature-growth` mode. It translates the idea of Change Impact Analysis (Bohner & Arnold) from tool-based dependency analysis into a planning technique based on LLM reading. Where Drift Analysis asks "what is the gap between the current state and the intent" (discover of refactor), Impact Analysis asks "what existing things does this addition touch" — the questions differ, so the two are not interchangeable.

## Procedure

Input = the new feature's intent (L1–L4 already structured via GORE-lite) and the existing codebase.

1. **Identify the starting set**
   - From the new feature's intent (especially L3/L4), list the starting points (modules, layers, APIs, data) in the existing codebase that it is likely to touch — the candidates the new feature will "read, call, or extend".
   - Grasp the existing codebase's structure by LLM reading: reading imports/references, directory structure, and call direction is sufficient (do not assume AST analysis or static-analysis tooling).

2. **Trace the ripple**
   - From each starting point, follow "if this is touched, what else is affected" one step at a time along the dependency direction, widening the candidates (the CIA idea of a starting impact set → candidate impact set). Exhaustiveness is not required, but **thicken the impact list to a depth sufficient for the downstream Additive Slicing to design the seams** (a thin inventory turns the seams into guesswork).
   - Attach **evidence** (file / code location) to each candidate. Treat ripples that cannot be confirmed by reading as conjecture and separate them into `Assumptions`.

3. **Structure into the impact list**
   - Raise the candidates as the impact list. Structure each item with the following three points:
     - **Boundary touched**: module / layer / API
     - **Existing contract depended on**: API signature, data schema, events, behavior
     - **Kind of impact**: read / call / extend / requires change
   - This structure becomes the downstream contract: in compass, each item is raised into a protective Invariant ("do not change X's existing contract"); in packets, Additive Slicing takes it as the input for seam design.
   - If "requires change" dominates, that is a sign of redesign rather than addition — note a mode reconsideration (refactor) in Open Questions.

4. **When you find drift, route it elsewhere**
   - If, during the investigation, you discover a structural problem in the existing design (drift: decayed boundaries, dependencies contradicting the intent — problems outside feature-growth's purpose), **do not fix it within this mode**; record it in Open Questions and recommend separate work in `refactor` mode. Keep only the fact "the new feature touches it" in the impact list.

## Discipline

- **A planning technique, not execution**: inventorying impact is the structuring of intent; do not perform code changes or seam implementation here.
- **Structural prohibition of drive-by refactoring**: even if you find drift, do not fix it within feature-growth. Send it to Open Questions + a refactor recommendation.
- **Separate facts from guesses**: record impacts confirmed by reading as evidence-backed facts, and separate conjecture about unconfirmed ripples into `Assumptions`.
- **Send undetermined items to Open Questions**: for boundaries where you cannot judge whether they are touched, do not fill with guesses; write them into Open Questions.

## Output

The impact list (each item: boundary touched / existing contract depended on / kind of impact, with evidence). It becomes the input for the Invariants in compass and for the seam design by Additive Slicing in packets. Reflect undetermined items and discovered drift (present as a proposal) into the Open Questions / Assumptions of `intent-tree.md`.
