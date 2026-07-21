# Mapping: packet → Spec Kit

The rules for converting one chosen packet into a Spec Kit specify input + spec hints. Used by the `intent-export-speckit` skill. This is one of the per-export-target mappings (for Spec Kit). To add another target, add `rules/map-<target>.md` and create a corresponding `intent-export-<target>` skill (the seam). Do not change other targets' map rules.

## Input scope (strict / information-source contract)

- Read only **the one target packet** and the **common selection result** returned for that packet by `.intent/execution-contract.md`.
- With `selection_status: applied`, project-wide constraints come from `selected` only in the common result. Do not read Compass directly to add constraints, and do not mix `confirm` or `excluded` into downstream constraints.
- Do not use Tree/Compass material read by the drift check or Open Questions check, or their verdicts, as input to the common selection result, downstream constraints, or internal record. If human confirmation updates canonical material, rerun common selection from the updated canonical sources.
- Only when the execution contract is absent, use `selection_status: legacy-not-applied`, preserve the existing packet + Compass input and placement, and continue the export (fail open). Do not report that the new three-way classification was applied.
- **Do not read** the full Intent Tree or other packets. Only when the overall direction is needed, reference Tree L0–L1 **as a summary** in a pinpoint manner (no body transcription).
- **Exception (carrying the screen-design draft; UI cases only)**: only when the target packet deals with user-facing screens (UI), you may reference the Tree's "Screen Rough Reference" section in the same pinpoint manner as L0–L1. If it holds a reference to a screen-design draft (`.intent/nl-spec/screen-design-brief*.md`), read that draft and transcribe a short digest (each main screen's purpose, information priority, main action, key states, and visual direction, with the confirmed / inferred distinction) and the reference path into the spec hints (`spec-hints.md`). Do not drop the inferred markers and do not promote them to confirmed. When there is no reference, read nothing, write nothing, and continue as before (the ban on transcribing other packets or the Tree body stands).
- This keeps the amount of information passed to Spec Kit to about 1 packet's worth (preventing token explosion).
- **Do not quote/transcribe other packets, the Intent Tree body, or unrelated Compass body** into the deliverables (specify input / spec hints).

## Output (drafts of 2 files + internal record / do not create the main body)

Write the drafts under the per-packet directory `.intent/speckit/<packet-slug>/` (slug derivation is in the next section, "Output layout"). Align **one-directionally** with Spec Kit's entry contract (`/speckit.specify <natural-language feature description>` generates spec.md and is held against the principles of `.specify/memory/constitution.md`). Do not depend on Spec Kit's internal implementation.

### `.intent/speckit/<packet-slug>/specify-input.md`

The **natural-language feature description** fed into Spec Kit's `/speckit.specify`. Make it a condensed text that is **usable verbatim as the argument** from the top.

- Include: (a) who has the problem, (b) the current situation, (c) what should change / in-out scope / invariants to protect / parent intent.
- **primary output**: shape it so the minimal and always-valid feature-description text for `/speckit.specify` can be derived from the opening of specify-input (the section structuring is added value on top). It is usable verbatim as the argument from the top (does not force extra extraction work on the user).
- Base the feature description on the target packet (Why/Scope/Expected Behavior/Safety). Only when needed to state applicability or protected behavior, include a condensed projection of the common result's `selected` constraints.

### `.intent/speckit/<packet-slug>/spec-hints.md`

The **spec hints** for reconciling with the spec.md Spec Kit generates (not the main body). Include the following required elements.

- **Parent intent reference** (required heading): state the higher-level aim this packet serves (L0/L1/L2/L3), forming a structure by which parent intent flows into the spec Spec Kit generates.
- **Invariant reference** (required heading `## Invariant Reference`): in addition to packet-specific invariants, with `selection_status: applied` list only the common result's `selected` constraints, shaped for uptake into Spec Kit's acceptance conditions. Each selected constraint carries `Identifier`, `Name`, `Law`, `Applicability`, `Verification`, and `Canonical Reference`; retain a normative SHALL / MUST form where the Law supports it.
- Do not include ordinary selection reasons such as area match, `always`, or explicit reference in the specify input or spec hints. Include only the minimal reason summary needed when the reason itself is an applicability condition, downstream must resolve a constraint conflict, or regulatory, audit, or safety assurance requires grounds.
- Do not promote `confirm` candidates into MUST / SHALL, an Invariant, or an acceptance condition. When a candidate lacks information needed for projection, do not invent it; return it to the internal confirmation candidates.
- **`## Execution Contract`** (required heading): reference `.intent/execution-contract.md` and briefly map the target packet's sources: Invariant=Safety; Scope / Acceptance=Scope, Expected Behavior, and Validation; Decision=Decisions; Preference / Heuristic=Agent-discretion and candidates. Hand off that a boundary-crossing discovery uses the referenced decision format and waits for the human. Do not copy the contract body or its full three-choice menu. When absent, state "contract absent; continue with existing boundaries".
- **`### Revalidation Candidates`**: From the target packet's Agent-discretion zone, transcribe only an undecided item that has both a reason and the same item's `Revisit when`, exactly once and as a non-binding candidate. Never promote it into MUST / SHALL, an Invariant, or an acceptance condition. If there is no candidate, omit the subsection; a re-export must not duplicate the same item. Never carry the full text of unrelated Tree / Compass / archive material.
- **The one-line note that constitution reflection is the user's call** (required): always add the one line that "whether to reflect these Invariants into Spec Kit's project constitution `.specify/memory/constitution.md` is the user's decision." **This skill does not write to constitution.md** (no modification of external tools).
- **Reconciliation points**: add points for checking whether the spec.md Spec Kit generated dropped parent intent / Invariants.
- Do not complete the main body. The completion of spec.md is delegated to Spec Kit (from `/speckit.specify` onward) (INV4).

