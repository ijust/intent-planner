# Constraint Starters — code / frontend & cross-cutting design

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: cross-cutting design concerns that surface in frontend implementation (accessibility, form UX, information design, etc.). Design is not a standalone domain value; these are a cross-cutting axis that is both code and design. They belong to `domain: code`, matched to a UI/frontend context via `fits when` (DR55: keep the two-value classification and absorb the cross-cutting axis via `fits when`).

## id: accessibility-wcag

- name: Accessibility (WCAG / ensure perceive, operate, understand)
- domain: code
- fits when: Implementing web UI components or screens (a frontend engineer's implementation is both code and design). When you see information conveyed by color alone, no keyboard operation, or missing alternative text.
- starter:
  - Anti-direction: Do not build the UI assuming sight and a mouse only. Do not defer color contrast, keyboard operation, or screen-reader information.
  - Invariant: Make the UI perceivable, operable, and understandable including for people with disabilities (WCAG). Provide text alternatives, sufficient contrast, keyboard operation, and appropriate labels/roles (semantics). Do not convey information by color alone.
- source: W3C Web Content Accessibility Guidelines (WCAG) 2 (W3C Recommendation; ISO/IEC 40500, https://www.w3.org/WAI/standards-guidelines/wcag/, retrieved 2026-06-26)

## id: form-ux-clarity

- name: Form UX (lower cognitive load through structure and clarity)
- domain: code
- fits when: Implementing input forms or registration/settings screens. When labels are ambiguous, required/optional is unclear, or error messages are unhelpful, leaving users unsure how to fill in.
- starter:
  - Anti-direction: Do not drop labels and rely on placeholders alone. Do not leave required/optional or the cause/fix of errors ambiguous. Do not arrange fields without thought.
  - Invariant: Design forms for structure, transparency, clarity, and support to lower users' cognitive load. Provide clear labels, explicit required/optional, and error messages that convey cause and remedy.
- source: Nielsen Norman Group "Forms" (four principles of form design: structure / transparency / clarity / support, https://www.nngroup.com/topic/forms/, retrieved 2026-06-26)

## id: responsive-mobile-first-layout

- name: Responsive / mobile-first layout (design starting from the small screen)
- domain: code
- fits when: Work implementing web screens or layouts. When it is built around desktop width and breakage on narrow screens or touch operation looks deferred.
- starter:
  - Anti-direction: Do not fix the layout assuming a specific screen width (especially desktop) only. Do not cram in small screens and touch operation as an afterthought.
  - Invariant: Design the layout starting from the small screen (mobile-first) and let it reflow fluidly to each device width via the viewport and breakpoints. Build with relative units and flex/grid so it follows the display area.
- source: web.dev "Responsive web design basics" (https://web.dev/articles/responsive-web-design-basics, retrieved 2026-07-04)

## id: ui-non-happy-states

- name: Non-happy-path state design (provide loading, empty, and error states)
- domain: code
- fits when: Work implementing screens that include data fetching or async processing. When only the success state (a fully-loaded display) is built and the look of loading, zero-data, and failure is missing.
- starter:
  - Anti-direction: Do not design only the succeeded, fully-populated state (the happy path). Do not defer loading, error, and empty states to "later" and leave them undesigned.
  - Invariant: Design not only success but each state for data-driven UI: loading, error (convey the cause and show a recovery path), and empty (with guidance toward the next step). Do not leave users unresponsive or at a dead end.
- source: Nielsen Norman Group "Error-Message Guidelines" (https://www.nngroup.com/articles/error-message-guidelines/, retrieved 2026-07-04) / ibid. "Designing Empty States in Complex Applications" (https://www.nngroup.com/articles/empty-state-interface-design/, retrieved 2026-07-04)

## id: destructive-action-confirmation

- name: Confirmation and undo for destructive/irreversible actions (make mistakes reversible)
- domain: code
- fits when: Work implementing a UI with irreversible actions such as delete, overwrite, or billing. When you see a structure that runs immediately on one click with no recovery from a mistake.
- starter:
  - Anti-direction: Do not let an action with serious consequences run immediately on one click. Do not proceed without providing a way to recover from a mistake.
  - Invariant: For actions with serious consequences, interpose a confirmation before execution or provide undo after execution. State clearly what will happen before execution so users can recover from a mistake.
- source: Nielsen Norman Group "Confirmation Dialogs Can Prevent User Errors — If Not Overused" (https://www.nngroup.com/articles/confirmation-dialog/, retrieved 2026-07-04)

## id: design-tokens-consistency

- name: Consistency via design tokens (choose from a system, not ad hoc)
- domain: code
- fits when: Work implementing a UI with multiple screens and components. When color, spacing, and font size are decided ad hoc per screen, and look and behavior vary.
- starter:
  - Anti-direction: Do not hardcode color, spacing, and typography ad hoc per component. Do not give the same kind of operation a different look and behavior per place.
  - Invariant: Reference style decisions such as color, spacing, and type scale from shared design tokens (a single source of truth) and keep them consistent across screens. Give elements of the same meaning the same expression so users can reuse what they learned.
- source: W3C Design Tokens Community Group (https://www.w3.org/community/design-tokens/, retrieved 2026-07-04)

## id: i18n-l10n-readiness

- name: Internationalization / localization readiness (externalize text, string expansion, RTL, formats)
- domain: code
- fits when: Work implementing a UI that may support multiple languages in the future. When text is hardcoded into the code and the layout is packed assuming English width and left-to-right.
- starter:
  - Anti-direction: Do not embed display text directly into the UI. Do not build the layout assuming a single language, single format, and fixed width.
  - Invariant: Externalize text from the code to make it translatable, and make the layout absorb string expansion from translation, right-to-left (RTL), and per-language date/number/currency formats.
- source: W3C "Authoring web pages: Internationalization techniques" (https://www.w3.org/International/techniques/authoring-html, retrieved 2026-07-04)

## id: system-status-feedback

- name: Visibility of system status (immediate feedback to actions)
- domain: code
- fits when: Work implementing a UI with actions whose result does not return immediately (submit, save, long-running processing). When you see a structure where the UI is unresponsive after a press, users cannot tell success from failure, and tend to double-act.
- starter:
  - Anti-direction: Do not create periods of no response to a user's action. Do not hide what is happening internally and leave long-running processing without a progress indicator.
  - Invariant: Return feedback to actions within a reasonable time (roughly within 0.1 second) and always make the system's state — in progress, complete, failed — visible. For long processing, provide cues of progress and completion.
- source: Nielsen Norman Group "10 Usability Heuristics for User Interface Design" (Visibility of system status, https://www.nngroup.com/articles/ten-usability-heuristics/, retrieved 2026-07-04)
