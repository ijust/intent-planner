# Constraint Surfacing (surfacing constraint starting points)

A procedure that matches the bundled domain-convention catalog (`.intent/constraint-starters.md`) read-only and surfaces **draft candidates** for Anti-direction / Invariants. Used during the Compass construction phase of `/intent-compass`, **as a step before** deriving Anti-direction / Invariants. If the user has grown their own constraints (`.intent/constraint-library.md`), add those to the candidates as well.

This is a **supplement that does not replace** C2's derivation (the container that makes Anti-direction/Invariants explicit in the compass to suppress local optima): impact list → Invariants, premortem → Anti-direction. The existing derivation runs as is; this only injects "draft candidates of conventions that fit the context" ahead of it.

## Discipline (must hold)

- **Surfacing stays a read-only draft.** Do not **auto-write** matched conventions into Anti-direction / Invariants. Transcription into the compass happens by hand after the user picks what to adopt (confirmation with the user uses this skill's own confirmation mechanism).
- **Do not push.** Do not surface conventions that do not fit the context. Narrow the candidates; involve no stop or coercion. If the fit is weak, stay silent (lean toward silence over false positives, to keep the draft feature trustworthy).
- **Match semantically.** Judge by reading "fits when" against the context. Do not lean on mechanical string scoring or regular-expression matching.
- **Do not replace or duplicate the existing derivation.** The impact-list → Invariants and premortem → Anti-direction steps stay as is. This procedure only adds a supply of candidates ahead of them.
- **Stay silent when the catalog is absent.** When `.intent/constraint-starters.md` is absent, skip the matching and say so (do not stop). Same for `.intent/constraint-library.md` (skip if absent).
- **Do not record to any log.** Surfacing stays a read-only suggestion and keeps no record.

## Procedure

1. **Read the catalog (pull only the relevant domains from the domain index)**
   - First read the **domain index** in `.intent/constraint-starters.md` (the parent catalog) read-only. This file is split; the convention bodies live in `.intent/constraint-starters/<domain>.md`.
   - Match each row of the domain index (domain, file, conventions it holds) against the compass work at hand (material, domain, boundaries touched), and read read-only **only the domain files that seem relevant** (do not always load all domains — the minimal-cost pull discipline). When relevance is unclear you may read the candidate domains broadly, but do not read unrelated domains.
   - If present, also read `.intent/constraint-library.md` (constraints the user grew) read-only. Obtain conventions (per `## id:`) from each file.
   - If the parent catalog, domain files, and library are all absent, skip and say so (do not stop). **Backward compatibility**: when there is no domain index (an old single-file scaffold), read the whole `.intent/constraint-starters.md` as before.

2. **Match each convention's "fits when" against the context**
   - Match each convention's `fits when` against the case you are about to write the compass for (material, domain, boundaries touched). `fits when` is a cue, not a strong rule; if the fit is weak, do not surface that convention.
   - Use only the case context for matching. Do not read code diffs or runtime metrics.
   - **Tell intent-oriented from means-oriented (only for constraints from the personal ledger `.intent/constraint-library.md`)**: read each constraint's `fits when` as either "policy-deciding (intent-based — effective when deciding a feature's intent)" or "implementation-oriented (means-based — effective at implementation-means moments such as editing a SKILL or designing a DB)". Surface intent-oriented ones in this compass phase as before; do not surface means-oriented ones in compass — send them to the implementation-phase firing (Procedure 6). Read this distinction semantically from the `fits when` text (use "when / on what occasion it is effective" as a cue if written), and add no new field (absorb it in how `fits when` is written — minimality). Conventions from the bundled catalog (starters) are out of scope for this distinction and handled as before.

