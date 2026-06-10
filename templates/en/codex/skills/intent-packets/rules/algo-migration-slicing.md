# Algorithm: Migration Slicing

A technique for decomposing a large change into "migration slices" that preserve behavior and can be shipped individually. Used in the Packet decomposition phase of `refactor` mode. It cuts the gap between the intended design and the current state into behavior-preserving / testable / rollbackable units, deriving a path that advances from the current state one step at a time.

## Procedure

Input = the Intent of the refactor target (the intended design) and the current state, plus the drift list produced by Drift Analysis.

1. **Mikado pre-pass: back-calculate the prerequisites**
   - For resolving each drift (the goal), recursively back-calculate "what must be true first for this to be changed safely", and write the prerequisite graph (the Mikado Method's Mikado Graph) as an indented bullet list.
   - The **leaves** — entries with no prerequisites — are the changes you can start with. This is a desk back-calculation at planning time; do not experimentally change code to find out (write the implementation-time Mikado discipline of "revert immediately when an experiment fails, and attack from the leaves" into each slice's Rollback so it flows into the exported implementation hints).

2. **Cut the gap into minimal migration units**
   - Split the current → intended gap into the smallest units that can be applied without breaking behavior. Raise slices starting from the changes close to the leaves of the prerequisite graph (think of dependency discovery as the graph's job and unit decomposition as the slice's job, separately).
   - Make each slice individually deployable and have it advance the design one step while preserving the existing behavior.

3. **Order by dependency, into a chain of unblocks**
   - Order the slices by their dependencies so that each slice unblocks the next.
   - Confirm that at whichever slice you stop, the state up to that point is consistent (intermediate states are also behavior-preserving).
   - When multiple slices are startable within the dependency constraints, **put first the one that reduces the most risk / unblocks the most downstream slices**, and attach a one-sentence reason (no numeric scoring — that would be groundless pseudo-quantification).

4. **Attach a verification point and rollback to each slice**
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
- **Drift traceability**: every drift in the input drift list must terminate as one of — a slice (packet), an Open Question, or an explicit deferral with a reason. Never silently drop a drift.
- Order slices by dependency, and each must be individually deployable.
- Keep to 3–7. For slices that are too many or too large, present split proposals.
- This is the structuring of intent (a packet-decomposition technique), not migration execution code. Do not change code.

## Output

An ordered set of migration slices. Each slice has the structure above, and its Scope / Validation / Rollback flow into each packet. Update (present as a proposal) `packets.md`.
