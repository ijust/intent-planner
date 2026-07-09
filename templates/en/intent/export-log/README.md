# export-log/ (split-form active surface)

export-log is a **packet-derived** record, so write it split into **per-packet files** `export-log/<packet-slug>.md`. Different packets touch different files, so tail-append conflicts are eliminated by construction (this also resolves the shared collision where cc-sdd / openspec exports append to the same single file).

- Keep only the currently-referenced export records here (the active surface), kept thin.
- Move terminal (no-longer-referenced) entries into `export-log/archive/<year>/`.
- The `<packet-slug>` in the filename follows the existing packet slug rule (`intent-packets/rules/packet-format.md`). Do not use sequential numbering (a central counter like `0001`).
- **The old `../export-log.md` is kept as a generated active mirror**: until reader cross-following is complete, the writer regenerates `../export-log.md` on every export by concatenating the split files in `exported_at` order (derived, never hand-edited). This keeps existing single-file readers from breaking.

## Feature-name real link (an appended line below the table; optional)

Besides the three-column table (`| packet | exported_at | commit |`), a split file may carry the line `- feature: <feature name> (<record date>)` **below the table**. It records the feature name the downstream spec tool generated after the export, so the packet → generated spec correspondence stays traceable by a real link later (there is no guarantee that the packet name survives into the downstream spec).

- The writer writes it only when the handoff went as far as invoking `/kiro-spec-init`. When it did not, or the name could not be obtained, nothing is written (optional record; never blocking).
- Being a non-table line, it is **invisible** to the existing readers of the table and to the mirror regeneration (the three-column schema is unchanged).
- Append only (never rewrite past lines). Do not write a duplicate of the same feature name. When the feature name changes, add a line.
- Write only the feature name (an identifier) and the date. No sensitive content, no detail.

> This README is a **restatement** of the rule. The single source of truth is CONTRACT.md "Split & archive discipline for append-only records". Consult CONTRACT for placement decisions.

Do not put real entries in the active surface; entries are generated in split form by the export writers (intent-export-cc-sdd / intent-export-openspec).
