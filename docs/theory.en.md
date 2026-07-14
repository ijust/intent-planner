# Theory notes: term-drift integration

## Less instruction / clearer intent

intent-planner does not try to maximize instructions. It provides **minimum sufficient steering** where design drift or integration rework would be expensive. Four levels of binding force—Invariant, Scope / Acceptance, Decision, and Preference / Heuristic—make the boundary explicit without prescribing every implementation step. This is **bounded autonomy**: the agent proceeds inside the agreed boundary and returns only boundary-crossing changes for human judgment.

JIT input follows the same principle. It preserves the settled inputs needed for the current decision and carries implementation-time recheck candidates without injecting the full Intent Tree, Compass, or history. A tiny experiment where vibe coding is enough can use the `direct` route or skip the layer.

Status reporting likewise keeps **Process health**, **Unresolved design decisions**, and **User outcomes** distinct. A green process does not prove a successful outcome. When outcome evidence is absent, the outcome remains unobserved; there is no overall PASS or score. The display instead foregrounds the one decision a human needs to make next.

This English companion explains the responsibility boundary for the bundled term-drift integration. The broader theory of intent-planner is currently maintained in Japanese in [the main theory document](theory.md); this note deliberately covers only the public integration contract that must remain equivalent across languages.

## Extending the candidate gate to service design

The read-only candidate gate used for technical practices also covers established service design frames. It uses semantic matching between the case's role lens and the catalog's suitable situations; a shared word or familiar frame name is not enough.

When the fit is weak, the rule will present no candidate and stay silent; a person decides whether to adopt, decline, or defer each suggestion. Before adoption it generates nothing. Only after adoption does it create a derived, regenerable draft at `.intent/nl-spec/design-frame-<frame-id>.md`. It does not change the Intent Tree, Intent Compass, or packet sources of truth, so a suggestion cannot silently become a settled design decision.

Images or diagrams, analytics measurement, experience stages, numeric priorities, date commitments, and progress percentages are out of scope. The frames support deliberation; they do not turn intent-planner into an analytics or project-management system.

## Why the integration stays loose

intent-planner organizes intent before implementation. term-drift performs a full terminology inspection and applies only rewordings a person approved. Combining those responsibilities would give intent-planner a second copy of term-drift's detection logic and make the two copies drift apart. The integration therefore verifies and delegates; it does not take ownership of term-drift's rules, skill, or user data.

term-drift 0.3.0 is installed by default as an exact direct npm dependency. Normal intent-planner setup invokes the installed owner CLI after the target repository and agent are known, placing `./.term-drift/` and the dedicated agent skill project-locally under the owner's policy. The legacy `--with-term-drift` flag remains accepted for existing scripts but is not a placement gate. The existing `--yes` flag continues to control only appending the intent-planner quickstart to a root document.

The delegated version is pinned to term-drift 0.3.0. Pinning makes compatibility review meaningful: intent-planner can verify one published version, its common rules, and the selected agent's dedicated skill as a single set instead of assuming that an unverified latest release is compatible. The verified 0.2.3 and 0.2.5 contracts are retained only as trusted update baselines: their manifest, assets, and actual bytes must all match before an owner update is attempted.

Version 0.3.0 can persist an approved general-term classification in an optional ledger column and restore it in another session. That record covers only the term classification for the default reader; a specialized local use of the same spelling or unclear wording remains subject to review. term-drift's rules and dedicated skill own the classification, persistence, and resume semantics. intent-planner does not duplicate them and verifies only the published asset set.

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

When health is `ready`, the full terminology inspection starts from the selected agent's dedicated term-drift skill. The intent-planner installer is only the standard placement seam; it does not become the terminology-inspection engine.

## Ownership and update boundary

For `not-installed` or `additive-compatible`, normal setup delegates to the official owner installer for term-drift 0.3.0. For `update-attemptable`, it delegates exactly one attempt to the official owner update. `ready` is a no-op. intent-planner does not directly write, delete, repair, overwrite, or roll back term-drift-owned rules, agent skills, or glossary data. This keeps the owner tool responsible for its own file layout and preserves user data across reruns and failures.

An owner refusal or abnormal response remains an operation failure, and intent-planner always reports post-health from the same inspector instead of claiming success or rolling files back. A `ready` installation is not reinstalled, a `blocked` installation is not silently repaired, and unknown self-consistent or future versions newer than 0.3.0 are never followed automatically. Any future safe update path must come from term-drift's owner contract rather than from intent-planner guessing how to migrate owner files.

The dedicated term-drift path also does not replace `/intent-validate`'s structural checks. The responsibilities form three layers: root-document, pre-question, and export guidance prevent terminology drift; repositories with no project-local term-drift placement retain the lightweight `coinage-suspect` fallback; and repositories with a placement use validate only to guide the user to the normal installer's `--dry-run` health display. Validate does not judge terminology or redetermine version, hashes, required files, or agent-skill compatibility. Only after the installer reports `ready` does full terminology inspection begin from the selected agent's dedicated term-drift skill. This keeps one health source of truth in the installer inspector and one detailed terminology-review entry in the dedicated skill.
# Normalized storage and permanent fallback

The split compass store (one symbol per file) is the default for new installations, while the legacy single-file form remains a permanent reader path. Migration is opt-in and non-destructive; the installer never moves user data.

## Decision lifecycle and relevant working sets

As decision history grows, reviewing every past decision for every new case makes cognitive cost grow with the archive. Readers therefore select only `active` Invariants and Decisions relevant to the case's area and impact. Irrelevant, `superseded`, and archived records remain available as rationale but stay outside the current gate; uncertain relevance is surfaced for confirmation.

A matched `Revisit when` condition is evidence for reconsideration, not an automatic expiry rule. The old decision, new fact, and matched condition are presented together, and a human-approved writeback creates the successor while preserving history. This keeps the design rationale correctable without turning the decision log into a mandatory full-history review.
