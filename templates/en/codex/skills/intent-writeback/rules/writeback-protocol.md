# Writeback Protocol (canonical rules for intent-writeback)

The source of truth for `/intent-writeback`'s decisions and procedure. SKILL.md holds only the skeleton of the steps; decisions follow this file. "Canonical deliverables" means intent-tree.md / intent-compass.md / the files under `.intent/packets/` (the packet files and plan.md).

## 1. Target identification (4-tier priority + fallback)

Identify exactly one target packet by first-match from the top. When the target is identified via a fallback (tier 3 or later), announce that fact (which tier identified it) in the user-facing output.

1. **Packet name from the argument**: if a packet is specified by argument, use it as the target.
2. **The latest row of export-log.md (canonical)**: use the packet name of the latest data row (= the last data row of the `| packet | exported_at | commit |` table) in `.intent/export-log.md`. In the steady state where export-log exists, the target is finalized here.
3. **"## Source Packet" heading in the drafts (fallback)**: if export-log.md is absent or its latest row cannot be parsed, read the packet name from the "## Source Packet" heading in `.intent/cc-sdd/<packet-slug>/requirements.md`. Adopt that heading only when **exactly one** packet directory exists; if multiple exist, list the heading of each directory as candidates and go straight to 4. This tier is a relief for the transitional period where export-log is not yet established (e.g., right after the first export); in the steady state the target is finalized at 2.
4. **Text-matching fallback (user confirmation required)**: raise candidates by text-matching the draft bodies against the packet names (frontmatter `name`) in index.md / the packet files under `active/`, then ask the user in natural language and wait for the answer. Never finalize the target without confirmation.

If the target still cannot be identified, present the situation (that it was not found and where you looked), ask the user to specify the write-back target packet, and stop.

**Directory identification rule (packet name → directory)**: the source of truth for identifying a directory from a packet name is "the `## Source Packet` heading in requirements.md inside the directory matches the packet name". Slug computation is a fast path for searching; even if the slug matches, do not identify the directory as that packet's when the heading does not match.

**Archive exception for target resolution**: if the resolved target packet's file is not under `active/` (a preceding supersede, completion already processed, etc.), refer to `archive/` **explicitly** and identify the file by matching the frontmatter `name` (the only explicit exception to the principle of "normally never read `archive/`"). Once identified, report to the user the fact that the packet is done / superseded. For a write-back to an archived packet that is not done, do not reflect into the target packet file; redirect the learnings to intent-tree.md / intent-compass.md / the successor packet (the packet file `superseded_by` points to).

## 2. Learning extraction perspectives (5 kinds, tags 1:1)

Cross-check the target packet's definition (the target packet file), the cc-sdd drafts (including the Intent-derived constraints), and intent-compass.md against the implementation reality (the codebase, tests, and `.kiro/specs/`; all read-only), and extract learnings from the following 5 perspectives. Tags map 1:1 to the perspectives.

| Tag | Perspective |
|------|------|
| `[decision]` | A new decision (a judgment made during implementation that is not written in the packet definition) |
| `[invariant-violation]` | A discovered invariant violation (a conflict between existing Invariants and the implementation reality) |
| `[implicit-behavior]` | Implicit behavior not written in the intent (reverse-extracted from the implementation) |
| `[deferred-resolved]` | A resolved Deferred |
| `[question]` | A new unresolved Question |

During learning extraction, cross-check against the **Revisit when** field of the Decision Rules in intent-compass.md, and on each learning line that matches a Revisit when condition, append a reference to the corresponding Decision (e.g. `[decision] <a new decision> (Revisit matched: <summary of the corresponding Decision's Context>)`). The note is free text within the learning line; the canonical deltas.md template (§9) is not changed.

## 3. Two-stage protocol

