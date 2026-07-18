# omission recap Procedure (summarize what was checked and what went unfilled, and prompt re-confirmation)

The single source of truth by which the `intent-from-spec` skill, after finishing extraction (extract-intent), readout (gap-readout), and qualitative sorting (load-bearing), summarizes **what was checked (presenting the frame) and what went unfilled** for the user and prompts re-confirmation. SKILL.md holds only the procedure and report format; "how to summarize the checked frame, how to hold unapproved items, and how to guide promotion of approved items" is governed by this rule. This rule defines no new checks or slots; it **summarizes as-is** the frame of the existing ID system (`validate-checks.md` / `decision-slots.md`) that gap-readout bound to. Observation is limited to Read / Glob / Grep, and it does not modify the input specification, the canonical `.intent/*.md`, or the rulers' sources at all (writes go only under `.intent/spec-ingest/`).

## Why a recap is needed (avoid the "silence of silence")

State this rule's purpose at the top. Whereas the adjacent gap-readout "shows each gap," this rule bears the role of "**summarizing, as a list, the checked frame itself and the places that went unfilled.**"

- Merely showing each gap individually does not let the user see **how far the AI checked**. When the checked frame itself is invisible, the user jumps to the conclusion that "it is already covered" and stops their own search. This is the "**silence of silence**" (an error of omission / automation bias in which the human stops searching because the AI implied completeness).
- To avoid this, the recap **explicitly presents the frame of the rulers that were checked**. It lists "which rulers were read (the check catalog of validate-checks, the 8 slots of decision-slots), and of those which were filled, which were silent, and which could not be checked," and shows the very outline of the inspection to the user.
- Beyond the silences, it also makes explicit the **places that could not be checked** (no corresponding ID exists in the catalog; the ruler does not hold that viewpoint). It does not fill them in by guessing; it leaves absence as absence. Not claiming coverage is itself a responsibility of the recap.

## What the recap summarizes

Receiving the output of extract-intent, gap-readout, and load-bearing, it lists the following in an observable form. In every case it cites as-is the existing IDs that gap-readout bound to, and does not re-derive or redefine them.

1. **The checked frame (what was read)** — present the rulers read (the check catalog of `validate-checks.md`, the common-core 8 slots of `decision-slots.md`) and show the outline of the inspection.
2. **The places that were filled (items the specification answered)** — show the frames the specification answered, making it observable that the recap did not "pick up only silences."
3. **The places that went unfilled (silences)** — list the gaps gap-readout enumerated, together with the bound IDs. Record the qualitative sorting of load-bearing (high / low) in a distinguishable form alongside.
4. **The places that could not be checked (absence)** — make explicit, without filling in by guessing, the places where there is no bound ID and judgment was withheld, as absence.

## Approval gate (only approved items are promoted to canonical)

The recap is a presentation to prompt re-confirmation, not a finalization. Reflecting anything into canonical requires the user's explicit approval.

- Only when the user **confirms and approves** an item is that item made a target for placement onto the canonical intent structure (the intent-tree / compass Invariants, Anti-direction, Decision Rules) (Req 4.2).
- Items that have not gone through the user's confirmation are **not automatically reflected** into canonical (Req 4.3). At the moment the recap presents them, every item is still a hypothesis.
- Items that were not approved are **not discarded but held as Assumptions** (Req 4.4). This is a hold, not a rejection, and they remain in the derived area (`.intent/spec-ingest/`) for re-confirmation on later occasions.

## Promotion is a human copy (it holds no machine handoff)

This is the crux of this feature's boundary, and not stating it would create hidden shared ownership.

- spec-ingest's output is **derived and regenerable**, not the canonical source of truth. spec-ingest merely writes out approved candidates into the derived area in a "**transcribable form**."
- Promotion to canonical is done by a **human copy in which the user carries approved items by hand into the discover / compass dialogue**. spec-ingest **does not call** discover / compass, and discover / compass **do not automatically read** spec-ingest's output. No automatic linkage (machine handoff) exists between them.
- Therefore the recap presents a **guide**: "please transcribe the items you approved, yourself, into the discover / compass dialogue." The recap itself never performs promotion. By writing out with headings and granularity that can be copied 1:1 into the transcription destination (the Assumptions of the intent-tree / each block of the compass), it makes the human transcription easy (keeping the seam of promotion in human hands).
- Through this separation, no double source of truth between the derived (spec-ingest) and the canonical (intent-tree / compass) is created, and the overlap of ownership (hidden shared ownership) is avoided.

## Handling of output

- All outputs are derived, regenerable, and not the source of truth. Nothing is written back to the canonical intent-tree / compass (promotion is by hand, after approval).
- This rule does not modify the rulers' sources of truth (`validate-checks.md` / `decision-slots.md`) at all; it merely summarizes the output of gap-readout and load-bearing. It does not run checks or slot validation itself.
