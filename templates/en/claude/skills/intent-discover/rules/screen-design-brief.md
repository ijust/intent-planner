# Probing screen design before implementation, with a draft

For cases that include user-facing screens (UI), this procedure probes the design of the screens themselves — each screen's purpose, information priority, key states, navigation between screens, layout, and visual direction — in dialogue before implementation, and produces a derived draft with inference markers. It is kept separate from reviewing the whole service experience (the experience-design perspective in `rules/role-perspective-review.md`) and handles per-screen judgments only.

## Firing conditions (only when all are met)

- The case includes user-facing screens (UI).
- designer-questions is on.
- The question depth (question-depth) is deep, **or** the role lens adopted "the perspective that designs the screens" (an explicit choice to examine the screens).

For cases with no applicable UI, cases where designer-questions is off, and standard cases where screen examination was not chosen, add no question and no draft and continue the existing flow. Silence is not a failure (the default experience does not change).

## What to confirm (per main screen)

For each main screen, turn the following into confirmation points. Ask few at a time (at most 4 questions per batch), let every batch choose "check later / unknown / not applicable", and do not force an answer (inherit the INV58 guardrails; not an interrogation).

- The screen's purpose and the next action the user takes on that screen.
- Information priority (what should catch the eye first, what comes second and later, what need not be shown).
- Key states: normal, empty (no data), loading, failure, insufficient permission, and completed.
- Navigation between screens (where the user comes from and where they go next).
- Layout and information density, the flow of the eye, mobile support, and accessibility.
- Visual direction, references to draw on (existing screens, other services, reference images), and expressions to avoid.

Do not end the confirmation on vague words such as "simple" or "modern" alone. Open up what the word points to — information density, whitespace, the role of color, the order of emphasis, and expressions to avoid (DR95: ask with concrete examples a first-time user can choose from).

## Existing material takes precedence

- If the "Screen Rough Reference" in the intent-tree already holds material (a rough, an existing screen, a link), read it first and add no inference that contradicts the material. When you notice a contradiction, let the existing material win and surface the difference explicitly.
- If the referenced material cannot be read (a broken link or a missing path), mark it "reference unverified" and do not substitute inferred content for it.

## Read-only matching against the frontend starters

- If `.intent/constraint-starters/code-frontend.md` exists, match against it read-only (accessibility, mobile-first, non-happy-path state design, design tokens, system-status visibility, and the like). Mention only strong fits briefly as candidates; the user decides adoption.
- Once a decision is made, append one row to `constraint-ledger.md` in the inherited issue directory using the existing row format (`| starter id | host | decision | one-line context | date |`; the host is `discover`). Add no columns. Do not resurface declined starters.
- If the catalog or the recording container does not exist, skip the matching or recording and do not stop. If nothing fits, proceed silently (the matching is never a gate on the process).

## Generating the derived draft

- From the answers, write a Markdown screen-design draft to `.intent/nl-spec/screen-design-brief.md`. Only when a draft for a **different case** already exists at that path and must be kept, write to `.intent/nl-spec/screen-design-brief-<case-slug>.md` (derived deterministically from the case name). A rerun for the same case fully replaces the same path and never appends duplicates.
- In the header of the draft, visibly state inferred, derived, regenerable, and not a source of truth.
- For each main screen, record the purpose, information priority, main action, key states, and visual direction, each marked as **confirmed / inferred / unverified**. What the user answered is confirmed; what was derived from evidence but not yet approved is inferred; what has no evidence is unverified.
- When there is nothing to draw on, keep the visual direction as multiple inferred candidates or as unverified. Do not fix trendy looks or brand expressions as if they were facts.
- Produce a Markdown draft only. Do not automatically generate images, finished mockups, a design system, or a brand guide.

## Recording the draft reference (wiring into the existing carrier)

- Record the generated draft's path as a reference in the intent-tree's "Screen Rough Reference" (the value keeps the existing form, a path; create no new section and no new source of truth). This lets the spec generation (the screens-and-touchpoints view of `/intent-to-spec`) and the exports reach this draft through the existing route unchanged.
- If a screen-rough path or link is already recorded, do not replace it; record the draft reference alongside it.

## Write boundary

- Write only the derived draft under `.intent/nl-spec/` and the reference in the intent-tree's "Screen Rough Reference". Do not change the Intent Compass, any packet, or the mode records. The derived draft never substitutes for canonical intent.
- If the write fails, report the target path. If the write fails, do not roll back any source of truth or the decision ledger.
