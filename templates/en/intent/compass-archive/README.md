# compass-archive/ (split form)

compass-archive is the record that retires superseded Decision Rules, so write it split into **per-superseded-rule files (rule-unit)** `compass-archive/<rule-slug>.md`. Re-superseding the same rule collects into the same file (the rule is the natural key).

- The `<rule-slug>` is derived from the retired Decision Rule's identifier via the existing slug rule (`intent-packets/rules/packet-format.md`). Do not use sequential numbering (a central counter like `0001`).
- Retirement happens when writeback / improve supersedes a Decision Rule. **Move the 6 fields (Context / Decision / Why / Alternatives considered / Consequences / Revisit when) + the successor reference verbatim (byte-unchanged)** — do not summarize or alter them (record content is immutable).
- Since this directory is itself the archive role, the `archive/` subdirectory is a further per-year refuge when needed.

> This README is a **restatement** of the rule. The single source of truth is CONTRACT.md "Split & archive discipline for append-only records". Consult CONTRACT for placement decisions.
