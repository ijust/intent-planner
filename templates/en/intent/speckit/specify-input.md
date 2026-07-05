# Spec Kit Specify Input Draft Template

> `/intent-export-speckit` writes a per-packet draft to `.intent/speckit/<packet-slug>/specify-input.md` in this format. This file is a format template (headings + usage notes); do not write concrete content here. The mapping source of truth is the export skill's rule (map-speckit). The readers are the user who hands off to Spec Kit and `/speckit.specify`, which is launched on continuation. Shape it so a feature description usable verbatim as the `/speckit.specify` argument can be derived from the top.

## Feature Description (specify input body)

The natural-language feature description passed to `/speckit.specify`. State who has the problem, the current situation, and what should change (in/out scope) in a form Spec Kit's spec generation can carry forward. Make it a minimal, always-valid text that is usable verbatim as the argument from the top.

## Parent Intent

The upstream aim this packet serves (L0/L1/L2/L3). Make it explicit so intent flows into the spec Spec Kit generates.

## Invariants

Constraints that must hold (packet-specific invariants + compass project-wide Invariants). Keep anything expressible as normative (SHALL / MUST) in that form.
