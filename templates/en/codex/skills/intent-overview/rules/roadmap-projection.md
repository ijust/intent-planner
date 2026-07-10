# Roadmap projection (a view generated only when requested)

The procedure for bundling active packets' order, state, and dependencies read-only into one "forward order of work" and projecting it to `.intent/overview/roadmap-projection.md` as a derived output. Applied in `intent-overview`'s Step 2 **only when the user asks for the roadmap** (a default run does not generate this view and only emits the one-line pointer in Output). It **carries no dates, deadlines, Gantt, or velocity** (only order and state = a facet of C34; DR92; INV62).

## When it applies (never by default)

- Generate only when the user **asks for the roadmap** to `/intent-overview` (natural-language triggers "roadmap", "order of work", "what is blocking what", etc.). Never bundle it into the default overview automatically (the pull discipline; context cost).
- On a default run, do not generate this view; leave only the one-line pointer in overview.md. The default run's output and cost stay exactly as before (behavior-preserving).
- When there are zero packets (`.intent/packets/active/` is empty), do not stop; return an empty view that states "no packets" (never error; never fill in by guessing).

## Procedure

1. **Read active packets, read-only**: read the frontmatter of each `.intent/packets/active/*.md` as the source of truth (`packet_id` / `name` / `state` / `updated_at` / `depends_on`), not `.intent/packets/index.md` (a derived cache that regeneration fixes). Mirror `state` (the 6 values draft/ready/verifying/done + legacy values like active) read-only only; do not compute or infer state.
2. **Bundle order and dependencies (no dates)**:
   - **order**: from the `depends_on` relations, build the "what is needed first → what waits on it" precedence, and arrange it as **precedence**, not dates. Attach no calendar schedule or deadline (INV62).
   - **blocker chains**: trace, from depends_on, which packet is blocking what (if A is incomplete, B cannot start), and state it as a chain. If there are cycles or unresolved dependencies (e.g. a dependency on a packet not in active), state them as-is (do not smooth them away).
   - **the parked partition**: gather packets marked parked (parked / on-hold in `state` or the body) into a separate partition, and do not mix them with the forward order.
   - **work-plan group bundling (reflect if present; behave as before if absent)**: if `.intent/packets/plan.md` has a "Work plan" section (human-declared group headings and order of work), bundle the roadmap by those groups (headings), ordering within each group by the work-plan order (share DR139's derivation rule; do not invent a different order interpretation here). If the section is absent or empty, order as before by `depends_on` precedence alone. Carry no dates or scores (INV62/INV81; use the human's group headings as written and do not fix them to a fixed vocabulary = Anti 432).
3. **Add progress actuals and cross-cutting bundles**:
   - **progress actuals**: from `state` and `updated_at`, read "what recently became done / verifying" and add the recent progress (not as a date column, but as a "recently moved" marker).
   - **risk aggregation**: if a packet body carries a risk section (e.g. `## Risk`), aggregate and bundle it. If absent, state "not filled in" (never fill in by guessing).
   - **experience-stage bundle**: if any packet carries an experience stage, bundle by stage. If absent, omit that bundle and state the reason (not filled in) (backward compatible).
4. **Write `.intent/overview/roadmap-projection.md` by full replacement**: state the generation time at the top (derived; regenerable; manual regeneration only). Writing is confined to `.intent/overview/` (never write to the canonical).

## Output shape

- Top: generation time; the material read (count of active packets; whether depends_on existed); **the notice that this is derived, not the source of truth**.
- Body: the forward order (precedence) and each packet's `state`. A blocker-chain section (what blocks what). The parked partition. Markers for what recently moved. Aggregation for packets with a risk section. A per-stage bundle if experience stages are written.
- When empty: **state "no packets" explicitly** (never manufacture an order). Even a repo with only legacy packets (no `depends_on`, no new sections) must hold up with "no dependencies" / "not filled in" stated (the backward-compatible reading contract).
- Tail: the notice that this is derived / not the source of truth.

## Discipline (keep these)

- **Carry no dates, progress %, or velocity (INV62; the most important oracle)**: emit no date column, deadline, Gantt, progress %, or velocity in the output. Stay within the forward order (precedence), state, blocker chains, the parked partition, and the "recently moved" markers. Do not become a calendar schedule.
- **Do not compute or infer state**: mirror the `state` frontmatter value read-only only. Do not collapse progress into a single %, and do not predict completion.
- **Read the frontmatter, not index.md, as the source of truth**: `packets/index.md` is a derived cache that regeneration fixes. Treat drift plainly as "derived drift that regeneration fixes", not a "conflict" (A31/INV38; add that `/intent-packets` regeneration is the fix).
- **The backward-compatible reading contract**: state "no dependencies" when `depends_on` is absent, and "not filled in" when a risk section / experience stage is absent. Do not **fill in** the new sections (only bundle them if present; only state "not filled in" if absent).
- **Emit no entry that cannot be traced to a source**: every entry traces to the packet read (zero fabrication; the same line as evidence-anchored).
- **Never rewrite the canonical**: writing goes only to `.intent/overview/roadmap-projection.md`. Actually changing the order of work after seeing it is the human's call (this view goes only as far as the projection).