**The scope of the constraint in this §3 is limited to the writeback phase (the stage of extracting learnings back from reality after implementation and returning them to the canonical deliverables).** The drafting skills run **before** implementation — `/intent-compass` (which directly Writes the compass's North Star / Anti-direction / Invariants / Decision Rules) and `/intent-packets` (which directly drafts packet files) — are out of scope of this constraint (their writing canonical directly is the normal, intended behavior). What this constraint forbids is "writing post-implementation learnings into the canonical deliverables directly, bypassing a delta", not pre-implementation drafting.

In the writeback phase, never editing the canonical deliverables directly is the backbone of this skill. Always go through the following two stages.

Note: once you enter the stage of "implementation is complete and you are returning learnings from that reality to the canonical deliverables", that is the entry to the writeback phase. Do not settle for writing Evidence directly into the packet file; go through this protocol (via a delta).

### Stage 1: delta recording (canonical untouched)

- Record the extracted learnings into deltas.md as a new entry (Status: pending). Do not touch the canonical deliverables at this stage at all.
- Even if the user approves nothing, the entry remains as pending (automatic rewriting without approval is forbidden).

### Stage 2: approval → per-item promotion

Vary the approval granularity by the kind of learning. Do not ask about everything one item at a time with equal weight (in practice most learnings are records of "the implementation already behaves this way" with no room for yes/no, so asking about every item uniformly turns approval into a ritual).

- **Gated items (explicit approval mandatory)**: the following two kinds affect the canonical criteria and invariants, so always ask the user about each item in natural language and wait for the answer.
  - `[invariant-violation]` (a discovered invariant violation; the user decides the response policy such as "fix the code / keep it as a record only").
  - **`[decision]` that changes Decision Rules (the compass ADR)** (those falling under the ADR promotion in §4: replacing or adding an existing Decision, including ones that match a Revisit when).
- **Default bulk promotion (L3-append kind)**: learnings other than the above (a `[decision]` / `[implicit-behavior]` / `[deferred-resolved]` that only appends to intent-tree.md L3, and `[question]` transcription into Open Questions) are presented with their reflection targets as a list, and **after asking the user to name any item they want to hold back, are promoted in bulk if none is named**. Do not ask for a per-item yes/no.
- On either path, "automatic rewriting without approval is forbidden" (the backbone of §3's opening) is preserved because every item is already recorded as a delta in Stage 1 and the user is given one chance to hold items back. Items the user holds back are treated as declined and given a §5 two-value tag.
- Reflect the approved or bulk-promoted items into the canonical deliverables, and record `Status: promoted (<promotion date>)` and the reflection targets in the delta entry.
- Finalizing the state: **approving one or more items and reflecting them into the canonical deliverables → `promoted`**. **Declining every item as "rejected" → `closed`**. Both are terminal states. If items remain undecided including on-hold ones, keep pending.

## 4. ADR promotion rules (promotions that change Decision Rules)

A promotion that changes the criteria (Decision Rules) fully complies with the existing ADR form of intent-compass.md.

- **Add a new entry**: **Context** (the question and situation) / **Decision** (the option taken) / **Why** (the criteria) / **Alternatives considered** (a summary of the alternatives examined and why they were rejected) / **Consequences** (connection to Invariants and Anti-direction) / **Revisit when** (the conditions for revisiting; if they cannot be determined, explicitly record "undetermined"). **The Why field is mandatory** (never omit it).
- Put a **superseded note** on the old entry being replaced (append to the old entry that it is superseded, with a reference to its replacement).
- Move the old entry carrying the superseded note to the end of `.intent/compass-archive.md` **with its 6 fields intact** (no replacement with a summary). If compass-archive.md is absent, create it anew before evacuating. Do not delete the old entry (move only). Active Decision Rules entries stay directly written inside intent-compass.md as before (no pointer indirection to another file).
- **Do not introduce a custom Supersedes field** (do not create a dedicated field on the new entry side; the note goes on the old entry side).
- Old 4-field entries recorded before the introduction of the 6-field format (those without Alternatives considered / Revisit when) remain valid; do not treat the missing fields as an error, flag them, or rewrite them.

## 5. Final updates of declined-item tags (writeback's responsibility)

- Always put one of the two tags on learnings that were not promoted: **rejected (no re-proposal)** | **on-hold (re-propose at the next writeback)**.
- On-hold items are re-proposed at the next writeback run. The finalizing operation of **reflecting the re-proposal result (promote / confirm rejection / keep on hold) into the tag of the corresponding declined item of the old entry is writeback's responsibility**. `/intent-improve` only nudges the user to deal with on-hold items and never performs the final tag update.

## 6. Digesting [question]

- A `[question]` learning is considered digested once transcribed into the Open Questions of intent-tree.md.
- Record the transcription target (intent-tree.md Open Questions) as the reflection target in the promotion record.

## 7. Completion as one sequence of operations (mark done, move to archive, regenerate index)

Once the write-back of the target packet is complete (after the delta's terminal state is finalized), perform the packet's completion as the following **fixed-order sequence of operations** (never leave a done packet lingering under `active/`).

1. Fill in `state: done`, `closed_at` (completion date), and `spec_refs` in the frontmatter of the target packet file. `spec_refs` is the corresponding spec/feature name(s); raise candidates by cross-checking against the specs in progress under `.kiro/specs/` and finalize the entry with user confirmation.
2. Move the packet file to `archive/<year of closed_at>/` (never delete; move only).
3. Regenerate `index.md`: build the `| packet_id | name | state | summary |` table in ascending `packet_id` order from the frontmatter of all packet files under `active/` only (when `active/` is empty, the header-only table is the canonical form).

If a done packet remains under `active/` due to an interruption or the like, the consistency check of `/intent-status` reports it as a lingering violation.

## 8. Presenting past entries (repeated write-backs)

- At startup, always present the list of past delta entries of the target packet (including declined items with the "on-hold" tag).
- Writing back the same packet again (after re-export / re-implementation) appends a **new entry** without rewriting existing entries (history is preserved).
- The mechanical check for "does a corresponding delta exist" is valid **only for the first cycle**. From the second cycle on, the user decides whether a write-back is needed after being presented the list of past entries.
- Even after writeback completes, the target packet's drafts (`.intent/cc-sdd/<packet-slug>/`) are **never deleted** (they persist per packet). Enumerate missed write-backs by cross-checking all rows of export-log.md × the surviving `.intent/cc-sdd/<packet-slug>/` drafts × deltas.md.

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

- [decision] <a new decision>
- [invariant-violation] <a discovered invariant violation>
- [implicit-behavior] <implicit behavior not written in the intent>
- [deferred-resolved] <a resolved Deferred>
- [question] <a new unresolved Question>

### Promotion record (when promoted / closed)

- Reflected into: a new entry in intent-compass.md Decision Rules (with a superseded note on the old entry) / intent-tree.md L3 / the target packet file (under active/) / the Deferred section of plan.md (with a resolution note)
- Declined: <learnings not promoted> — rejected (no re-proposal) | on-hold (re-propose at the next writeback)
```
