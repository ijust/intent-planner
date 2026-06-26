# Constraint Starters — non-code / document

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: non-code documents (presentation decks, proposals, specification docs, etc.). These belong to `domain: non-code`.

## id: slide-deck-structure

- name: Presentation deck structure (claim first, one message per slide)
- domain: non-code
- fits when: Building a presentation deck, slides, or a proposal. When you see a tendency to cram in information or hold the conclusion until the end.
- starter:
  - Anti-direction: Do not cram multiple claims onto one slide. Do not start from a list of facts with the conclusion hidden until the end.
  - Invariant: Keep one slide = one message. Each slide leads with its claim (conclusion) and supports it with evidence.
- source: Barbara Minto "The Pyramid Principle" (conclusion-first, MECE structure) / Garr Reynolds "Presentation Zen" (one message per slide), retrieved 2026-06-21

## id: requirement-keywords-clarity

- name: Requirement clarity (use keywords that signal requirement levels)
- domain: non-code
- fits when: Writing a spec, RFC, or PRD that conveys to others what is mandatory vs optional. When "we do X" and "we'd like X" blur the distinction between required/recommended/optional.
- starter:
  - Anti-direction: Do not mix mandatory, recommended, and optional with vague phrasing. Do not write in a way that forces the reader to guess the requirement level.
  - Invariant: Use distinct keywords that signal requirement level (mandatory = MUST/SHALL, prohibited = MUST NOT, recommended = SHOULD, optional = MAY, etc.). Make each requirement's level unambiguously readable from the text.
- source: RFC 2119 "Key words for use in RFCs to Indicate Requirement Levels" (BCP 14, https://www.rfc-editor.org/rfc/rfc2119, retrieved 2026-06-26)

## id: doc-type-separation

- name: Documentation type separation (write by purpose)
- domain: non-code
- fits when: Designing or organizing user-facing docs such as READMEs, technical docs, or guides. When tutorials, how-tos, reference, and explanation are mixed on one page and readers cannot reach the information they need.
- starter:
  - Anti-direction: Do not mix learning-oriented (tutorial), problem-solving (how-to), information lookup (reference), and understanding (explanation) in one document. Do not arrange information without considering the reader's purpose.
  - Invariant: Write docs mapped to the four reader needs (learn / do a task / look up / understand) and organize the structure accordingly. Make each page's purpose clear.
- source: Diátaxis (a systematic approach to technical documentation: the four kinds tutorials / how-to guides / reference / explanation, https://diataxis.fr/, retrieved 2026-06-26)
