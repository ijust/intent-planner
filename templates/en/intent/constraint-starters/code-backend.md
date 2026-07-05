# Constraint Starters — code / backend (business logic)

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: correctness of server-side business logic (idempotency, transactional consistency, concurrent-update control, failing to the safe side). These belong to `domain: code`. The physical persistence layer (schema, indexes, connections) lives in code / data & persistence, and fault tolerance for remote calls lives in code / infrastructure.

## id: idempotency-retry-safe

- name: Idempotency / retry safety (no duplication on write retries)
- domain: code
- fits when: Work with writes over a network, billing, or inventory allocation where it is uncertain whether a request arrived and the client may resend. When a duplicated operation via `POST`/`PATCH` would cause trouble.
- starter:
  - Anti-direction: Do not build write operations assuming they arrive exactly once. Do not design in a way that a resend causes double billing or double registration.
  - Invariant: Make operations idempotent so retries do not duplicate side effects. Keep `PUT`/`DELETE` idempotent per spec, and protect non-idempotent operations (`POST`/`PATCH`, etc.) against duplicate execution with an idempotency key. Guarantee the result is not corrupted even if the same request arrives multiple times.
- source: MDN Web Docs "Idempotent" (definition of HTTP method idempotency, https://developer.mozilla.org/en-US/docs/Glossary/Idempotent, retrieved 2026-06-26)

## id: transaction-atomicity-boundaries

- name: Transaction boundaries / atomicity (commit related writes together)
- domain: code
- fits when: Work that updates multiple tables or multiple rows as a single business operation (money transfer, updating inventory and orders together, bulk-inserting parent/child records, etc.). When a mid-way failure that writes only part of it would cause inconsistency.
- starter:
  - Anti-direction: Do not commit related writes individually and leave a half-finished state behind on a mid-way failure.
  - Invariant: Wrap writes that form a single business unit in one transaction, making it all-succeed or all-undo (atomicity). On a mid-way failure, ROLLBACK so no partial write remains.
- source: PostgreSQL Documentation "Transactions" (https://www.postgresql.org/docs/current/tutorial-transactions.html, retrieved 2026-07-04)

## id: lost-update-locking

- name: Lost-update prevention / locking strategy (do not overwrite one side on concurrent updates to the same row)
- domain: code
- fits when: Work where multiple requests read → compute → write back the same row (balance, stock count, counter, reservation slots, etc.). When read-modify-write runs concurrently and a last-writer-wins can erase an earlier update.
- starter:
  - Anti-direction: Do not build assuming no one else updates between your read and your write-back, leaving lost updates unaddressed.
  - Invariant: Control concurrent-update conflicts explicitly. Use pessimistic locking (`SELECT ... FOR UPDATE` to lock the target row) or optimistic locking (a version column checked before update) so one update is not silently overwritten.
- source: PostgreSQL Documentation "Explicit Locking" (https://www.postgresql.org/docs/current/explicit-locking.html, retrieved 2026-07-04)

## id: fail-securely-no-swallow

- name: Fail to the safe side (fail closed; no swallowing exceptions)
- domain: code
- fits when: Work that includes security-relevant decisions such as authentication, authorization, or validation. When the default state on error governs safety and you see a structure where a failure turns into "allow."
- starter:
  - Anti-direction: Do not swallow exceptions with an empty catch and continue processing. Do not fail in a direction that grants access by default (fail open).
  - Invariant: Do not swallow errors; fail to the safe side. Have `isAuthorized()` / `isAuthenticated()` / `validate()` and the like return false if an exception occurs during processing. Initialize decision variables to deny by default (e.g., `isAdmin = false`) and flip to allow only when success is confirmed.
- source: OWASP "Fail securely" (https://owasp.org/www-community/Fail_securely, retrieved 2026-07-04)
