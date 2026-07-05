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
