# Drift Terrain

The symptom × in-progress Intent Tree matching logic used at Step 3.5 of `/intent-discover`. Runs only when `drift-watch: on` (off / missing / invalid does nothing). The goal is to name, before work starts, "this subject is prone to drift," and to make the anti-direction / invariant get written first, before you drift all the way out.

## The only basis for diagnosis is the type catalog

- **The only basis for diagnosis is the type catalog in `.intent/drift-patterns.md`.** At the discover stage there is no compass and no packet yet, so the type catalog is the only material to match against (an essential constraint). Matching based on the compass's Invariant / Anti-direction is the job of the export stage (a different drift-watch hook) and is not done here.
- The drift-prone-situation pre-check **assumes false positives**. "Matching" a type is not a confirmation of drift. Name it early on a weak cue, and record swings-and-misses too.

## Procedure

1. **Read drift-patterns.md**
   - Read `.intent/drift-patterns.md` and take all types (the seeds plus every type the user has grown).
   - **When absent**: skip drift-prone-situation pre-check and notify the user accordingly (do not stop / do not write to drift-log). Do not run the remaining steps.

2. **Match each type's symptom against the in-progress Intent Tree**
   - Hold each type's `symptom` against the **subject (topic) and L0–L3** (purpose / outcome / capability / behavior & design intent) of the Intent Tree you are currently building.
   - `symptom` is a **weak cue**, not a strong decision condition meaning "if it matches it is definitely drift." Assume false positives; pick it up if it looks suspicious.

