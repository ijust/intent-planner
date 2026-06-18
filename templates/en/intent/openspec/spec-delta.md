# OpenSpec Spec Delta Draft Template

> `/intent-export-openspec` writes the packet's acceptance criteria as OpenSpec delta-spec hints in this format to `.intent/openspec/<packet-slug>/spec-delta.md`. This is a **hint skeleton** that does not complete the body (the OpenSpec body generation and reconciliation are left to `/opsx:propose` and beyond). It seeds the `### Requirement:` / `#### Scenario:` heading syntax exactly to steer toward a structure that passes OpenSpec validate. The authority for the routing rule (ADDED by default / conditional MODIFIED, REMOVED) is the export skill's rule (map-openspec).

## ADDED Requirements

Capabilities or behaviors being newly added. By default, place all of the packet's acceptance criteria here.

### Requirement: <name>

A normative requirement statement (SHALL / MUST). When the compass's Invariants apply, drop those constraints in here.

#### Scenario: <name>

- **GIVEN** a precondition
- **WHEN** something happens
- **THEN** the expected outcome

## MODIFIED Requirements

Place here only when modifying an existing capability or behavior (when the packet's Scope or the compass's Anti-direction explicitly references a change to an existing capability). Keep it to a hint of "the capability name + direction of change"; leave the reconciliation to OpenSpec.

## REMOVED Requirements

Place here only when removing an existing capability or behavior (same condition as above). Indicate the name of the capability being removed as a hint.
