# Graphiti stage-specific search boundary

This contract is used only by the read-only Graphiti search that each Intent Planning stage performs when needed. Each stage reads this contract just in time and never loads it permanently. Search is not an execution condition of any stage, and an unavailable Graphiti never changes the existing way of working. The capability classification, trust boundary, and operation allowlists of the shared contract, and the state record of the sync contract, are referenced and never redefined here.

## Search purpose per stage

| Stage | Search purpose |
|---|---|
| `discover` | Related concepts, stakeholders, and past decisions |
| `compass` | Rules, exceptions, contradictions, and effective periods |
| `packets` | Concrete examples, boundary conditions, and missing acceptance criteria |
| `intent-search` | Narrowing candidates of existing Intent (confirmation happens on the canonical source) |

- Each stage prioritizes the result kinds matching its current question and never mixes unrelated kinds by default.

## Scope limitation

- The search scope is derived from the stage, the target Intent, and the current work unit. The knowledge kind (`domain` or `intent`) and the work stream (`stream`) are selected explicitly; searching across all groups and all documents is never the default.
- The full document set is never loaded into the conversation, and the search scope is never expanded automatically.
- Search runs only when needed, saying so; it is never an execution or completion condition of any stage.
