# Theory notes: term-drift integration

This English companion explains the responsibility boundary for the optional term-drift integration. The broader theory of intent-planner is currently maintained in Japanese in [the main theory document](theory.md); this note deliberately covers only the public integration contract that must remain equivalent across languages.

## Why the integration stays loose

intent-planner organizes intent before implementation. term-drift performs a full terminology inspection and applies only rewordings a person approved. Combining those responsibilities would give intent-planner a second copy of term-drift's detection logic and make the two copies drift apart. The integration therefore verifies and delegates; it does not take ownership of term-drift's rules, skill, or user data.

Installation is optional and requires dedicated consent. In an interactive terminal, the user can accept the term-drift-specific prompt. For explicit or non-interactive use, `--with-term-drift` is the pre-consent flag. The existing `--yes` flag consents only to appending the intent-planner quickstart to a root document; it never consents to installing term-drift. With neither form of dedicated consent, no term-drift process is started and no term-drift file is placed.

The delegated version is pinned to term-drift 0.2.5. Pinning makes compatibility review meaningful: intent-planner can verify one published version, its common rules, and the selected agent's dedicated skill as a single set instead of assuming that an unverified latest release is compatible. The immediately preceding verified 0.2.3 contract is retained only as a trusted update baseline: its manifest, assets, and actual bytes must all match before an owner update is attempted.

## Health is evidence, not a marker

The integration reports filesystem health from the complete compatibility set:

| Health | Meaning |
|---|---|
| `not-installed` | No project-local term-drift artifact is present. |
| `ready` | The pinned version, required rules, and selected agent skill form a compatible set. |
| `inconsistent` | At least one required component is missing, incompatible, or unsafe. |

An `inconsistent` installation also carries a repairability classification:

- `additive-compatible` means every existing artifact is compatible and only safe additions are missing. The official owner installer may complete those missing parts without replacing existing files.
- `update-attemptable` means the installation exactly matches a trusted known baseline such as the previously verified 0.2.3 contract, so the official owner update may be attempted.
- `blocked` means an untrusted self-consistent state, future version, mismatch, unsafe path, or partial selected skill prevents automatic processing. The conflicting paths must be resolved through the owner-side procedure first.

`install-failed` is not persistent filesystem health. It describes the current installation attempt and is displayed together with the post-attempt health, so a failed process is not confused with what is actually present on disk.

When health is `ready`, the full terminology inspection starts from the selected agent's dedicated term-drift skill. The intent-planner installer is only the optional placement seam; it does not become the terminology-inspection engine.

## Ownership and update boundary

For `not-installed` or `additive-compatible`, an approved installation delegates to the official owner installer for term-drift 0.2.5. For `update-attemptable`, explicit consent delegates exactly one attempt to the official owner update. `ready` is a no-op. intent-planner does not directly write, delete, repair, overwrite, or roll back term-drift-owned rules, agent skills, or glossary data. This keeps the owner tool responsible for its own file layout and preserves user data across reruns and failures.

An owner refusal or abnormal response remains an operation failure, and intent-planner always reports post-health from the same inspector instead of claiming success or rolling files back. Updates require explicit consent. A `ready` installation is not reinstalled, a `blocked` installation is not silently repaired, and unknown self-consistent or future versions newer than 0.2.5 are never followed automatically. Any future safe update path must come from term-drift's owner contract rather than from intent-planner guessing how to migrate owner files.

The dedicated term-drift path also does not replace `/intent-validate`'s structural checks. The responsibilities form three layers: root-document, pre-question, and export guidance prevent terminology drift; repositories with no project-local term-drift placement retain the lightweight `coinage-suspect` fallback; and repositories with a placement use validate only to guide the user to the existing installer's `--with-term-drift --dry-run` health display. Validate does not judge terminology or redetermine version, hashes, required files, or agent-skill compatibility. Only after the installer reports `ready` does full terminology inspection begin from the selected agent's dedicated term-drift skill. This keeps one health source of truth in the installer inspector and one detailed terminology-review entry in the dedicated skill.
# Normalized storage and permanent fallback

The split compass store (one symbol per file) is the default for new installations, while the legacy single-file form remains a permanent reader path. Migration is opt-in and non-destructive; the installer never moves user data.
