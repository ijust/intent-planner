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
