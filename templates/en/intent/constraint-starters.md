# Constraint Starters (catalog of constraint starting points)

> Read by `/intent-compass` (primary touchpoint) and `/intent-discover` (drift-prone-situation pre-check lane) as **draft candidates** when writing Anti-direction / Invariants. It is the source set for matching bundled domain conventions against your context to surface "this case is probably this." **Surfacing is a read-only draft; transcription into the compass happens manually after a human picks what to adopt** (the AI does not auto-transcribe). Constraints you personally reuse are grown in a separate file, `constraint-library.md`.

## How to read this catalog

- **This is a starting point, not a finished set.** We broaden domain coverage to raise comprehensiveness over time, but each convention is not a mandate of "it must be this" — they are listed only as **candidates** that fit the context, and you decide whether to adopt them. Raising coverage does not change the read-only-draft, false-positives-assumed, human-transcribed nature.
- **This catalog is split into per-domain files.** This file (the parent catalog) holds the schema, reading guide, verification discipline, and a **domain index** (below); the convention bodies live in `constraint-starters/<domain>.md`. `/intent-compass` and `/intent-discover` read-only pull only the domains relevant to the work at hand (they do not always load all domains — the minimal-cost pull discipline).
- Each convention is identified by `id` (kebab-case). `domain` distinguishes code vs non-code, `fits when` describes "for what kind of work it helps," and `starter` holds the Anti-direction / Invariant candidates. **Design (UI/UX) is a cross-cutting axis spanning both code and non-code**, not a standalone domain value; set `domain` to `code | non-code` and absorb the design framing via `fits when` (e.g., "implementing a frontend UI").
- **This is a supplement, not a replacement.** The compass's Anti-direction/Invariant derivation (impact list → Invariants, premortem → Anti-direction) stays as is; this only injects draft candidates ahead of it.
- **This is a static document.** It never queries an external service, online lookup, or database when used. It also makes no external call to "fetch the latest conventions." It stays within the bundled static content plus contextual completion in later slices.
- **This is a separate catalog from the existing drift catalog (drift-patterns).** Because what it accumulates differs (reusable constraint conventions), it is a separate file, and it never touches the drift log's (drift-log) records or aggregation.

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

## Domain index

Convention bodies live in per-domain files. When matching, read only the domains that fit the work's context (do not always load all domains).

Domains are ordered along three classification axes. **Layer** (which part of the architecture: frontend / API & boundary / backend / data & persistence / infra) + **cross-cutting concern** (effective across layers: security, AI/LLM) + **process / artifact** (VCS hygiene, non-code document/communication). Design (UI/UX) is not a standalone domain; it appears cross-cuttingly inside the frontend layer.

| Class | Domain | File | Conventions it holds (work it fits) |
|-------|--------|------|-------------------------------------|
| Layer | code / frontend (UI) | `constraint-starters/code-frontend.md` | Accessibility (WCAG), form UX, responsive/mobile-first, non-happy-path states (loading/empty/error), confirmation and undo for destructive actions, design-token consistency, i18n readiness, visibility of system status (implementing UI components or screens; includes the cross-cutting design axis) |
| Layer | code / API & boundary | `constraint-starters/code-api.md` | Input validation, rate limiting, SSRF prevention, mass assignment prevention, preventing excessive data exposure (work exposing or designing an API to the outside; the boundary of incoming input, abuse curbing, and returned data) |
| Layer | code / backend (business logic) | `constraint-starters/code-backend.md` | Idempotency/retry safety, transaction boundaries/atomicity, lost-update prevention/locking, fail-safe, explicit time zones for temporal derivation (correctness of server-side logic, write consistency, concurrent updates, or deriving dates and period boundaries) |
| Layer | code / data & persistence | `constraint-starters/code-data.md` | Backward-compatible migrations (expand → migrate → contract), schema-side integrity constraints (NOT NULL/UNIQUE/FK/CHECK), indexing that follows query patterns, avoiding N+1 queries, avoiding connection-pool exhaustion (work involving DB schema design, persistent data models, or query efficiency) |
| Layer | code / infra & resilience | `constraint-starters/code-infra.md` | Timeouts on remote calls, retry with exponential backoff + jitter, circuit breaker/degradation, structured logging + correlation ID, reliable resource cleanup (work involving remote calls, distribution, observability, or fault tolerance) |
| Cross-cutting | code / security (cross-cutting) | `constraint-starters/code-security.md` | SQLi, XSS, CSRF, authorization (least privilege), secrets management, preventing sensitive information in logs, security response headers/transport protection, never deserializing untrusted data, password storage hashing, file upload validation, dependency vulnerability management (work touching user input, authentication, secrets, transport, or externally sourced data; effective across layers) |
| Cross-cutting | code / AI & LLM (cross-cutting) | `constraint-starters/code-ai-llm.md` | Prompt injection prevention, safe handling of LLM output, preventing excessive agency, preventing sensitive-information leakage via prompts (work embedding LLMs / generative AI / agents; effective across layers) |
| Process | code / VCS hygiene | `constraint-starters/code-vcs-hygiene.md` | History removal + rotation for a mistakenly committed secret, no secrets in commit messages, blocking secret commits at the entry point (.gitignore / pre-commit detection), auditing history before going public (any Git work; making a repository public — the Git operations & history path, distinct from `secrets-no-hardcode`'s prevention-before-writing) |
| Artifact | non-code / document | `constraint-starters/non-code-document.md` | Deck structure, requirement clarity (RFC 2119), documentation type separation (building decks, specs, READMEs) |
| Artifact | non-code / communication | `constraint-starters/non-code-communication.md` | Lead with the conclusion (BLUF), release notes/changelog (emails, announcements, release notes that move the reader) |

> **Design (UI/UX) conventions are not a standalone domain; they appear cross-cuttingly inside the code or non-code files** (matched to a frontend/UI context via `fits when`). Domains and files can keep growing as work requires.
