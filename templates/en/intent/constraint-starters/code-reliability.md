# Constraint Starters — code / design & reliability

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: code design & reliability (idempotency, input validation, data-access efficiency, etc.). These belong to `domain: code`.

## id: idempotency-retry-safe

- name: Idempotency / retry safety (no duplication on write retries)
- domain: code
- fits when: Work with writes over a network, billing, or inventory allocation where it is uncertain whether a request arrived and the client may resend. When a duplicated operation via `POST`/`PATCH` would cause trouble.
- starter:
  - Anti-direction: Do not build write operations assuming they arrive exactly once. Do not design in a way that a resend causes double billing or double registration.
  - Invariant: Make operations idempotent so retries do not duplicate side effects. Keep `PUT`/`DELETE` idempotent per spec, and protect non-idempotent operations (`POST`/`PATCH`, etc.) against duplicate execution with an idempotency key. Guarantee the result is not corrupted even if the same request arrives multiple times.
- source: MDN Web Docs "Idempotent" (definition of HTTP method idempotency, https://developer.mozilla.org/en-US/docs/Glossary/Idempotent, retrieved 2026-06-26)

## id: input-validation-fail-fast

- name: Input validation (early, at the boundary / fail-fast)
- domain: code
- fits when: Work that processes or persists data received from external sources (web clients, system integrations, partner feeds, etc.). When untrusted input flows downstream unchecked.
- starter:
  - Anti-direction: Do not pass input downstream (DB, other components) without validation. Do not scatter validation deep inside the processing.
  - Invariant: For every untrusted input source, validate as early in the data flow as possible (right after receiving from the external party) so that only well-formed data proceeds. Define the return contract for unexpected/empty input (fail-fast). Note: input validation is not a substitute for the primary defenses against XSS/SQLi (it runs alongside them as a supplement).
- source: OWASP Input Validation Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html, retrieved 2026-06-26)

## id: n-plus-1-query

- name: Avoid N+1 queries (batch fetch / eager loading)
- domain: code
- fits when: Work that fetches a list via an ORM and then queries each element's related data inside a loop. Easy to miss because each individual query is fast enough to not show in the slow-query log.
- starter:
  - Anti-direction: Do not fetch related data with a separate query per row of a list (in-loop queries). Do not overlook the total volume because "each one is fast."
  - Invariant: Do not fetch with N extra queries what the primary query could have retrieved. Reduce database round-trips with JOINs, eager loading, or batching. Observe (profile) query counts so N+1 can be detected.
- source: Stack Overflow "What is the 'N+1 selects problem' in ORM" (definition of the N+1 problem, answer by Vlad Mihalcea, https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm-object-relational-mapping, retrieved 2026-06-26)
