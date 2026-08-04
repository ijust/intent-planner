# Constraint Starters — code / testing & verifiability

> A per-domain file under the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` pull only the domains relevant to the work, read-only. The parent catalog is authoritative for schema, usage, and source rules; this file contains only the starter bodies.
>
> **Domain**: choosing test inputs, establishing a basis for deciding whether observed results are correct, and assessing the fault-detection strength of a test suite. It belongs to `domain: code` on the development-process side and fits work that designs or reviews test strategy, acceptance criteria, or regression tests.
>
> **Boundary with existing domains**: `current-time-injectable-clock` covers the implementation boundary used to control nondeterministic current time, while `state-machine-path-and-failure-testing` covers representative transition paths and failure paths. This domain addresses testing in general—including those targets—through input-domain selection, generalized properties, and the suite's ability to detect faults. It does not make a universal code-coverage or mutation-score target a pass condition.

## id: specification-partitions-boundaries-oracle

- name: Derive equivalence classes, boundaries, and invalid inputs from the specification, and make the result oracle explicit
- domain: code
- fits when: Requirements or contracts expose input ranges, classes, upper or lower limits, formats, or preconditions. Example tests are biased toward happy paths, or it is unclear what evidence determines whether a test result is correct.
- starter:
  - Anti-direction: Do not copy implementation branches into test cases and thereby duplicate the same misunderstanding in both. Do not stop at ordinary valid examples while omitting values just below, on, and just above a boundary or invalid classes. Do not treat a produced result as passing when there is no basis for judging the expected result.
  - Invariant: Starting from requirements, contracts, models, or another basis independent of the implementation, partition the input domain into classes expected to receive the same treatment, then choose representatives, boundary-adjacent values, and invalid inputs. Attach a test oracle—an expected value, decision rule, reference model, or equivalent basis—that can judge each observation. Treat a result the oracle cannot decide as inconclusive, not passing.
- source: IEEE Computer Society, *Guide to the Software Engineering Body of Knowledge (SWEBOK Guide), Version 4.0a*, Software Testing — Specification-Based Techniques / Equivalence Partitioning / Boundary Value Analysis / The Oracle Problem (https://ieeecs-media.computer.org/media/education/swebok/swebok-v4.pdf, retrieved 2026-08-05); ISO/IEC/IEEE 29119 series overview, Parts 2 and 4 (https://committee.iso.org/sites/jtc1sc7/home/projects/flagship-standards/isoiecieee-29119-series.html, retrieved 2026-08-05)

## id: property-based-testing-when-properties-exist

- name: Use property-based testing to complement examples when meaningful general properties and generators exist
- domain: code
- fits when: A feature such as serialization round trips, sorting, normalization, reversible transformations, or algebraic operations has properties that should hold over a broad input set, and a few examples cannot explore combinations adequately.
- starter:
  - Anti-direction: Do not treat generating many inputs as evidence of quality by itself. Do not replace example tests with weak properties, generators that produce only unrealistic inputs, or failures that cannot be reproduced. Do not force this technique onto behavior for which no meaningful general property can be stated.
  - Invariant: State a meaningful universally quantified property derived from the requirement, provide generators satisfying its preconditions, and provide shrinking that reduces a failure to a reproducible counterexample. Preserve a discovered minimal counterexample as a concrete regression example. Keep known critical examples and user scenarios as example-based tests so the two techniques complement each other.
- source: Koen Claessen and John Hughes, “QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs,” *ICFP 2000* (https://doi.org/10.1145/351240.351266, retrieved 2026-08-05); John Hughes, *Software Testing with QuickCheck* (Chalmers University of Technology doctoral thesis; properties, generators, shrinking, and stated limitations, https://research.chalmers.se/publication/136076/file/136076_Fulltext.pdf, retrieved 2026-08-05)

## id: selective-mutation-testing-for-suite-efficacy

- name: Apply mutation testing selectively to important test suites or suites whose effectiveness is uncertain
- domain: code
- fits when: Code is covered yet defects escape, assertion strength around important conditions is unclear, or a team needs to determine whether tests for changed code actually detect faults. The execution and investigation cost can be bounded.
- starter:
  - Anti-direction: Do not infer that outcomes are asserted merely because coverage shows the code was executed. Do not mutate the whole codebase indiscriminately and stall delivery while investigating equivalent mutants or a flood of results. Do not turn a universal mutation score into a quality guarantee or release gate.
  - Invariant: Select a high-impact, changed, or otherwise doubtful scope and check whether existing tests fail when operators or conditions are changed slightly. Investigate surviving mutants as possible missing tests, weak assertions, unreachable code, or equivalent mutants, then fix only meaningful gaps. Treat the results as diagnostic evidence about the suite rather than reducing them to one score.
- source: Mike Papadakis et al., “Mutation Testing Advances: An Analysis and Survey,” *Advances in Computers*, 2019 (https://doi.org/10.1016/bs.adcom.2018.03.015, retrieved 2026-08-05); Goran Petrović et al., “State of Mutation Testing at Google,” *ICSE-SEIP 2018* (selective operation to control computation and developer attention, and why code coverage alone does not establish assertion effectiveness, https://research.google.com/pubs/archive/46584.pdf, retrieved 2026-08-05)
