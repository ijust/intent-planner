# milestones/ (split-form active surface)

milestones is an **event-derived** record, so write it split into **per-date+slug files** `milestones/<date>-<event-slug>.md`. Different events touch different files, so tail-append conflicts are eliminated by construction.

- Keep only the currently-referenced milestone events here (the active surface), kept thin.
- Move terminal (no-longer-referenced) entries into `milestones/archive/<year>/`.
- The `<event-slug>` is derived from the event's natural-language text via the existing slug rule (`intent-packets/rules/packet-format.md`); `<date>` is recorded_at. Do not use sequential numbering (a central counter like `0001`).
- **Manual entry**: milestones is a record the user fills in declaratively. In split form, create one file `milestones/<date>-<event-slug>.md` per milestone event and write a single `| event | recorded_at | note |` row (keep the event natural-language text verbatim — improve's Revisit matching and status's unconsumed-milestone detection read it).

> This README is a **restatement** of the rule. The single source of truth is CONTRACT.md "Split & archive discipline for append-only records". Consult CONTRACT for placement decisions.
