# Constraint Starters — code / release, configuration, and recovery

> A per-domain file under the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` pull only the domains relevant to the work, read-only. The parent catalog is authoritative for schema, usage, and source rules; this file contains only the starter bodies.
>
> **Domain**: validation before activating configuration, decisions for progressively expanding a change's exposure, compatibility and rollback while versions coexist during deployment, and proof of restoration from backup. It belongs to `domain: code` and fits work designing or reviewing application or configuration releases, rolling updates, backup, and recovery.
>
> **Boundary with existing domains**: `input-validation-boundary` addresses trust boundaries for external input, `backward-compatible-migration` addresses database schema expand–migrate–contract, and `remote-call-*` addresses resilience to remote failures while running. This domain addresses when configuration may be activated, how far a change may be exposed, whether deployed versions can coexist and move forward or backward, and whether saved state can actually restore service.

## id: configuration-semantic-validation-before-activation

- name: Validate configuration semantics in the target context before activation
- domain: code
- fits when: Configuration supplied through files, environment variables, an administrative UI, or an API becomes active at startup, reload, or deployment, and syntactically valid values can still fail through bad references, units, combinations, or resource assumptions.
- starter:
  - Anti-direction: Do not treat successful parsing as proof that a configuration is safe. Do not wait for an outage after activation to discover a missing reference, out-of-range value, unit mistake, contradictory combination, or option unsupported by the target version. Do not hide dependencies on mutable external resources that make the same configuration impossible to restore reliably.
  - Invariant: Before activation, validate not only types and required values but, as far as practicable, reference resolution, ranges and units, cross-field constraints, target software version, and target-environment resource assumptions. On failure, retain the previously active valid configuration and report which field and condition failed. Trace configuration and its applied result to a version and owner, and make dependencies explicit so the rollback target does not silently become a different object.
- source: Google SRE Workbook, *Configuration Design and Best Practices* (semantic validation, ownership and change tracking, gradual application, and hermetic rollback, https://sre.google/workbook/configuration-design/, retrieved 2026-08-05)

## id: progressive-delivery-observe-before-expansion

- name: Expose a change to a bounded population and observe it before expanding impact
- domain: code
- fits when: Releasing code, configuration, or data everywhere at once could spread defects that test environments do not reveal, and the deployment can separate an exposed population and compare it with a control or known baseline.
- starter:
  - Anti-direction: Do not label a release “progressive” without defining the exposed population, evidence for a good or bad result, and proceed, halt, or recovery conditions. Do not hide candidate failures inside aggregate metrics or automate decisions from signals unrelated to the change. Do not fix one rollout percentage, observation window, or metric for every system.
  - Invariant: First expose the change to a bounded set of users, traffic, instances, regions, or another suitable population and compare it with an unexposed control or known baseline. Connect signals that represent user impact and system health and are attributable to the change to decisions to proceed, pause, roll back, or safely roll forward. Choose population, observation duration, thresholds, and recovery path from the system's risk, load, false-signal exposure, and business tolerance, and establish representativeness before expanding.
- source: Google SRE Workbook, *Canarying Releases* (partial deployment, good/bad evaluation, release-process integration, and representative attributable signals, https://sre.google/workbook/canarying-releases/, retrieved 2026-08-05); Google SRE Workbook, *Configuration Design and Best Practices* (avoid global all-at-once configuration pushes and retain the ability to abort gradual application, https://sre.google/workbook/configuration-design/, retrieved 2026-08-05)

## id: version-skew-upgrade-downgrade-safety

- name: Verify coexisting versions and the actual forward and backward deployment sequences
- domain: code
- fits when: Rolling updates, staged delivery, or independently deployed services cause different versions to communicate and read or write messages, serialized data, files, caches, or shared state, so two versions that each work alone can fail during rollout or rollback.
- starter:
  - Anti-direction: Do not infer compatibility from the one-way check that the new version reads old output. Do not assume redeploying the old binary restores service after the new version writes state the old version cannot read. Do not substitute a single-process, all-at-once update test for production's mixed-version rolling update.
  - Invariant: For every version combination that can run concurrently, maintain a compatibility interval in which both sides can handle RPCs, events, serialization formats, and shared persistent state. In a representative multi-instance environment, use the production deployment topology and order to exercise mixed versions, complete upgrade, and downgrade or rollback in the actual reverse sequence. If forward or backward movement is unsafe, split activation into multiple changes that are each safe; remove the old contract only after affected consumers are known to have migrated.
- source: AWS Builders' Library, *Ensuring rollback safety during deployments* (version skew in rolling deployments, protocol and persistent-state compatibility, upgrade/downgrade testing with the deployment topology, and decomposition into safe changes, https://aws.amazon.com/builders-library/ensuring-rollback-safety-during-deployments/, retrieved 2026-08-05)

## id: backup-restore-data-function-verification

- name: Restore a backup and verify recovered data and critical functions
- domain: code
- fits when: Data, configuration, or system state is backed up to resume business after loss or corruption, but only backup-job success is observed and the completeness, currency, and usability of a restored system have not been demonstrated.
- starter:
  - Anti-direction: Do not treat the existence of a backup file, successful replication, or a green backup job as proof of recoverability. Do not execute the restore procedure for the first time during an incident or declare recovery because recovered data merely opens while critical work cannot resume. Do not assign one restore frequency, RTO, or RPO to every system.
  - Invariant: For state required after loss, perform a representative restore from backup and its dependencies into an isolated destination, verify restoration-asset integrity before use, then verify recovered-data completeness and currency and critical read, write, and business functions. Retain roles, procedures, required resources, escalation, and improvements, and compare measured restore time and data loss with system-specific tolerable downtime and loss derived from business impact. Apply a lighter treatment to ephemeral data that can be regenerated without material impact.
- source: NIST SP 800-34 Rev.1, *Contingency Planning Guide for Federal Information Systems* (business-impact-derived RTO/RPO, recovery from backup, and validation of recovered data and functionality, https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-34r1.pdf, retrieved 2026-08-05); NIST Cybersecurity Framework 2.0 Core RC.RP-03 / RC.RP-05 (integrity of restoration assets before use, integrity of restored assets, and confirmation of normal operations, https://www.nist.gov/system/files/documents/2024/03/25/The_NIST_CSF_2-0_Core_With_Withdrawn_CSF_1-1_Elements.pdf, retrieved 2026-08-05)
