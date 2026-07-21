# Mapping: packet → OpenSpec

The rules for converting one chosen packet into an OpenSpec proposal draft + delta spec hint. Used by the `intent-export-openspec` skill. This is one of the per-export-target mappings (for OpenSpec). To add another target (e.g. cc-sdd), add `rules/map-<target>.md` and create a corresponding `intent-export-<target>` skill (the seam). Do not change `map-cc-sdd`.

## Input scope (strict / information-source contract)

- When `.intent/execution-contract.md` exists, the OpenSpec placement input is limited to **one target packet and `selected` from the common selection result**. Do not reread or transcribe Compass Invariants / Anti-direction directly from the OpenSpec-specific rules.
- Only when `.intent/execution-contract.md` is absent, use `selection_status: legacy-not-applied` and fall back to the existing path that directly uses the target packet + `.intent/intent-compass.md` Invariants / Anti-direction (fail open).
- **Do not read** the full Intent Tree or other packets. Only when the overall direction is needed, reference Tree L0–L1 **as a summary** in a pinpoint manner (no body transcription).
- **Exception (carrying the screen-design draft; UI cases only)**: only when the target packet deals with user-facing screens (UI), you may reference the Tree's "Screen Rough Reference" section in the same pinpoint manner as L0–L1. If it holds a reference to a screen-design draft (`.intent/nl-spec/screen-design-brief*.md`), read that draft and transcribe a short digest (each main screen's purpose, information priority, main action, key states, and visual direction, with the confirmed / inferred distinction) and the reference path at the end of `## Impact`. Do not drop the inferred markers and do not promote them to confirmed. When there is no reference, read nothing, write nothing, and continue as before (the ban on transcribing other packets or the Tree body stands).
- This keeps the amount of information passed to OpenSpec to about 1 packet's worth (preventing token explosion).
- **Do not quote/transcribe other packets or the Intent Tree body** into the deliverables (proposal / delta).

## OpenSpec placement of the common selection result

- Use the common selection result returned by `.intent/execution-contract.md`. With `selection_status: applied`, place only `selected` downstream; do not add OpenSpec-specific candidate discovery or reclassification.
- Each selected constraint carries `Identifier`, `Name`, `Law`, `Applicability`, `Verification`, and `Canonical Reference`. When any field cannot be produced without inventing a new obligation, keep that candidate in `confirm` and omit it from downstream constraints.
- Use `## Impact` in `proposal.md` as the primary placement for selected constraints. Seed only selected constraints directly related to required behavior into the corresponding Requirement / Scenario hints in `spec-delta.md`; do not copy every constraint into unrelated deltas.
- Do not include ordinary selection reasons such as area match, `always`, or explicit reference in downstream text. Only when the reason is itself an applicability condition, is needed to judge a constraint conflict, or is required for regulatory, audit, or safety assurance, attach the minimum reason summary needed for the decision.
- Do not promote `confirm` candidates into MUST / SHALL, an Invariant, or an acceptance condition. Keep their kind, evidence, and missing information only in the internal record.
- Replace `constraint-selection.md` (`.intent/openspec/<packet-slug>/constraint-selection.md`) in full under the common internal-record contract, in the same run as proposal/delta. Do not pass `constraint-selection.md` downstream or include it in the `/opsx:propose` inputs.
- With `selection_status: legacy-not-applied`, preserve the existing packet + Compass input and placement. Do not present Selected or Confirmation Candidates as decided by the new flow; reference the primary output from Legacy Output in the internal record.
- Preserve the existing Impact, acceptance conditions, Revalidation Candidates, the non-binding treatment of Related conventions (candidates, not adopted), and the external approval workflow in OpenSpec.

## Output (drafts of 2 files / do not create the main body)

Write the drafts under the per-packet directory `.intent/openspec/<packet-slug>/` (slug derivation is in the next section, "Output layout"). Align **one-directionally** with OpenSpec's entry contract (`/opsx:propose <natural-language change description>`, the proposal's Why/What Changes/Impact, the delta spec's ADDED/MODIFIED/REMOVED + `### Requirement:` / `#### Scenario:`). Do not depend on OpenSpec's internal implementation.

