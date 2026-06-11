# Check Catalog: intent-validate

The canonical source of the checks that the `intent-validate` skill applies. SKILL.md carries only the procedure and the report format; the definition of the checks references this file. To add a check, just add a row to this table (the table is the source of truth).

## The 3 severity classes

| Severity | Definition |
|----------|------------|
| must-fix | A contradiction or consistency break that should be resolved before starting work. Proceeding to export / implementation as-is becomes a cause of architectural drift |
| recommended | A quality risk. Not severe enough to stop work immediately, but resolving it raises the deliverables' reliability as a basis for judgment |
| info | A heads-up. Action is optional, but the state should be known |

## Check catalog (8 checks)

| Category | Check | Severity guideline |
|----------|-------|--------------------|
| Contradiction | A packet's Scope/Expected Behavior conflicts with the compass Invariants | must-fix |
| Contradiction | A packet's direction falls under the compass Anti-direction | must-fix |
| Contradiction | Mismatch between the intent-tree L3 intent and the packet content (direct contradiction with an explicit L3 statement = must-fix; divergence open to interpretation = recommended) | must-fix/recommended |
| Coverage | A goal among the tree's L1–L3 goals that corresponds to no packet (including L4) | recommended |
| Coverage | An orphan packet whose Parent Intent traces back to no node of the tree | must-fix |
| Coverage | Stagnation of unresolved Questions in tree/compass/packets | info |
| Boundary | Scope overlap / responsibility conflict between packets on packets.md | must-fix |
| Boundary | Consistency between the current export draft (single slot, the latest 1 packet's worth) and packets.md (mismatched transcription of Invariants, divergence from the packet definition, etc.) | recommended |

## Criteria for classifying the L3 mismatch

- Packet content that **directly contradicts an explicit statement** of the intent-tree L3 = **must-fix**
- **Divergence open to interpretation** (no explicit statement, but the direction looks off, etc.) = **recommended**
- When in doubt, lean toward recommended, attach a quotation of the evidence, and leave the judgment to the user

## Note on the boundary checks (single-slot constraint)

- The export draft (`.intent/cc-sdd/*.md`) is a single slot that holds **only the latest 1 packet's worth**. The target of the boundary check in row 8 of the table is limited to the consistency between the current draft and packets.md (check on the premise that drafts of past packets do not exist).

## Handling of unverified targets (the verifiable-scope principle)

1. If a deliverable subject to verification is missing or unfilled, skip the checks that require that deliverable.
2. Run the remaining checks within the verifiable scope (do not abort the whole run).
3. Include "unverified targets" in the report, stating the skipped checks and the reason (which file is missing / unfilled).
4. Example: packets.md is absent → skip the packet-dependent checks across contradiction/coverage/boundary, and run only the checks possible with the tree/compass alone (e.g., stagnation of unresolved Questions).
