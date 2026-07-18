# Intent coverage map (a view generated only when a target range is specified)

The procedure for cross-checking a specified code area, read-only, from the viewpoint of "blank zones governed by no intent", and emitting the result to `.intent/overview/coverage-map.md` as a derived output. Applied in `intent-overview`'s Step 2 **only when the user specifies a target range** (a default run without one does not generate this view and only emits the one-line pointer in Output). It is a map for deciding where to aim reverse reading (the inward projection from code to intent), and it never judges or scores (facet (5) of C38; A49; INV63).

## When it applies (never by default)

- Generate only when the user **specified a target range (a directory / module)** to `/intent-overview`. Never scan the whole repo by default (the pull discipline; context cost).
- On a default run without a range, do not generate this view; leave only the one-line pointer in overview.md ("specify a target range to generate the intent coverage map"). The default run's output and cost stay exactly as before (behavior-preserving).
- When the target range does not exist, do not stop; state "no material to read" and return an empty result (never fill in by guessing).

## Procedure

1. **Partition the area**: use the first level directly under the target range (directories / major file groups) as the default partition. Follow the user's partition if they specify one.
2. **Cross-check each area on 3 facets** (all read-only):
   - **(a) the packet facet**: semantically match whether a packet under `.intent/packets/active/` (and `archive/`, referenced explicitly when needed) includes the area in its `## Scope` / `spec_refs` (an LLM reading; do not lean on machine scoring).
   - **(b) the Invariant facet**: match the area with plain grep against the impact paths attached to each compass Invariant (the A38 notation = markers of the files/paths where that Invariant applies) (a simple path match needing no semantic judgement, so grep assists = the INV48 exception). When no Invariant carries impact paths, mark this facet "unobserved".
   - **(c) the commit facet**: if `.intent/release-note/release-note.md` (release-note's derived output) exists, read it and see whether commits touching the area carry an intent link (solid link = from an Intent trailer / guess = from text-matching; the distinction follows release-note's output rules). If the release-note output is absent, mark this facet "unobserved (run /intent-release-note to observe it)". **Never read git directly** (this skill's tool contract is Read/Glob/Grep/Write only; the source of truth for commit matching is release-note's matching rules, and here we only read its derived output = do not duplicate the matching logic).
3. **List the blank zones**: list the areas matching **none of** (a)(b)(c) as "intent blank zones", with grounds (which facets were checked and came up empty; which facets were unobserved). Every row must be traceable to its source (the files read).
4. **Write `.intent/overview/coverage-map.md` by full replacement**: state the generation time and the target range at the top (derived; regenerable; manual regeneration only). Writing is confined to `.intent/overview/` (never write to the canonical).

## Output shape

- Top: generation time, target range, the material read (packets / compass impact paths / whether the release-note output existed).
- Body: a table or list per area (area | (a) packet | (b) Invariant | (c) commits | verdict = blank / covered / partly unobserved).
- Blank-zone section: restate only the areas judged blank, with grounds. **When there are zero blank zones, state so explicitly** (never manufacture a warning).
- Tail: the notice that this is derived / not the source of truth, and the pointer to the next move for filling a blank (reverse reading = the inward projection from code to intent, or `/intent-discover` to raise the intent for that area).

## Discipline (keep these)

- **No scoring, no report cards (Anti-direction 302)**: attach no importance ranks, priority scores, or pass/fail vocabulary to blank areas. Use no vocabulary that brands "blank = bad" (some blanks are legitimate — settled stable code, boilerplate needing no intent). Stay an enumeration of observations.
- **Emit no entry that cannot be traced to a source**: every entry traces to the files read (zero fabrication; the same line as evidence-anchored).
- **Mirror solid links vs. guesses distinctly (INV63)**: facet (c) mirrors release-note's distinction (solid link / guess) as-is; never blend them.
- **Bring in no index (Anti-direction 301; INV2)**: matching is Grep plus an LLM semantic reading. Build no vector index, dependency graph, or cache.
- **Never rewrite the canonical**: writing goes only to `.intent/overview/coverage-map.md`. Moving from a discovered blank to raising intent / reverse reading is the human's call (this view goes only as far as the map).