### `.intent/openspec/<packet-slug>/proposal.md`

The **proposal draft** fed into OpenSpec's `/opsx:propose`. Always include the three headings.

- `## Why` — Transcribe the packet's intent / Why and state the **parent intent** (the higher-level aim this packet serves). Describe why this change is needed now.
- `## What Changes` — List the packet's deliverables / Scope as **bullets**. State the **Anti-direction** carried by the packet or an applicable `selected` entry within this section **as out-of-scope (what not to do)**.
- `## Impact` — The specs / contracts this change affects and the constraints to protect. With `selection_status: applied`, transcribe only `selected` from the common result, listing affected scope (contracts / capabilities touched) alongside each invariant. Only `legacy-not-applied` directly uses the existing Compass Invariants.
- `## Execution Contract` — Reference `.intent/execution-contract.md` and briefly map the target packet's sources: Invariant=Safety; Scope / Acceptance=Scope, Expected Behavior, and Validation; Decision=Decisions; Preference / Heuristic=Agent-discretion and candidates. Hand off that a boundary-crossing discovery uses the referenced decision format and waits for the human. Do not copy the contract body or its full three-choice menu. When absent, state "contract absent; continue with existing boundaries".
- `### Revalidation Candidates` — From the target packet's Agent-discretion zone, transcribe only an undecided item that has both a reason and the same item's `Revisit when`, exactly once and as a non-binding candidate. Never promote it into MUST / SHALL, an Invariant, or an acceptance condition. If there is no candidate, omit the subsection; a re-export must not duplicate the same item. Never carry the full text of unrelated Tree / Compass / archive material.
- **primary output**: Write it so that a **minimal and always-valid change description** that can be fed into `/opsx:propose` is derivable from the top of the proposal (the structured proposal is added value on top of that).
- With `selection_status: applied`, limit the information source to the target packet (Why/Scope/Expected Behavior/Safety) and `selected` from the common result. Only `legacy-not-applied` directly uses the existing Compass Invariants / Anti-direction.

### `.intent/openspec/<packet-slug>/spec-delta.md`

A **hint skeleton** for OpenSpec's delta spec (not the main body).

- Map the packet's acceptance criteria / Expected Behavior onto the skeleton of `### Requirement: <name>` (**normative SHALL / MUST statements**) and `#### Scenario: <name>` (**GIVEN / WHEN / THEN**).
- With `selection_status: applied`, place only `selected` constraints directly related to required behavior into the corresponding Requirement / Scenario hint. Do not mix unrelated selected constraints or `confirm` candidates into the delta.
- **Seed the heading syntax accurately** (`### Requirement:` / `#### Scenario:`) to guide toward a structure that passes OpenSpec's validate.
- Follow the dispatch rule in the next section, "Delta dispatch".
- Do not complete the main body. Reconciliation and completion are left to OpenSpec (from `/opsx:propose` onward) (INV4).

### "Related conventions (candidates, not adopted)" section at the end of `proposal.md` (optional · A40/DR83 host ② · DR85)
You may attach, as an **independent section at the end** of the draft (`proposal.md`), the conventions that plausibly relate to this packet, as candidates (to deliver them JIT to the downstream implementer/agent). **Keep the section separate from adopted Invariants** so the needed constraints are not confused with requirements. It is isomorphic to the cc-sdd exit's section (`map-cc-sdd`), only reading the draft file name as `proposal.md`.