### `.intent/speckit/<packet-slug>/constraint-selection.md` (internal record)

- Following the common internal-record format, record selected IDs with one-line reasons, confirmation candidates and missing information, selection time, canonical sources, selection status, source mode, and degradation reasons. Do not copy all excluded candidates or Compass body.
- Replace the entire file in the same run as specify-input.md and spec-hints.md. Do not append, and do not treat a run as successful when only the drafts or only the internal record can be written.
- With `selection_status: legacy-not-applied`, mark Selected and Confirmation Candidates not applicable. Update specify-input.md / spec-hints.md through the existing packet + Compass input and placement, and in Legacy Output list only the existing primary downstream file specify-input.md.
- `constraint-selection.md` is an Intent Planner internal record. Do not pass `constraint-selection.md` downstream. At Spec Kit startup, pass only specify-input.md as before; use spec-hints.md to reconcile against the generated spec.md.
- Start the Spec Kit side only after user approval; Intent Planner does not replace constitution or main-spec approval.

### "Related conventions (candidates, not adopted)" section at the end of `spec-hints.md` (optional · A40/DR83 host ② · DR85)
You may attach, as an **independent section at the end** of the draft (`spec-hints.md`), the conventions that plausibly relate to this packet, as candidates (to deliver them JIT to the downstream implementer/agent). **Keep the section separate from adopted Invariants** so the needed constraints are not confused with requirements. It is isomorphic to the cc-sdd exit's section (`map-cc-sdd`), only reading the draft file name as `spec-hints.md`.

- **State at the top of the section**: put one sentence saying "these are candidates, not requirements; adoption is the downstream's call".
- **Keep the body to references only**: each convention carries only its `id` + name + one-line gist + catalog reference path (`.intent/constraint-starters/<domain>.md`). **Do not transcribe the convention body in full** (the catalog is canonical).
- **Narrow to a few**: semantically match against the target packet's Scope / Expected Behavior and keep **only strong fits** (about 5). If weak, do not list it (you may omit the whole section).
- **Reflect the decision ledger (INV57, DR84)**: read the `constraint-ledger.md` of the inherited issue directory (silence if absent); do not list **already-adopted** or **declined** conventions (if the purpose/context has changed from decline time, a declined one may return; no numeric condition; INV2). Details are owned by "Constraint decision ledger" in `.intent/discovery/README.md`.
- **Optional · backward compatible**: if there is no match, omit the whole section. It does not affect the export's success (not even a warn). Do not write to Spec Kit's constitution.md (DR78; no external-tool modification); stay inside the read-only draft.

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
- With `selection_status: applied`, seed the common result's **`selected`** into spec-hints in a form suitable for Spec Kit acceptance conditions and **normative statements (SHALL / MUST)**. Do not transcribe directly from Compass.
- The aim: even as Spec Kit proceeds from spec to implementation, parent intent and invariant keep working, so local-optimization prevention does not evaporate via Spec Kit either.
- **Responsibility boundary**: intent-planner's responsibility goes up to "propagating parent intent / invariant **through the structure of the content passed** only." It does not intervene in Spec Kit's internal implementation. The actual uptake is delegated to Spec Kit (does not depend on Spec Kit's behavior). Full uptake is **not a guarantee but a structural maximization of probability**.

## Invariants

- Do not **complete the main body** of Spec Kit's spec / plan (drafts/hints only). The completion of spec.md is delegated to `/speckit.specify` onward (INV4).
- specify-input / spec-hints must include references to parent intent and invariant.
- Do not quote/transcribe other packets or the Intent Tree body into the deliverables (when applied, the only project-wide constraint source is the common result's `selected`; only `legacy-not-applied` uses the existing packet + Compass path).
- **Do not write into another packet's directory** (the write target is only under the target packet's slug).
- Do not intervene in Spec Kit's skill / internal implementation. Confine the output to `.intent/speckit/` and do not touch `.intent/cc-sdd/` / `.intent/openspec/`. Do not write into the repository-root `.specify/` / `specs/` / constitution.md either.
