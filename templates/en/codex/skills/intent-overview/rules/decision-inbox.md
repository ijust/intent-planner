# Decision inbox (a view generated only when requested)

The procedure for cross-checking, read-only, the scattered "questions currently waiting on a human decision", and emitting the result to `.intent/overview/decision-inbox.md` as a derived output. Applied in `intent-overview`'s Step 2 **only when the user asks for the inbox** (a default run does not generate this view and only emits the one-line pointer in Output). It is a map for surveying and clearing the decisions that have piled up, and it never judges or scores (a facet of C34; DR92; INV62).

## When it applies (never by default)

- Generate only when the user **asks for the inbox (waiting on a decision)** to `/intent-overview` (natural-language triggers "decision inbox", "waiting on a decision", "gather the unanswered questions", etc.). Never bundle it into the default overview automatically (the pull discipline; context cost).
- On a default run, do not generate this view; leave only the one-line pointer in overview.md. The default run's output and cost stay exactly as before (behavior-preserving).
- When there is zero material (no unanswered questions, no learnings awaiting approval, no warnings), do not stop; return an empty view that states "nothing waiting on a decision" (never error; never fill in by guessing).

## Procedure

1. **Gather the pending material from 3 sources, read-only** (reading only):
   - **(a) unanswered Open Questions**: read `## Open Questions` in `.intent/intent-tree.md`, the unsettled items in `.intent/intent-compass.md`, and `## Open Questions` in `.intent/packets/active/*.md`, and pick up the questions that carry no answer yet (settled, or delegated to implementation discretion). Do **not** list questions already answered or explicitly delegated to discretion (suppresses over-listing).
   - **(b) deltas awaiting approval (unpromoted learnings)**: read `.intent/deltas/` (the split form is the source of truth; the single `deltas.md` is a mirror / legacy) and pick up deltas not yet promoted (approved) into the canonical. Do not list deltas recorded as promoted or rejected.
   - **(c) recent warnings**: pick up only warns that remain recorded in a tracked file (preflight warns in `.intent/export-log` (the split form is the source of truth); `.intent/drift-log.md` (only when drift-watch is on), etc.). Do not pick up volatile warns that appeared only in session output (what did not remain cannot be observed).
2. **Attach a source link and "who should answer" to each item**:
   - **source link**: make each item traceable to which file, which question / which delta (a file name plus a heading / line marker). The reader must be able to move straight from the inbox to "where to answer" (the pillar of the fit criterion).
   - **who should answer**: attach the **lens name** only when a lens (perspective stand-in) record is tied to that question (use the free-text of `role lens` as-is; do not presume a fixed set of three roles). When there is no record, leave it blank; never fill in a role by guessing. Never transcribe org-presence information (who is absent, whose responsibility it is) (INV60; up to the perspective name only).
3. **Write `.intent/overview/decision-inbox.md` by full replacement**: state the generation time at the top (derived; regenerable; manual regeneration only). Writing is confined to `.intent/overview/` (never write to the canonical).

## Output shape

- Top: generation time; the material read (Open Questions across tree/compass/packets; unpromoted deltas; whether tracked warns existed); **the notice that this is derived, not the source of truth**.
- Body: a list of "N waiting on a decision". Each row = `[perspective name (if any)] a one-line summary of the question / learning / warning → where to answer (source link)`. You may bundle them by source ((a) questions / (b) awaiting approval / (c) warnings).
- When empty: **state "nothing waiting on a decision" explicitly** (never manufacture items).
- Tail: the notice that this is derived / not the source of truth, and guidance on how to answer (a question by editing the relevant file; a delta awaiting approval via the writeback approval flow; a warning by re-running the relevant skill — this view carries no answer UI).

## Discipline (keep these)

- **Do not answer from this view (read-only; one-directional)**: the inbox only mirrors "where, and what kind of, decisions are pending". Answering, approval, and clearing warnings happen in the existing file-edit / approval flows (this view carries no answer UI).
- **Neither over-list nor miss**: do not list questions already answered or delegated to discretion, or deltas already promoted / rejected (suppresses over-listing). Do not miss unanswered questions, unpromoted deltas, or warns that remain (suppresses misses).
- **Do not turn into a PM tool (INV62)**: attach no deadlines, assignee Gantt, progress %, or velocity. Go only as far as the pending list and "where to answer".
- **Transcribe nothing sensitive (INV60)**: "who should answer" goes only as far as the perspective name. Do not carry org presence, personal assignment, or raw measured data.
- **Emit no entry that cannot be traced to a source**: every entry traces to the files read (zero fabrication; the same line as evidence-anchored).
- **Drift is derived drift (A31/INV38)**: if the canonical moves after generation and the view goes stale, that is not a "conflict" but "derived drift that regeneration fixes". Regeneration is manual only (DR92).
- **Never rewrite the canonical**: writing goes only to `.intent/overview/decision-inbox.md`. Actually clearing a noticed pending decision is the human's call (this view goes only as far as the list).