- **State at the top of the section**: put one sentence saying "these are candidates, not requirements; adoption is the downstream's call".
- **Keep the body to references only**: each convention carries only its `id` + name + one-line gist + catalog reference path (`.intent/constraint-starters/<domain>.md`). **Do not transcribe the convention body in full** (the catalog is canonical).
- **Narrow to a few**: semantically match against the target packet's Scope / Expected Behavior and keep **only strong fits** (about 5). If weak, do not list it (you may omit the whole section).
- **Reflect the decision ledger (INV57, DR84)**: read the `constraint-ledger.md` of the inherited issue directory (silence if absent); do not list **already-adopted** or **declined** conventions (if the purpose/context has changed from decline time, a declined one may return; no numeric condition; INV2). Details are owned by "Constraint decision ledger" in `.intent/discovery/README.md`.
- **Optional · backward compatible**: if there is no match, omit the whole section. It does not affect the export's success (not even a warn). Do not write to OpenSpec's shared settings; stay inside the read-only draft.

## Delta dispatch (ADDED / MODIFIED / REMOVED)

- **Default**: Place all of the packet's acceptance criteria under `## ADDED Requirements`.
- **Conditional**: Only when the packet's **Scope** or an applicable `selected` entry **explicitly references a change/removal** of an existing capability or behavior, place a hint of "**the name of the capability changed + the direction of change**" under `## MODIFIED Requirements` / `## REMOVED Requirements`. Under `legacy-not-applied`, the existing Compass Anti-direction may also be used.
- MODIFIED / REMOVED stay as identification hints for the change target; reconciliation with the existing spec and finalization are left to OpenSpec. If there is no explicit reference, do not place MODIFIED / REMOVED.

## Output layout (slug rule and collision rule)

### Slug rule (deterministic)

Derive the directory name (slug) from the packet name **deterministically** in the following order. The same packet name always yields the same slug. This rule is **identical** to the slug rule in `packet-format.md` and `map-cc-sdd` (aligning output-path derivation across export targets).

1. Apply NFC normalization.
2. Trim leading/trailing whitespace.
3. Lowercase ASCII uppercase letters.
4. Replace whitespace and path-dangerous characters (`/ \ : * ? " < > |`) with `-`.
5. Collapse consecutive `-` into one.
6. Strip leading/trailing `-`.

- Non-ASCII characters (Japanese etc.) are preserved as-is.
- If the result is an empty string, use `unnamed-packet` as the slug and notify the user.

### Collision rule

- A collision occurs only when the slug matches an existing directory AND that directory's proposal.md points to a **different** packet name. Assign a numbered alternative starting at `-2`, and notify the user of the packet-name → directory-name mapping. Never silently overwrite.
- If it points to the **same** packet name, it is not a collision but a re-export: update the drafts in that same directory in place.

## Intent propagation (carry it into the deliverables OpenSpec generates)

- State the **parent intent** in the proposal's `## Why` and the **invariants** in `## Impact`, passing them in a structure that is easy to take into the deliverables (spec / design / tasks) OpenSpec generates.
- Render `selected` from the common result into OpenSpec's **normative statements (SHALL / MUST)** and the constraints of `## Impact`. Only when a selected constraint is directly related to a delta's `### Requirement:`, seed it there as a normative statement.
- Aim: that parent intent and invariants keep working even at the stage of moving from an OpenSpec change to implementation, so that local-optimum prevention does not evaporate via OpenSpec either.
- **Responsibility boundary**: intent-planner's responsibility goes only as far as "propagating parent intent / invariants **through the structure of what is passed alone**". Do not intervene in OpenSpec's internal implementation. The actual incorporation is left to OpenSpec (do not depend on OpenSpec's behavior). Complete incorporation is **not a guarantee, but a probability maximized by structure**.

## Invariants

- Do not complete **the main body** of OpenSpec's proposal / delta spec (drafts / hint skeleton only). Completing the delta is left to `/opsx:propose` onward (INV4).
- The proposal's `## Why` / `## Impact` must always include references to parent intent and invariants.
- Do not quote/transcribe other packets or the Intent Tree body into the deliverables (under `applied`, limit sources to the target packet + `selected` from the common result).
- **Never write into another packet's directory** (write only under the target packet's slug directory).
- Do not intervene in OpenSpec's skills / internal implementation. Confine output to `.intent/openspec/` and do not touch `.intent/cc-sdd/`.
