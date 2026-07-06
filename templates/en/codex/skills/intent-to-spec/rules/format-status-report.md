# format mapping: status report (bottom line up front)

The mapping rule by which the `intent-to-spec` skill assembles the three-layer material read by source-scope interpretation into a **status report** — a report document that, at a milestone (weekly, biweekly, etc.), conveys "what progressed, what got decided, what awaits a decision" to stakeholders. SKILL.md holds only the procedure and report format; "which material goes in what order into which heading" refers to this rule.

## Boundary of responsibility (mapping, not reading / checking)

- This rule is a **format mapping**. It only handles composition, ordering, and assignment of material to headings.
- It does **not re-read** the projection sources (intent-tree / compass / packets / steering). It rearranges the material handed over by source-scope interpretation (with its layer / heading / packet provenance preserved) as-is.
- Attaching traces, marking inferred, and preserving invariants are the fabrication-guard rule's responsibility, not this rule's. It places canonical-derived and inferred-derived material (Assumptions / Open Questions) distinctly.

## Reader and design constraint (BLUF)

The reader is assumed to be a stakeholder following this effort (inside and outside the team, including decision-makers). A status report is first and foremost about grasping quickly "what moved at this milestone", so it takes **BLUF** as the core of its composition (DR93's `bluf-message`).

- **Put each section's bottom line at the top.** In each of the three pillars — "what progressed / what got decided / what awaits a decision" — write the bottom line first, and put the detail and history after.
- **One output, one purpose (type separation).** The report stays about conveying the situation; do not mix a how-to or design detail into it (DR93's `doc-type-separation`).
- **No schedule or velocity (INV62).** Do not emit date-committed plans or velocity metrics; stop at state transitions and the forward order.
- **Match the vocabulary to the reader (A33).** For a developer-facing report you may keep internal identifiers (DR / packet id, etc.), adding a plain-word paraphrase on first use; for a report where non-developers are present, drop or paraphrase the identifiers.

## Composition (three pillars: what progressed → what got decided → what awaits a decision)

Place the material handed over by source-scope interpretation in these three sections.

| Order | Section | What goes here | Main provenance of material |
|---|---|---|---|
| 1 | What progressed | Work that moved since last time (state transitions, units that became done) | packets' state / updated_at (ones recently done / verifying) |
| 2 | What got decided | Newly settled judgments and decisions | new Decision Rules (compass) / a packet's settled decision slots |
| 3 | What awaits a decision | Questions now waiting on a human's judgment | unanswered Open Questions across intent-tree / compass / packets + deltas awaiting approval |

- In every section, put the bottom line (conclusion) at the top (do not lead with background).
- Keep a section with no matching material, stating "none this time" (do not delete the section — "no decisions this time" also has reporting value).
- For each item under "what awaits a decision" (3), attach the provenance (which file's which question) so the reader can trace to the source.
- Do not mix inferred-derived material (Assumptions / Open Questions) with canonical settled items.

## Invariants

- Do not re-read or change the projection sources (mapping only).
- Do not break the order that puts the bottom line at the top of each section (BLUF).
- Do not include a schedule or velocity (INV62).
- State "none this time" for a section with no material; do not fill with guesses.
- Do not mix canonical-derived and inferred-derived material (leave the marking to the fabrication-guard rule).
