# Omission recap and promotion guidance (summarizes the scope read · guides promotion by manual copy)

The source of truth by which, after the `intent-from-code` skill finishes extraction (extract-code-intent), it summarizes **what was read · what could be extracted · what fell silent · what could not be read** to present to the user, and promotes approved candidates by manual copy. SKILL.md holds only the procedure and reporting format; "how to summarize the scope read, how to retain unapproved candidates, and how to guide the promotion of approved candidates" refers to this rule. This rule defines no new extraction / category, but **summarizes as-is** the candidates extract-code-intent raised and the scope read-scope fixed. Observation is limited to Read / Glob / Grep, and it never modifies target code, canonical `.intent/*.md`, or the existing documents used as input (writes are only under `.intent/code-ingest/`).

## Why a recap is needed (to avoid the "silence of silence")

State this rule's purpose at the head. Whereas the neighboring extract-code-intent "raises each candidate," this rule bears the role of "**summarizing as a list the scope read itself and the areas that could not be filled**."

- Merely lining up the candidates that could be extracted does not let the user see **how far the AI read · which categories it checked against**. When the frame of the scope read and the categories inspected is invisible, the user prematurely concludes "the intent of the code is now covered" and stops their own exploration. This is the "**silence of silence**" (the omission error / automation bias in which the AI hints at completeness and the human stops exploring).
- To avoid this, the recap **explicitly presents the frame of the scope read and the categories checked**. It lists "which scope was read, which categories (purpose · outcomes · capabilities · design intent · invariants · gaps of silence) were checked against, and of those which were filled · which fell silent · where could not be read," showing the user the very outline of the extraction.
- Beyond silence, also state explicitly **the areas that could not be read** (out of scope · default-excluded · areas where intent could not be raised from observation). Do not fill in by guessing; leave absence as absence. Not claiming completeness is itself the recap's responsibility.

## What the recap summarizes

Receiving the output of extract-code-intent and read-scope, list the following in an observable form. In all cases draw as-is on the candidates already raised · the scope already fixed, and do not re-extract / redefine.

1. **The scope read (what was read)** — presents the target scope (directory · module) read-scope fixed and the areas not read under default exclusion (dependencies · generated artifacts), showing the outline of the extraction.
2. **The categories that could be extracted (items where intent candidates could be raised from code)** — shows the categories where candidates could be raised, making observable that the recap did not "pick up only silence."
3. **The categories that fell silent (places the code demonstrates but where no description of intent exists and could not be filled)** — lists the places extract-code-intent raised as "gaps of silence" and the categories where no candidate arose at all. Also state, in a distinguishable form, the candidates that could not be sorted between intentional and accidental and were sent to Open Questions.
4. **The areas that could not be read (absence)** — state explicitly as absence, without filling in by guessing, the out-of-scope · default-excluded · areas where intent could not be raised from observation and judgment was held.

All candidates are entirely inferred (guessed = Assumptions) and remain provisional until the user's approval (INV65). The recap is a presentation to prompt reconfirmation, not a confirmation.

## Promotion is a manual copy (holds no machine handoff)

This is the crux of this feature's boundary, and unless stated it generates hidden shared ownership (overlapping ownership).

- The code-ingest output is **derived · regenerable · Git-untracked** and is not the canonical source of truth. code-ingest only writes approved candidates out to the derived area in a "**form easy to transcribe**."
- Promotion into canonical is done by a **manual copy in which the user carries the candidates they approved by hand into the discover / compass dialogue**. intent-from-code **does not call (auto-launch)** discover / compass, and discover / compass do **not auto-load** code-ingest's output either. No automatic linkage (machine handoff) exists between the two.
- Therefore the recap writes, at the **end** of the staging output, the **guidance** "please transcribe the candidates you approved into the discover / compass dialogue yourself." The recap itself never performs promotion. By writing out at a heading · granularity the user can copy 1:1 into the transcription destination (intent-tree's Assumptions / compass's blocks), it makes manual transcription easy (keeping the promotion seam manual).
- Through this separation, it does not create a dual source of truth of derived (code-ingest) and canonical (intent-tree / compass), avoiding overlapping ownership. Approval is limited to the human's explicit act (holds no auto-promotion · INV65).

## The skeleton of the promotion guidance written at the end of staging

At the end of the output, place the following as a procedure a human can read and execute (without breaking the premise of holding no machine handoff).

- That this output is entirely guesses (Assumptions) and does not enter canonical until approved.
- That the user promotes the candidates they approved by **carrying them by hand into the `/intent-discover` / `/intent-compass` dialogue**, toward the transcription destination attached to the heading (e.g. purpose candidate → intent-tree L0 Assumptions, invariant candidate → compass Invariants).
- That this skill does not auto-launch discover / compass, and discover / compass do not auto-load this output either (manual copy is the only path of promotion).
- That candidates not approved are not discarded but remain as Assumptions in staging (`.intent/code-ingest/`) for the next reconfirmation (they are rebuilt by full replacement on re-run).

## Handling of the output

- All output is derived · regenerable and is not the source of truth. Do not write it back to canonical intent-tree / compass (promotion is a manual copy after approval).
- This rule does not modify the extraction source of truth (extract-code-intent.md) or the scope-governance source of truth (read-scope.md) at all; it only summarizes their output. It does not itself perform extraction · scope governance · masking of sensitive info (leaves these to each source of truth).