3. **When a type matches**
   - **Name it explicitly** to the user. Example: "This subject is a situation where you can easily hit `<id>`."
   - Write that type's "Things to write first" (Anti-direction / Invariant candidates) into the Intent Tree's **Open Questions / anti-direction candidates**. Concretize the subject-dependent parts from context (do not paste the catalog's generic wording verbatim; phrase it for the current subject).
   - Append one entry to `drift-log.md` (see the append procedure below). The values are:
     - `pattern: <the matched type's id>`
     - `stage: discover`
     - `packet: -` (no packet is fixed yet at the discover stage)
     - `mechanism: pattern-catalog`
     - `outcome: prevented` (**a draft**: this is drift-watch's estimate; the verdict is the user's `user-verdict`)
     - `user-verdict: unjudged`
     - `recorded_at: <ISO 8601>`
     - `commit: <short hash | ->`
     - `note: <1-2 lines>` (what you named and what you had written first)
   - If multiple types match, append one entry per type.

4. **When no type matches (a swing and a miss / not-applicable)**
   - **Always record the swing-and-miss too.** So that `missed=0` is not misread as "evidence it worked," record the moments when nothing matched just as evenly (structural avoidance of confirmation bias).
   - Append one entry to `drift-log.md`. The values are:
     - `pattern: -` (no type matched; `uncatalogued:<short name>` is the value for an actual drift outside the catalog, so do not use it for a swing-and-miss — use `-`)
     - `stage: discover`
     - `packet: -`
     - `mechanism: none`
     - `outcome: not-applicable`
     - `user-verdict: unjudged`
     - `recorded_at: <ISO 8601>`
     - `commit: <short hash | ->`
     - `note: <1-2 lines>` (that no type was present in the situation)

## The append procedure for drift-log

- **Write in split form (CONTRACT "Split and archive convention for append-only records")**: drift-log is event-origin, so instead of appending to the end of a single `drift-log.md`, write one entry to a **per-date+slug split file** `drift-log/<date>-<slug>.md`. `<date>` is the recorded_at date; `<slug>` is derived from the pattern (the event) via the existing slug rule (`intent-packets/rules/packet-format.md`) — do not create new/sequential numbering. Because a different event touches a different file, tail collisions disappear by construction. Never rewrite or delete an existing entry (**append-only**).
- **Always write all 9 keys in the fixed order**: `pattern` → `stage` → `packet` → `mechanism` → `outcome` → `user-verdict` → `recorded_at` → `commit` → `note`. Do not write an entry that is missing even one of the 9 keys.
- **recorded_at**: write the time of recording in ISO 8601 (transaction time).
- **commit**: write the result of `git rev-parse --short HEAD`. When it cannot be obtained (non-repository, git CLI absent, etc.), use `-` (fail-open: keep recording).
- **When the `drift-log/` directory is absent**: create the directory, then write the split file. An old single `drift-log.md`, if still present, can be read side-by-side by readers (migration is handled by this slice's migration step).
- Follow the sample in the "Entry format" section of `.intent/drift-log.md` (`### drift-log entry`) for the entry format.

## Context cost cues (tied to drift-watch)

Alongside drift-prone-situation pre-check, run a matching that makes you **notice** a way of progressing that eats context (tokens). This is a **separate catalog** from drift-patterns (types of intent drift); only the symptom differs — it is "a situation that eats context" rather than "intent drift". This is awareness, not a norm, and because it differs in nature from the drift-patterns matching above, it is **kept as a separate procedure**.

- **Only when `drift-watch: on`** do this matching (do nothing when off / unset / invalid). When `.intent/context-cost-cues.md` is absent, skip the matching and announce that (do not stop).
- **This is not recorded to any log.** Unlike the drift-patterns matching above (which appends to `drift-log.md` on both a match and a miss), context cost cues are **not appended to `drift-log.md` or to any other log**. Reason: consumption cannot be measured and its outcome cannot be evaluated, so mixing it into the log would pollute the drift-log tally with guesses; furthermore, what eats context legitimately differs per person, so recording it would intrude on privacy. **Do not apply the "append procedure for drift-log" above to this matching.**

### Procedure

1. **Read context-cost-cues.md**
   - Read `.intent/context-cost-cues.md` and obtain all types (seed + every type the user has grown). If absent, skip and announce (do not stop).

2. **Match each type's symptom against the Intent Tree under construction**
   - Check each type's `symptom` against the subject / way of progressing (topic and L0–L3) of the Intent Tree you are currently building. The `symptom` is a weak cue; if the fit is weak, stay silent (lean toward staying silent over false positives — to keep the awareness feature trustworthy).
   - Use only the subject of the Intent Tree under construction for matching. Do not read token consumption, git diffs, or runtime metrics.

3. **When a type matches (present the cue; do not write to any log)**
   - Name it to the user in a non-directive, noticing way. Example: "This subject may match `<id>` — this might be eating context."
   - Add the type's "if this is unintentional" light alternative (thin entry point / JIT pull / limited input) as an **optional choice**. Example: "If this is unintentional, there is also <light alternative> (the judgment is yours)."
   - **Do not correct or instruct.** Phrase it as a cue rather than an imperative or a verdict. Installing many skills or loading full content can be a legitimate high-cost choice, so do not dismiss a context-eating choice as unnecessary. Leave the judgment to the user.
   - **Do not append to any log** (do not reuse the drift-patterns append procedure).

4. **When no type matches**
   - Name nothing. **Write nothing to any log** (do not record a miss either — this matching has no log at all).

## Constraint starter awareness (always; not linked to drift-watch)

Alongside drift-prone-situation pre-check, perform a light match to give **early awareness** of domain-convention starters. This is the discover-side supplement to constraint-starter surfacing whose primary touchpoint is the compass (`intent-compass/rules/constraint-surfacing.md`); it reads a different catalog from the above (`.intent/constraint-starters.md` = reusable constraint conventions). Its symptom differs from intent-drift and context-cost, so **keep its procedure separate**.

- **This match runs always, regardless of the drift-watch value (A40, DR83 host ④)**. Unlike the drift-patterns match above and the context-cost cues, which are `drift-watch: on`-only, only the constraint-starter awareness runs even when off / unset / invalid (made always-on because noticing conventions at the case's first stage minimizes rework; user-confirmed 2026-07-04). When `.intent/constraint-starters.md` is absent, skip the matching and say so (do not stop). It is a light match: pull only the relevant domains and stay silent if the fit is weak (the gates below).
- **This is surfacing, not auto-transcription.** It only gives awareness of candidates; it does not auto-write into Anti-direction / Invariants. Adoption and wording are done by a human in the compass (the primary touchpoint).
- **Read the decision ledger and do not resurface decided conventions (INV57, DR84)**: read the `constraint-ledger.md` of the inherited issue directory (`.intent/discovery/<slug>-<rand>/constraint-ledger.md`; silence if absent); conventions decided in the same issue series are not resurfaced (if the purpose/context has changed from decline time, by semantic matching, a declined one may return; no numeric condition; INV2). When a decision is attached in discover, append one row to the ledger (`| convention-id | host=discover | decision | one-line context | date |`). Skip recording when the ledger / issue directory is absent. Details are owned by "Constraint decision ledger" in `.intent/discovery/README.md`. Apart from this ledger, **append to no log** (neither drift-log nor the context-cost logs).

### Procedure

1. **Read constraint-starters.md (pull only the relevant domains from the domain index)**
   - First read the **domain index** in `.intent/constraint-starters.md` (the parent catalog) read-only. This file is split; the convention bodies live in `.intent/constraint-starters/<domain>.md`.
   - Match each row of the domain index against the material/domain of the Intent Tree being built, and read read-only **only the domain files that seem relevant** (do not always load all domains). If present, also read `.intent/constraint-library.md` (constraints the user grew) read-only. Obtain conventions (per `## id:`) from each file.
   - If the parent catalog, domain files, and library are all absent, skip and say so (do not stop). **Backward compatibility**: when there is no domain index (an old single-file scaffold), read the whole `.intent/constraint-starters.md` as before.

2. **Match each convention's "fits when" against the Intent Tree under construction**
   - Match each convention's `fits when` against the material/domain of the Intent Tree you are building. `fits when` is a weak cue; if the fit is weak, stay silent (lean toward silence over false positives).
   - Use only the material of the Intent Tree under construction for matching. Do not read code diffs or runtime metrics.

3. **When a convention matches (surface awareness; record only decisions)**
   - Name it to the user in an non-directive, noticing way. Example: "This material may match `<id>` (<name>) — you can consider it as a starter in the compass." Do not push; narrow the candidates.
   - The detailed starter (Anti-direction candidate / Invariant candidate) and the adoption decision are **left to the compass (the primary touchpoint)**. In discover, only give early awareness that "this convention may help."
   - When a decision is attached, record it in the ledger (per the ledger convention above). **Append to no log other than the ledger.**

4. **When no convention matches**
   - Name nothing. **Write nothing to any log** (this matching has no log other than the decision ledger).
