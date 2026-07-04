# Mapping: packet → Spec Kit

The rules for converting one chosen packet into a Spec Kit specify input + spec hints. Used by the `intent-export-speckit` skill. This is one of the per-export-target mappings (for Spec Kit). To add another target, add `rules/map-<target>.md` and create a corresponding `intent-export-<target>` skill (the seam). Do not change other targets' map rules.

## Input scope (strict / information-source contract)

- Read only **the one target packet** and **the Invariants / Anti-direction of `.intent/intent-compass.md`**.
- **Do not read** the full Intent Tree or other packets. Only when the overall direction is needed, reference Tree L0–L1 **as a summary** in a pinpoint manner (no body transcription).
- This keeps the amount of information passed to Spec Kit to about 1 packet's worth (preventing token explosion).
- **Do not quote/transcribe other packets or the Intent Tree body** into the deliverables (specify input / spec hints). Limit sources to the target packet and the compass.

## Output (drafts of 2 files / do not create the main body)

Write the drafts under the per-packet directory `.intent/speckit/<packet-slug>/` (slug derivation is in the next section, "Output layout"). Align **one-directionally** with Spec Kit's entry contract (`/speckit.specify <natural-language feature description>` generates spec.md and is held against the principles of `.specify/memory/constitution.md`). Do not depend on Spec Kit's internal implementation.

### `.intent/speckit/<packet-slug>/specify-input.md`

The **natural-language feature description** fed into Spec Kit's `/speckit.specify`. Make it a condensed text that is **usable verbatim as the argument** from the top.

- Include: (a) who has the problem, (b) the current situation, (c) what should change / in-out scope / invariants to protect / parent intent.
- **primary output**: shape it so the minimal and always-valid feature-description text for `/speckit.specify` can be derived from the opening of specify-input (the section structuring is added value on top). It is usable verbatim as the argument from the top (does not force extra extraction work on the user).
- Limit sources to the target packet (Why/Scope/Expected Behavior/Safety) and the compass's Invariants / Anti-direction.

### `.intent/speckit/<packet-slug>/spec-hints.md`

The **spec hints** for reconciling with the spec.md Spec Kit generates (not the main body). Include the following required elements.

- **Parent intent reference** (required heading): state the higher-level aim this packet serves (L0/L1/L2/L3), forming a structure by which parent intent flows into the spec Spec Kit generates.
- **Invariant reference** (required heading): list the constraints to protect (packet-specific invariants + the compass's project-universal Invariants), passed in a form readily taken into the spec's acceptance conditions. Keep anything expressible as normative (SHALL / MUST) in that form.
- **The one-line note that constitution reflection is the user's call** (required): always add the one line that "whether to reflect these Invariants into Spec Kit's project constitution `.specify/memory/constitution.md` is the user's decision." **This skill does not write to constitution.md** (no modification of external tools).
- **Reconciliation points**: add points for checking whether the spec.md Spec Kit generated dropped parent intent / Invariants.
- Do not complete the main body. The completion of spec.md is delegated to Spec Kit (from `/speckit.specify` onward) (INV4).

## Output layout (slug rule and collision rule)

### Slug rule (deterministic)

Derive the directory name (slug) from the packet name **deterministically** in the following order. The same packet name always yields the same slug. This rule is **identical** to the slug rule of `packet-format.md` and of the other targets' maps (aligning output-directory derivation across export targets).

1. NFC-normalize.
2. Trim leading/trailing whitespace.
3. Lowercase ASCII uppercase.
4. Replace whitespace and path-dangerous characters (`/ \ : * ? " < > |`) with `-`.
5. Collapse consecutive `-` into one.
6. Remove leading/trailing `-`.

- Preserve non-ASCII characters (Japanese, etc.) as is.
- If the result is an empty string, use the slug `unnamed-packet` and inform the user.

### Collision rule

- A collision occurs only when the slug matches an existing directory **and** that directory's specify-input.md points to a **different** packet name. Assign an alternate name by appending a sequential number starting from `-2`, and inform the user of the packet-name → directory-name correspondence. Do not silently overwrite.
- When it points to the **same** packet name, it is not a collision but a re-export, and the drafts in the same directory are updated in place.

## intent propagation (deliver into the artifacts Spec Kit generates)

- State **parent intent** in the specify-input's opening description and **invariant** in spec-hints, passed in a structure readily taken into the artifacts Spec Kit generates (spec / plan / tasks).
- Distill the compass's **Invariants** into a form seedable into the spec's acceptance conditions and **normative statements (SHALL / MUST)** in spec-hints.
- The aim: even as Spec Kit proceeds from spec to implementation, parent intent and invariant keep working, so local-optimization prevention does not evaporate via Spec Kit either.
- **Responsibility boundary**: intent-planner's responsibility goes up to "propagating parent intent / invariant **through the structure of the content passed** only." It does not intervene in Spec Kit's internal implementation. The actual uptake is delegated to Spec Kit (does not depend on Spec Kit's behavior). Full uptake is **not a guarantee but a structural maximization of probability**.

## Invariants

- Do not **complete the main body** of Spec Kit's spec / plan (drafts/hints only). The completion of spec.md is delegated to `/speckit.specify` onward (INV4).
- specify-input / spec-hints must include references to parent intent and invariant.
- Do not quote/transcribe other packets or the Intent Tree body into the deliverables (limit sources to the target packet + compass).
- **Do not write into another packet's directory** (the write target is only under the target packet's slug).
- Do not intervene in Spec Kit's skill / internal implementation. Confine the output to `.intent/speckit/` and do not touch `.intent/cc-sdd/` / `.intent/openspec/`. Do not write into the repository-root `.specify/` / `specs/` / constitution.md either.
