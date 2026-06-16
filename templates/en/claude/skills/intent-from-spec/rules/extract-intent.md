# Intent Candidate Extraction Procedure (read-only; all candidates are Assumptions)

The single source of truth by which the `intent-from-spec` skill reads the natural-language specification text the user provides (PRDs, design specs, feature specs, issues, user stories, and other general development specifications) and extracts candidates for intent that is not stated explicitly. SKILL.md holds only the procedure and report format; "what to read under which category, and toward which transcription destination to write it out" is governed by this rule. This rule only **reads** the specification; it does not modify the input specification, the canonical `.intent/*.md`, steering (tech.md, etc.), or the design at all (writes go only under `.intent/spec-ingest/`).

## posture (a proposer, not an adjudicator)

What this rule performs is **extraction (proposal)** by the heuristics of LLM judgment, not certification of confirmed intent. Every extracted candidate is a **hypothesis (Assumption)** and is treated as provisional until the user confirms and approves it. Processing does not stop; it stays at presenting warnings and observations (consistent with the product invariant that inferred intent is treated as provisional until a human reviews it). Therefore this rule **may infer** slot applicability from the specification's statements and silences, **but does not finalize** it.

## Input boundary (fixed)

- Input is **limited** to the natural-language specification text the user designates (path reference or paste).
- **Source code, execution traces, and test results are not used as input for intent extraction.** Recovering intent from those is a separate path handled by the code→Intent of behavior-unknown mode, and is out of scope for this rule.
- When no input is given, perform no extraction and ask the user for the specification to be supplied (write nothing).

## Candidate categories to extract (7 kinds; all Assumptions)

Read the specification text and extract candidates in the following 7 categories. For each candidate, attach the extraction basis (which statement or which silence in the specification it was derived from). **Mark every extracted candidate as an Assumption (inferred intent) and do not mix it with canonical (confirmed intent).**

1. **Purpose** — what this product/feature exists for.
2. **Desired Outcomes** — the state changes one wants to cause for users, business, operations, and developer experience.
3. **Capabilities** — the responsibilities/capabilities that support the outcomes (as capabilities, not feature names).
4. **Invariants** — behavior, APIs, data, UX, and operational constraints that must never be broken. Includes "constraints to be upheld" such as technical and security requirements.
5. **Constraints** — technical/security/operational requirements and preconditions to be upheld.
6. **anti-direction** — directions one must not proceed in; local optima to avoid.
7. **Implicit Assumptions** — matters the specification presupposes without stating them, and the judgments derived therefrom.

> Constraints to be upheld, such as technical and security requirements, are **not dropped**, whether stated explicitly or implicit. Pick these up reliably into the Invariants category and write them out as the Invariants candidates in the output contract below.

## output contract (write out under headings whose transcription destination is uniquely determined)

Write each candidate at a heading and granularity that lets a person transcribe it 1:1 to its destination. Make the headings correspond uniquely to the destinations in the table below. The responsibility of this rule extends only to **writing out** the candidates; reflecting them into destinations (the canonical intent-tree / compass, and steering / design) is not performed here. Promotion occurs when the user manually carries approved candidates into the discover / compass dialogue (there is no machine handoff).

| Extraction category | Heading to write out | Destination (by hand; not reflected by this rule) |
|---|---|---|
| Purpose | `### Purpose candidates (→ intent-tree L0 Assumptions)` | intent-tree `## Assumptions` (corresponding to L0: Product Purpose) |
| Desired Outcomes | `### Outcome candidates (→ intent-tree L1 Assumptions)` | intent-tree `## Assumptions` (corresponding to L1: Desired Outcomes) |
| Capabilities | `### Capability candidates (→ intent-tree L2 Assumptions)` | intent-tree `## Assumptions` (corresponding to L2: Capabilities) |
| Invariants | `### Invariants candidates (→ compass Invariants)` | compass `## Invariants` |
| Constraints | `### Constraint candidates (→ compass Invariants)` | compass `## Invariants` |
| anti-direction | `### Anti-direction candidates (→ compass Anti-direction)` | compass `## Anti-direction` |
| Implicit Assumptions | `### Implicit-assumption candidates (→ intent-tree Assumptions / Decision Rules)` | intent-tree `## Assumptions`, and judgments derived from the assumptions become compass `## Decision Rules` candidates |

- **Purpose, Outcomes, and Capabilities** are written at a granularity that can be transcribed 1:1 into the corresponding L0–L4 level `## Assumptions` items of the intent-tree (do not write into the canonical L0–L4 body).
- **anti-direction** is written at a granularity transcribable into the compass `## Anti-direction` block.
- **Judgments derived from implicit assumptions** are written out as compass `## Decision Rules` candidates (candidates, not finalized ADRs).
- **Invariants and Constraints (constraints to be upheld, including technical/security requirements) are written out as candidates for the compass `## Invariants` block.** The destination of Invariants candidates is **limited** to the compass Invariants.

## Downstream delegation (what not to include in output)

- Reflecting Invariants candidates into steering (tech.md) or design is handled by the existing flows (writeback / export / by hand). **Reflection into tech.md / design is not included in the output of this rule.** The responsibility of this rule stays at recording them as Invariants candidates under headings bound for the compass, preserving a single source of truth.
- Writing into the canonical intent-tree / compass is also not performed (promotion is by hand, after approval).

## Handling of omissions / non-observation

- Among the 7 categories, those on which the specification is silent are not filled in by guessing but stated explicitly as "no corresponding statement (silence)." Treating silence itself as a gap is the responsibility of the gap-readout side; this rule presents, distinctly, the candidates it could extract and the absence of categories it could not extract.
- All outputs are made explicit as derived, regenerable, and not the source of truth. Nothing is written back to canonical.
