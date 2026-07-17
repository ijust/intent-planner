# Probing screen design before implementation, with a draft

For cases that include user-facing screens (UI), this procedure probes the design of the screens themselves — each screen's purpose, information priority, key states, navigation between screens, layout, and visual direction — in dialogue before implementation, and produces a derived draft with inference markers. It is kept separate from reviewing the whole service experience (the experience-design perspective in `rules/role-perspective-review.md`) and handles per-screen judgments only. After the draft is settled, and only when the user wants it, the procedure continues to generating a viewable, clickable mock and revising it in a feedback loop (see "Generating the mock and the feedback loop" below).

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

## Question strategy (how to pick and order the questions)

When turning the checkpoints above into actual questions, pick them with the following strategy. This designs how questions are **chosen**; the amount of questioning and its guardrails — few at a time, deferrable, never interrogative — stay unchanged.

- **Ask the unsettled points that sway the outcome most**: rather than walking through every checkpoint top to bottom, prioritize the unsettled points whose answer would change the draft or the mock the most. Experts prefer an AI that proactively asks clarifying questions over one that passively waits for feedback — yet good questions do not arise naturally, hence this explicit strategy (the Sketch2Code benchmark, 2024; a finding in a web-design context).
- **Settle meaning top-down**: confirm in the order overall direction (theme, tone, audience) → screen structure (layout, information priority) → individual parts (colors, component shapes). Details depend on the higher-level decisions, so asking in reverse order causes rework (design semantics for UI generation are hierarchical and interdependent: Bridging Gulfs in UI Generation, 2026).
- **Ask in an answerable form**: pair options with free-form answers, and where the user is likely to get stuck, add examples and starter drafts marked as inferences (carrying the existing elicit-and-propose posture into this lane).

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
- This section produces a Markdown draft only. Do not automatically generate images, a design system, or a brand guide. A viewable, clickable mock is generated only when the user wants it, in "Generating the mock and the feedback loop" below (never generated unasked).

## Recording the draft reference (wiring into the existing carrier)

- Record the generated draft's path as a reference in the intent-tree's "Screen Rough Reference" (the value keeps the existing form, a path; create no new section and no new source of truth). This lets the spec generation (the screens-and-touchpoints view of `/intent-to-spec`) and the exports reach this draft through the existing route unchanged.
- If a screen-rough path or link is already recorded, do not replace it; record the draft reference alongside it.

## Generating the mock and the feedback loop (after the draft is settled; only when wanted)

Once the draft has been generated and confirmed, ask **one question** to confirm whether to also build a viewable, clickable mock (do not force an answer; if declined, add nothing and continue the existing flow — silence is not a failure). The default format is **a single self-contained HTML file** (viewable just by opening it in a browser), and this one question only presents that default. Choose another format that fits the case's environment only when the user explicitly asks for it — do not fix the format to web/HTML.

