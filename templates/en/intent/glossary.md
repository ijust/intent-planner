# Glossary (lightweight canonical vocabulary ledger, β)

> A lightweight canonical ledger that gathers in one place the mother-set of the agreed-upon canonical vocabulary (ubiquitous language) for this project. `/intent-validate` reads it as the mother-set when it names, read-only, "a term not in the ledger = a suspected coinage". **Humans edit it; skills only read it and never modify it automatically.**

## How to use this ledger

- **Its purpose is limited to "gathering canonical terms plus spelling variants / synonyms".** It is not a dictionary for bulk-replacing terms with translations (no translation replacement that harms readability / discoverability).
- **This is not exhaustive.** The premise is that you grow this file by appending rows as canonical terms increase. When you officially adopt a new term, register its canonical form, spelling variants, and a one-line explanation here.
- **Write each one-line explanation in plain words that a first-time reader can understand on its own.** Do not chain unexplained ledger terms or technical jargon inside a definition. When in doubt, state "what it does" with a subject and a verb (e.g., "a check that points out X; it never rewrites files"). If a term cannot be explained in plain words, reconsider whether to register that term at all.
- **It is canonical (humans edit it).** The coinage-management skill reads this ledger only and never rewrites it automatically. Applying a rewrite suggestion is a separate action taken only after a human approves it.
- When a term not in the "Canonical term" column appears in an intent artifact, detection offers it as a "suspected coinage" candidate. Proper nouns, established English terms, and legitimate new terms already given a first-mention one-line explanation are excluded.

## Entry schema (minimal 3 fields)

| Canonical term | Aliases & synonyms | One-line explanation |
|---|---|---|
| ubiquitous language | canonical vocabulary | The full set of terms this project has agreed to treat as "correct". It is kept in one place because intent alignment breaks down when everyone uses different words. |
| canonical vocabulary | ubiquitous language | The approved, correct terms registered in this ledger. A term not found here is suspected of being a newly invented word. |
| coinage-suspect | suspected coinage | The name of the check that points out a term appearing in artifacts but missing from the ledger, saying "this may be a newly invented word". It only points things out; it never rewrites files. |
| groundless-conclusion | suspected groundless conclusion | The name of the check that points out conclusions whose "why we decided this" (premises, constraints, trade-offs) cannot be traced. A conclusion without its reasons cannot be revisited later. It never rewrites files. |
| unverified-hypothesis | suspected unverified hypothesis | The name of the check that points out hypotheses stated as settled without supporting evidence. While groundless-conclusion looks for missing reasons, this one looks for missing evidence (a separate role). It never rewrites files. |
| dangling-reference | suspected dangling reference | The name of the check that points out numbered references in documents (pointers like `INV 3` or `DR 5`) whose target entry has been deleted or moved away, leaving the pointer with nowhere to go. It looks at something different from the other checks such as coinage-suspect: only whether a reference's target still exists. It never rewrites files. |
| glossary | vocabulary ledger | This list itself: the correct terms together with their aliases and one-line explanations. |
| drift | — | Gradually moving away from the original intent as work progresses. Common situations where this happens are cataloged in drift-patterns. |
| packet | — | A self-contained unit of work used to hand intent over to implementation. Where it came from is recorded at the top of each file (frontmatter). |
| compass | intent-compass | The reference you return to when unsure how to decide: a file gathering the promises to keep (Invariants) and the records of how decisions were made (Decision Rules). |
| intent tree | intent-tree | The canonical file that lays out intent — why, what, and how — as a hierarchy from purpose down to candidate work items. |
| work plan | 工程計画 | The human planning intent of "in which grouping and in what order to build the packets", written in an optional section of `.intent/packets/plan.md`. Group headings may be written freely in your own words (Phase, step, etc.; nesting allowed), and the order expresses priority. The tools only read it to surface a recommended order of work; they never enforce order or auto-assign. **It is distinct from the tool's own process phases (the discover→compass→… stages of how you proceed), from a packet's `state` (the draft/ready/… progress stage), and from milestones (records of past turning points)** — those are separate existing mechanisms. |
