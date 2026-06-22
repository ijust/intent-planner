# export-log/ (split-form active surface)

export-log is a **packet-derived** record, so write it split into **per-packet files** `export-log/<packet-slug>.md`. Different packets touch different files, so tail-append conflicts are eliminated by construction (this also resolves the shared collision where cc-sdd / openspec exports append to the same single file).

- Keep only the currently-referenced export records here (the active surface), kept thin.
- Move terminal (no-longer-referenced) entries into `export-log/archive/<year>/`.
- The `<packet-slug>` in the filename follows the existing packet slug rule (`intent-packets/rules/packet-format.md`). Do not use sequential numbering (a central counter like `0001`).
- **The old `../export-log.md` is kept as a generated active mirror**: until reader cross-following is complete, the writer regenerates `../export-log.md` on every export by concatenating the split files in `exported_at` order (derived, never hand-edited). This keeps existing single-file readers from breaking.

> This README is a **restatement** of the rule. The single source of truth is CONTRACT.md "Split & archive discipline for append-only records". Consult CONTRACT for placement decisions.

Do not put real entries in the active surface; entries are generated in split form by the export writers (intent-export-cc-sdd / intent-export-openspec).
