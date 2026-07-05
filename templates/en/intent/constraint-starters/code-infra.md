# Constraint Starters — code / infrastructure & resilience

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: infrastructure, operations, and fault tolerance (timeouts on remote calls, retries, cut-off/degradation, observability, resource release). These belong to `domain: code`. It gathers the concerns of stopping failures from cascading across distributed components and keeping the system traceable and recoverable in operation.

## id: bounded-timeout-remote-calls

- name: Always set a timeout on remote calls (no unbounded waiting)
- domain: code
- fits when: Work that makes remote calls (network, database, RPC, external API) where a response may never come. When you see a structure that keeps waiting on an unresponsive peer while holding a thread or connection.
- starter:
  - Anti-direction: Do not keep waiting on a remote call without a timeout (deadline), or with an extremely long one. Do not leave the wait on an unresponsive dependency to chain back to the caller and exhaust it.
  - Invariant: Set a bounded deadline (timeout) on every remote call so an unresponsive peer cannot tie up resources indefinitely. Abandon the wait and return control to prevent cascading failure.
- source: Google SRE Book "Addressing Cascading Failures" (https://sre.google/sre-book/addressing-cascading-failures/, retrieved 2026-07-04)

## id: retry-backoff-jitter

- name: Retry with exponential backoff + jitter (no tight-loop retries)
- domain: code
- fits when: Work that absorbs transient failures with retries. When you see a structure where many clients resend immediately at once and hammer the peer (thundering herd). Limited to idempotent operations (works as a pair with idempotency `idempotency-retry-safe`).
- starter:
  - Anti-direction: Do not retry immediately in a tight loop with no interval on failure. Do not have all clients resend at the same instant and amplify the load.
  - Invariant: Grow the retry interval exponentially (exponential backoff) and add random jitter to spread retries across time. Cap the retry count, and limit retries to idempotent operations.
- source: AWS Architecture Blog "Exponential Backoff And Jitter" (Marc Brooker, https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/, retrieved 2026-07-04)

## id: circuit-breaker-degradation

- name: Cut off a continually failing dependency with a circuit breaker and degrade (graceful degradation)
- domain: code
- fits when: Work that repeatedly calls an external service or downstream dependency, where that dependency fails or goes unresponsive continually and repeated calls could drag you down too.
- starter:
  - Anti-direction: Do not keep calling an unresponsive dependency, exhaust critical resources, and propagate cascading failure across multiple systems.
  - Invariant: When failures exceed a threshold, cut off calls (open the circuit breaker) and immediately return an error or degrade with a cache or default (graceful degradation). When recovery is detected, return calls gradually.
- source: Martin Fowler "CircuitBreaker" (https://martinfowler.com/bliki/CircuitBreaker.html, retrieved 2026-07-04)

## id: structured-logging-correlation-id

- name: Contextual structured logging and correlation ID (do not silently swallow errors)
- domain: code
- fits when: Work implementing a production service or batch that runs across multiple components and multiple RPCs. When you later need to trace and diagnose failures. When you see a structure where errors are swallowed and leave no trace.
- starter:
  - Anti-direction: Do not swallow errors (catch and silently discard) and leave no trace. Do not leave logs without context where you cannot tell which upstream log corresponds to which downstream log.
  - Invariant: Thread a unique identifier that spans a request (request identifier / correlation ID) through all RPCs and emit it as structured logs. Do not swallow errors; record and propagate them by severity to shorten time-to-diagnosis and recovery.
- source: Google SRE Book "Effective Troubleshooting" (https://sre.google/sre-book/effective-troubleshooting/, retrieved 2026-07-04)

## id: resource-cleanup-no-leak

- name: Reliable resource release (prevent leaks with defer / try-with-resources / RAII)
- domain: code
- fits when: Work that handles resources needing release once acquired (files, network connections, DB connections, locks, handles). When you see a structure that releases only on the happy path and leaks on exception or early-return paths.
- starter:
  - Anti-direction: Do not write resource release only at the end of the happy path. Do not leave a leak where a mid-way return, exception, or branch skips the release.
  - Invariant: Always close an acquired resource on whichever path the function exits — success, failure, or exception. Pair acquisition and release with a language mechanism (Go's defer, Java's try-with-resources, Python's with, C++'s RAII, etc.), reserving the release right after acquisition.
- source: The Go Programming Language Blog "Defer, Panic, and Recover" (https://go.dev/blog/defer-panic-and-recover, retrieved 2026-07-04)
