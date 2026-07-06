# Format Selection (interpret the format argument, delegation rule)

The source of truth by which the `intent-release-note` skill interprets the user-specified format argument and delegates to the corresponding output-structure rule. SKILL.md owns only the procedure and reporting format; "which format argument delegates to which output-structure rule" is defined by this rule. This rule carries **only the delegation rule** and does not carry the output structure itself (sections, categories, ordering); that is the responsibility of `format-changelog.md` / `format-github-releases.md` and is not duplicated here (AD24).

## Posture (do not hardcode format in the body; delegate to rules)

Do not hardcode the target format into the SKILL.md body. The format choice is interpreted in this rule, and the assembly of the chosen output structure is delegated to the corresponding format rule. To add a format, add an output-structure rule and a single row to this rule's delegation table.

## Interpreting and delegating the format argument

Interpret and delegate the format argument the user gave to `/intent-release-note` as follows.

| Format argument | Delegate to (output-structure rule) | Layout |
|---|---|---|
| `changelog` (or a synonymous specification) | `rules/format-changelog.md` | Keep a Changelog style (per-kind categories) |
| `github-releases` (or a synonymous specification) | `rules/format-github-releases.md` | GitHub Releases style (narrative + change list) |
| `changelog-customer` (or a synonymous "customer-facing" / "user-facing" specification) | `rules/format-changelog-customer.md` | Customer-facing changelog (user-impact first, opening up internal terms) |
| Unspecified (default) | `rules/format-changelog.md` (default format) | Use the default and **state in the output which format was generated** |

- If the format argument uniquely determines the format, perform no interactive completion (do not depend on prompting the user back; uniquely determine via the default).
- The default format (when unspecified) is `changelog`; at the top of the output, state which format was used, e.g. "format = changelog (default)."

## Responsibility split after delegation

- This rule: determine which format to use and hand the corresponding format rule the "material" (the matched commit set = matched commits with their "why" + unmatched commits as thin lines).
- Delegate (format-* rule): pour the received material into that format's output structure (sections, categories, ordering). Do not read git or match (that is SKILL.md's responsibility).

## Invariants

- Do not write the output structure (sections, categories, ordering) in this rule (that is the format-* responsibility; no duplication).
- Do not hardcode the target format into the SKILL.md body (select and delegate in this rule; AD24).
- When the default format is used, always state in the output which format was generated.
- Do not bring custom machine scoring or thresholds into format selection (only the plain interpretation of the argument and the default).
