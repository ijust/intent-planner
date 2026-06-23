# Improve: three-axis evaluation and classification criteria

Rules for cross-checking the `.intent/` deliverables against the implementation reality in post-implementation realignment. Used by the `intent-improve` skill. Whereas writeback is the regular per-packet path, improve is the cross-cutting safety net that also catches drift not tied to a packet.

## The three evaluation axes

- **completeness** (whether the intended content has been realized): whether the Expected Behavior / Scope of the packet files under active/ appears in the implementation and tests (the cross-cutting read is limited to active/; do not read archive/). Detects unrealized or partially realized content.
- **correctness** (whether the realized content matches the intent): whether the implemented behavior matches the packet's Why / Expected Behavior. Detects realizations that differ from the intent and additions outside the intent.
- **coherence** (whether the implementation is consistent with the North Star, Invariants, and Decision Rules): whether the implementation contradicts the North Star / Invariants / Anti-direction / Decision Rules of intent-compass.md. Detects local optimizations and invariant violations. It also detects Decision entries whose Revisit when conditions in the Decision Rules of intent-compass.md can be read as met from the implementation reality and `deltas` (cross-read in split form: the split files `.intent/deltas/*.md` (source of truth if present, natural-key ascending) → read-fallback to the legacy single `.intent/deltas.md` (generated mirror) if absent; when both coexist, treat split as source of truth and do not double-count the mirror). Report such detections with evidence under the existing classification "Decision Rules update recommended" (do not create a new classification). In addition, as a separate path with a different input source, substring-match each event string in `.intent/milestones.md` against the `Revisit when` field of every Decision Rule, and re-propose any matched Decision Rule for review under the same "Decision Rules update recommended" classification. Rules whose `Revisit when` is explicitly recorded as "undecided" are excluded from matching (so as not to produce a false firing). To avoid over-matching on events that are too short, assume sufficiently specific events (at or above a certain length). This milestones-originated matching is read-only and report-only; it does not auto-rewrite the compass and does not create a new corrective classification. The implementation/deltas-originated Revisit detection and the milestones-originated matching coexist, and both are reported under the "Decision Rules update recommended" classification.

## Classification (5 kinds; multiple may apply)

