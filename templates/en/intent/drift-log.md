# Drift Log

> The hooks of `/intent-discover`, `/intent-export-cc-sdd`, and `/intent-improve` append one entry per detected drift. The only writers are these three hooks; the readers are `/intent-status` (a light summary) and `/intent-improve` (a `pattern × outcome` cross-tabulation). When `drift-watch: off` (the default), nobody writes here.
>
> **How to read this**: read `missed=0` as "a suspicion of missing records," not as "evidence it worked." Keeping only the moments it worked (prevented / caught) in the tally is confirmation bias. This file is designed on the premise that the moments it did not work (missed / false-positive / not-applicable) are recorded just as evenly.

## How this file operates

- **append-only**: entries are appended only. Never rewrite or delete a past entry (to avoid creating an asymmetry in the world-line anchor).
- **outcome is a draft / user-verdict is the verdict**: `outcome` is estimated and drafted by drift-watch. `user-verdict` is confirmed by the user (the same separation as canonical / inferred in the Intent Tree). Even if the user has not judged it, it stays `unjudged` and remains a target for recording and tallying.
- **world-line anchor (Layer 1)**: each entry carries `recorded_at` (the time it was recorded) and `commit` (the world-line it was recorded on) from the start. Adding them to past entries after the fact creates an asymmetry, so they are recorded from the start. Immutability is delegated to git, and this file is kept as a "projection of the present."
- **no validity period**: because drift is an event, not a state, it has no valid-time fields such as `valid_until`.

## Entry format

Each entry carries the following 9 keys as a fixed-order Markdown list. The sample below, wrapped in `<!-- -->` (an HTML comment), is a fill-in template and is not included in real entries.

<!--
### drift-log entry
- pattern: <a drift-patterns id | uncatalogued:<short name>>
- stage: <discover | export | improve>
- packet: <packet name | ->
- mechanism: <compass-anti-direction | compass-invariant | pattern-catalog | packet-scope-overflow | none>
- outcome: <prevented | caught | missed | false-positive | not-applicable>
- user-verdict: <valid | false-alarm | unjudged>
- recorded_at: <ISO 8601>          # transaction time (the time it was recorded)
- commit: <short hash | ->         # world-line anchor (Layer 1). - when unavailable
- note: <1-2 lines>
-->

## The 5 outcome values (structural avoidance of confirmation bias)

The "worked" family and the "did not work" family are enumerated symmetrically. We do not physically create a "field that only records effective."

| Worked | Did not work |
|---|---|
| `prevented` (prevention succeeded at discover) | `missed` (could not prevent it, it got through) |
| `caught` (capture succeeded at export) | `false-positive` (it was a false alarm) |
| | `not-applicable` (not present in the terrain; a swing and a miss) |

Tallying assumes a `pattern × outcome` cross-tabulation. Read `missed=0` as "a suspicion of missing records," not as "it worked."
