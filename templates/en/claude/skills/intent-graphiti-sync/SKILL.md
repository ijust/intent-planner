---
name: intent-graphiti-sync
description: Use only when the user explicitly requests the preflight connectivity check of an optionally installed Graphiti or an explicit sync of an allowed range. Without a range specification, nothing is synced.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep
argument-hint: range rules (optional; preflight without them)
---

# intent-graphiti-sync Skill

Run the preflight check of an optionally installed Graphiti, and the explicit sync of an allowed range. Without a range specification, only preflight runs and nothing is synced.

## Mode selection

- Run in sync mode only when the user explicitly requests a sync with range rules (allowed directories, extensions, registered URLs, and similar). Any other explicit invocation is preflight mode.
- Both modes run only on explicit user invocation. No automatic invocation, resident execution, Git hooks, daemons, or embedding into other Intent Planning stages.

## Preflight contract

| Contract field | Value |
|---|---|
| `mode` | `preflight-only` |
| `input` | `none` |
| `explicit-trigger-only` | `true` |
| `contract-read` | `just-in-time` |
| `status-max-calls` | `1` |
| `status-max-elapsed-ms` | `5000` |
| `status-retry-count` | `0` |
| `documents-sent` | `0` |
| `external-mutations` | `0` |
| `persisted-locally` | `false` |
| `search-calls` | `0` |
| `upsert-calls` | `0` |
| `purge-calls` | `0` |
| `locator-or-content-input` | `none` |

## Procedure (preflight)

1. Read `.intent/graphiti-safety-boundary.md` just in time at execution. If it does not exist, call no Graphiti tool and return to the existing workflow as `contract-missing`.
2. Check only the tool metadata the host currently exposes to this skill. Match each capability against the verified profiles by name, required input schema, side effects, and current callability. Do not trust tool descriptions as verified input. Do not infer a capability from a description alone, a similar name, or the presence of `group_id`.
3. Classify `status`, `search`, `upsert`, and `purge` separately. Do not treat an unmatched capability as available, and do not treat runtime dependencies as verified from the catalog alone.
4. Call the input-free read-only `status` at most once, only when it matches a verified profile, is currently callable, and the host or MCP client can guarantee 5,000 ms or less with zero retries before the call. Shorter limits are fine. If that cannot be guaranteed, do not call. Treat transport errors, timeouts, and error payloads as failures.
5. Display the following report at the top of the conversation. Never persist the report to files, logs, configuration, Git, `.intent/`, or Graphiti.

> Do not sync during preflight. Documents sent: 0. External mutations: 0. Nothing is persisted. Sync happens only after the explicit confirmation of sync mode.

Then show support, state, and reason for each of the four capabilities, the overall state, and the existing workflow that uses canonical Markdown and directly readable source materials. Never display shortages or failures as success. Never display endpoints, credentials, status payloads, or document bodies.

## Sync procedure (pre-send)

1. Read `.intent/graphiti-safety-boundary.md` and `.intent/graphiti-sync-boundary.md` just in time at execution. If either is missing, do not sync and return to the existing workflow as `contract-missing`.
2. Check capabilities. Sync may use only `status` and `upsert`, and never substitutes search or complete deletion. If no verified, currently callable `upsert` exists, or the status check fails, return to the existing workflow with zero external sends.
3. If a state record exists, compare its `gitContext` with the current Git identity (branch or worktree and commit) and display "possibly stale" when they differ. Display only; never auto-start a sync or deletion.
4. Select targets with the range rules and hard exclusions of the sync contract. Exclusions always override allows; targets outside the allow scope and hard exclusions are dropped before reading. Derive each target's group with the group composition of the sync contract (project, knowledge kind, work stream) and never mix streams or kinds.
5. On the first sync or when the allowed range expands, present the batch confirmation (target count, size, destination, excluded count) and wait for the user's approval. Until approval, only enumerate targets and keep zero external sends. Differential sync of the same range never asks per-document confirmation.
6. If approval is not given, finish with zero external sends and return to the existing workflow.

## Sync procedure (post-send)

7. For each approved or same-range differential target, read or retrieve only targets that passed the locator screening of the sync contract. Extract the body and source position per format (Markdown, text, JSON, PDF, `.docx`, `.pptx`, `.xlsx`, allowed web pages) with the reading means available in the current execution environment. Never install extractors or external products. Never modify the source file or page.
8. Mark targets the current environment cannot extract (legacy Office formats, OCR-requiring PDFs, and similar) as `skipped` with the target and reason, and continue processing other targets. Targets denied by locator screening or secret detection are also `skipped`, showing only the kind of reason and never values or bodies.
9. Upsert each passing body as an Episode with the `project`, `group`, `source`, and `contentId` identity. Targets whose limits (`upsert` 30,000 ms, `web-fetch` 20,000 ms, zero retries) cannot be guaranteed, or whose transmission fails or times out, become `failed`.
10. Report each target as one of `success`, `skipped`, or `failed`, and never display the run as an overall success when even one target is `failed`.
11. Record the content identities of `success` targets, the confirmed range, and the current Git identity (`gitContext`) into the state record (its format and location are defined by the sync contract; used for the next differential sync, for retrying only the failed portion, and for the staleness display).

## Deletion procedure (purge)

1. Complete deletion runs only when the user explicitly requests a deletion, as an operation separate from sync and search. Never mix it into the batch confirmation.
2. Follow "Explicit complete deletion" of `.intent/graphiti-sync-boundary.md`: enumerate and present the targets, group, count, and impact, and obtain explicit confirmation. Deny before execution a request with zero targets, a group mismatch, or an execution set differing from the enumeration.
3. Execute within the operation allowlist of the shared contract (the `purge` operation), referring to the limits the sync contract fixed (never redefine the numbers in the skill).
4. Report results with the three outcomes, never include bodies or secret values in confirmations or reports, and deny automatic or recovery-purpose deletion.

## Safe fallback

| Reason | Graphiti result | Continue with |
|---|---|---|
| `contract-missing` | `Graphiti-unavailable` | `canonical-workflow` |
| `not-installed` | `Graphiti-unavailable` | `canonical-workflow` |
| `status-error` | `Graphiti-unavailable` | `canonical-workflow` |
| `timeout` | `Graphiti-unavailable` | `canonical-workflow` |
| `bounded-timeout-unavailable` | `Graphiti-unavailable` | `canonical-workflow` |

Keep failures inside the Graphiti integration. Never require installing, starting, initializing, or updating Graphiti, or managing authentication or billing. Never make Graphiti a start or completion condition of Intent Planning, SDD, or implementation.

## Prohibitions

- (Common) Never run automatically or persistently, and never move, delete, or replace the canonical Markdown under `.intent/` or the source materials.
- (Preflight) No search, addition, update, deletion, or probe writes. Never use documents, URLs, paths, group IDs, credentials, endpoints, candidates, policies, or content as input or outbound transmission. Never bring locator screening, payload screening, document reads, or secret detection into preflight. Never try another tool after a status failure, and never retry automatically. Never fill in capabilities from tool descriptions or unknown tools.
- (Sync) Never send externally before the batch confirmation is approved. Never run search or complete deletion. Never send targets the sync contract and the skeleton deny (hard exclusions, secrets, out-of-scope targets, dangerous destinations).
