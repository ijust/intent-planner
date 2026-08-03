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

## id: rfp-outcome-requirement-evaluation-alignment

- name: Align RFP outcomes, requirements, responses, and evaluation (compare proposals on the same basis)
- domain: non-code
- fits when: Preparing an RFP for IT services or systems and comparing multiple proposals fairly and reproducibly.
- starter:
  - Anti-direction: Do not lock in a product name or implementation before defining the outcome, evaluate on criteria absent from the RFP, or mix mandatory and scored conditions.
  - Invariant: Begin with the problem and measurable outcomes, then align scope, constraints, deliverables, acceptance criteria, and response format. Publish evaluation factors, mandatory versus point-rated status, scoring scale, and relative importance before proposals, and apply the same stated criteria to submitted evidence.
- source: UK Government "Digital, Data and Technology Playbook" (outcome-based specifications and evaluation approach, https://www.gov.uk/government/publications/the-digital-data-and-technology-playbook/the-digital-data-and-technology-playbook-html, retrieved 2026-08-04); Canada Treasury Board "Evaluation Criteria" (mandatory and point-rated criteria and rating scales, https://www.canada.ca/en/treasury-board-secretariat/corporate/organization/professional-audit-support-services/evaluation-criteria.html, retrieved 2026-08-04); U.S. FAR 15.304 (stated factors, relative importance, price and quality, https://www.acquisition.gov/far/15.304, retrieved 2026-08-04; jurisdiction-specific rules are not generalized)

## id: rfp-lifecycle-cost-and-exit

- name: Define the RFP lifecycle boundary (total cost, security, data, exit, and migration)
- domain: non-code
- fits when: Procuring SaaS, custom development, or managed services whose dependency and cost continue through operation, change, and termination.
- starter:
  - Anti-direction: Do not compare only initial price and a feature checklist while postponing operating cost, change cost, security responsibility, data return, intellectual property, and exit assistance until after award.
  - Invariant: Standardize the response format for total cost across acquisition, operation, change, and exit. As applicable, specify security and supply-chain responsibilities, data ownership and portable formats, standards and interoperability, intellectual property, service levels, termination conditions, and migration assistance so acceptance and exit are verifiable.
- source: UK Government "Digital, Data and Technology Playbook" (whole-life value, cyber security, testing, and contract change, https://www.gov.uk/government/publications/the-digital-data-and-technology-playbook/the-digital-data-and-technology-playbook-html, retrieved 2026-08-04); UK Government "Open Standards Principles" (interoperability, exit/migration, and avoiding vendor lock-in, https://www.gov.uk/government/publications/open-standards-principles/open-standards-principles, retrieved 2026-08-04)

## id: effort-estimate-basis-and-range

- name: Record the basis and range of an effort estimate (scope, assumptions, decomposition, and uncertainty)
- domain: non-code
- fits when: Planning or proposing person-hours, person-days, or person-months for development whose requirements or design have material uncertainty.
- starter:
  - Anti-direction: Do not commit to a single number without scope, assumptions, method, and uncertainty, or count only coding while omitting verification, integration, documentation, management, and external dependencies.
  - Invariant: Decompose a technical baseline through a WBS and record included/excluded scope, assumptions, constraints, dependencies, reference actuals, and estimation method. Express uncertain work as a range; for material investments, cross-check multiple methods and perform risk and sensitivity analysis.
- source: U.S. GAO "Cost Estimating and Assessment Guide" (technical baseline, WBS, assumptions, data, methodology, sensitivity/risk, and documentation, https://www.gao.gov/products/gao-20-195g, retrieved 2026-08-04); NASA "Cost Estimating Handbook" (software cost estimating and risk/uncertainty, https://www.nasa.gov/ocfo/ppc-corner/nasa-cost-estimating-handbook-ceh/, retrieved 2026-08-04)

## id: effort-estimate-update-with-actuals

- name: Update effort estimates with actuals (compare on the same decomposition and preserve changes)
- domain: non-code
- fits when: Iterative or multi-phase development can update remaining-work forecasts from delivery actuals and requirement changes.
- starter:
  - Anti-direction: Do not keep the initial estimate as a fixed promise, collapse scope change, failed assumptions, and productivity variance into a single label of delay, or reuse another team's velocity without calibration.
  - Invariant: Capture actual effort and completion against the estimate's WBS or deliverable units, preserving changes to scope, assumptions, and dependencies. At each meaningful checkpoint, re-estimate remaining work and its range, and feed variance causes back into reference data and method calibration.
- source: U.S. GAO "Cost Estimating and Assessment Guide" (the 12-step process updates estimates with actual costs and changes for continuous improvement, https://www.gao.gov/products/gao-20-195g, retrieved 2026-08-04)
