# Algorithm: Example Mapping

A technique for grounding abstract capabilities into observable concrete examples. Used in the Packet decomposition phase of the `standard` and `behavior-unknown` modes. It expands a capability into "rules, examples, questions, deferred" and derives the packet's Expected Behavior and Validation. In behavior-unknown mode, the observed facts pinned by the preceding Characterization Test become the input for the "examples" (observe first, organize after).

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

4. **Deferred (what you decided not to do this time)**
   - Anything judged mid-expansion as "this rule/example is excluded from this packet" must not be silently dropped — record it explicitly as **deferred**. It becomes the seed of a follow-up packet, or an Open Question.

5. **Derive Validation and Rollback from the examples**
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

- Packets must be **behavior-preserving / testable / rollbackable**. In greenfield work with no existing behavior to preserve, read behavior-preserving as "can be introduced and removed standalone without affecting anything else".
- Keep to 3–7. For packets that are too many or too large, present split proposals.
- Do not drop them too far down into implementation tasks (above an Issue, before a spec).
- Do not change code.

## Output

Update (present as a proposal) `packets.md`. Each packet has the structure above. Of the four expansion columns (Rules / Examples / Questions / Deferred), the rules and examples flow into each packet's Expected Behavior, the questions go to Open Questions, and the deferred items are kept in the `Deferred` section of `packets.md`.
