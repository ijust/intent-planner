# Walking Skeleton Check

The procedure for confirming whether the top-priority packet spans the primary user journey end to end (i.e., is a walking skeleton). Used at the priority presentation (Step 4) of `/intent-packets`, only when designer-questions in `.intent/mode.md` is `on`. All dialogue is conducted as confirmation with the user (the means of confirmation follows the SKILL.md conventions).

## Applicability

- Read `designer-questions` in `.intent/mode.md`. Apply this procedure to the Step 4 priority presentation only when it is `on`.
- **When designer-questions is not recorded as on (off or unrecorded), do not apply this procedure and do not change the existing Step 4 behavior** (notification for the unrecorded case follows the `.intent/mode.md` conventions).
- **Do not reference purpose.**

## Procedure

1. **E2E verdict**
   - Read the top-priority packet's Scope and Expected Behavior, and judge whether it spans the primary user journey end to end (input → processing → observable output).
   - Ground the verdict in the packet's descriptions. A packet that stops at an intermediate layer (processing only, UI only, etc.) is judged "does not span".
   - **Read "the primary user journey" as replacing the work the user actually does today.** A skeleton that runs end to end through the technical layers yet replaces none of the user's work does not count as "spans". Read the Current Drift in the intent tree (what is manual or roundabout today) and ground the verdict in **which of the user's manual steps disappear once this skeleton is complete**.
     - Example (fictional): even if the path "fill in every field, then produce the output" runs end to end technically, the user's manual work (pasting materials into another tool and retyping them) stays exactly as it was — no replacement happened. Only once "drop in the material and a draft comes out" runs end to end does that manual step disappear.
     - **In a case where no Current Drift is written in the tree, skip this criterion and apply only the traditional spanning verdict** (do not fill in what is not written by guesswork; state in the rationale that it was skipped).
     - Where "replacing the user's work" is hard to define — non-application cases (documents, research, tooling) — fall back to the traditional spanning verdict and do not assert.

2. **Present the verdict and rationale, and confirm**
   - Present the verdict (spans end-to-end / does not span) and its rationale to the user, and confirm.
   - State the rationale in plain language: describe what this packet (the unit of work handed to cc-sdd) builds and what runs end to end after completion, so the rationale is readable without knowing the field names.
   - **State alongside it the Current Drift this removes**: say in one line which of the user's manual steps disappear once this skeleton is complete. **For a skeleton that removes none of the most important Current Drift, add that as a warning** ("this runs end to end technically, but none of the user's manual work is replaced"). It is a warning, not a stop.

3. **Propose remedies (when judged "does not span", or when it removes none of the most important Current Drift)**
   - Propose how to make the first packet a walking skeleton, in one of the following forms:
     - **Reordering proposal**: reorder the priorities so that a packet spanning E2E comes first.
     - **Merge proposal**: merge the Scopes of multiple packets to create a packet that spans E2E.
   - If the user intentionally defers the walking-skeleton conversion, accept that as a choice (do not silently drop it — record it; see step 4). **Knowingly choosing a skeleton that removes none of the most important Current Drift is likewise accepted as a reasoned choice** (do not create a new remedy frame; ride the existing deferral record).

4. **Record the confirmation result**
   - Record in the "Walking Skeleton" section of `.intent/packets/plan.md`: **Top-priority packet** (packet name) / **E2E verdict** (spans end-to-end / does not span) / **Current Drift removed** (the user's manual work that disappears once this skeleton is complete; state so if the criterion was skipped) / **Confirmation result** (what the user confirmed).
   - For an intentional deferral, also record it together with the reason under the Deferred section.
   - **Non-destructive append for older scaffolds**: if `plan.md` lacks a "Walking Skeleton" section, append the section while preserving the existing recorded content, then record. **Read an older record that has no "Current Drift removed" as unrecorded, and do not warn retroactively** (backward compatible).

5. **Point to an intermediate deliverable that can be shown early (so progress is not invisible until the very end)**
   - This point, where the packets phase has settled, is **the first chance for the user to see progress before implementation**. Before entering implementation, in one or two lines point to showing one of the following depending on the case type (create no new deliverable — just point to an existing vessel):
     - **App / a case where something runnable can be built**: once the first skeleton (walking skeleton) runs, show it to the user at that point.
     - **Non-app / planning-stage cases** (documents, research, tooling, etc.): show the Intent Tree overview (`.intent/overview/`, generated by `/intent-overview`) or the plan (`.intent/packets/plan.md`).
   - This is **a pointer, not a mandate**. If the user says "not now", that is fine. Do not stack multiple nudges at the same output position as the existing "next move" / "handoff nudge" (keep it to one; avoid noise).
   - **Once you have shown it (or promised to show it), record that fact in one line in the "Walking Skeleton" section of `plan.md`**: `Early preview: <what / when>` (e.g., `Early preview: show the preview once the first skeleton runs (2026-01-01)`). Create no new file or section — just add one line to the existing Walking Skeleton section. The export gate (`intent-export-cc-sdd`'s preflight) reads whether this record is present and warns once if it is absent (they form a pair).
   - **Do not fire this procedure when designer-questions is off, or when `plan.md` has no Walking Skeleton section** (follow the applicability conditions; do not force pointing/recording where the vessel is absent = backward compatible).

## Discipline

- The confirmation result is referenced by intent-validate. Do not omit the record.
- Do not change code.
