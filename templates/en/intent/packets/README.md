# Packets directory

> This directory holds the packets (the work units before handing off to cc-sdd — broader than an Issue, just before a spec), managed as 1 packet = 1 file. The writers are `/intent-packets`, `/intent-writeback`, and `/intent-improve`. The canonical source for the packet file format, ID rule, and state transitions is rules/packet-format.md of the intent-packets skill; no norms live here.

## Structure

```
.intent/packets/
├── README.md            # This explanation
├── plan.md              # Plan-level records (Walking Skeleton / Recommended First Packet / Deferred)
├── index.md             # Generated artifact. The list of active packets (do not edit by hand)
├── active/              # draft / active packets (1 packet = 1 file)
│   └── pkt-<YYYYMMDD>-<slug>.md
└── archive/             # done / superseded packets
    └── <year>/
        └── pkt-<YYYYMMDD>-<slug>.md
```

The skills create `active/` and `archive/` on their first write (no need to create them by hand in advance).

## State transitions in brief

- A packet's state transitions `draft → active → done`. Superseded is not a state but a separate axis: the successor packet_id is filled into the frontmatter `superseded_by`.
- `draft | active` packets live in `active/`; packets that are `done` or have `superseded_by` filled in live in `archive/<year>/`.
- Packets that became done / superseded are moved to archive. They are never deleted (moved only).

## Git tracking

Everything under `packets/` (README / plan / index / active / archive) is Git-tracked. Commit the changes together so the packet history is shared.
