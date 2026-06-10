# Algorithm: Migration Slicing

A technique for decomposing a large change into "migration slices" that preserve behavior and can be shipped individually. Used in the Packet decomposition phase of `refactor` mode. It cuts the gap between the intended design and the current state into behavior-preserving / testable / rollbackable units, deriving a path that advances from the current state one step at a time.

## Procedure

Input = the Intent of the refactor target (the intended design) and the current state, plus the drift list produced by Drift Analysis.

1. **Cut the gap into minimal migration units**
   - Split the current → intended gap into the smallest units that can be applied without breaking behavior.
   - Make each slice individually deployable and have it advance the design one step while preserving the existing behavior.

2. **Order by dependency, into a chain of unblocks**
   - Order the slices by their dependencies so that each slice unblocks the next.
   - Confirm that at whichever slice you stop, the state up to that point is consistent (intermediate states are also behavior-preserving).

3. **Attach a verification point and rollback to each slice**
   - Attach a characterization / regression verification point to each slice so that behavior preservation is observable → **Validation**.
   - How to revert on failure (each slice must be reversible on its own) → **Rollback**.

## Assembling the packet

Consolidate the ordered migration slices into packets. Each packet satisfies the following.

- **Parent Intent**: a reference to the corresponding L1/L2/L3 (required). If it stems from a drift, also indicate the original drift.
- **Scope / Non-scope**: the migration this slice includes / does not include.
- **Expected Behavior**: the existing behavior preserved after the migration.
- **Safety / Invariants**: invariants that must not be broken during the migration.
- **Validation / Rollback**: derived from the above.
- **cc-sdd Mapping**: the policy for how to hand off to cc-sdd.

## Discipline

- Each slice must be **behavior-preserving / testable / rollbackable**.
- Order slices by dependency, and each must be individually deployable.
- Keep to 3–7. For slices that are too many or too large, present split proposals.
- This is the structuring of intent (a packet-decomposition technique), not migration execution code. Do not change code.

## Output

An ordered set of migration slices. Each slice has the structure above, and its Scope / Validation / Rollback flow into each packet. Update (present as a proposal) `packets.md`.
