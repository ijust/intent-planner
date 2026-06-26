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
