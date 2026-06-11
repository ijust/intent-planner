# Writeback Protocol (canonical rules for intent-writeback)

The source of truth for `/intent-writeback`'s decisions and procedure. SKILL.md holds only the skeleton of the steps; decisions follow this file. "Canonical deliverables" means the three files intent-tree.md / intent-compass.md / packets.md.

## 1. Target identification (4-tier priority + fallback)

Identify exactly one target packet by first-match from the top.

1. **Packet name from the argument**: if a packet is specified by argument, use it as the target.
2. **"## Source Packet" in the cc-sdd drafts**: read the packet name from the "## Source Packet" heading in `.intent/cc-sdd/*.md`. The drafts hold only the latest one export (single-slot constraint), so only **the packet of the latest export** can be identified here.
3. **Text-matching fallback (user confirmation required)**: if the "## Source Packet" heading is absent or unclear, raise candidates by text-matching the cc-sdd draft body against the packet names in packets.md, then ask the user in natural language and wait for the answer. Never finalize the target without confirmation.
4. **Request a specification**: if the target still cannot be identified, present the situation (that it was not found and where you looked), ask the user to specify the write-back target packet, and stop.

## 2. Learning extraction perspectives (5 kinds, tags 1:1)

Cross-check the target packet's definition (packets.md), the cc-sdd drafts (including the Intent-derived constraints), and intent-compass.md against the implementation reality (the codebase, tests, and `.kiro/specs/`; all read-only), and extract learnings from the following 5 perspectives. Tags map 1:1 to the perspectives.

| Tag | Perspective |
|------|------|
| `[decision]` | A new decision (a judgment made during implementation that is not written in the packet definition) |
| `[invariant-violation]` | A discovered invariant violation (a conflict between existing Invariants and the implementation reality) |
| `[implicit-behavior]` | Implicit behavior not written in the intent (reverse-extracted from the implementation) |
| `[deferred-resolved]` | A resolved Deferred |
| `[question]` | A new unresolved Question |

## 3. Two-stage protocol

Never editing the canonical deliverables directly is the backbone of this skill. Always go through the following two stages.

### Stage 1: delta recording (canonical untouched)

- Record the extracted learnings into deltas.md as a new entry (Status: pending). Do not touch the canonical deliverables at this stage at all.
- Even if the user approves nothing, the entry remains as pending (automatic rewriting without approval is forbidden).

### Stage 2: approval → per-item promotion

- Present the learnings item by item, ask the user in natural language for promotion approval, and wait for the answer. Do not force bulk approval.
- Reflect only the approved items into the canonical deliverables, and record `Status: promoted (<promotion date>)` and the reflection targets in the delta entry.
- Finalizing the state: **approving one or more items and reflecting them into the canonical deliverables → `promoted`**. **Declining every item as "rejected" → `closed`**. Both are terminal states. If items remain undecided including on-hold ones, keep pending.

## 4. ADR promotion rules (promotions that change Decision Rules)

A promotion that changes the criteria (Decision Rules) fully complies with the existing ADR form of intent-compass.md.

- **Add a new entry**: **Context** (the question and situation) / **Decision** (the option taken) / **Why** (the criteria) / **Consequences** (connection to Invariants and Anti-direction). **The Why field is mandatory** (never omit it).
- Put a **superseded note** on the old entry being replaced (append to the old entry that it is superseded, with a reference to its replacement). Do not delete the old entry.
- **Do not introduce a custom Supersedes field** (do not create a dedicated field on the new entry side; the note goes on the old entry side).

## 5. Final updates of declined-item tags (writeback's responsibility)

- Always put one of the two tags on learnings that were not promoted: **rejected (no re-proposal)** | **on-hold (re-propose at the next writeback)**.
- On-hold items are re-proposed at the next writeback run. The finalizing operation of **reflecting the re-proposal result (promote / confirm rejection / keep on hold) into the tag of the corresponding declined item of the old entry is writeback's responsibility**. `/intent-improve` only nudges the user to deal with on-hold items and never performs the final tag update.

## 6. Digesting [question]

- A `[question]` learning is considered digested once transcribed into the Open Questions of intent-tree.md.
- Record the transcription target (intent-tree.md Open Questions) as the reflection target in the promotion record.

## 7. Presenting past entries (repeated write-backs)

- At startup, always present the list of past delta entries of the target packet (including declined items with the "on-hold" tag).
- Writing back the same packet again (after re-export / re-implementation) appends a **new entry** without rewriting existing entries (history is preserved).
- The mechanical check for "does a corresponding delta exist" is valid **only for the first cycle**. From the second cycle on, the user decides whether a write-back is needed after being presented the list of past entries.

## 8. Canonical deltas.md template (the source of truth)

The following is **the source of truth** of the canonical deltas.md template; the scaffold (the initial content of the distributed `.intent/deltas.md`) is its copy. When changing the heading structure, always change here first.

- In environments without `.intent/deltas.md` (existing users), create it anew from this template at the first run.
- **Never overwrite an existing deltas.md** (non-destructive). On existing files, only append entries and update Status and tags.

```markdown
# Intent Deltas

> Recorded by `/intent-writeback`, referenced by `/intent-status` and `/intent-improve`. The canonical deliverables (intent-tree.md / intent-compass.md / packets.md) are updated after the fact only through these deltas.

## How this file operates

- Write-back is two-staged: `/intent-writeback` first records learnings here as a delta (it never edits the canonical deliverables directly), and only the items the user approves are promoted into the canonical deliverables.
- One write-back of one packet = one entry. Writing back the same packet again (after re-export / re-implementation) appends a new entry (history is preserved). The mechanical check for "does a corresponding delta exist" is valid only for the first cycle; from the second cycle on, the user decides whether a write-back is needed by reviewing the list of past entries.
- Known constraint (single slot): the drafts under `.intent/cc-sdd/` hold only the latest one packet (overwritten on every export). Missed write-backs of previously exported packets cannot be detected mechanically, so they are compensated by cross-checking packets.md against this file to list candidates and confirming with the user (exports do not record a feature name, so identifying the corresponding spec also relies on text matching and may fail).

## State semantics

- `pending`: recorded, not yet promoted.
- `promoted` / `closed` are terminal states. Approving one or more items and reflecting them into the canonical deliverables → `promoted`; declining every item as "rejected" → `closed`.
- Declined items require one of the two tags: "rejected (no re-proposal) | on-hold (re-propose at the next writeback)". Only on-hold items become re-proposal targets at the next `/intent-writeback` run (and review targets for `/intent-improve`), and the final tag update (promote / confirm rejection / keep on hold) is done by `/intent-writeback`.
- A `[question]` learning is considered digested once transcribed into the Open Questions of intent-tree.md (record the transcription target in the promotion record's reflection target).

## Delta: <packet-name> — <ISO 8601 date>

- Status: pending | promoted (<promotion date>) | closed (<close date>)
- Source: Source Packet in .intent/cc-sdd/ | specified by the user

### Learnings

- [decision] <a new decision>
- [invariant-violation] <a discovered invariant violation>
- [implicit-behavior] <implicit behavior not written in the intent>
- [deferred-resolved] <a resolved Deferred>
- [question] <a new unresolved Question>

### Promotion record (when promoted / closed)

- Reflected into: a new entry in intent-compass.md Decision Rules (with a superseded note on the old entry) / intent-tree.md L3 / packets.md <packet>
- Declined: <learnings not promoted> — rejected (no re-proposal) | on-hold (re-propose at the next writeback)
```
