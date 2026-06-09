# Algorithm: Example Mapping

A technique for grounding abstract capabilities into observable concrete examples. Used in the Packet decomposition phase of `standard` mode. It expands a capability into "rules, examples, questions" and derives the packet's Expected Behavior and Validation.

## Procedure

For each L2/L3 capability, expand it as if writing four-color cards.

1. **Rules (the rules the capability follows)**
   - Bullet the rules/constraints the capability must satisfy.

2. **Examples (observable concrete scenarios)**
   - For each rule, give concrete examples of "when this happens, behave like this".
   - These become the packet's **Expected Behavior** (the behavior observable after completion).

3. **Questions (undetermined)**
   - Anything that cannot be filled in when trying to write an example, or that requires a decision, leave it as a "question".
   - This becomes the packet's **Open Questions**, or is sent back to the Compass.

4. **Derive Validation and Rollback from the examples**
   - How to verify each example (tests / manual check / type checking / log check) → **Validation**.
   - How to revert on failure → **Rollback**.

## Assembling the packet

Consolidate the expansion results into packets. Each packet satisfies the following.

- **Parent Intent**: a reference to the corresponding L0/L1/L2/L3 (required).
- **Scope / Non-scope**: what is included / what is not.
- **Expected Behavior**: derived from the "examples" above.
- **Safety / Invariants**: derived from the Compass invariants.
- **Validation / Rollback**: derived from the above.
- **cc-sdd Mapping**: the policy for how to hand off to cc-sdd.

## Discipline

- Packets must be **behavior-preserving / testable / rollbackable**.
- Keep to 3–7. For packets that are too many or too large, present split proposals.
- Do not drop them too far down into implementation tasks (above an Issue, before a spec).
- Do not change code.

## Output

Update (present as a proposal) `packets.md`. Each packet has the structure above.
