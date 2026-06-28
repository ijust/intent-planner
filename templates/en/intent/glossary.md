# Glossary (lightweight canonical vocabulary ledger, β)

> A lightweight canonical ledger that gathers in one place the mother-set of the agreed-upon canonical vocabulary (ubiquitous language) for this project. `/intent-validate` reads it as the mother-set when it names, read-only, "a term not in the ledger = a suspected coinage". **Humans edit it; skills only read it and never modify it automatically.**

## How to use this ledger

- **Its purpose is limited to "gathering canonical terms plus spelling variants / synonyms".** It is not a dictionary for bulk-replacing terms with translations (no translation replacement that harms readability / discoverability).
- **This is not exhaustive.** The premise is that you grow this file by appending rows as canonical terms increase. When you officially adopt a new term, register its canonical form, spelling variants, and a one-line explanation here.
- **It is canonical (humans edit it).** The coinage-management skill reads this ledger only and never rewrites it automatically. Applying a rewrite suggestion is a separate action taken only after a human approves it.
- When a term not in the "Canonical term" column appears in an intent artifact, detection offers it as a "suspected coinage" candidate. Proper nouns, established English terms, and legitimate new terms already given a first-mention one-line explanation are excluded.

## Entry schema (minimal 3 fields)

| Canonical term | Aliases & synonyms | One-line explanation |
|---|---|---|
| ubiquitous language | canonical vocabulary | The mother-set of correct terms agreed upon for the project. When the vocabulary fractures, alignment of intent breaks down. |
| canonical vocabulary | ubiquitous language | The correct terms themselves registered in the ledger. A suspected coinage is judged as a term absent from this set. |
| coinage-suspect | suspected coinage | The ID of the detection check that names, read-only, any term absent from the canonical vocabulary as a suspected coinage. |
| groundless-conclusion | suspected groundless conclusion | The ID of the detection check that names, read-only, any conclusion whose rationale (reasons, constraints, premises, trade-offs) is not traceable, and checks correctability. |
| glossary | vocabulary ledger | The lightweight canonical ledger (this file) that gathers canonical terms plus spelling variants / synonyms. The home of the mother-set. |
| drift | — | A way of progressing that gradually departs from the original intent. drift-patterns catalogs it as situation types. |
| packet | — | The minimal unit of intent handed from intent to spec / implementation. Its provenance is stamped in frontmatter. |
| compass | intent-compass | The compass that folds intent into Decision Rules and Invariants. |
| intent tree | intent-tree | The canonical body of intent that holds objective / problem / direction in a hierarchy. |
