# Constraint Starters — code / distributed asynchronous messaging

> A domain file under the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` pull only domains relevant to the current case, read-only. The parent catalog is canonical for the schema, reading guidance, and source requirements; this file contains only the starters.
>
> **Domain**: work where a state update and message publication cross systems, the same message can be redelivered, messages can arrive out of order, or producers can create work faster than consumers process it. This is a `code` domain for queues, events, streams, and asynchronous jobs.
>
> **Boundary from existing domains**: `idempotency-retry-safe` mainly covers retried synchronous requests, `immutable-event-correction` covers a data model whose events are the system of record, State Machine and durable workflow-engine starters cover long-running state transitions, and `remote-call-*` covers failures of remote calls. This domain covers dual writes, duplicates, out-of-order messages, and overload across a messaging boundary.

## id: atomic-state-change-and-message-intent

- name: Record the business-state change and intent to publish in one commit unit
- domain: code
- applies when: One operation updates business state in a database and must notify a separate queue, event platform, or service. Success of only one write would make internal state disagree with what other systems were told.
- starter:
  - Anti-direction: Do not commit the data update and then make one fallible publication attempt. Do not publish first and later roll back the data update, thereby announcing a change that does not exist. Do not treat call ordering as atomicity across two systems.
  - Invariant: Record the business change and an intent-to-publish record containing the payload, a stable identifier, and required ordering information in the same local transaction. A separate process publishes committed records and tracks enough state to resume after failure. This transactional outbox approach does not remove duplicate publication, so consumers still handle duplicates safely. Compare change-data capture when the database log can expose the same committed record without a separate outbox table.
- source: AWS Prescriptive Guidance, *Transactional outbox pattern* (business data and outbox in one transaction, separate publication process, idempotent consumers for duplicates; https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html; retrieved 2026-08-05)

## id: duplicate-message-side-effect-once

- name: Keep the business side effect single when the same message arrives more than once
- domain: code
- applies when: Timeouts, consumer failure, lost acknowledgements, or retries can redeliver a message, and duplicate charges, inventory decrements, notifications, or other side effects must be prevented.
- starter:
  - Anti-direction: Do not rely on “normally delivered once,” a redelivery flag, or a short-lived in-memory cache to prevent the second side effect. Do not assume broker deduplication or a producer feature named exactly-once covers effects in an external API or another database.
  - Invariant: The producer supplies a stable identifier for the message or business operation. The consumer records that identifier and changes business state in the same commit unit where possible, and performs no repeated side effect for an already processed identifier. It acknowledges completion only after required effects are durably committed. When an effect and processed-record cannot share a commit unit, pass the identifier downstream, use an idempotent downstream operation, or define reconciliation and resumable failure paths.
- source: AWS Well-Architected Framework, REL04-BP04 *Make mutating operations idempotent* (message identifiers, duplicate suppression, downstream token propagation, recording with mutations; https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html; retrieved 2026-08-05) / Azure Service Bus, *Prevent message loss and duplicate processing* (redelivery after receive failure, idempotent consumers, sender-side duplicate detection does not replace it; https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-message-loss-and-duplicates; retrieved 2026-08-05)

## id: business-ordering-scope-and-version

- name: Limit ordering to the business entity that needs it, and compare entity versions
- domain: code
- applies when: Updates, commands, or aggregation inputs for the same entity pass through parallel producers or multiple partitions and can arrive in a different order from creation. Different entities should remain parallel, but ordering errors for one order, account, document, or similar entity would corrupt state.
- starter:
  - Anti-direction: Do not implicitly require a total order across the whole system. Do not treat timestamps alone as a unique order while ignoring different clocks, ties, retries, and late arrival. Do not serialize unrelated entities and lose concurrency and availability.
  - Invariant: Identify the entity for which an ordering violation matters and assign that entity to one ordering scope. Carry an entity sequence, version, or expected previous version so the consumer distinguishes duplicates, stale versions, gaps, and late arrival and can reject, hold, reload, or reconcile. State whether the guarantee is per entity, partition, producer, or another bounded scope, and process unrelated entities concurrently when safe.
- source: Apache Kafka, *Design* (ordering and deduplication depend on partition and producer scope; sequence numbers support deduplication; https://kafka.apache.org/41/design/design/; retrieved 2026-08-05) / Amazon SQS Developer Guide, *Amazon SQS queue types* (standard queues require handling duplicates and out-of-order arrival; choose application reordering or scoped FIFO when order matters; https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-types.html; retrieved 2026-08-05)

## id: bounded-inflight-and-queue-capacity

- name: Bound in-flight work and queues to consumer capacity
- domain: code
- applies when: Producers can create queued, streamed, or asynchronous work faster than consumers process it, and bursts or reduced consumer capacity can grow waiting work, memory use, and delay without bound.
- starter:
  - Anti-direction: Do not use an unbounded queue as the overload strategy. Do not merely monitor while accepting work indefinitely above sustainable capacity. Do not leave full-capacity behavior unspecified or move work among hidden buffers. Do not impose one item count or rate on every system.
  - Invariant: Set case-specific limits on in-flight work, queued work, and age at each material stage: producer buffer, broker, and received-but-unfinished work. Where consumers can signal demand, use flow control (backpressure) so upstream does not exceed it. At a limit, explicitly pause, reject, shed lower-priority work, or divert recoverable work according to criticality and recovery needs, and return the outcome upstream. Observe oldest-item age, processing rate, failure rate, and limit hits as well as queue depth; derive limits from measured capacity and acceptable waiting time.
- source: Reactive Streams (asynchronous, non-blocking demand signaling for stream flow control; https://www.reactive-streams.org/; retrieved 2026-08-05) / RabbitMQ, *Consumer Acknowledgements and Publisher Confirms* (prefetch bounds the unacknowledged-delivery window and prevents unbounded consumer buffering; https://www.rabbitmq.com/docs/next/confirms; retrieved 2026-08-05) / RabbitMQ, *Quorum Queues and Flow Control — The Concepts* (credit, confirms, acknowledgements, and prefetch control ingress and in-flight work; https://www.rabbitmq.com/blog/2020/05/04/quorum-queues-and-flow-control-the-concepts; retrieved 2026-08-05)
