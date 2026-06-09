# Algorithm: Characterization Test

A technique for capturing the "observable behavior" of unknown legacy as test points that pin it down exactly as it is now. Used together with Example Mapping in the Packet decomposition phase of `behavior-unknown` mode. Before structuring intent, it fixes "how it behaves now" as a safety net and derives the packet's Expected Behavior and Validation from observed facts.

## Procedure

Input = the target whose behavior is unknown (legacy code / existing behavior) and the observed scenarios raised in Example Mapping.

1. **Observe the current behavior and pin it down without judging**
   - Observe the target's current inputs/outputs and side effects, and write them down as characterization test points (tests that pin the current behavior exactly as it is) without judging "whether it is correct".
   - This is the planning of test points, not actual test code implementation.

2. **Map the pinned behavior to the "examples" of Example Mapping**
   - Tie each pinned behavior to an "example" of Example Mapping, and sort which are intentional and which are accidental.
   - Send the accidental ones (side effects / dependencies that cannot be separated from intent) to **Open Questions**; do not promote them to intent by guessing.

3. **Make the characterization tests the starting point of Validation**
   - Use the sorted behavior points as the starting point of each packet's **Validation**, so they can be used for regression detection during refactoring.
   - How to revert on failure → **Rollback**.

## Assembling the packet

Consolidate the pinned behavior points into packets. Each packet satisfies the following.

- **Parent Intent**: a reference to the corresponding L1/L2/L3 (required). If it stems from an observation, also indicate the original behavior.
- **Scope / Non-scope**: the behavior included / not included.
- **Expected Behavior**: derived from the current observed behavior pinned above.
- **Safety / Invariants**: among the pinned behaviors, the invariants that must not be broken.
- **Validation / Rollback**: derived from the above.
- **cc-sdd Mapping**: the policy for how to hand off to cc-sdd.

## Discipline

- **Observation, not judgment**: pin the current behavior as fact exactly as it is, and do not delve into judging correctness or into causes.
- For anything where you cannot judge whether it is intentional or accidental, do not fill it with guesses; send it to **Open Questions**.
- This is the structuring of intent (a technique that pins down intent by observing behavior), not actual test code implementation. Do not change code.

## Output

A set of test points that pin the current behavior (with the intentional / accidental sorting). The Expected Behavior / Validation of each point flows into each packet. Update (present as a proposal) `packets.md`.
