# Constraint Starters — code / data & persistence

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: physical design of the database and persistence layer (schema constraints, migrations, indexes, query efficiency, connections). These belong to `domain: code`. Transactional consistency and concurrent-update control as business logic live in code / backend, and SQL injection prevention (placeholders) lives in code / security (not duplicated here).

## id: expand-contract-migration

- name: Backward-compatible migration (change with zero downtime via expand → migrate → contract)
- domain: code
- fits when: Work that changes the schema of a live table (renaming a column, changing a type, splitting, etc.). When old and new code coexist temporarily and a bulk drop-and-recreate would break existing access.
- starter:
  - Anti-direction: Do not drop and recreate a live table in a single deploy, nor apply an incompatible change all at once and break existing code.
  - Invariant: Split each migration into small backward-compatible changes. Split expand-contract (add a new column → migrate/backfill data → drop the old column) across separate deploys, keeping both old and new code working at every point in between.
- source: Martin Fowler "Evolutionary Database Design" (https://martinfowler.com/articles/evodb.html, retrieved 2026-07-04)

## id: schema-level-integrity-constraints

- name: Schema-side integrity constraints (enforce invariants in the DB, not only the app)
- domain: code
- fits when: Work where data correctness (required, unique, referential existence, value range) is a business rule. When relying on app validation alone lets bad data slip in via another write path or a race.
- starter:
  - Anti-direction: Do not put required/unique/referential/range checks only in app code and allow bad data to bypass into the DB.
  - Invariant: Enforce data invariants declaratively with schema-side constraints (NOT NULL / UNIQUE / FOREIGN KEY / CHECK). Constraint violations are rejected by the DB with an error.
- source: PostgreSQL Documentation "Constraints" (https://www.postgresql.org/docs/current/ddl-constraints.html, retrieved 2026-07-04)

## id: index-for-query-patterns

- name: Index design that follows query patterns (support WHERE/JOIN/ORDER BY with indexes)
- domain: code
- fits when: Work that frequently filters, joins, or sorts on particular columns. When full-table scans are slow, or conversely too many indexes make writes heavy.
- starter:
  - Anti-direction: Do not decide indexes without looking at the actual query's search conditions. And do not add indexes indiscriminately while ignoring write cost.
  - Invariant: Support the columns used in WHERE / JOIN / ORDER BY with indexes. Because indexes carry a write cost, narrow to the necessary indexes that follow the actual query patterns.
- source: Markus Winand "Use The Index, Luke!" — The WHERE Clause (https://use-the-index-luke.com/sql/where-clause, retrieved 2026-07-04)

## id: n-plus-1-query

- name: Avoid N+1 queries (batch fetch / eager loading)
- domain: code
- fits when: Work that fetches a list via an ORM and then queries each element's related data inside a loop. Easy to miss because each individual query is fast enough to not show in the slow-query log.
- starter:
  - Anti-direction: Do not fetch related data with a separate query per row of a list (in-loop queries). Do not overlook the total volume because "each one is fast."
  - Invariant: Do not fetch with N extra queries what the primary query could have retrieved. Reduce database round-trips with JOINs, eager loading, or batching. Observe (profile) query counts so N+1 can be detected.
- source: Stack Overflow "What is the 'N+1 selects problem' in ORM" (definition of the N+1 problem, answer by Vlad Mihalcea, https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm-object-relational-mapping, retrieved 2026-06-26)

## id: connection-pool-exhaustion

- name: Avoid connection-pool exhaustion (do not open more DB connections than the limit)
- domain: code
- fits when: Work that connects to the DB from many concurrent requests or workers. When a connection is opened per request or forgotten to be returned, or the pool ceiling does not align with the server's max_connections and connections get exhausted.
- starter:
  - Anti-direction: Do not open unbounded connections per request or forget to return them, eating up the DB's connection limit.
  - Invariant: Reuse connections via a pool and always return them when done. Keep the pool ceiling within the server's max_connections to prevent connection exhaustion.
- source: PostgreSQL Documentation "Connection Settings" (max_connections) (https://www.postgresql.org/docs/current/runtime-config-connection.html, retrieved 2026-07-04)

## id: temporal-valid-and-transaction-time

- name: Separate time dimensions (do not mix when a fact was valid with when it was recorded)
- domain: code
- fits when: Retroactive corrections, audits, or history queries for contracts, prices, or assignments must answer both what was effective at a time and what the system knew at a time.
- starter:
  - Anti-direction: Do not use only `created_at` / `updated_at` to represent business validity, or overwrite historical rows during correction and lose what was recorded then.
  - Invariant: Define valid time (when a fact is true in reality) separately from transaction time (when it is recorded in the database). Use both dimensions only when both questions are required, and state which dimension every as-of query uses.
- source: Oracle Database Documentation "Managing and Maintaining Time-Based Information" (valid time versus transaction time, https://docs.oracle.com/en/database/oracle/oracle-database/26/vldbg/time-based-info.html, retrieved 2026-08-04); Microsoft Learn "Temporal tables" (system-versioned current/history tables and point-in-time analysis, https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables, retrieved 2026-08-04)

## id: temporal-half-open-nonoverlap

- name: Make interval boundaries and overlap explicit (use half-open periods and database constraints)
- domain: code
- fits when: Prices, contracts, or assignments form consecutive periods for the same subject and concurrent valid rows are forbidden.
- starter:
  - Anti-direction: Do not vary end-point inclusion between implementations, or rely only on an application pre-check that concurrent writes can bypass.
  - Invariant: By default, represent periods as half-open `[start, end)` ranges and preserve start < end. When periods for the same subject must not overlap, enforce the rule atomically with a database constraint such as a range exclusion constraint where available.
- source: PostgreSQL Documentation "Range Types" (`[)` canonical form, range overlap operators, and non-overlap through exclusion constraints, https://www.postgresql.org/docs/current/rangetypes.html, retrieved 2026-08-04)

## id: immutable-append-correct-replay

- name: Correct by appending (do not overwrite immutable events; preserve ordering and replay)
- domain: code
- fits when: Audit trails, historical reconstruction, or multiple read models make immutable change events worth their operational complexity.
- starter:
  - Anti-direction: Do not update or delete stored events to change history, or use wall-clock timestamps alone as a total order and lose conflicts or duplicates.
  - Invariant: Store each event as an append-only fact with a unique identity and order within its stream. Express corrections as compensating events, detect concurrent appends with an expected version or equivalent, rebuild projections from the same sequence, and account for retries and duplicate delivery.
- source: Microsoft Azure Architecture Center "Event Sourcing pattern" (append-only events, compensating events, optimistic concurrency, replay and projections, https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing, retrieved 2026-08-04)

## id: immutable-selective-adoption

- name: Adopt immutable models selectively (limit them to boundaries that need audit or reconstruction)
- domain: code
- fits when: Event sourcing or append-only history is being considered alongside simple current-state CRUD, personal-data deletion, schema evolution, and projection operations.
- starter:
  - Anti-direction: Do not adopt event sourcing for every datum merely because history is desirable, or omit deletion duties, event versioning, and projection consistency from the design.
  - Invariant: Limit immutable history to boundaries that require audit, reconstruction, or temporal queries. Decide event compatibility, projection rebuilds, snapshot consistency, and retention/deletion policy before adoption; allow ordinary mutable CRUD for simple current-state management.
- source: Microsoft Azure Architecture Center "Event Sourcing pattern" (complexity, eventual consistency, schema evolution, snapshots, privacy/deletion conflict, and when not to use it, https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing, retrieved 2026-08-04)