- **Generation**: When adopted, write a mock that reflects the draft's content (each screen's purpose, information priority, main action, key states, and visual direction) to `.intent/nl-spec/screen-design-mock.html` (with a fitting extension for another format). Only when a mock for a **different case** already exists at that path and must be kept, write to `.intent/nl-spec/screen-design-mock-<case-slug>.html`. A rerun for the same case and each revision round fully replaces the same path and never appends duplicates (same shape as the draft).
- **Faithful to the draft**: The mock reflects what the dialogue settled and adds no new inference as if it were fact. Where the visual direction is inferred or unverified, render it with restraint (closer to a wireframe) and keep confirmed / inferred / unverified markers as notes inside the mock.
- **Provenance labels**: At the top, state inferred, derived, regenerable, and not a source of truth in an HTML comment (or the format's comment syntax).
- **Self-contained**: The default HTML mock depends on no external resources (CDNs, external fonts, external images, external APIs) and renders just by opening it locally.
- **Platform representation**: For non-web cases such as mobile apps, present the screens inside a device-frame viewport. Do not fix the mock format, device frame, or aspect ratio on web/desktop assumptions.
- **Switching key states**: Beyond the normal look, let the requester switch the mock between the key states settled in the draft (empty, loading, failure, and so on) that they want to see (do not mandate covering every state).
- **Parallel theme proposals (only while the direction is unsettled)**: when the visual direction reads as not yet settled in the requester's mind, do not start with a single proposal — lay out 2–3 substantively different theme proposals side by side, evenly and with grounds, switchable inside the mock for comparison (never pad the count with rewordings of the same proposal; if there is a favorite, say so explicitly). Place no mechanical condition such as first-time-only, every-time, or a run cap; use it as many times as needed while the direction reads as unsettled. Once the requester picks one, iterate on that single proposal from then on (for requests with a clear direction, start with a single proposal as before; exploration research finds multiple proposals effective at the ideation stage and single-proposal iteration at the refinement stage: DreamSketch, UIST 2017 / DesignTrace, CHI 2026).
- **The feedback loop**: After generating, have the user open and check the mock, then apply their revision requests by fully replacing the same mock. The loop ends **only on the requester's agreement or an explicit stop** — it has no mechanical round limit, and the AI never cuts it off by declaring on its own that the user must be satisfied. Questions in the loop inherit the INV58 guardrails (few at a time; "check later / unknown / not applicable" always available).
- **Recording the reference**: Record the mock's path alongside the draft in the intent-tree's "Screen Rough Reference" (do not replace existing references; create no new section). The spec generation (`/intent-to-spec`) and the exports reach the mock through the existing route unchanged.
- **No leaking into implementation**: The mock is a scratch artifact confined to `.intent/nl-spec/`; never write it into the app's source tree. Do not start building a walking skeleton (a minimal implementation that runs end to end) or production code here, and do not promise that the mock's code is "ready to use as-is" in the real implementation (implementation belongs to the downstream stage).

## The critique gate (self-check before showing the mock)

Before presenting a generated or updated mock, the AI self-checks it against the criteria below — established design principles put into checkable words (the critique gate: a gate on the AI's own output). The judgment is made by the AI reading the mock for meaning; do not introduce scoring scripts, mechanical scoring, or aggregate scores. The only exception: checks whose formula is defined by a public standard (such as the WCAG contrast ratio) may use that formula's numeric confirmation as an aid (an aid to, never a replacement for, the meaning-based judgment).

- **Three stages**: check in the order perception (what is on the screen) → comprehension (what each element means and does) → judgment (which criterion it falls short of, and how) (stagewise critique: Criticmate, CHI 2026).
- **Criteria in words (each with its source)**:
  - Typography: body line length of 50–75 characters (about 40 for Japanese), line height 1.5 times the font size, paragraph spacing 2em (Baymard Institute's readability guidelines).
  - Visual hierarchy: use 2–3 font sizes to signal the information hierarchy, and let the eye enter from what should be seen first (Nielsen Norman Group's principles of visual design).
  - Grouping: place related elements close together and unrelated ones apart; give the same role the same look (the Gestalt principles of proximity and similarity).
  - Contrast: body text at 4.5:1 or higher against its background, large text at 3:1 or higher (WCAG 2.1 AA; the standard's calculation may assist).
  - Consistency: pick colors, whitespace, and font sizes from a system (design tokens), not ad hoc per spot (the design-tokens-consistency starter).
  - Density and whitespace: keep the number of elements down; do not raise screen density by cramming (a verbal rendering of the screen-design metrics of Ngo, Teo, and Byrne, 2003).
  - Key states: the empty, loading, and failure looks are provided (a re-check of the key-state switching above).
- **Handling shortfalls**: fix what can be fixed before presenting. Never hide what cannot be fixed — present the mock together with which criterion it falls short of, why, and the source. Do not hold back the presentation to regenerate repeatedly; whether to accept or have it fixed is the requester's decision.
- **Critique record**: keep a short record — criteria applied, judgments, what was fixed, and remaining shortfalls — right after the provenance comment at the top of the mock, and mention it briefly when presenting. Write each point in the order criterion → gap → remedy (Sadler 1989, formative feedback).
- **The requester's preference wins**: when a preference the requester stated conflicts with a criterion, add a sourced note once, then respect that preference in later generations. The critique gate never overrides the requester's judgment (satisfaction belongs to the requester, as with ending the loop above).

## Write boundary

- Write only the derived artifacts (the draft and the mock) under `.intent/nl-spec/` and the reference in the intent-tree's "Screen Rough Reference". Do not change the Intent Compass, any packet, or the mode records. The derived draft never substitutes for canonical intent (nor does the mock).
- If the write fails, report the target path. If the write fails, do not roll back any source of truth or the decision ledger.
