# Writeback Protocol (canonical rules for intent-writeback)

The source of truth for `/intent-writeback`'s decisions and procedure. SKILL.md holds only the skeleton of the steps; decisions follow this file. "Canonical deliverables" means intent-tree.md / intent-compass.md / the files under `.intent/packets/` (the packet files and plan.md).

## 0. Determine the operation kind first

Select the outcome branch only when the user explicitly says they are recording an "outcome learning." If it is ambiguous whether they want to write back an implementation learning or record a post-release outcome learning, present those two choices in plain words, confirm the operation kind, and wait for the answer. Do not infer it from context.

When "implementation learning" is selected, keep the existing five-tier target identification, five-perspective extraction, approval, and Packet completion processing unchanged. Do not mix the outcome branch's added conditions or output into the ordinary implementation-learning path.

## 1. Target identification (5-tier priority + fallback)

Identify exactly one target packet by first-match from the top. When the target is identified via a fallback (tier 3 or later), announce that fact (which tier identified it) in the user-facing output.

1. **Packet name from the argument**: if a packet is specified by argument, use it as the target.
2. **The latest row of export-log.md (canonical)**: use the packet name of the latest data row (= the last data row of the `| packet | exported_at | commit |` table) in `.intent/export-log.md`. In the steady state where export-log exists, the target is finalized here.
3. **"## Source Packet" heading in the drafts (fallback)**: if export-log.md is absent or its latest row cannot be parsed, read the packet name from the "## Source Packet" heading in `.intent/cc-sdd/<packet-slug>/requirements.md`. Adopt that heading only when **exactly one** packet directory exists; if multiple exist, list the heading of each directory as candidates and go straight to 5. This tier is a relief for the transitional period where export-log is not yet established (e.g., right after the first export); in the steady state the target is finalized at 2. **For a Spec Kit case, apply the same rule to the drafts under `.intent/speckit/<packet-slug>/`** (only the location read differs; heading matching, adopt-only-when-exactly-one, and go-to-5-when-multiple stay the same).
4. **Direct-implementation route via explicit record or inference (cases that bypass cc-sdd / openspec / speckit)**: tiers 2 and 3 both presuppose an export, so a case driven by nl-spec (`/intent-to-spec`) or direct implementation (no spec tool) leaves 2 and 3 structurally empty. This tier identifies the target packet for a non-exported case with **the explicit exit record as the primary signal and inference as the fallback** ("choice > inference", INV34). Evaluate in this order:
   - **4a. Explicit-record route (primary signal)**: read the `format` line following the CONTRACT.md read fallback contract (the inherited issue directory's `discovery/<slug>-<rand>/mode.md` [A34] → else the single `.intent/mode.local.md` [legacy] → else the old `.intent/mode.md`); when that `format` line is `direct` (direct implementation with no tool), treat the case as a direct-implementation case. List `done` candidate packets by matching the frontmatter `name` across `active/`→`archive/`; **finalize if unique**, otherwise drop to 5. When the `format` line is `speckit`, do not treat it as a direct-implementation case: identify the target packet from the "## Source Packet" heading of the Spec Kit draft (`.intent/speckit/<packet-slug>/`) in tier 3 as the primary signal.
   - **4b. Inference route (fallback when 4a is absent)**: when `format` is not `direct` / is unrecorded, infer a direct-implementation case from the **3-condition AND** of `spec_refs empty + no row in export-log + state=done` (each machine-observable and deterministic). List candidates by `name` matching across `active/`→`archive/`; **finalize if unique**, otherwise drop to 5. Do **not** make the handwritten `Source` field of a delta ("direct implementation", etc.) or git commits a primary signal (a delta is written only after writeback and is absent at first-writeback time — a chicken-and-egg). Use these only to narrow down when candidates hit multiple done packets.
5. **Text-matching fallback (user confirmation required)**: raise candidates by text-matching the draft bodies against the packet names (frontmatter `name`) in index.md / the packet files under `active/`, then ask the user in natural language and wait for the answer. Never finalize the target without confirmation (this is also the final relief when tier 4 hits multiple candidates).

If the target still cannot be identified, present the situation (that it was not found and where you looked), ask the user to specify the write-back target packet, and stop.

**Directory identification rule (packet name → directory)**: the source of truth for identifying a directory from a packet name is "the `## Source Packet` heading in requirements.md inside the directory matches the packet name". Slug computation is a fast path for searching; even if the slug matches, do not identify the directory as that packet's when the heading does not match.

**Archive exception for target resolution**: if the resolved target packet's file is not under `active/` (a preceding supersede, completion already processed, etc.), refer to `archive/` **explicitly** and identify the file by matching the frontmatter `name` (the only explicit exception to the principle of "normally never read `archive/`"). Once identified, report to the user the fact that the packet is done / superseded. For a write-back to an archived packet that is not done, do not reflect into the target packet file; redirect the learnings to intent-tree.md / intent-compass.md / the successor packet (the packet file `superseded_by` points to).

## 1.5 Outcome-branch target and pending record

In the outcome branch, do not change the five-tier priority in §1 for identifying the target packet. If the packet is not under `active/`, also search `archive/`; accept a target packet that is already done or superseded.

Next, identify the target L1 by a verbatim quote of its body in Intent Tree. When the same verbatim quote occurs more than once, show the candidates with their surrounding heading or location and wait for the user's selection. Do not automatically associate an L1 from the Packet name, a similar-looking L1, or the outcome content. Stop recording until the target is unique.

If the target L1's `Outcome measure:` is missing, accept the outcome record and say that an outcome measure needs to be drafted. If provenance is incomplete—who, when, or where it was measured—accept the record and report the missing fields. When an existing observation might be a duplicate, do not automatically delete or merge it. Preserve the user's ability to keep a distinct observation by appending a new `pending` observation block to the Packet-scoped delta.

Before and after the outcome branch's pending record, do not change the target Packet's `state`. Do not change `closed_at`. Do not change `spec_refs`. Do not change the Packet's location. Do not change the `index`. At this stage, add only the new pending observation.

Do not fetch outcome data from external services or files. Do not perform automated scoring or achievement judgment. Do not automatically integrate the outcome record with bug classification. Do not store raw data such as sales records, user logs, or participant statements in the delta; guide the user to record only the summary needed for judgment.

## 1.6 Outcome-branch approval and decline

In the outcome branch, while an observation is `pending`, do not change Intent Tree at the byte level. Show the observation and the proposed projection line to the user. Project it into the target L1 only when a human explicitly approves it.

At approval time, reread the current Intent Tree and match the verbatim target L1 quote recorded in the observation, together with its location when needed. Update only when the verbatim reference resolves uniquely. When the same verbatim quote occurs more than once and the location still does not make it unique, do not project it. Show the candidates and wait for the user's selection.

Update the approved observation's `Status` to `promoted (<promotion date>)`. Reflect `value delivered`, `value not delivered`, and `not known yet` into `Outcome learning:` without reinterpreting any of them. The current-result line is `Outcome learning: <result> — <summary> (record: <delta reference>)`, preserving a direct trail to the observation's result, summary, and delta reference.

Keep at most one `Outcome learning:` line per L1. Add it when absent. When an `Outcome learning:` line already exists in the target L1, replace only that line with the latest approved observation. Do not change other L1 lines, `Outcome measure:`, or `Measurement criteria:`.

When the user declines an observation, update its `Status` to `closed (<close date>)`. Never delete the declined observation, and do not change Intent Tree at the byte level. If a decline reason is recorded, append it to the existing observation block rather than replacing the observation.

The delta is the source of truth for repeated observation history. Never delete or overwrite a past `promoted`, `closed`, or `pending` observation during approval or decline. Append a new observation as a separate block. On repeated approval, replace only Intent Tree's current-result line with the latest approved observation.

For approval, decline, and repeated approval alike, keep the target Packet's `state`, `closed_at`, `spec_refs`, location, and `index` unchanged. Do not rerun Packet completion processing. Do not mix this outcome-branch approval contract into the ordinary implementation-learning path's approval granularity, five perspectives, or Packet completion processing.

## 2. Learning extraction perspectives (5 kinds, tags 1:1)

Cross-check the target packet's definition (the target packet file), the cc-sdd drafts (including the Intent-derived constraints), and intent-compass.md against the implementation reality (the codebase, tests, and `.kiro/specs/`; all read-only), and extract learnings from the following 5 perspectives. Tags map 1:1 to the perspectives. When reading the implementation reality, also include in the grep cross-check scope the code modules (file names, module names) named by Decision Rules (intent-compass.md), and you may extract a divergence between a Rule's main text and the implementation as an `[invariant-violation]`.

Write each extracted learning as `[tag] <a plain one-sentence summary (REQUIRED)>`. The summary should be a plain sentence an approver who did not implement the packet can read directly and grasp — not a jargon-compressed noun phrase — even if it runs a little long for the sake of clarity. Only when background, rationale, or implications are needed, add an indented `  - 解説 (note): <…>` sub-line optionally below it (the note is not required; a summary-only learning is the normal form). This is the same format as the canonical deltas.md template in §9, and a learning extracted here is recorded into §9 in that very format.

| Tag | Perspective |
|------|------|
| `[decision]` | A new decision (a judgment made during implementation that is not written in the packet definition) |
| `[invariant-violation]` | A discovered invariant violation (a conflict between existing Invariants and the implementation reality) |
| `[implicit-behavior]` | Implicit behavior not written in the intent (reverse-extracted from the implementation) |
| `[deferred-resolved]` | A resolved Deferred |
| `[question]` | A new unresolved Question |

During learning extraction, cross-check against the **Revisit when** field of the Decision Rules in intent-compass.md, and on each learning line that matches a Revisit when condition, append a reference to the corresponding Decision (e.g. `[decision] <a new decision> (Revisit matched: <summary of the corresponding Decision's Context>)`). The note is free text within the learning line; the canonical deltas.md template (§9) is not changed.

**Attribution of bug-derived learnings (optional; additional tags; INV63/A49)**: when the writeback target includes a **learning from fixing a defect (bug)**, you may optionally classify it by "where the cause lay." Even for the same "fixed a bug," the destination differs by where the cause was — a bug is a signal of intent quality, and this makes the structure visible in the records when bugs caused by holes in the intent keep recurring. **Add** the following 3 tags to the existing 5 (the meaning, format, and approval granularity of the existing tags are unchanged = pure addition; INV29). Attaching one is optional; a learning without one passes exactly as before (never mandatory; Anti-direction 298).

| Tag | Perspective (where the bug's cause lay) | Destination by classification (all proposals only; no auto-transcription) |
|------|------|------|
| `[bug-impl]` | An implementation error (the intent was right = the intent side is untouched) | Record the delta only. Do not touch the intent (tree/compass/packet). May ride §3 stage 3's personal-ledger promotion if useful |
| `[bug-intent-gap]` | A gap in the intent (it was not written, so it was implemented wrongly) | Present as a proposed addition to Open Questions or as a seed for a new packet (a human decides) |
| `[bug-intent-wrong]` | A wrong intent (the written intent itself was mistaken) | Present as a revision **candidate** for the relevant compass Invariant / Decision Rule (human approval is the checkpoint = go through §4's ADR promotion rules; the AI never rewrites the compass on its own; Anti-direction 303) |

- **A human declares the classification**: the AI goes only as far as presenting a candidate classification with a one-line rationale (why that classification). Finalization happens at §3's approval stage by a human (never make the AI's judgment the final value; Anti-direction 299).
- **A compound cause may stay "unclassified"**: do not force a single classification; a learning you are unsure about may be recorded without one (with the existing 5 tags only). Do not force it into one bucket by guessing.
- **No retroactive back-filling of past deltas**: do not force a bulk pass that attaches classifications to already-recorded learnings (Anti-direction 304; start from the next learning you touch).
- The classification tags ride the existing learning-line format `[tag] <a plain one-sentence summary>` as-is (like `[bug-intent-gap] The intent never wrote down the session-expiry time, so the implementation improvised one (rationale: no expiry statement in the packet)` — include the one-line rationale in the summary). The heading structure of §9's canonical deltas.md template is not changed.

**DB-design drift reason record (linked to intent-validate's `db-design-implementation-drift`)**: when the target packet has a DB design draft (`.intent/db-design/<slug>/`) and `/intent-validate` has detected drift between "draft vs. implementation schema", extract "**why the design ended up different from the draft**" as a learning (do not create a new tag or a new promotion path; ride on `[decision]` = a design decision made during implementation that is not written in the draft). Classify each drift item into one of "**referenced**" (as in the draft) / "**intentional change**" (with reason = a legitimate change worked out in implementation) / "**unrecovered**" (a divergence with an unknown reason), and include the reason in the summary for intentional changes. Leave the unrecovered ones (divergence with an unknown reason) as `[question]` and do not let them silently disappear (lossy-projection = visualizing the drift). These learnings ride the usual two-stage protocol of §3 (delta record → approval → promotion), and only the approved reasons are promoted into the canonical (the compass Invariant, the packet's Safety, etc.). For cases without a draft or without drift, skip this extraction (behavior-preserving).

## 2.5 Human decision for boundary-crossing differences

The revalidation candidates compared with implementation results are limited to the **target packet's** `## Decisions` Agent-discretion entries that carry both a reason for remaining undecided and the same item's `Revisit when`. Do not collect candidates from the whole Compass or other packets. If a candidate does not materialize, do not add it to the delta; if it materializes inside the boundary, handle it through the existing five learning views without adding confirmation. Apply the shared contract below only when the resulting difference crosses the boundary.

When `.intent/execution-contract.md` exists, read it just in time and apply its inside-boundary / boundary-crossing decision and A/B/C to differences between implementation and agreed intent (do not redefine its decision material, binding strengths, or choices here). Before the choice, keep the delta pending and do not promote it into canonical artifacts. For A, leave intent unchanged and identify the implementation as needing return to the agreed design. For B, complete the normal reasoned-Decision and supersede path before promotion. For C, record a subsequent-packet candidate and do not promote the difference into the current packet's canonical artifacts.

In a legacy environment where the contract is absent, state that fact and fail open to the existing approval flow in section 3. Absence alone does not stop writeback.

## 3. Two-stage protocol

**The scope of the constraint in this §3 is limited to the writeback phase (the stage of extracting learnings back from reality after implementation and returning them to the canonical deliverables).** The drafting skills run **before** implementation — `/intent-compass` (which directly Writes the compass's North Star / Anti-direction / Invariants / Decision Rules) and `/intent-packets` (which directly drafts packet files) — are out of scope of this constraint (their writing canonical directly is the normal, intended behavior). What this constraint forbids is "writing post-implementation learnings into the canonical deliverables directly, bypassing a delta", not pre-implementation drafting.

In the writeback phase, never editing the canonical deliverables directly is the backbone of this skill. Always go through the following two stages.

Note: once you enter the stage of "implementation is complete and you are returning learnings from that reality to the canonical deliverables", that is the entry to the writeback phase. Do not settle for writing Evidence directly into the packet file; go through this protocol (via a delta).

### Stage 1: delta recording (canonical untouched)

- Record the extracted learnings into a **per-packet split file** `.intent/deltas/<packet-slug>.md` as a new entry (Status: pending) (CONTRACT "Split and archive convention for append-only records"; `<packet-slug>` is derived from the target packet name via the existing slug rule — no new numbering). Create the `deltas/` directory if absent. Do not touch the canonical deliverables at this stage at all. Move terminal (promoted/closed) past entries into `.intent/deltas/archive/<year>/` to keep the active surface thin (move all before folding the old file; migration is handled by this slice's migration step).
- Even if the user approves nothing, the entry remains as pending (automatic rewriting without approval is forbidden).

### Stage 2: approval → per-item promotion

Vary the approval granularity by the kind of learning. Do not ask about everything one item at a time with equal weight (in practice most learnings are records of "the implementation already behaves this way" with no room for yes/no, so asking about every item uniformly turns approval into a ritual).

- **Gated items (explicit approval mandatory)**: the following two kinds affect the canonical criteria and invariants, so always ask the user about each item in natural language and wait for the answer.
  - `[invariant-violation]` (a discovered invariant violation; the user decides the response policy such as "fix the code / keep it as a record only").
  - **`[decision]` that changes Decision Rules (the compass ADR)** (those falling under the ADR promotion in §4: replacing or adding an existing Decision, including ones that match a Revisit when).
- **Default bulk promotion (packet-append kind)**: learnings other than the above (`[implicit-behavior]`, and packet-local `[decision]` / `[deferred-resolved]`, plus `[question]` transcription into Open Questions) are presented with their reflection targets as a list, and **after asking the user to name any item they want to hold back, are promoted in bulk if none is named**. Do not ask for a per-item yes/no.
  - **Promotion target = the `## Expected Behavior` of the associated packet (DR63 · bloat reduction)**: `[implicit-behavior]` (and packet-local `[decision]` / `[deferred-resolved]`) is **appended after the fact to the `## Expected Behavior` section of the packet whose implementation produced the learning** (the target packet under `active/`, or the corresponding packet under `archive/` if already archived) — it is **not** appended to intent-tree.md L3. The packet is the body of the pull discipline (always read just before implementing), so the learning is reliably pulled, and once the packet goes closed→archive the learning retires with the packet, keeping intent-tree.md L3 from bloating. **Only the promotion target changes; the two-stage promotion path (delta=pending → approval → promoted) is unchanged** — do not write directly into the packet bypassing the delta (the "no auto-rewrite without approval" root rule at the top of §3 is preserved).
  - **Fallback**: if the packet associated with a learning cannot be identified (the target packet is found neither under `active/` nor `archive/`), append to intent-tree.md L3 as before and state so explicitly (do not drop a learning just because it has no promotion target).
  - **Cross-cutting `[decision]` goes through §4**: a `[decision]` that binds beyond the packet (changes Decision Rules) is promoted not via this path but via the "gated" route above = the ADR promotion of §4 into compass's Decision Rules (the branch is preserved).
- On either path, "automatic rewriting without approval is forbidden" (the backbone of §3's opening) is preserved because every item is already recorded as a delta in Stage 1 and the user is given one chance to hold items back. Items the user holds back are treated as declined and given a §5 two-value tag.
- Reflect the approved or bulk-promoted items into the canonical deliverables, and record `Status: promoted (<promotion date>)` and the reflection targets in the delta entry.
- Finalizing the state: **approving one or more items and reflecting them into the canonical deliverables → `promoted`**. **Declining every item as "rejected" → `closed`**. Both are terminal states. If items remain undecided including on-hold ones, keep pending.

### Stage 3: ask whether to promote into the personal ledger (constraint-library) (optional, read-only prompt, the user decides)

Following the canonical promotion (Stage 2), ask read-only whether to promote **the constraints that proved effective when implementing this work** into the user's personal ledger `.intent/constraint-library.md`. Against the compass-side accumulation that catches "the constraint just written" right at adoption (`constraint-surfacing.md` step 5), this is the writeback-side accumulation that catches **a constraint that only turned out to be effective once implemented** after the fact; their timing differs (the same feature is not duplicated — the moments are split).

- **Limit the candidate tags.** Ask about promoting into the personal ledger only for learnings tagged **`[decision]` (a design decision made in implementation = could become a reusable constraint) or `[invariant-violation]` (an invariant that should have been held = a candidate standard Invariant)**. Do not target `[implicit-behavior]` (a record of behavior the implementation already has = unlikely to become a reusable constraint), `[deferred-resolved]` (resolution of a deferral), or `[question]` (an unresolved question) for ledger promotion (avoid over-prompting and do not bury the §4 canonical promotion decision).
- **Filter by the benefit of keeping it in the ledger, not by tag alone. The default is silence (ask only when the benefit is clearly legible).** Even when a learning is tagged `[decision]` / `[invariant-violation]`, do not ask about it automatically on the tag alone. `[decision]` arises on almost every implementation (a judgment not written in the packet is normal), so making a tag match the promotion condition fires every time and makes the recommendation sloppy. The personal ledger is a **ledger of standards (reusable constraints that recur across cases)**, so **set the default to "stay silent" and ask only about learnings whose benefit of being in the ledger is clearly legible** (when the benefit is not legible or you are unsure, do not ask). To judge "clearly beneficial," use the following as light cues (not a checklist to verify in full every time — if any one clearly applies, lean toward "beneficial"; if none is legible, lean toward silence):
  - **Does it generalize?** Not a one-off judgment that only holds for this packet, but a constraint whose same form is legibly likely to hold in other cases / other packets.
  - **Is it not already covered?** A constraint of the same intent is not already in effect via an existing Invariant (compass) or the bundled starters catalog (constraint-starters) (do not add duplicates to the ledger).
  - **Can you picture where it actually bites later?** You can picture a concrete situation (which phase / which means-trigger) where this constraint will next be read and change a decision.
  This default (silence) carries the same discipline as `constraint-surfacing.md` Procedure 5 ("err on the side of silence over false positives to preserve trust in the starter feature") over to the writeback side: when in doubt, do not ask (silence over over-prompting). Read this judgment semantically from the learning's content, not by a mechanical score or a reuse-count threshold (add no new field).
- **Show a schema draft.** When asking, present a **draft candidate** that maps the target learning into the ledger's fixed schema (`## id:` / name / domain / fits when / constraint / origin). Pre-fill the `origin` field with "which packet / which work it was implemented and proved effective in" (infer `domain` as code|non-code from the learning's context as a draft the user can correct). The user reviews this draft and accepts/edits it.
- **Do not re-surface a constraint already in the ledger (dedup).** If the same `id` (or a substantively identical constraint) is already in `.intent/constraint-library.md`, do not ask about promoting it (do not pester with the same constraint every time).
- **Do not auto-write into the ledger.** Appending happens only after the user approves (no auto-accumulate behavior — a read-only gate = extending §3's "no auto-rewrite without approval" to the accumulation side). **If there are no candidate-tag learnings, or all candidates are already in the ledger, ask nothing.**
- **Keep accumulation inside this project only.** The append target is only inside this project's `.intent/` directory; provide no mechanism to share or persist constraints across projects (do not guide cross-project accumulation).
- **Backward compatible**: when the personal ledger `.intent/constraint-library.md` is absent, skip ledger promotion and say so (do not stop). This Stage 3 is independent of the canonical promotion (Stage 2); the main writeback flow (delta record, canonical promotion, done-marking) proceeds as before even without ledger promotion.

## 4. ADR promotion rules (promotions that change Decision Rules)

A promotion that changes the criteria (Decision Rules) fully complies with the existing ADR form of intent-compass.md.

- **Add a new entry**: **Context** (the question and situation) / **Decision** (the option taken) / **Why** (the criteria) / **Alternatives considered** (a summary of the alternatives examined and why they were rejected) / **Consequences** (connection to Invariants and Anti-direction) / **Revisit when** (the conditions for revisiting; if they cannot be determined, explicitly record "undetermined"). **The Why field is mandatory** (never omit it).
- Put a **superseded note** on the old entry being replaced (append to the old entry that it is superseded, with a reference to its replacement).
- Move the old entry carrying the superseded note **with its 6 fields intact** (no replacement with a summary) into the retired Decision Rule's **per-rule file** `.intent/compass-archive/<rule-slug>.md` (CONTRACT "Split and archive convention for append-only records"; `<rule-slug>` is derived from the retired Decision Rule's identifier via the existing slug rule — no new numbering; re-superseding the same rule collects into the same file). Create the `compass-archive/` directory if absent. Do not delete the old entry (move only; the 6 fields stay byte-unchanged). Active Decision Rules entries stay directly written inside intent-compass.md as before (no pointer indirection to another file).
- **Do not introduce a custom Supersedes field** (do not create a dedicated field on the new entry side; the note goes on the old entry side).
- Old 4-field entries recorded before the introduction of the 6-field format (those without Alternatives considered / Revisit when) remain valid; do not treat the missing fields as an error, flag them, or rewrite them.

### Do not promote only the conclusion (keep the grounds running alongside — correctability)

What gets promoted to canonical is not the conclusion alone. **Keep the grounds (reasons, constraints, premises, trade-offs) that led to the conclusion (the promoted Invariant / Decision) running alongside it.** The conclusion can be re-derived from the grounds, but the grounds cannot be re-derived from the conclusion (asymmetric). A promotion that has shed its grounds cannot be re-evaluated or corrected when a contradicting fact later arrives, and goes on confidently asserting the old error (brittle memory). To prevent this, confirm the following at the promotion moment (applies to both the ADR promotions of Stage 2 in §3 — Decision Rules — and the L3-addition promotions).

- **Let the grounds run alongside existing structures**: for an ADR promotion, the Decision Rule's **Why / Consequences** fields; for an Invariant promotion, the Invariant body; otherwise the optional `  - 解説 (note):` (commentary) side of the delta. Do not introduce a new required field (such as `根拠:`). **Do not fold the plain-language summary (the required summary of §2/§9) back into a grounds-laden compressed tag** — keep the summary readable as-is and let the grounds run alongside on the commentary side.
- **Attach a qualitative completeness flag**: at the promotion moment, attach a **qualitative flag** (e.g., a short note of "grounds present" / "grounds not traceable") for whether grounds run alongside this promotion. This is a light mark for the approver to confirm correctability at a glance, and is **not held as a number (k/N)** (an Intent's grounds are hard to count discretely). Do not hide a "grounds not traceable" promotion; state it explicitly, and do not fill untraceable grounds with guesses — send them to §6 as a `[question]`.
- **The AI must not fabricate grounds (most important)**: keeping grounds alongside is prompting only (read-only); the human (the user) is the one who fills them in. If the AI auto-completes grounds to retroactively justify a conclusion, it worsens brittle memory. Do not force grounds onto a promotion whose grounds are self-evident (referencing already-stated grounds, or a generally obvious judgment) — allow legitimate omission.

## 5. Final updates of declined-item tags (writeback's responsibility)

- Always put one of the two tags on learnings that were not promoted: **rejected (no re-proposal)** | **on-hold (re-propose at the next writeback)**.
- On-hold items are re-proposed at the next writeback run. The finalizing operation of **reflecting the re-proposal result (promote / confirm rejection / keep on hold) into the tag of the corresponding declined item of the old entry is writeback's responsibility**. `/intent-improve` only nudges the user to deal with on-hold items and never performs the final tag update.

## 6. Digesting [question]

- A `[question]` learning is considered digested once transcribed into the Open Questions of intent-tree.md.
- Record the transcription target (intent-tree.md Open Questions) as the reflection target in the promotion record.

## 7. Completion as one sequence of operations (mark done, move to archive, regenerate index)

Once the write-back of the target packet is complete (after the delta's terminal state is finalized), perform the packet's completion as the following **fixed-order sequence of operations** (never leave a done packet lingering under `active/`).

0. **Fill in the correspondence (verified-by) between acceptance oracles and real tests by measurement (optional; measurement-based; INV63/A49)**: for each acceptance oracle (the "yardstick that rejects a wrong implementation") in the target packet's `## Validation`, fill in, as verified-by in `## Verification protocol`, the **real test** (file path + test name) that guards it after implementation. **Base it on measurement** — write only tests that exist, and do not write correspondences you have not confirmed or tests that do not exist (zero fabrication; Anti-direction 299). For an oracle with no corresponding real test, do not fill it in by guessing; mark it "unlinked". This filling is optional and never a gate (mark-done proceeds as before even without it; Anti-direction 298). The format (whether to include the test name, how to list multiple tests) is left to implementation. Do not force retroactive bulk filling on an old packet lacking a `## Verification protocol` section (start from the next packet you touch; Anti-direction 304). After filling, a read-only `/intent-validate` (the `oracle-test-link-missing` axis) can later name broken/unlinked correspondences (the writer = this step and the reader = validate close the round trip as a pair).
1. Fill in `state: done`, `closed_at` (completion date), and `spec_refs` in the frontmatter of the target packet file. `spec_refs` is the corresponding spec/feature name(s); raise candidates by cross-checking against the specs in progress under `.kiro/specs/` and finalize the entry with user confirmation.
2. Move the packet file to `archive/<year of closed_at>/` (never delete; move only).
3. Regenerate `index.md`: build the `| packet_id | name | state | summary |` table in ascending `packet_id` order from the frontmatter of all packet files under `active/` only (when `active/` is empty, the header-only table is the canonical form).
4. **Prompt for canonical history archiving (DR64 · bloat reduction · optional)**: if the feature has settled, prompt to **move** the history of that feature accumulated in the `intent-tree.md` body (`## Impact Analysis (existing boundaries touched by …)`, the shipped group of `## L4 Candidate Packets`, retired `## Feature addition: <slug>`) and the `### <feature>-specific (premortem: …)` Anti-direction block of that feature in the `intent-compass.md` body, into the archive files (`intent-tree.history.md` / `compass-history.md`) — same shape as A19's active-surface / history split; the archive notation follows the rule at the top of each archive file. **A move, not an edit** = move the wording, numbering, and meaning that were in the body unchanged, and do not mix editing live canonical with archiving history (Anti-direction 210). Archive rather than delete, keeping the archive greppable (Anti-direction 211). If the archive file is absent, skip archiving and prompt for its creation (do not delete history). This is a prompt, not a mandate (steps 1–3 of packet completion complete as before even without history archiving = behavior-preserving). The archive target differs from `compass-archive.md` (dedicated to superseded Decision Rules). **If that feature's `## 機能追記: <slug>` lives in the split store `.intent/tree/<feature>.md`, look at that file as the target** (if `.intent/tree/` is absent, look at the tail of the body `intent-tree.md` as before = permanent fallback; tree-normalize / DR133).

If a done packet remains under `active/` due to an interruption or the like, the consistency check of `/intent-status` reports it as a lingering violation.

## 8. Presenting past entries (repeated write-backs)

- **Reading cross-reads in split form (CONTRACT "split / archive discipline for append-only records"; the same discipline as `intent-overview`'s `aggregate-sources.md` and `intent-status`'s decision-table footnote 10)**: when reading past entries of `deltas` / `export-log`, cross-read in the order the split form `.intent/<rec>/*.md` set (source of truth if present; natural-key ascending) → read-fallback to the old `.intent/<rec>.md` (the generated mirror) if absent. When the split form and the old single mirror coexist, treat **the split form as the source of truth** and do not double-count the mirror. archive (`.intent/<rec>/archive/`) is read as history (not mixed into the active tally). This reading is a path separate from writing (the split writes in §4), and the missed-writeback cross-check and the past-entry listing return the same result before and after the split (behavior-preserving).
- At startup, always present the list of past delta entries of the target packet (including declined items with the "on-hold" tag; collected via the split-form cross-read above).
- Writing back the same packet again (after re-export / re-implementation) appends a **new entry** without rewriting existing entries (history is preserved).
- The mechanical check for "does a corresponding delta exist" is valid **only for the first cycle**. From the second cycle on, the user decides whether a write-back is needed after being presented the list of past entries.
- Even after writeback completes, the target packet's drafts (`.intent/cc-sdd/<packet-slug>/`) are **never deleted** (they persist per packet). Enumerate missed write-backs by cross-checking all rows of export-log (split-form cross-read) × the surviving `.intent/cc-sdd/<packet-slug>/` drafts × deltas (split-form cross-read).
- **Direct-implementation cases (exit `direct`; identified at §1 tier 4) are out of scope for the §8 cross-check**: a direct-implementation case that bypasses cc-sdd / openspec / speckit appears in neither export-log nor the cc-sdd drafts, so the missed-writeback enumeration above (export-log × cc-sdd drafts × deltas) does not detect it. This is a separate axis (omission enumeration, not target identification); do not bring direct-implementation omission enumeration into §8 (§1's target identification handles direct implementation, while §8's omission cross-check stays scoped to cases that have cc-sdd drafts — INV34).

## 9. Canonical deltas.md template (the source of truth)

The following is **the source of truth** of the canonical deltas.md template; the scaffold (the initial content of the distributed `.intent/deltas.md`) is its copy. When changing the heading structure, always change here first.

- In environments without `.intent/deltas.md` (existing users), create it anew from this template at the first run.
- **Never overwrite an existing deltas.md** (non-destructive). On existing files, only append entries and update Status and tags.

```markdown
# Intent Deltas

> Recorded by `/intent-writeback`, referenced by `/intent-status` and `/intent-improve`. The canonical deliverables (intent-tree.md / intent-compass.md / the packet files and plan.md under `.intent/packets/`) are updated after the fact only through these deltas.

## How this file operates

- Write-back is two-staged: `/intent-writeback` first records learnings here as a delta (it never edits the canonical deliverables directly), and only the items the user approves are promoted into the canonical deliverables.
- One write-back of one packet = one entry. Writing back the same packet again (after re-export / re-implementation) appends a new entry (history is preserved). The mechanical check for "does a corresponding delta exist" is valid only for the first cycle; from the second cycle on, the user decides whether a write-back is needed by reviewing the list of past entries.
- Draft retention (per-packet directories): the drafts under `.intent/cc-sdd/<packet-slug>/` persist per packet (untracked by Git, local-only). Completing a write-back does not delete the drafts. The export history is recorded in `.intent/export-log.md` (one row per export with packet name, datetime, and commit), and missed write-backs of previously exported packets are enumerated by cross-checking all rows of export-log.md × the surviving `.intent/cc-sdd/<packet-slug>/` drafts × this file.

## State semantics

- `pending`: recorded, not yet promoted.
- `promoted` / `closed` are terminal states. Approving one or more items and reflecting them into the canonical deliverables → `promoted`; declining every item as "rejected" → `closed`.
- Declined items require one of the two tags: "rejected (no re-proposal) | on-hold (re-propose at the next writeback)". Only on-hold items become re-proposal targets at the next `/intent-writeback` run (and review targets for `/intent-improve`), and the final tag update (promote / confirm rejection / keep on hold) is done by `/intent-writeback`.
- A `[question]` learning is considered digested once transcribed into the Open Questions of intent-tree.md (record the transcription target in the promotion record's reflection target).

## Delta: <packet-name> — <ISO 8601 date>

- Status: pending | promoted (<promotion date>) | closed (<close date>)
- Source: latest row of export-log.md | Source Packet in .intent/cc-sdd/<packet-slug>/ | specified by the user

### Learnings

Write each learning as `[tag] <a plain one-sentence summary (REQUIRED)>`. The summary should be a plain sentence an approver can read directly and grasp — not a jargon-compressed noun phrase — even if it runs a little long for the sake of clarity. Only when background, rationale, or implications are needed, add an indented `  - 解説 (note): <…>` sub-line **optionally** below it (the note is not required; a summary-only learning is the normal form).

- [decision] <a decision made during implementation that wasn't in the packet definition, in plain words>
  - 解説 (note): <why this decision was reached — background or rationale (optional; omit if unneeded)>
- [invariant-violation] <where an existing Invariant conflicts with the implementation reality, in plain words>
  - 解説 (note): <which Invariant conflicts and how, and the intended response (optional)>
- [implicit-behavior] <behavior not written in the intent that the implementation already exhibits, in plain words (usually summary-only)>
- [deferred-resolved] <how a previously deferred item was resolved, in plain words>
- [question] <a newly surfaced unresolved question, in plain words>

### Outcome learning (optional; append once per observation)

Use the following observation block only when recording a post-release outcome. Record a usability study or a single user's feedback in the same observation block as any other outcome. When the same intent has another observation, append another block without overwriting past observations. If the target L1's outcome measure is missing, accept the record and say that an outcome measure needs to be drafted. Do not paste raw data such as sales records, user logs, or participant statements; record a summary of the result.

#### Observation: <ISO 8601 datetime or a human-readable distinguishing name>

- Status: pending | promoted (<promotion date>) | closed (<close date>)
- Target L1: <verbatim quote of the L1 item in Intent Tree>
- Target L1 location: <surrounding heading or location when the same quote appears more than once | not needed>
- Result: value delivered | value not delivered | not known yet
- Summary: <summary of the result without pasting raw data>
- Who measured: <measurer or reviewer>
- When measured: <observation datetime>
- Where measured: <measurement source or reference source>

### Promotion record (when promoted / closed)

- Reflected into: a new entry in intent-compass.md Decision Rules (with a superseded note on the old entry) / intent-tree.md L3 / the target packet file (under active/) / the Deferred section of plan.md (with a resolution note)
- Declined: <learnings not promoted> — rejected (no re-proposal) | on-hold (re-propose at the next writeback)
```
## Plainness check for questions (right before output; shared)

Right before putting a question or confirmation to the user, check these 5 points (if any fails, rewrite the question in plain words before sending; the rewrite must not change the question's meaning or options):

1. **Does it stand on its own?** Would a first-time reader understand the question by itself? Are you transcribing vocabulary straight from the internal documents you just read (compass, packets, rules, etc.)?
2. **Is it overloaded?** Three or more unexplained technical terms in one question is the sign of overload — split it or reword it.
3. **Did you gloss identifiers?** When you surface an identifier (a command name, a symbol, a packet name), attach a one-line plain-words gloss at first mention.
4. **Are you overloading an ordinary word?** Even when a word looks ordinary (e.g. "stand-in", "delivery"), are you using it with a narrow project- or tool-specific meaning? If you (the tool/AI) loaded that meaning onto it, attach a one-line plain-words gloss at its first mention in the conversation or document (leave ordinary words used in their everyday sense, and established technical terms, alone).
5. **Are you conveying meaning only through a metaphor or a vague qualifier?** The foundation is precision: write so the meaning reads unambiguously (plain language is a means of staying easy to read while preserving it). Do not convey meaning only through an ungrounded vague qualifier (e.g. "significantly", "nicely") or a bare metaphor — if you use a metaphor, pair it immediately with a precise restatement (do not force established technical terms, or ordinary words in their everyday sense, into strained paraphrases — that makes things more ambiguous).

This check is generation-time prevention and works as a pair with the after-the-fact check (`/intent-validate`'s coinage check) — never prevention alone or checking alone.
