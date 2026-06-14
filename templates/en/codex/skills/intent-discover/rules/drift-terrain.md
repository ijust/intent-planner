# Drift Terrain

The symptom × in-progress Intent Tree matching logic used at Step 3.5 of `/intent-discover`. Runs only when `drift-watch: on` (off / missing / invalid does nothing). The goal is to name, before work starts, "this subject is easy-to-drift terrain," and to make the anti-direction / invariant get written first, before you drift all the way out.

## The only basis for diagnosis is the type catalog

- **The only basis for diagnosis is the type catalog in `.intent/drift-patterns.md`.** At the discover stage there is no compass and no packet yet, so the type catalog is the only material to match against (an essential constraint). Matching based on the compass's Invariant / Anti-direction is the job of the export stage (a different drift-watch hook) and is not done here.
- Terrain diagnosis **assumes false positives**. "Matching" a type is not a confirmation of drift. Name it early on a weak cue, and record swings-and-misses too.

## Procedure

1. **Read drift-patterns.md**
   - Read `.intent/drift-patterns.md` and take all types (the seeds plus every type the user has grown).
   - **When absent**: skip terrain diagnosis and notify the user accordingly (do not stop / do not write to drift-log). Do not run the remaining steps.

2. **Match each type's symptom against the in-progress Intent Tree**
   - Hold each type's `symptom` against the **subject (topic) and L0–L3** (purpose / outcome / capability / behavior & design intent) of the Intent Tree you are currently building.
   - `symptom` is a **weak cue**, not a strong decision condition meaning "if it matches it is definitely drift." Assume false positives; pick it up if it looks suspicious.

3. **When a type matches**
   - **Name it explicitly** to the user. Example: "This subject is terrain where you can easily hit `<id>`."
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
     - `note: <1-2 lines>` (that no type was present in the terrain)

## The append procedure for drift-log

- **append-only**: never rewrite or delete an existing entry. Always just append one entry at the end of the file.
- **Always write all 9 keys in the fixed order**: `pattern` → `stage` → `packet` → `mechanism` → `outcome` → `user-verdict` → `recorded_at` → `commit` → `note`. Do not write an entry that is missing even one of the 9 keys.
- **recorded_at**: write the time of recording in ISO 8601 (transaction time).
- **commit**: write the result of `git rev-parse --short HEAD`. When it cannot be obtained (non-repository, git CLI absent, etc.), use `-` (fail-open: keep recording).
- **When drift-log.md is absent**: create it anew, header and all (the operating notes and entry format below `# Drift Log`), then append.
- Follow the sample in the "Entry format" section of `.intent/drift-log.md` (`### drift-log entry`) for the entry format.
