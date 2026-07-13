# Theory notes: term-drift integration

This English companion explains the responsibility boundary for the optional term-drift integration. The broader theory of intent-planner is currently maintained in Japanese in [the main theory document](theory.md); this note deliberately covers only the public integration contract that must remain equivalent across languages.

## Why the integration stays loose

intent-planner organizes intent before implementation. term-drift performs a full terminology inspection and applies only rewordings a person approved. Combining those responsibilities would give intent-planner a second copy of term-drift's detection logic and make the two copies drift apart. The integration therefore verifies and delegates; it does not take ownership of term-drift's rules, skill, or user data.

Installation is optional and requires dedicated consent. In an interactive terminal, the user can accept the term-drift-specific prompt. For explicit or non-interactive use, `--with-term-drift` is the pre-consent flag. The existing `--yes` flag consents only to appending the intent-planner quickstart to a root document; it never consents to installing term-drift. With neither form of dedicated consent, no term-drift process is started and no term-drift file is placed.

The delegated version is pinned to term-drift 0.2.1. Pinning makes compatibility review meaningful: intent-planner can verify one published version, its common rules, and the selected agent's dedicated skill as a single set instead of assuming that an unverified latest release is compatible.

## Health is evidence, not a marker

The integration reports filesystem health from the complete compatibility set:

| Health | Meaning |
|---|---|
| `not-installed` | No project-local term-drift artifact is present. |
| `ready` | The pinned version, required rules, and selected agent skill form a compatible set. |
| `inconsistent` | At least one required component is missing, incompatible, or unsafe. |

An `inconsistent` installation also carries a repairability classification:

- `additive-compatible` means every existing artifact is compatible and only safe additions are missing. The official owner installer may complete those missing parts without replacing existing files.
- `blocked` means a mismatch, unsafe path, or partial selected skill prevents automatic repair. The conflicting paths must be resolved through the owner-side procedure first.

`install-failed` is not persistent filesystem health. It describes the current installation attempt and is displayed together with the post-attempt health, so a failed process is not confused with what is actually present on disk.

When health is `ready`, the full terminology inspection starts from the selected agent's dedicated term-drift skill. The intent-planner installer is only the optional placement seam; it does not become the terminology-inspection engine.

## Ownership and update boundary

For `not-installed` or `additive-compatible`, an approved installation delegates to the official owner installer for term-drift 0.2.1. intent-planner does not directly write, delete, repair, or overwrite term-drift-owned rules, agent skills, or glossary data. This keeps the owner tool responsible for its own file layout and preserves user data across reruns and failures.

Automatic updates of an existing term-drift installation are outside this integration's scope. A `ready` installation is not reinstalled, and a `blocked` installation is not silently repaired. A future safe update path must come from term-drift's owner contract rather than from intent-planner guessing how to migrate owner files.

The dedicated term-drift path also does not replace `/intent-validate`. Validation remains a read-only check of intent-planner artifacts; full terminology cleanup begins from the term-drift skill. Keeping the entrances distinct prevents an optional external tool from silently expanding the responsibilities of the existing validation workflow.
