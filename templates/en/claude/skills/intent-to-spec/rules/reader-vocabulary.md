# Reader-specific vocabulary opening: for customer-facing output, open symbols and insider terms into the reader's words (reader branch)

The source of truth for how `intent-to-spec` opens internal symbols and insider identifiers into the reader's words when the readable Spec it generates is aimed at a **non-coding reader (customer, executive, sales, a non-developer stakeholder)**. Each format-mapping rule (decision memo, upstream-facing, integrated spec, status report, one-pager) references this rule when the reader is judged to be a non-insider. SKILL.md holds only the wiring of "to which reader this discipline applies"; the body of how to open is unified here (the same discipline is not duplicated into each format rule).

This applies the idea of C14 (rendering symbols in natural language) to the **output side** of `intent-to-spec`. Where C14 itself targets **the tool's own files** ("when writing intent artifacts, attach a label to a bare symbol / replace symbols with labels at publish time for the tool's own distributables — shipped-internal-symbols"), this rule targets "the outward artifact that to-spec generates for the user's own work" (a different target and firing point; features and tests are not duplicated).

## Judging the reader (insider or non-insider)

- **Non-insider (customer, etc.)**: a reader who does not read code or `.intent/`. The format that assumes this reader by default is the one-pager (stakeholder-onepager). For other formats too, treat the reader as a non-insider when the user specifies the reader as "customer-facing" etc., or states that the output is for handing to a customer.
- **Insider (someone inside the repo)**: a reader who can follow intent artifacts. The formats that assume this reader by default are the decision memo (reader = yourself weeks later), upstream-facing, integrated spec, and status report (a report for developers).
- Derive the judgment from the existing source-scope interpretation (arguments, format kind). Do not add a new state machine or a persistent record of the reader. When the format kind alone is ambiguous (customer and insider may be mixed), prefer the user's reader specification; absent one, fall back to that format's default reader.

## How to open (apply only when non-insider)

1. **Paraphrase symbols by looking them up in the ledger.**
   - Look up internal symbols (`INV` + number, `DR` + number) in the symbol→label ledger `scripts/symbol-labels.json` and paraphrase them into the short name in the distribution language (ja short name for the ja template, en short name for the en template) (e.g. "(INV47)" → something like "(load the compass partially via domain tags)").
   - **Reuse** the existing ledger held by shipped-internal-symbols (publish-time label replacement for distributables). Do not create a second paraphrase ledger on the to-spec side (avoid double maintenance and label drift for the same symbol).
   - The source of truth for a label is the symbol's definition line (DR22), and the ledger carries its short name. Do not invent your own label on the referencing side.

2. **Drop identifiers absent from the ledger.**
   - **Drop** from the body those identifiers whose human short name is not in the ledger, such as packet ids (`pkt-…`), skill names (`from-spec` / `discover` / `intent-compass`, etc.), and implementation terms (`byte-identical` / `fail-fast` / `golden`, etc.).
   - Drop them; do not fill in with a plausible coinage (do not invent a word the reader does not know = fabrication guard; follow to-spec's nature of transcribing only what the material states). If dropping leaves a sentence unable to point at "which decision, which work unit", name the subject in plain words rather than the identifier (e.g. "the input extension of pkt-…-qo0h" → "ingesting scratch notes").

3. **Insiders as before.**
   - When the reader is judged an insider, keep symbols and identifiers as references for following, as before (dropping them would harm traceability). In this case the paraphrase/drop of this rule does not apply.

## Invariants

- Open only for non-insider output (keep symbols and identifiers in insider output as before).
- Paraphrase symbols by looking up the existing ledger `scripts/symbol-labels.json` (do not create a to-spec-specific second ledger).
- Drop identifiers with no short name in the ledger (do not fill with a coinage).
- Paraphrase/drop is a vocabulary operation for readability of the body and does not change the content of the projection source's invariants/constraints (do not weaken, strengthen, or lose meaning; preserving invariants remains the fabrication-guard rule's responsibility).
- Do not add a new state machine, persistent record, or mechanical check for judging the reader (ride on the existing source-scope interpretation).
