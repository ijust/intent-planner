# Constraint Starters — code / architecture quality

> A per-domain file under the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` pull only the domains relevant to the work, read-only. The parent catalog is authoritative for schema, usage, and source rules; this file contains only the starter bodies.
>
> **Domain**: making cross-layer quality goals concrete, boundaries that contain change, rationale for long-lived structural decisions, and conformance between intended dependency boundaries and implementation. It belongs to `domain: code` and fits work that designs or reviews structures or quality tradeoffs spanning multiple modules.
>
> **Boundary with existing domains**: technology domains own concrete mechanisms such as API validation, database migration, resilience, and security. Testing starters such as `specification-partitions-boundaries-oracle` own behavioral verdicts. This domain addresses which qualities the structure supports, where change is contained, why the structure was chosen, and which module dependencies must remain true.

## id: quality-attribute-scenario-measurable-response

- name: Express an architecture-driving quality requirement as a scenario with context and a measurable response
- domain: code
- fits when: Performance, availability, security, modifiability, interoperability, or another quality materially drives design, but the requirement says only “fast,” “robust,” or “maintainable.”
- starter:
  - Anti-direction: Do not select a structure from a quality-attribute name alone while leaving who or what supplies which stimulus, to which artifact, under what environment, and what response constitutes success unspecified. Do not assign numbers to every irrelevant quality or substitute a universal threshold for the system's actual tolerance.
  - Invariant: For each architecture-driving quality requirement, identify the source, stimulus, artifact, environment, expected response, and response measure, and link the scenario to a business or user goal. Analyze how the chosen structure supports it, record effects on competing qualities, and name how a prototype, simulation, test, or other evidence will assess it.
- source: Carnegie Mellon University Software Engineering Institute, *Quality Attribute Workshops (QAWs), Third Edition*, CMU/SEI-2003-TR-016 (six-part scenario refinement, https://www.sei.cmu.edu/library/quality-attribute-workshops-qaws-third-edition/, retrieved 2026-08-05); SEI, Architecture Tradeoff Analysis Method Collection (quality scenarios, risks, sensitivity points, and tradeoff points, https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/, retrieved 2026-08-05)

## id: information-hiding-around-likely-change

- name: Contain a likely-to-change design decision behind an information-hiding boundary
- domain: code
- fits when: An external specification, data representation, algorithm, device or service dependency, or business rule may change and that change should not propagate to many clients. Modules are divided only by processing step or screen while internal representations are widely exposed.
- starter:
  - Anti-direction: Do not assume that smaller files or more classes make change local. Do not leak a volatile representation or product detail through a public interface or duplicate the same design knowledge across modules. Do not add abstraction layers for every imaginable future change.
  - Invariant: Identify a design decision that is likely to change and costly if spread, then contain its knowledge in one owning boundary. Expose only the smallest stable contract clients require so implementation-detail changes do not propagate to conforming clients. Validate the boundary with a plausible change scenario and observe whether edits remain local.
- source: D. L. Parnas, “On the Criteria To Be Used in Decomposing Systems into Modules,” *Communications of the ACM* 15(12), 1972, DOI 10.1145/361598.361623 (decomposition by hidden design decisions, https://doi.org/10.1145/361598.361623, retrieved 2026-08-05); IEEE Computer Society, *SWEBOK Guide V4.0a*, Software Design (modularization, encapsulation, and separation of interface and implementation, https://ieeecs-media.computer.org/media/education/swebok/swebok-v4.pdf, retrieved 2026-08-05)

## id: architecture-decision-rationale-tradeoffs

- name: Preserve concerns, alternatives, rationale, tradeoffs, and outcomes for a significant structural decision
- domain: code
- fits when: A public interface, persistent format, deployment boundary, service split, or major dependency is expensive to reverse; multiple quality goals compete; or future maintainers cannot reevaluate the conclusion without its context.
- starter:
  - Anti-direction: Do not record only the selected option as a “best practice” while erasing the concern, rejected alternatives, and quality costs. Do not force one ADR template onto every local decision or silently rewrite old records to match current reality.
  - Invariant: For an architecturally significant decision, retain the affected stakeholders and concerns, selected option, realistic alternatives considered, rationale, quality tradeoffs, known outcomes, and reconsideration conditions in a traceable form. When the decision changes, preserve the earlier rationale and make the superseding or appended relationship visible. Choose the record format and granularity for the project.
- source: ISO/IEC/IEEE 42010:2022 public conceptual model (Architecture Decision, Concern, and Architecture Rationale including alternatives not chosen, https://www.iso-architecture.org/ieee-1471/cm/, retrieved 2026-08-05); SEI, *The Architecture Tradeoff Analysis Method*, CMU/SEI-98-TR-008 (interacting quality attributes and design tradeoffs, https://www.sei.cmu.edu/library/the-architecture-tradeoff-analysis-method/, retrieved 2026-08-05)

## id: architecture-boundary-conformance-check

- name: State dependency boundaries that have a quality rationale and continuously check implementation conformance
- domain: code
- fits when: Dependencies among modules, packages, layers, or plugins must follow a direction to preserve modifiability, security, independent delivery, or testability, and shortcut dependencies may accumulate even though the design depicts separation.
- starter:
  - Anti-direction: Do not ban every cycle or cross-boundary dependency without a rationale, and do not reduce dependency counts to one quality score. Do not keep only the design document correct while implementation violates the boundary. Do not treat silence from one tool as proof that no violation exists.
  - Invariant: Express quality-critical allowed and forbidden dependencies as rules that identify the affected modules and rationale. Check them repeatedly through reproducible code review, static analysis, build boundaries, or an equivalent mechanism. When a violation appears, restore the dependency or update the intended structure with rationale. State false-negative, false-positive, runtime-dependency, and other scope limits of the check.
- source: ISO/IEC/IEEE 42010 public conceptual model (Correspondence Rules expressing dependency, constraint, consistency, and related relations, https://www.iso-architecture.org/ieee-1471/cm/, retrieved 2026-08-05); Leo Pruijt et al., “The accuracy of dependency analysis in static architecture compliance checking,” *Software: Practice and Experience* 47(2), DOI 10.1002/spe.2421 (implementation-to-design dependency conformance and detection limits, https://dspace.library.uu.nl/handle/1874/351324, retrieved 2026-08-05)
