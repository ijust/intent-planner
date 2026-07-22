# Constraint Starters — code / backend (business logic)

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: correctness of server-side business logic (idempotency, transactional consistency, concurrent-update control, failing to the safe side, and obtaining, deriving, or validating temporal values). These belong to `domain: code`. The physical persistence layer (schema, indexes, connections) lives in code / data & persistence, and fault tolerance for remote calls lives in code / infrastructure.

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

## id: temporal-derivation-explicit-time-zone

- name: Make the time zone explicit when deriving dates and times
- domain: code
- fits when: Server-side work derives “today,” a date, time, weekday, month, deadline, reporting period, or day boundary. When converting a stored timestamp or the current instant into a user or business calendar.
- starter:
  - Anti-direction: Do not implicitly treat the server or process default time zone, a zone-less local date-time, or a date obtained in UTC as the date for the relevant user or business.
  - Invariant: Before deriving a date, time, weekday, or period boundary, explicitly identify both the reference instant and the relevant user or business time zone. Convert the instant into that time zone before deriving calendar values, applying the region's rules including daylight-saving transitions. UTC is permitted only when it is the explicitly defined rule for the business context. Never depend on the server or process default time zone.
- source: Oracle Java Documentation `LocalDate.now(ZoneId)` / `LocalDate.atStartOfDay(ZoneId)` (avoiding default-time-zone dependence and applying time-zone rules, including daylight-saving transitions, to day boundaries; https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/LocalDate.html, retrieved 2026-07-23)

## id: current-time-injectable-clock

- name: Obtain the current time from a replaceable clock
- domain: code
- fits when: Server-side logic whose result depends on the current time, including the current date, deadlines, validity periods, or elapsed time, and the tests for that logic.
- starter:
  - Anti-direction: Do not read the system clock directly inside business logic, making tests depend on when and where they run.
  - Invariant: Logic that depends on the current time receives a replaceable clock as a dependency. Tests fix that clock so date changes, instants immediately before and after deadlines, leap days, and other boundary conditions are reproducible with the same inputs.
- source: Oracle Java Documentation `LocalDate.now(Clock)` (using an alternate clock through dependency injection to make current-date code testable; https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/LocalDate.html, retrieved 2026-07-23)

## id: zoned-day-boundary-not-fixed-duration

- name: Do not represent a zoned day boundary as a fixed 24-hour duration
- domain: code
- fits when: Work converts a day in a time zone into an instant range for daily aggregation, same-day searches, or end-of-day processing, especially in regions with daylight-saving transitions.
- starter:
  - Anti-direction: Do not assume a day always starts at `00:00`, and do not obtain the next-day boundary by adding a fixed 24 hours to the start.
  - Invariant: Represent a day range as greater than or equal to the first valid instant of the target date and less than the first valid instant of the following date, both determined under the target time-zone rules. Do not compensate for nonexistent or repeated local times using a fixed offset or fixed 24-hour duration.
- source: Oracle Java Documentation `LocalDate.atStartOfDay(ZoneId)` (daylight-saving and other time-zone rules can make the earliest valid time differ from midnight and can create gaps or overlaps; https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/LocalDate.html, retrieved 2026-07-23)

## id: temporal-types-match-domain-meaning

- name: Distinguish a calendar date from an instant on the time-line
- domain: code
- fits when: APIs, domain models, or persistent data handle calendar dates such as birthdays, billing dates, or business days alongside unique instants such as creation, transmission, or occurrence times.
- starter:
  - Anti-direction: Do not store, compare, or order a zone-less date or local date-time as if it identified a unique instant. Conversely, do not add an unnecessary time or time zone to a value whose meaning is only a calendar date.
  - Invariant: Distinguish calendar dates, local date-times, offset date-times, and instants according to the value's business meaning. Require the target time zone when converting an instant to a calendar date, and make the change in meaning visible in the type or field name.
- source: Oracle Java Documentation `LocalDate` / `LocalDate.ofInstant(Instant, ZoneId)` (`LocalDate` is a date without a time zone, and converting an instant to a date requires a time zone; https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/LocalDate.html, retrieved 2026-07-23)

## id: calendar-date-strict-validation

- name: Do not silently normalize a nonexistent calendar date
- domain: code
- fits when: An API, form, or import process receives year, month, and day fields and converts them into a date, especially around month ends and leap years where validity depends on the combination.
- starter:
  - Anti-direction: Do not silently accept and normalize nonexistent dates such as February 30 or February 29 in a non-leap year into a date in the following month or on an adjacent day.
  - Invariant: Validate not only the individual ranges of year, month, and day but also that their combination exists in the calendar. Report a nonexistent date as an input error. Normalize it only when an explicit business requirement defines both the adjustment rule and how the adjusted result is disclosed to the user.
- source: Oracle Java Documentation `LocalDate.of(...)` (the contract throws `DateTimeException` when an individual value or the year-month-day combination is invalid; https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/LocalDate.html, retrieved 2026-07-23)
