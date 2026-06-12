# cc-sdd Export Drafts

> `/intent-export-cc-sdd` writes per-packet drafts under this directory. Everything except this README is NOT tracked by Git (local-only). The readers are the user handing drafts to cc-sdd, plus `/intent-writeback`, `/intent-status`, and `/intent-validate`. The authority for the draft format is the export skill's rules (map-cc-sdd); no scaffold templates live here.

## Structure

```
.intent/cc-sdd/
├── README.md          # this note (tracked by Git)
└── <packet-slug>/     # generated per packet by /intent-export-cc-sdd (untracked)
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

The directory name (slug) is derived deterministically from the packet name (see map-cc-sdd for the rule and collision handling).

## Role of the 3 drafts

- **requirements.md** — the condensed Project Description passed to cc-sdd's `/kiro-spec-init`. Always includes the headings `## Source Packet` (exact transcription of the packet name), `## Parent Intent`, and `## Invariants`.
- **design.md** — oversight-prevention hints (bullets) for when cc-sdd generates the design. Not the main body.
- **tasks.md** — intent-derived constraints (parent intent / invariants / anti-direction) first, followed by check items for cc-sdd's tasks generation.

## Git-untracked policy

- Drafts under the packet directories are local-only and not tracked by Git (only this README is tracked). By design, this prevents team merge conflicts and draft loss by overwriting.
- The history of exports lives in the Git-shared `.intent/export-log.md` (1 export = 1 line). That log is also the canonical source for resolving the "current packet".
- Drafts are not deleted after writeback; they remain available for cross-checking missed writebacks (export-log × remaining drafts × deltas.md).