3. **Surface matched conventions as draft candidates (do not write)**
   - **Read the decision ledger first and do not resurface decided conventions (INV57, DR84)**: before surfacing, read the `constraint-ledger.md` of the inherited issue directory (`.intent/discovery/<slug>-<rand>/constraint-ledger.md`; silence if absent). Conventions that already received a decision (adopted/declined/deferred) in the same issue series are not resurfaced (but if the case's purpose/context has changed from the one-line context recorded at decline time, by semantic matching, a declined convention may return to the candidates; holds no numeric condition; INV2).
   - Surface the `starter` (Anti-direction candidate / Invariant candidate) of matched conventions to the user as candidates. Example: "This case may match `<id>` (<name>) — how about <Anti-direction candidate> / <Invariant candidate> as a starter (adoption is up to you)?".
   - **Do not auto-write into the compass.** Whether to adopt is the user's call; only adopted ones are taken into Anti-direction / Invariants by hand.
   - **Record the decision in the ledger (INV57, DR84)**: when the user attaches a decision to a surfacing, append one row to the ledger (`| convention-id | host=compass | decision | one-line context | date |`; a decline requires the one-line context). Skip recording when the ledger / issue directory is absent (do not stop). The detailed recording convention is owned by "Constraint decision ledger" in `.intent/discovery/README.md`. This adds one recording destination without changing the surfacing logic.
   - Do not surface non-matching conventions. Narrow so there are not too many candidates.

4. **Proceed to the existing derivation**
   - After surfacing candidates, run the existing Anti-direction / Invariant derivation (impact list → Invariants, premortem → Anti-direction) as usual. Candidates the user adopted are taken in by hand within that derivation.

5. **Reliably ask whether to accumulate an adopted constraint into the personal ledger (right after adoption, read-only prompt, the user decides)**
   - **Make the trigger timing explicit.** Among the starters surfaced in ③, if the user **adopted** a constraint as "this is my standard," then **right after that adoption** (after taking it into the compass, before moving on to other matters) **always ask once, read-only**: "Keep this constraint in the personal ledger `.intent/constraint-library.md`?" Do not adopt and then pass over the accumulation prompt (making this prompt actually fire is the heart of this step — the personal ledger easily falls into a state where the read path exists but the accumulation path never works).
   - **Show a schema draft.** When asking, present a **draft candidate** that maps the adopted constraint into the ledger's fixed schema (`## id:` / name / domain / fits when / constraint / origin). Pre-fill the `origin` field with "which work / which starter id it was adopted from (the catalog id if it came from the bundled catalog)." The user reviews this draft and accepts/edits it. Next time it is surfaced as a candidate alongside the bundled catalog and is reused within the repo.
   - **Do not re-surface a constraint already in the ledger (dedup).** If the same `id` (or a substantively identical constraint) is already in `.intent/constraint-library.md`, do not ask about accumulating it (do not pester with the same constraint every time — preserving trust in the starter feature, erring on the side of silence over false positives).
   - **Do not auto-write into the ledger.** Appending happens by the user's manual action, or only under the user's explicit approval (it carries no auto-accumulate behavior — a read-only gate). **If the user does not adopt, ask nothing and append nothing.** The surfacing behavior up through ③ is unchanged (this step only makes the post-adoption accumulation prompt reliable).
   - **Keep accumulation inside this project only.** The append target is only inside this project's `.intent/` directory; provide no mechanism to share or persist constraints across projects (do not guide cross-project accumulation).
   - When the personal ledger `.intent/constraint-library.md` is absent, skip the accumulation and say so (do not stop — backward compatible).
   - **Write "when it is effective" into the accumulation draft's "fits when" (align the marker on the write side and the read side)**: if the adopted constraint is means-oriented (effective in the implementation phase), make it a convention to add "when / on what occasion it is effective (e.g., when doing a change that edits a SKILL body)" to the draft's `fits when`. This is the marker that makes Procedure 2's intent-vs-means distinction and Procedure 6's implementation-phase firing work; align how the marker is written on the accumulation side (this Procedure 5) and the read side (Procedures 2 and 6) so they do not diverge. Add no new field; absorb it in the existing `fits when` text (minimality).

6. **Fire means-oriented constraints in the implementation phase too (personal ledger only, read-only candidate surfacing)**
   - Personal-ledger constraints read as "implementation-oriented (means-based)" in Procedure 2 easily lie dormant in the compass phase (the case context is "the feature's intent" and does not match a means-based constraint). Read, semantically match, and surface these as candidates in the **implementation phase** too (`/intent-packets`'s packet drafting / decision-slot filling).
   - Host this by riding on `/intent-packets`'s `rules/decision-probe.md` (the procedure that pulls evidence from `.intent/` at a decision point) — do not stand up a separate new firing point; add the personal ledger as one evidence source to the existing evidence pull (minimal cost). See `intent-packets/rules/decision-probe.md` for details.
   - Even when the firing point is widened to the implementation phase, inherit all the gates of this procedure: candidate surfacing only (do not auto-write into compass, packet, or library); stay silent if the fit is weak (do not surface unrelated constraints; do not load the whole ledger); semantic matching (no mechanical scoring); read only the in-repo `.intent/constraint-library.md` (do not read external evidence sources); record to no log.
   - When the personal ledger is absent, or there is no constraint read as means-oriented, fire nothing (silence — backward compatible).

## Relationship to discover

- In discover's drift-prone-situation pre-check lane (`drift-terrain.md`), the same catalog is matched lightly when `drift-watch: on` to give early awareness. This procedure (compass) is the primary touchpoint; discover is supplementary.
