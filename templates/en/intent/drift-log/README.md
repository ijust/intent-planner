# drift-log/ (split-form active surface)

drift-log is an **event-derived** record, so write it split into **date+slug files** `drift-log/<date>-<slug>.md`. Different events touch different files, so tail-append conflicts are eliminated by construction.

- Keep only the currently-referenced events here (the active surface), kept thin.
- Move terminal (no-longer-updated) entries into `drift-log/archive/<year>/`.
- The `<slug>` in the filename follows the existing slug rule (`intent-packets/rules/packet-format.md`). Do not use sequential numbering (a central counter like `0001`).

> This README is a **restatement** of the rule. The single source of truth is CONTRACT.md "Split & archive discipline for append-only records". Consult CONTRACT for placement decisions.

The existing single file `../drift-log.md` may remain (it coexists with the new split form). The 9-key schema (record contents) is unchanged. Do not put real entries in the active surface; entries are generated in split form by the drift-record writer.