- **aligned**: no drift. Consistent on all three axes (no correction needed; still attach the evidence of consistency).
- **intent reinforcement recommended**: the implementation is sound, but the `.intent/` side is thin or left implicit. Present update proposals that add to or clarify the deliverables (intent-tree.md / intent-compass.md / packet files).
- **corrective packet recommended**: the drift is on the implementation side and code changes are needed. Since improve does not change code, present the corrective work as a new packet proposal (an addition proposal of a new packet file (under active/) → export → the regular path of cc-sdd implementation).
- **Decision Rules update recommended**: a judgment gained in implementation conflicts with the existing Decision Rules, or a new decision criterion is needed. A Decision entry whose Revisit when conditions are detected as met is also reported for review under this classification. Follow the "Decision Rules change convention" below.
- **invariant violation detected**: the implementation violates the Invariants. Report it with top priority and present a corrective packet proposal or a review of the invariant itself (the user's call).

When multiple classifications apply, list them all, and organize the report per classification.

## Handling of evidence

- Sources of the implementation reality: the codebase (Read/Glob/Grep only; changes forbidden), the presence and placement of tests, the progress of `.kiro/specs/`, and `deltas` (promoted / pending; cross-read in split form). All of them are **read-only**.
- **Cross-read `deltas` in split form (CONTRACT "Split and archive convention for append-only records"; the same discipline as `intent-overview`'s `aggregate-sources.md`)**: read the split files `.intent/deltas/*.md` (source of truth if present, natural-key ascending) → read-fallback to the legacy single `.intent/deltas.md` (generated mirror) if absent; when both coexist, treat split as source of truth and do not double-count the mirror; archive is history and is not mixed into the active tally (read-only).
- Always attach evidence (file / relevant text) to the evaluation. Do not present an evaluation or correction proposal whose evidence cannot be shown.

## Decision Rules change convention (the same convention as writeback)

- A correction that changes the Decision Rules **adds a new entry** in the existing ADR form of intent-compass.md (**Context** / **Decision** / **Why** / **Alternatives considered** / **Consequences** / **Revisit when**) and annotates the superseded old entry as superseded with a reference to the succeeding entry.
- Move the old entry annotated as superseded, with its 6 fields intact (do not summarize), into the retired Decision Rule's **per-rule file** `.intent/compass-archive/<rule-slug>.md` (CONTRACT split & archive convention; `<rule-slug>` via the existing slug rule — no new numbering; re-superseding the same rule collects into the same file). Create the `compass-archive/` directory if absent. Active Decision Rules entries remain written directly inside the compass.
- Do not delete the old entry (history is preserved in compass-archive.md). Do not introduce custom fields (e.g., Supersedes).
- Old 4-field entries recorded before the introduction of the 6-field format (those without Alternatives considered / Revisit when) remain valid; do not treat the missing fields as an error, flag them, or rewrite them.

## Writeback guidance (division of roles as the safety net)

- When an unrecorded write-back learning is detected — no delta entry in `deltas` (cross-read in split form: the split files `.intent/deltas/*.md` (source of truth if present) → read-fallback to the legacy single `.intent/deltas.md` if absent; no double-count) corresponding to the current Source Packet (the latest export), or an unrecorded decision that surfaced in the implementation — do not write a delta yourself; prompt the user to run `/intent-writeback`.
- When declined items with the "on-hold" tag remain, only prompt for a re-proposal or a confirmed rejection. The final tag update (promote / confirm rejection / keep on hold) is the responsibility of `/intent-writeback`.
- improve does not write into the `deltas` record (in either split or legacy single-mirror form) (all recording and state updates of deltas are done by writeback).

## Validate catch-up guidance (a bridge to the conformance check)

- Only when that run's 5 classifications include `Decision Rules update recommended` or `invariant violation detected` (= a run where a reflection that could affect compass's Decision Rules / Invariants may arise), attach, alongside the writeback guidance, one sentence prompting the user to run `/intent-validate` (the cross-check of whether a compass update has been caught up by each packet = the check for conformance staleness). On a run that is `aligned` only, or that does not include the two classifications above, do not attach it (avoid over-prompting).
- improve itself does not make the conformance staleness judgment (the estimate of the right moment). The estimate of the right moment is the responsibility of intent-status, and improve only guides. The definitive diagnosis is made by `/intent-validate`.
- This guidance is limited to adding a guidance sentence and does not change the three-axis evaluation (completeness / correctness / coherence) or the 5-classification logic at all (the 5 classifications are unchanged).

## Recording to drift-log (drift-watch-linked)

Only when `drift-watch: on`, copy the drift detected on the coherence axis (invariant violation / anti-direction conflict) into `.intent/drift-log.md` as an after-the-fact record. When `off` / missing / invalid, do not record (byte-equivalent to current behavior; the off-guard is guaranteed on the SKILL.md side).

### Recording procedure

- **Reuse the drift the coherence axis detected (invariant violation / anti-direction conflict) rather than detecting it anew**, and append it one at a time to `.intent/drift-log.md` as a `stage: improve` entry. The values are:
  - `pattern: <the matched drift-patterns id | uncatalogued:<short name> | ->` (an id if identifiable, `uncatalogued:<short name>` for an actual drift outside the catalog, `-` if undeterminable)
  - `stage: improve`
  - `packet: <the attributable packet name | ->` (`-` if attribution cannot be determined)
  - `mechanism: compass-invariant` (when an Invariant is violated) or `compass-anti-direction` (when the Anti-direction is conflicted; choose by which compass element was breached)
  - `outcome: missed` (**a draft**: at improve time the drift has already happened and slipped through, so it is `missed` by default. The verdict is backed by the user's `user-verdict` being valid / false-alarm / unjudged)
  - `user-verdict: unjudged`
  - `recorded_at: <ISO 8601>`
  - `commit: <short hash | ->`
  - `note: <1-2 lines>` (what was violated / conflicted)
- If multiple drifts are detected, append one entry per drift.
- **Write in split form (CONTRACT "Split and archive convention for append-only records")**: drift-log is event-origin, so instead of appending to the end of a single `drift-log.md`, write one entry to a **per-date+slug split file** `drift-log/<date>-<slug>.md`. `<date>` is the recorded_at date; `<slug>` is derived from the pattern (the event) via the existing slug rule (`intent-packets/rules/packet-format.md`) — do not create new/sequential numbering. Because a different event touches a different file, tail collisions disappear by construction. Never rewrite or delete an existing entry (**append-only**).
- **Always write all 9 keys in the fixed order**: `pattern` → `stage` → `packet` → `mechanism` → `outcome` → `user-verdict` → `recorded_at` → `commit` → `note`. Do not write an entry that is missing even one of the 9 keys.
- **commit**: write the result of `git rev-parse --short HEAD`. When it cannot be obtained (non-repository, git CLI absent, etc.), use `-` (fail-open: keep recording).
- **When the `drift-log/` directory is absent**: create the directory, then write the split file. An old single `drift-log.md`, if still present, can be read side-by-side by readers (migration is handled by this slice's migration step). Follow the sample in the "Entry format" section of `.intent/drift-log.md` (`### drift-log entry`) for the entry format.

### Do not create a new correction class (separating recording from correction)

- This recording **does not create a new correction class**. The "Classification (5 kinds)" above (aligned / intent reinforcement recommended / corrective packet recommended / Decision Rules update recommended / invariant violation detected) is left entirely unchanged. It merely **also copies** the drift detected on the coherence axis **into the drift-log schema**, separately from the correction classification.
- **drift-watch records, improve corrects**. Recording (drift-log) and correction (the 5 classes) are separate responsibilities and are not mixed. Appending to drift-log neither substitutes for nor alters any correction.

## Improvement report (pattern × outcome cross-tabulation)

When `drift-watch: on`, improve also presents in its output an improvement report that cross-tabulates drift-log by `pattern × outcome`.

- **The aggregation keys are aligned to the type (pattern)**. The structure by which the user can later reconcile the "without group (past failures) / with group (the drift-watch-on period)" is established **by the type id and the `commit` column of drift-log only** (do not create an additional comparison mechanism).
- The report must always carry the following **honesty notes**:
  - Read `missed=0` as "a suspicion of missing records," not "evidence it worked" (keeping only the moments it worked in the tally is confirmation bias).
  - Frequent `false-positive` suggests the anti-direction is too broad.
- These notes are of the same intent as the honesty note in `.intent/drift-log.md` and guarantee a reading not biased toward the "worked" family (prevented / caught).

### Reading packet-scope-overflow as an "instrument that measures the first defense's efficacy" (DR9 second defense)

Entries with `mechanism: packet-scope-overflow` (the second-defense detection drift-watch records when, after export, the user issues an implementation instruction that exceeds the target packet's `## Scope`) are read as an instrument that measures **whether the first defense (the convention-doc rule "go back to intent on scope overflow"—recall only, no enforcement) is actually working**. They ride the same pattern × outcome cross-tally, with one added reading discipline:

- `outcome: caught` (the user heeded the warning and returned to intent via `/intent-packets` → re-export) = a moment when the first and second defenses worked.
- `outcome: missed` (they ignored the warning and pushed through with cc-sdd) = a moment when the first defense's recall did not work = the **denominator of the intent-shift rate (the rate of scope creep)**. Only as these accumulate can "how much the first defense is failing" be observed (the chicken-and-egg: the mechanism that measures the first defense's efficacy lives inside the second defense itself).
- `outcome: false-positive` (it was actually a valid scope extension) = a sign the check may be over-sensitive.
- **Do not bring in numeric scoring or threshold solvers.** Do not assert "more caught means the first defense is working"; carry over the honesty notes as-is (`missed=0` = suspected missing record, frequent `false-positive` = over-sensitive check) and keep it to candidate presentation. Align the tally key to the type (pattern = `scope-creep` or `uncatalogued:scope-overflow`); build no extra comparison machinery.

## Role boundary (the three-way split of recording, correction, and writeback)

- **drift-watch does not hook writeback** (Requirement R8). So as not to muddy writeback's single responsibility — the two-stage promotion of deltas — recording to drift-log does not interfere with the writeback path at all. The behavior of "Writeback guidance" above is unchanged.
- Recording (drift-log), correction (the 5 classes), and writeback (the two-stage promotion of deltas) are **three separate responsibilities**. Do not mix the three.

## Context cost cues (tied to drift-watch)

Alongside the coherence-axis evaluation, run a matching that makes you **notice** whether the way you are doing the post-implementation realignment is eating context (tokens). This is a **separate catalog** from drift-patterns (types of intent drift); only the symptom differs — it is "a situation that eats context" rather than "intent drift". This is awareness, not a norm, and because it differs in nature from the "recording to drift-log" and "improvement report (pattern×outcome tally)" above, it is **kept as a separate procedure**.

- **Only when `drift-watch: on`** do this matching (do nothing when off / unset / invalid). When `.intent/context-cost-cues.md` is absent, skip the matching and announce that (do not stop).
- **This is not recorded to any log.** Unlike the coherence-deviation detection above (which appends to `drift-log.md` and tallies pattern×outcome), context cost cues are **not appended to `drift-log.md` or to any other log**. Reason: consumption cannot be measured and its outcome cannot be evaluated, so mixing it into the log would pollute the drift-log tally with guesses; furthermore, what eats context legitimately differs per person, so recording it would intrude on privacy. **Do not apply the "append procedure for drift-log" or the "improvement-report tally" above to this matching, and do not include it in the pattern×outcome tally.**
- **The 5 classes are unchanged**: this cue does not alter the existing 5 classes (aligned / strengthen intent / corrective packet / update Decision Rules / invariant violation) at all. It is presented as advice that leaves no log, separate from the corrective classes.

### Procedure

1. **Read context-cost-cues.md**
   - Read `.intent/context-cost-cues.md` and obtain all types (seed + every type the user has grown). If absent, skip and announce (do not stop).

2. **Match each type's symptom against how the realignment is proceeding**
   - Check each type's `symptom` against the post-implementation realignment (the path/subject of reading code or done work). The `symptom` is a weak cue; if the fit is weak, stay silent (lean toward staying silent over false positives — to keep the awareness feature trustworthy).
   - Use only the subject for matching. Do not read token consumption, git diffs, or runtime metrics.

3. **When a type matches (present the cue; do not write to any log)**
   - Name it to the user in a non-directive, noticing way. Example: "The way this realignment is proceeding may match `<id>` — this might be eating context."
   - Add the type's "if this is unintentional" light alternative (thin entry point / JIT pull / limited input) as an **optional choice**. Example: "If this is unintentional, there is also <light alternative> (the judgment is yours)."
   - **Do not correct or instruct.** Phrase it as a cue rather than an imperative or a verdict. Installing many skills or loading full content can be a legitimate high-cost choice, so do not dismiss a context-eating choice as unnecessary. Leave the judgment to the user.
   - **Do not append to any log** (do not reuse the coherence-deviation append procedure or tally).

4. **When no type matches**
   - Name nothing. **Write nothing to any log** (do not record a miss either — this matching has no log at all).
