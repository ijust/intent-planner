# Intent Deltas

> Recorded by `/intent-writeback`, referenced by `/intent-status` and `/intent-improve`. The canonical deliverables (intent-tree.md / intent-compass.md / packets.md) are updated after the fact only through these deltas.

## How this file operates

- Write-back is two-staged: `/intent-writeback` first records learnings here as a delta (it never edits the canonical deliverables directly), and only the items the user approves are promoted into the canonical deliverables.
- One write-back of one packet = one entry. Writing back the same packet again (after re-export / re-implementation) appends a new entry (history is preserved). The mechanical check for "does a corresponding delta exist" is valid only for the first cycle; from the second cycle on, the user decides whether a write-back is needed by reviewing the list of past entries.
- Known constraint (single slot): the drafts under `.intent/cc-sdd/` hold only the latest one packet (overwritten on every export). Missed write-backs of previously exported packets cannot be detected mechanically, so they are compensated by cross-checking packets.md against this file to list candidates and confirming with the user (exports do not record a feature name, so identifying the corresponding spec also relies on text matching and may fail).

## State semantics

- `pending`: recorded, not yet promoted.
- `promoted` / `closed` are terminal states. Approving one or more items and reflecting them into the canonical deliverables → `promoted`; declining every item as "rejected" → `closed`.
- Declined items require one of the two tags: "rejected (no re-proposal) | on-hold (re-propose at the next writeback)". Only on-hold items become re-proposal targets for `/intent-improve`, and the final tag update (promote / confirm rejection / keep on hold) is done by `/intent-writeback`.
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
