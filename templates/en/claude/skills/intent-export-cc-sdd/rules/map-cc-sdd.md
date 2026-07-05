# Mapping: packet → cc-sdd

The rules for converting one chosen packet into a cc-sdd draft. Used by the `intent-export-cc-sdd` skill. This is one of the per-export-target mappings (for cc-sdd). To add another target (e.g. OpenSpec), add `rules/map-<target>.md` and create a corresponding `intent-export-<target>` skill (the seam).

## Input scope (strict / information-source contract)

- Read only **the one target packet** and **the Invariants / Anti-direction of `.intent/intent-compass.md`**.
- **Do not read** the full Intent Tree or other packets. Only when the overall direction is needed, reference Tree L0–L1 **as a summary** in a pinpoint manner (no body transcription).
- This keeps the amount of information passed to cc-sdd to about 1 packet's worth (preventing token explosion).

## Output (drafts of 3 files / do not create the main body)

Write the drafts under the per-packet directory `.intent/cc-sdd/<packet-slug>/` (slug derivation is in the next section, "Output layout").

### `.intent/cc-sdd/<packet-slug>/requirements.md`
- The **Project Description body** (condensed text) fed into cc-sdd's `/kiro-spec-init`.
- What to include: (a) whose problem it is, (b) the current state, (c) what you want to change / In·Out scope / invariants to protect / parent intent. If the target packet has a `## Value (what happens for whom)` section, carry its gist into the head as context for (a)/(c) (so that downstream design decisions can assume "what happens for whom"; omit as before if absent = byte-equal).
- **Required headings (output contract)**: always include the three headings `## Source Packet`, `## Parent Intent`, and `## Invariants`. The value of `## Source Packet` is the **exact transcription** of the packet name (the anchor that identifies which packet this directory belongs to).
- The information source is limited to the target packet (Why/Scope/Expected Behavior/Safety) and the compass's Invariants.

### `.intent/cc-sdd/<packet-slug>/design.md`
- **Hints to prevent oversights (bullets)** for when cc-sdd generates the design. Not the main body.
- Origin: the packet's Scope/Non-scope/Rollback + the compass's technical-constraint Invariants. Perspectives: responsibility boundaries, dependency direction, side effects, migration/rollback, risk, technical constraints (if the compass Invariants include technology-stack, infrastructure, or license constraints, transcribe them into the hints so that cc-sdd's design technology selection does not deviate from them). If the target packet has a `## Risks` section, carry its qualitative risks (what breaks if it happens / early signs / countermeasure / who watches) into the design's risk-perspective hints (omit if absent).
- **The estimate is carried into the design hints as a reference note only** (optional): if the target packet has a `## Estimate` section, you may transcribe its range, grounds, and implementer as a one-line "Intent-side estimate (reference)" at the end of the design hints. But do **not** generate or finalize cc-sdd/kiro task estimates (intent-planner goes only as far as the draft = Non-scope). Do not let the estimate turn into a requirement or acceptance criterion (keep it distinct as reference information).

### `.intent/cc-sdd/<packet-slug>/tasks.md`
- Place an **"Intent-derived constraints" section** (a summary of parent intent / invariant / Anti-direction) at the top.
- After that, cc-sdd's tasks-generation check items (characterization test / migration slice / each task's invariant reference).
- Origin: the packet's Validation/Rollback + parent intent + the compass's Invariants/Anti-direction.

### "Related conventions (candidates, not adopted)" section at the end of `requirements.md` (optional · A40/DR83 host ② · DR85)
You may attach, as an **independent section at the end** of the draft (`requirements.md`), the conventions that plausibly relate to this packet, as candidates (to deliver them JIT to the downstream implementer/agent). **Keep the section separate from adopted Invariants** so the needed constraints are not confused with the spec's requirements.

- **State at the top of the section**: put one sentence saying "these are candidates, not requirements; adoption is the downstream's call" (the boundary that keeps the downstream from misreading them as requirements).
- **Keep the body to references only**: each convention carries only its `id` + name + one-line gist + catalog reference path (`.intent/constraint-starters/<domain>.md`). **Do not transcribe the convention body in full** (the catalog is canonical; this prevents double-maintenance and carrying stale copies).
- **Narrow to a few**: semantically match against the target packet's Scope / Expected Behavior and keep **only strong fits** (about 5). If the fit is weak, do not list it (you may omit the whole section).
- **Reflect the decision ledger (INV57, DR84)**: read the `constraint-ledger.md` of the inherited issue directory (silence if absent); do not list conventions that are **already adopted** (already in the packet's Safety / Invariants) or **declined**. If the purpose/context has changed from decline time (by semantic matching), a declined one may return to the candidates (no numeric condition; INV2). Details are owned by "Constraint decision ledger" in `.intent/discovery/README.md`.
- **Optional · backward compatible**: if there is no match, omit the whole section. The presence/content of the section does not affect the export's success (not even a warn; candidates are simply appended quietly). Do not write to the downstream's shared settings (steering, etc.); stay inside the read-only draft.

## Output layout (slug rule and collision rule)

### Slug rule (deterministic)

Derive the directory name (slug) from the packet name **deterministically** in the following order. The same packet name always yields the same slug.

1. Apply NFC normalization.
2. Trim leading/trailing whitespace.
3. Lowercase ASCII uppercase letters.
4. Replace whitespace and path-dangerous characters (`/ \ : * ? " < > |`) with `-`.
5. Collapse consecutive `-` into one.
6. Strip leading/trailing `-`.

- Non-ASCII characters (Japanese etc.) are preserved as-is.
- If the result is an empty string, use `unnamed-packet` as the slug and notify the user.

### Collision rule

- A collision occurs only when the slug matches an existing directory AND that directory's requirements.md `## Source Packet` heading names a **different** packet. Assign a numbered alternative starting at `-2`, and notify the user of the packet-name → directory-name mapping. Never silently overwrite.
- If `## Source Packet` names the **same** packet, it is not a collision but a re-export: update the drafts in that same directory in place.

## Propagation to impl (strategy X)

- Write the tasks hints at the granularity of "**invariant references tied to individual tasks**".
- Aim: that parent intent and invariants are **transcribed** into each task of the main `tasks.md` that cc-sdd generates. This lets an impl subagent that is invoked in a different session without reading `.intent/` still reference the invariants / Anti-direction via the cc-sdd deliverable (tasks.md).
- **Responsibility boundary**: intent-planner's responsibility goes only as far as "passing hints in a structure that is easy to transcribe". The actual transcription is left to cc-sdd's tasks generation (do not depend on cc-sdd's behavior). Complete transcription is **not a guarantee, but a probability maximized by structure**.

## Invariants

- Do not complete **the main body** of cc-sdd's requirements/design/tasks (drafts/hints only).
- The tasks hints must always include references to parent intent and invariants.
- **Never write into another packet's directory** (write only under the target packet's slug directory).
- Do not intervene in cc-sdd's skills.
