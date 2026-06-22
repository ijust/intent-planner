# Algorithm: Additive Slicing

A technique for decomposing a new feature into "additive slices" that are added in an order that does not affect existing behavior. Used together with Example Mapping in the Packet decomposition phase of `feature-growth` mode. It composes the slices in three stages — establish the seam → additively stack the new feature → wire it into the existing system — deriving a path where each slice can be delivered independently while preserving the existing behavior. Where Migration Slicing takes a drift list (gaps to fix) as input, Additive Slicing takes the impact list and the new feature's intent — the inputs differ, so the two are not interchangeable.

## Procedure

Input = the new feature's intent (structured via GORE-lite and concretized via Example Mapping) and the impact list produced by Impact Analysis in discover (each item = boundary touched / existing contract depended on / kind of impact). A thin impact list turns the slices into guesswork — if it lacks the depth to design the seams, go back to discover.

1. **Cut the slice that establishes the seam**
   - From the impact list's "extend / requires change" items, identify the junction points where the new feature meets the existing system, and put first a **behavior-preserving slice that creates the junction with the minimal change to the existing code**.
   - Reference the established tactics: the interface insertion of **Branch by Abstraction** (Fowler / Hammant), the expand stage of **Parallel Change (expand-contract)** (Danilo Sato), and the **seam concept** (Feathers, Working Effectively with Legacy Code). All are moves for "creating a point where a new implementation can be plugged in without changing existing behavior".
   - When the seam-establishing slice completes, the existing observable behavior must be unchanged.

2. **Stack the new feature additively**
   - Beyond the seam, stack the new feature as a **set of slices consisting only of new code that does not touch existing code**. The slices in this stage are unreachable from the existing system before wiring, so they can be stacked while keeping the impact on existing behavior at zero.
   - The examples concretized by Example Mapping flow into each slice's Expected Behavior.

3. **Wire it in and activate**
   - Finally, place the **wiring slice that activates the new feature via the seam**. The wiring must be revertible to disabled on its own (each packet's Toggle Plan makes this concrete).

4. **Explore and split candidates with SPIDR**
   - For exploring slice candidates and splitting slices that are too large, use **SPIDR** (Mike Cohn: the five cuts of Spike / Paths / Interfaces / Data / Rules) as an auxiliary heuristic.
   - Rough affinity with the stages: seam stage = Interfaces, additive stage = Paths / Rules, wiring stage = Data / Rules.

5. **Attach a verification point, rollback, and toggle plan to each slice**
   - Attach a regression verification point for existing behavior, so that behavior preservation is observable → **Validation**.
   - How to revert on failure (each slice must be reversible on its own) → **Rollback**.
   - Which scope is off-by-default / under what condition the toggle gets removed → **Toggle Plan**.

6. **Confirm the termination of the impact list**
   - Confirm that every item in the impact list terminates as one of — "protected by the Safety / Invariants of some slice" or "sent to Open Questions". Leave no item that is neither.

## Assembling the packet

Consolidate the three-stage ordered additive slices into packets. Each packet satisfies the following.

- **Parent Intent**: a reference to the corresponding L1/L2/L3 (required). If it protects an impact-list item, also indicate the original item.
- **Scope / Non-scope**: the addition this slice includes / does not include.
- **Expected Behavior**: derived from the "examples" of Example Mapping. For the seam and wiring slices, also note "the existing behavior preserved".
- **Safety / Invariants**: invariants that must not be broken during the transition. State explicitly which impact-list items it protects (derived from the Compass invariants).
- **Validation / Rollback**: derived from the above.
- **Toggle Plan**: which scope is off-by-default / under what condition the toggle gets removed (Hodgson's Release Toggles). Estimating the toggle's implementation difficulty is outside the planning scope — write up to the plan for its existence and lifetime.
- **cc-sdd Mapping**: the policy for how to hand off to cc-sdd.

## Discipline

- Each slice must be **behavior-preserving / testable / rollbackable**.
- **Impact-list traceability**: every item in the input impact list must terminate as one of — protected by the Safety / Invariants of some slice, or sent to Open Questions. Never silently drop an item.
- **Keep the stage order**: establish the seam → add → wire. Do not embed directly into existing modules without creating a seam.
- Keep the count variable with the expected change size; do not pad it (one is fine for very small changes; treat 1–7 as a loose guide). For slices that are too large, present split proposals along the SPIDR cuts.
- This is the structuring of intent (a packet-decomposition technique), not addition execution code. Do not change code.

## Output

An ordered set of additive slices (establish the seam → add → wire). Each slice has the structure above, and its Scope / Validation / Rollback / Toggle Plan flow into each packet. Update (present as a proposal) the packet files (under `active/`).
