# Spec Kit Spec Hints Draft Template

> `/intent-export-speckit` writes hints that carry the packet's intent and constraints into Spec Kit's spec generation to `.intent/speckit/<packet-slug>/spec-hints.md` in this format. These are **hints** that do not complete the body (Spec Kit's spec.md generation and reconciliation are left to `/speckit.specify` onward). The mapping source of truth is the export skill's rule (map-speckit). The following headings are required (`## Parent Intent Reference` / `## Invariant Reference` / the one-line constitution note / `## Reconciliation Points`).

## Parent Intent Reference

Copy the upstream aim this packet serves (L0/L1/L2/L3) so parent intent is taken into the spec Spec Kit generates.

## Invariant Reference

List the constraints that must hold (packet-specific invariants + compass project-wide Invariants). Keep anything expressible as normative (SHALL / MUST) in that form, and pass it in a shape readily taken into the spec's acceptance conditions.

> **Constitution reflection is the user's call**: Whether to reflect these Invariants into Spec Kit's project constitution `.specify/memory/constitution.md` is the user's decision. `/intent-export-speckit` does not write to constitution.md (no modification of external tools).

## Reconciliation Points

Add points for checking whether the spec.md Spec Kit generated dropped parent intent / Invariants.
