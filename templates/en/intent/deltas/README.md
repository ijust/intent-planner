# deltas/ (split-form active surface)

deltas is a **packet-derived** record, so write it split into **per-packet files** `deltas/<packet-slug>.md`. Different packets touch different files, so tail-append conflicts are eliminated by construction.

- Keep only the currently-referenced deltas here (the active surface), kept thin.
- Move terminal (no-longer-updated) entries into `deltas/archive/<year>/`.
- The `<packet-slug>` in the filename follows the existing packet slug rule (`intent-packets/rules/packet-format.md`). Do not use sequential numbering (a central counter like `0001`).

> This README is a **restatement** of the rule. The single source of truth is CONTRACT.md "Split & archive discipline for append-only records". Consult CONTRACT for placement decisions.

The existing single file `../deltas.md` may remain (it coexists with the new split form). Do not put real entries in the active surface; entries are generated in split form by writeback/discover.
