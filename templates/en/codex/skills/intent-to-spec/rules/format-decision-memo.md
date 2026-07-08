# Format mapping: decision memo (options × criteria comparison, verdict up front)

The mapping rule the `intent-to-spec` skill uses to assemble the three-layer material read by source-scope interpretation into a **decision memo** — a single readable page that lays out a choice you are (or were) torn about as an "options × decision criteria" comparison plus "adopted / rejected, and why". SKILL.md holds only the procedure and reporting format; which material goes where, in what order, under which headings, is defined here.

## How to call it

- The format name token is `decision-memo`. Natural-language names ("decision memo", "comparison sheet for an open choice") refer to the same format. Output goes to `.intent/nl-spec/decision-memo.md`.

## Responsibility boundary (this is mapping — not interviewing, not evaluating)

- This rule is a **format mapping**. It only arranges material into sections and order.
- It does **not re-read** the sources (intent-tree / compass / packets / steering). It holds no parser or schema of its own; it rearranges the material handed over by source-scope interpretation (which preserves which layer, heading, and packet each piece came from).
- **Material is closed over existing intent artifacts (no interviewing).** Use the compass Decision Rules (Context / Decision / Why / Alternatives considered / Consequences / Revisit when) and Open Questions, Evidence that preserves the comparison process, and the packets' Deferred items and undecided Decisions slots. Do not write new information gathered by asking the user mid-generation into the document. A dilemma not yet written into the compass is outside this format's remit — advise "write the dilemma down first with `/intent-discover` or `/intent-compass`, then re-run", and do **not** generate (fail fast).
- **Never invent evaluations or verdicts.** Map only what the sources actually say about the comparison, the verdict, and the reasons. Do not fill a table cell with an evaluation that was never written (cells without a record say "no record"). Trace attachment, inferred marking, and invariant preservation are the **fabrication-guard rule's responsibility**, not this rule's.

## Reader and design constraints (verdict up front)

The assumed reader is the person who made the call (yourself, weeks later) and their colleagues. For a decision page, the reader wants the **verdict first**, not the narrative (starter `bluf-message`).

- **Put the verdict at the top.** State what was decided (or that it is still open) in the first section; comparison and background come after.
- **Keep the rejected options and their reasons on the same page as the adopted one.** When someone later says "but what about that other option…", the same single page must answer "here is why we didn't take it" — that is this format's purpose. Never drop them while the sources have them.
- **One output, one purpose (type separation).** Stick to recording the decision; do not mix progress reporting, spec details, or how-to material into the same output (starter `doc-type-separation`).
- **Identifiers may be attached as traces.** The reader is a repo insider, so decision numbers and packet names are useful references for tracing — but accompany the first occurrence with a plain-language paraphrase (no identifier-only lines).

## Composition (top to bottom: verdict → comparison → why rejected → revisit conditions)

Arrange the material handed over by source-scope interpretation in this order.

| # | Section | What goes here | Main source of material |
|---|---|---|---|
| 1 | Verdict (decided / still open) | For each dilemma, state the verdict in one line each. Mark still-open ones explicitly as "open" | compass Decision Rules (Decision) + Open Questions |
| 2 | Options × criteria comparison | For each dilemma, the options side by side and how they were weighed by which criteria (Why / criteria) | Decision Rules (Context / Why / Alternatives considered) + Evidence preserving the comparison |
| 3 | Why the rejected options were rejected | The options not taken, and the recorded reasons | Decision Rules (Alternatives considered) |
| 4 | Revisit conditions | What would trigger reconsidering this decision | Decision Rules (Revisit when) |
| 5 | Still open (if any) | Open dilemmas and where they are expected to be decided next | Open Questions + packets' undecided Decisions slots / Deferred |
| 6 | Assumptions / unconfirmed (if any) | Premises kept in a separate block, **never mixed** into the confirmed sections above | intent-tree Assumptions (inferred origin) |

- Section 1 (verdict) always comes first. Never open with the comparison (the core of verdict-up-front).
- The comparison may be a Markdown table, but a dilemma without enough material for a table is written as bullets (don't dilute content for the sake of form; don't pad cells).
- A section with no matching material says "no record" and is omitted (don't embellish by guessing).
- If the scope contains **no** dilemma/decision material at all (no Decision Rules / Open Questions / undecided slots), do not generate (fail fast; give the guidance under "Responsibility boundary" and stop).
- Section 6 keeps inferred-origin material in a trailing separate block, never dissolved into the canonical body (omit if there is none).

## Invariants

- Do not re-read or modify the sources (mapping only).
- Do not break the order that puts the verdict first.
- Do not add evaluations, verdicts, or reasons absent from the sources to fill table cells (cells without a record say "no record").
- Do not interview (material is closed over existing intent artifacts).
- Do not drop rejected options and their reasons while the sources have them.
- Do not mix canonical-origin and inferred-origin material (marking is delegated to the fabrication-guard rule).
