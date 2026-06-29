# Decision Probe (intent-side Self-Probing)

A procedure that, at a decision point, takes the agent's own **hypothesis (tentative conviction)**, checks it against the evidence in `.intent/`, and names—first and read-only—any evidence that contradicts the conviction. Apply it in Step 3 of `/intent-packets` (drafting a packet, filling decision slots).

**Aim**: When slicing a packet or filling a decision slot, the agent tends to coast on a tentative conviction such as "just copy the map and change the output target." If that conviction is adjudicated against the ledger's evidence (the Invariants/Decision Rules in compass, glossary, past deltas, related packets), drift that the ledger already has an answer for—yet that gets overlooked—can be prevented at the moment of decision. This is "gap detection before the decision," and it works **ahead of time**, in contrast to coinage-suspect / groundless-conclusion (after-the-fact detection) (A30, C19, INV37, DR61).

## Applicability (narrowing gate (i): narrow the firing point)

- **Fire only at load-bearing decision points.** Do not probe at every packet or every decision. Fire only when the decision rates, by "number of concerns touched × breadth of ripple into existing boundaries," at or above a threshold—i.e., a decision whose later reversal would ripple widely (how to slice a packet, which decision slot to fix up front, how to reconcile with an existing boundary, etc.).
- Do not fire on mechanical edits, typos, variable renames, byte-equivalent additions, or any decision that touches neither an Invariant nor a Decision Rule (do not pile on probe cost = minimal-cost principle).
- Judge "load-bearing" with the same qualitative read used for packet slicing (concerns touched × boundary ripple). Do not bring in effort-estimate numbers.

## Procedure

### 1. Self-Probing (articulate hypothesis and questions)
- For the packet/decision at hand, articulate the following two:
  - **Hypothesis (confirmed pattern)**: what you currently know / are convinced of about the decision (a tentative conviction).
  - **Question (open question)**: an unresolved question that could change the next decision. Limit it to ones where "if this turned out otherwise, the decision-slot value would change."
- Keep the questions few and sharp (do not raise questions that would not change a decision).

### 2. Pull evidence (narrowing gate (ii): narrow questions to those whose evidence exists)
- For each question, pull verifying/refuting evidence from `.intent/`. Evidence sources are the Invariants / Decision Rules in compass, the canonical vocabulary in glossary, past deltas, and related packets.
- **Add the personal ledger `.intent/constraint-library.md` (constraints the user grew) as an evidence source too (means-based constraints only, read-only candidate surfacing)**: this decision point (packet drafting / decision-slot filling = the implementation phase) is exactly where means-based constraints that lie dormant in `/intent-compass` should fire (effective at implementation-means moments such as editing a SKILL or designing a DB, with "when it is effective" written in `fits when`). Read the ledger, semantically match against the case context, and name matching means-based constraints as read-only candidates (constraint-library-firing, A32, INV39). The gates are the same as this procedure: candidate surfacing only (do not auto-write into canonical or the library); stay silent if the fit is weak (do not load the whole ledger); semantic matching (no mechanical scoring); in-repo only (do not read external evidence sources); record to no log. If the ledger is absent or there is no means-based match, emit nothing (silence). See `intent-compass/rules/constraint-surfacing.md` Procedures 2 and 6 for the detailed sorting convention.
- **Honor the pull discipline (do not load everything)**: pull only the packet at hand plus the related Invariants / Decision Rules. Do not load the whole compass or the whole tree.
- **Keep only questions whose evidence exists**: drop from the probe any question whose corresponding Invariant / Decision Rule / delta cannot be traced from `.intent/` (do not line up questions the ledger does not back). Questions that genuinely need a human ruling go to the packet's Open Questions on a separate lane, not to the probe output.
- This narrowing drops three failure modes at the door: a thin evidence pool, irrelevance, and a fabricated conviction (hallucination).

### 3. Emit the support view (refutation first, read-only)
- Cross-check the pulled evidence against the hypothesis and name, read-only, the following three:
  - **Evidence that contradicts the conviction (refutation, top priority)**: emit "your conviction X conflicts with INV/DR Y" **first**. Do not use evidence only to corroborate the conviction (do not become a rubber-stamp).
  - **Questions the evidence answers**: "this question is answered by delta / Decision Rule Z."
  - **Remaining questions for a human**: a question with no refuting ground truth in `.intent/` is not asserted; hold it and send it to Open Questions.
- **Temperature**: stay at candidate suggestions; do not assert (false positives assumed). If in doubt, do not emit.

## Discipline

- **Read-only; do not auto-modify canonical (most important)**: the probe output is a support view a human reads. Do not auto-reflect a correction of the conviction into canonical (intent-tree / intent-compass / packets) (A7/INV5, INV37). Recording is a separate action a human takes after approval.
- **warn-only; not a gate**: do not stop export or implementation even if a conviction cannot be backed. Do not obstruct places where it is legitimate to proceed on conviction (self-evident decisions, decisions where an already-stated rationale suffices) (isomorphic to DR23's bare-symbol exception).
- **Semantic judgment; do not lean on a mechanical check (INV2/A1)**: "whether a question's evidence can be pulled / whether a conviction conflicts" is a semantic read. Do not lean on `scripts/intent-check.mjs`, presence/absence of a required field, or a mechanical regex match.
- **Silence**: when there is no load-bearing decision, or not a single conviction contradicted by evidence, do not emit any probe output at all.
- **Cold start**: when `.intent/` (the evidence pool) is unreadable or empty (a new repo whose Invariants are still thin), skip the probe and state "skipping probe because there is no evidence pool" (do not flood with questions that have no backing evidence).
- **Keep the axis distinct from A29 (corrective-intent)**: this procedure adjudicates a **hypothesis** with **verifying/refuting evidence** (ahead of time, verification). It is a different axis from A29's "carry the **rationale (the historical grounds)** alongside a conclusion" (after the fact, preservation). Do not raise the same question twice.
- **Keep lanes distinct from designer-questions / decision-slot sowing**: this procedure has the AI raise and adjudicate its own hypothesis = **preventing a recurrence of a known pitfall**. designer-questions (human→AI elicitation) and decision-slot sowing (decision slots for a new area = **raising questions for an unknown new area**) run in the opposite direction and serve a different role. Do not raise the same question twice.
- Do not modify code.
