# Drift Patterns (catalog of drift types)

> Read by `/intent-discover` as the basis for drift-prone-situation pre-check (when `drift-watch: on`). This is a file you grow by adding, as types, the drifts you actually hit in your own project.

## How to read this catalog

- **This is not exhaustive.** The types listed here are only a starting point (1 seed + 2 generic). The premise is that you append the drifts you actually hit in your own project as types and grow this file over time.
- Each type is matched against `drift-log.md` by its aggregation key (`id`). The more types you add, the wider the range over which you can name "drift-prone situation" before you start work.
- The two bundled generic types (`premature-abstraction` / `layer-leak`) are placed as **weak cues with different symptoms**. They are deliberately varied so your thinking does not fixate on a single strong representative example (`microservice-over-split`).
- "Matching" a type is not a confirmation of drift. The drift-prone-situation pre-check assumes false positives. When a type matches, you **write the anti-direction / invariant first** to act before you drift all the way out.

## How to write a type

Append a new type with the schema below. Make `id` a unique kebab-case aggregation key (the `pattern` field in `drift-log.md` references this `id`).

```markdown
## id: <kebab-case aggregation key>
- name: <short name>
- symptom: <cue about the subject / how it is progressing; a weak cue discover matches against the subject>
- Things to write first:
  - Anti-direction: <anti-direction candidate to write before compass-ification when this type is suspected>
  - Invariant: <the corresponding invariant candidate; if subject-dependent, discover concretizes it from context>
```

- Write `symptom` as a cue for matching, not as a strong decision condition meaning "if this matches it is definitely drift" (keeping it a weak cue avoids fixation).
- "Things to write first" is the wording to make discover write into the Intent Tree's Open Questions / anti-direction candidates, before compass-ification, when this type is suspected. Discover concretizes the subject-dependent parts from context.

---

## id: microservice-over-split

- name: Microservice over-splitting
- symptom: Over-adapting to the virtue of "split it up and keep it loosely coupled" against a single intent, carving out more services / modules / packages than necessary. Cross-boundary calls and coordination cost grow, and the result becomes more complex and more loosely coupled than the original intent.
- Things to write first:
  - Anti-direction: Do not make "loose coupling / splitting" an end in itself. Only add a service / module when you can name one concrete problem that split solves.
  - Invariant: Do not add boundaries (service / process / package splits) that the original intent does not require. Allow a split only when it matches an intent boundary (L3).

## id: premature-abstraction

- name: Premature abstraction
- symptom: Starting to build shared code / generic base classes / config-driven frameworks while there are still only 1–2 use cases. Introducing layers or extension points for requirements that do not actually exist, justified by "we might use it this way in the future".
- Things to write first:
  - Anti-direction: Do not build abstraction / generalization ahead of time for future requirements that do not actually exist (wait for the rule of three).
  - Invariant: Introduce an abstraction (shared base, generic framework, config-driven design) only when there are 3 or more real use cases, or when the intent explicitly requires generality.

## id: layer-leak

- name: Layer leak
- symptom: A concern that should stay in a lower layer (domain logic, persistence, external I/O) leaks out into an upper layer (UI, handler, presentation), or dependency flows backward in the opposite direction. Each change is locally convenient, but the responsibility boundaries between layers gradually erode.
- Things to write first:
  - Anti-direction: Do not push domain logic or I/O into the presentation layer / handlers for short-term convenience. Do not take cross-layer shortcuts.
  - Invariant: Preserve each layer's responsibility boundary (the direction of dependency). Upper layers may depend on lower layers, but lower layers do not depend on upper layers.

## id: coinage-proliferation

- name: Coinage-prone situation
- symptom: The AI keeps coining new terms that are absent from the canonical vocabulary (ubiquitous language) instead of reusing terms that already exist. Several phrasings pile up for the same concept, the vocabulary fragments, and the alignment of intent (the core of the product) erodes.
- Things to write first:
  - Anti-direction: Do not invent a new term for a concept that already has a canonical term. If you must introduce a new term, attach a one-line explanation at first occurrence.
  - Invariant: Every term used traces to the glossary's canonical vocabulary, or is explained in one line at first occurrence. Do not add terms absent from the glossary without an explanation.

## id: scope-creep

- name: Scope-creep-prone situation
- symptom: An implementation instruction arrives later that exceeds an already-exported work unit's (packet's) declared scope (e.g., a front-end-only packet being asked to add back-end, authorization, or transaction-boundary work). Each addition feels locally natural, yet the packet-specific invariants that newly become necessary in the new territory (authorization, data consistency, transaction boundaries, idempotency) keep being left out as work piles up.
- Things to write first:
  - Anti-direction: Do not push instructions that exceed an exported packet's `## Scope` straight through cc-sdd. Return the new territory to intent as a separate packet.
  - Invariant: The implementation stays within the target packet's declared scope (`## Scope` / `## Non-scope`). If it reaches new territory, establish that territory's packet-specific invariants (authorization, consistency, transaction boundaries, idempotency) first.
