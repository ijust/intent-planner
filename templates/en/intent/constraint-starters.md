# Constraint Starters (catalog of constraint starting points)

> Read by `/intent-compass` (primary touchpoint) and `/intent-discover` (drift-prone-situation pre-check lane) as **draft candidates** when writing Anti-direction / Invariants. It is the source set for matching bundled domain conventions against your context to surface "this case is probably this." **Surfacing is a read-only draft; transcription into the compass happens manually after a human picks what to adopt** (the AI does not auto-transcribe). Constraints you personally reuse are grown in a separate file, `constraint-library.md`.

## How to read this catalog

- **This is not exhaustive.** The conventions listed here are only a starting point (2 seeds, one each for code / non-code). Later surfacing only lists conventions that fit the context as **candidates**; you decide whether to adopt them.
- Each convention is identified by `id` (kebab-case). `domain` distinguishes code vs non-code, `fits when` describes "for what kind of work it helps," and `starter` holds the Anti-direction / Invariant candidates.
- **This is a supplement, not a replacement.** The compass's Anti-direction/Invariant derivation (impact list → Invariants, premortem → Anti-direction) stays as is; this only injects draft candidates ahead of it.
- **This is a static document.** It never queries an external service, online lookup, or database when used. It also makes no external call to "fetch the latest conventions." It stays within the bundled static content plus contextual completion in later slices.
- **This is a separate catalog from the existing drift catalog (drift-patterns) and context-cost catalog (context-cost-cues).** Because what it accumulates differs (reusable constraint conventions), it is a separate file, and it never touches the drift log's (drift-log) records or aggregation.

## Provenance and accuracy discipline (quality of bundled conventions)

- **Every convention must carry a source (`source` field).** Record the basis (a primary-source URL, etc.) and the retrieval date; do not bundle conventions of unknown provenance. This is the guardrail against pushing wrong or stale conventions as "this case is probably this."
- **Accuracy review**: When adding or updating a convention, confirm the source exists and is still valid (do not attach guessed or fabricated sources).
- **Update policy**: When a source goes stale (recommendation changed, retracted, etc.), update the source or revisit the convention itself.
- **License**: When quoting from a source, respect the source's license and terms of use.

## How to write a convention

Append a new convention with the schema below. Make `id` a unique kebab-case key. `source` is required (do not add a convention without a source).

```markdown
## id: <kebab-case identifier key>
- name: <short name>
- domain: <code | non-code>
- fits when: <for what kind of work or material this convention helps. A cue the compass/discover matches against context>
- starter:
  - Anti-direction: <the anti-direction candidate to surface in that situation>
  - Invariant: <the invariant candidate. If material-dependent, the compass concretizes it from context>
- source: <basis (primary-source URL, etc.) and retrieval date. Required>
```

- `fits when` is written as a matching cue, not a strong rule of "if this matches it must be this convention" (false positives are assumed; candidates are narrowed, not pushed).
- `starter` is **not a confirmed value to drop straight into** the compass's Anti-direction/Invariants — it is a candidate a human picks.

---

## id: sql-injection-placeholder

- name: SQL injection prevention (always use placeholders)
- domain: code
- fits when: A web app or similar that builds SQL or queries a database using values that include user input. When you see queries being built by string concatenation.
- starter:
  - Anti-direction: Do not embed user input into SQL by string concatenation. Do not execute a dynamically assembled query string as-is.
  - Invariant: User-derived values must always be passed via placeholders (parameterized queries). Never concatenate values as part of SQL syntax.
- source: OWASP SQL Injection Prevention Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html, retrieved 2026-06-21)

## id: slide-deck-structure

- name: Presentation deck structure (claim first, one message per slide)
- domain: non-code
- fits when: Building a presentation deck, slides, or a proposal. When you see a tendency to cram in information or hold the conclusion until the end.
- starter:
  - Anti-direction: Do not cram multiple claims onto one slide. Do not start from a list of facts with the conclusion hidden until the end.
  - Invariant: Keep one slide = one message. Each slide leads with its claim (conclusion) and supports it with evidence.
- source: Barbara Minto "The Pyramid Principle" (conclusion-first, MECE structure) / Garr Reynolds "Presentation Zen" (one message per slide), retrieved 2026-06-21
