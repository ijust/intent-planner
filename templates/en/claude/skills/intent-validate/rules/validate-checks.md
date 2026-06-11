# Check Catalog: intent-validate

The canonical source of the checks that the `intent-validate` skill applies. SKILL.md carries only the procedure and the report format; the definition of the checks references this file. To add a check, just add a row to this table (the table is the source of truth).

## The 3 severity classes

| Severity | Definition |
|----------|------------|
| must-fix | A contradiction or consistency break that should be resolved before starting work. Proceeding to export / implementation as-is becomes a cause of architectural drift |
| recommended | A quality risk. Not severe enough to stop work immediately, but resolving it raises the deliverables' reliability as a basis for judgment |
| info | A heads-up. Action is optional, but the state should be known |

### Demotion rule

- If an intentional, reasoned deferral record (Deferred or Open Questions) exists for a missing item, report that item's severity lowered to "info".

## Check catalog

| Category | Check | Condition | Severity guideline |
|----------|-------|-----------|--------------------|
| Contradiction | A packet's Scope/Expected Behavior conflicts with the compass Invariants | always | must-fix |
| Contradiction | A packet's direction falls under the compass Anti-direction | always | must-fix |
| Contradiction | Mismatch between the intent-tree L3 intent and the packet content (direct contradiction with an explicit L3 statement = must-fix; divergence open to interpretation = recommended) | always | must-fix/recommended |
| Coverage | A goal among the tree's L1–L3 goals that corresponds to no packet (including L4) | always | recommended |
| Coverage | An orphan packet whose Parent Intent traces back to no node of the tree | always | must-fix |
| Coverage | Stagnation of unresolved Questions in tree/compass/packets | always | info |
| Boundary | Scope overlap / responsibility conflict between packets on packets.md | always | must-fix |
| Boundary | Consistency between the current export draft (single slot, the latest 1 packet's worth) and packets.md (mismatched transcription of Invariants, divergence from the packet definition, etc.) | always | recommended |
| Normative | Any of hypothesis / falsification criteria / GO-NO-GO criteria is unrecorded in "PoC Experiment Definition" | designer-questions=on and purpose=poc | must-fix |
| Normative | An L1 item lacks a `Measurement criteria:` line | designer-questions=on | recommended |
| Normative | The packets.md "Walking Skeleton" section is unfilled (when packets.md is filled in) | designer-questions=on | recommended |
| Normative | The "Screen Rough Reference" section is unfilled (none of a path, a link, "Not applicable", or a reasoned "none" is present) | designer-questions=on | recommended |
| Normative | designer-questions is unrecorded (skip the checks in the Normative category and announce only this row) | designer-questions unrecorded | info |
| Normative | purpose is unrecorded (skip the hypothesis / falsification criteria / GO-NO-GO check and announce only this row) | designer-questions=on and purpose unrecorded | info |

- The condition "always" does not override the principle of unverified targets (if the target deliverable is missing or unfilled, skip that check).
- The designer-questions / purpose in the conditions refer to the values recorded in mode.md. Do not run a check whose condition is not met. When designer-questions=off is recorded, run none of the checks in the Normative category. The reader judges designer-questions first and does not consult the purpose value unless on is recorded.

## Criteria for classifying the L3 mismatch

- Packet content that **directly contradicts an explicit statement** of the intent-tree L3 = **must-fix**
- **Divergence open to interpretation** (no explicit statement, but the direction looks off, etc.) = **recommended**
- When in doubt, lean toward recommended, attach a quotation of the evidence, and leave the judgment to the user

## Note on the boundary checks (single-slot constraint)

- The export draft (`.intent/cc-sdd/*.md`) is a single slot that holds **only the latest 1 packet's worth**. The target of the export-draft-consistency boundary check is limited to the consistency between the current draft and packets.md (check on the premise that drafts of past packets do not exist).

## Handling of unverified targets (the verifiable-scope principle)

1. If a deliverable subject to verification is missing or unfilled, skip the checks that require that deliverable.
2. Run the remaining checks within the verifiable scope (do not abort the whole run).
3. Include "unverified targets" in the report, stating the skipped checks and the reason (which file is missing / unfilled).
4. Example: packets.md is absent → skip the packet-dependent checks across contradiction/coverage/boundary, and run only the checks possible with the tree/compass alone (e.g., stagnation of unresolved Questions).
