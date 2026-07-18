# format mapping: stakeholder one-pager (bottom line up front)

The mapping rule by which the `intent-to-spec` skill assembles the three-layer material read by source-scope interpretation into a **stakeholder one-pager** — one page that a non-coding decision-maker (executive, sales, customer-facing, etc.) can read in a few minutes. SKILL.md holds only the procedure and report format; "which material goes in what order into which heading" refers to this rule.

## Boundary of responsibility (mapping, not reading / checking)

- This rule is a **format mapping**. It only handles composition, ordering, and assignment of material to headings.
- It does **not re-read** the projection sources (intent-tree / compass / packets / steering). It has no parser or schema of its own; it rearranges the material handed over by source-scope interpretation (with its layer / heading / packet provenance preserved) as-is.
- Attaching traces, marking inferred, and preserving invariants are the **fabrication-guard rule's** responsibility, not this rule's. It receives canonical-derived and inferred-derived material (Assumptions / Open Questions) distinctly and places them without collapsing that distinction.

## Reader and design constraint (BLUF)

The reader is assumed to be a non-coding decision-maker (executive, sales, customer-facing, a non-developer solo builder, etc.). Such a reader wants to know, before the detail, "what is this, ultimately, and why is it needed". So this format takes **BLUF (Bottom Line Up Front)** as the core of its composition (DR93's `bluf-message`).

- **Put the bottom line at the top.** State what is being built and why in the first paragraph; put background and history after (do not compose so that the conclusion arrives at the end).
- **One output, one purpose (type separation).** The one-pager stays a document that conveys "what, why, where we are"; do not mix a how-to, a reference, or technical detail into the same output (DR93's `doc-type-separation`).
- **Do not point internal symbols at the reader (A33).** Do not emit internal identifiers such as `INV` / `DR` / `pkt-` bare. The body of how to open is unified in `rules/reader-vocabulary.md` (paraphrase symbols INV/DR via the ledger `scripts/symbol-labels.json`; drop identifiers absent from the ledger — packet ids, skill names, etc.). Since this format's reader is a non-insider by default, always apply this opening.
- **No schedule or velocity (INV62).** Do not emit date-committed plans or velocity metrics; stop at where we are and the forward order.
- **No organizational presence/absence or raw measured data (INV60).** Stop at summaries and provenance references.

## Composition (top to bottom: bottom line → why → what we won't do → where we are)

Place the three-layer material handed over by source-scope interpretation in this order.

| Order | Section | What goes here | Main provenance of material |
|---|---|---|---|
| 1 | Bottom line (what is being built) | State up front what this effort is and its value to the reader | Intent's North Star (compass) + intent-tree's L0 (add the value note if present) |
| 2 | Why we build it | The problem being solved / the state to aim for | intent-tree's L0–L1 (the upper why; measurable criteria in plain words if present) |
| 3 | What we won't do | The scope this effort does not cover (heading off expectations) | compass's Anti-direction + a summary of packets' Non-scope |
| 4 | Where we are | Current state (group-level state summary; no dates or velocity) | a summary bundling packets' state (index / active state) |
| 5 | Assumptions / open (if any) | Assumptions and unresolved questions placed in a **separate** box, not mixed with the settled items above | intent-tree's Assumptions / Open Questions (inferred-derived) |

- Always place section 1 (bottom line) at the top. Do not lead with background (2) (the core of BLUF).
- Paraphrase internal identifiers into plain words before they reach the body (drop ones that cannot be paraphrased).
- Omit any section with no matching material, stating "not recorded / not applicable" (do not pad with guesses). In particular, when there is no value note or estimate, state honestly that there is none.
- Section 5 places inferred-derived material in a separate box at the end, not dissolved into the canonical body (omit if there is no material).

## Invariants

- Do not re-read or change the projection sources (mapping only).
- Do not break the order that puts the bottom line (what / why) at the top (BLUF).
- Do not point internal identifiers (INV/DR/pkt-) at the reader bare (A33).
- Do not include a schedule, velocity, organizational presence/absence, or raw measured data (INV62 / INV60).
- Do not mix canonical-derived and inferred-derived material (leave the marking itself to the fabrication-guard rule).
- Do not add background, motivation, or detail not in the material just to smooth the prose.
