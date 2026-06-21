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

1. **Read the catalog**
   - Read `.intent/constraint-starters.md` (bundled conventions) and, if present, `.intent/constraint-library.md` (constraints the user grew) read-only, and obtain all conventions (per `## id:`). If both are absent, skip and say so (do not stop).

2. **Match each convention's "fits when" against the context**
   - Match each convention's `fits when` against the case you are about to write the compass for (material, domain, boundaries touched). `fits when` is a cue, not a strong rule; if the fit is weak, do not surface that convention.
   - Use only the case context for matching. Do not read code diffs or runtime metrics.

3. **Surface matched conventions as draft candidates (do not write)**
   - Surface the `starter` (Anti-direction candidate / Invariant candidate) of matched conventions to the user as candidates. Example: "This case may match `<id>` (<name>) — how about <Anti-direction candidate> / <Invariant candidate> as a starter (adoption is up to you)?".
   - **Do not auto-write into the compass.** Whether to adopt is the user's call; only adopted ones are taken into Anti-direction / Invariants by hand.
   - Do not surface non-matching conventions. Narrow so there are not too many candidates.

4. **Proceed to the existing derivation**
   - After surfacing candidates, run the existing Anti-direction / Invariant derivation (impact list → Invariants, premortem → Anti-direction) as usual. Candidates the user adopted are taken in by hand within that derivation.

5. **Accumulate adopted constraints into the personal ledger (optional, by hand / with consent)**
   - Among the starters surfaced in ③, if the user **adopted** a constraint as "this is my standard," guide them to append it to the personal ledger `.intent/constraint-library.md` in its fixed schema (`## id:` / name / domain / fits when / constraint / origin). Next time it is surfaced as a candidate alongside the bundled catalog and is reused within the repo.
   - **Do not auto-write into the ledger.** Appending happens by the user's manual action, or only under the user's explicit approval (it carries no auto-accumulate behavior — a read-only gate). **If the user does not adopt, append nothing.** Leave the existing surfacing behavior unchanged.
   - **Keep accumulation inside this project only.** The append target is only inside this project's `.intent/` directory; provide no mechanism to share or persist constraints across projects (do not guide cross-project accumulation).
   - When the personal ledger `.intent/constraint-library.md` is absent, skip the accumulation and say so (do not stop — backward compatible).

## Relationship to discover

- In discover's terrain-diagnosis lane (`drift-terrain.md`), the same catalog is matched lightly when `drift-watch: on` to give early awareness. This procedure (compass) is the primary touchpoint; discover is supplementary.
