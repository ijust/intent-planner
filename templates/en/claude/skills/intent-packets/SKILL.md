---
name: intent-packets
description: From the Intent Tree and Intent Compass, build the Packet Plan before handing off to cc-sdd. Each packet has a parent intent and is behavior-preserving / testable / rollbackable. Does not implement.
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Bash
argument-hint: <focus of the decomposition (optional)>
---

# intent-packets Skill

## Core Mission
- **Success Criteria**:
  - There are 3–7 packet candidates, and each packet references a parent intent
  - Each packet is drafted as an individual file under `.intent/packets/active/` (1 packet = 1 file)
  - Each packet has Scope / Non-scope / Expected Behavior / Safety(Invariants) / Validation / Rollback / cc-sdd Mapping
  - Each packet is at a behavior-preserving / testable / rollbackable granularity
  - No existing packet file has been destroyed (changes are presented as differential update proposals)
  - No application code has been changed at all

## Execution Steps

### Step 1: Read the prerequisites
- Read `.intent/intent-tree.md` and `.intent/intent-compass.md`. If either is missing, guide the user to "run the corresponding command first" and stop.
- Read `.intent/mode.md`. If absent, default to standard and announce it in Open Questions (do not stop).
- Read `.intent/packets/index.md` and the existing packet files under `.intent/packets/active/` (the basis for differential updates).
- Legacy-install handling: if `.intent/packets/`, `plan.md`, `index.md`, or `README.md` is missing, the skill creates them itself before proceeding (do not wait for a scaffold reinstall).

### Step 1.5: Legacy packets.md migration
- Detect the legacy `.intent/packets.md`. If it does not exist, do nothing and continue to Step 2.
- When found, split it by packet section (`## Packet: <packet-name>`) and assign each packet an ID of `pkt-<migration date>-<slug>`. Transcribe the frontmatter `name` **verbatim** from the legacy heading's packet name (no reformatting or rephrasing — this preserves the matching key against export-log and existing drafts).
- Classify: a packet that has a row in `.intent/export-log.md` AND a terminal-state (promoted / closed) delta in `.intent/deltas.md` is an archive candidate (fill in `state: done`, leave `closed_at` empty, place it under `archive/<migration year>/`). An exported packet with zero deltas is an active candidate (err on the safe side against a missed writeback). Everything else is an active candidate. For sections whose ownership is unclear, confirm the handling via AskUserQuestion (never discard without confirmation).
- If the Invariants section of `.intent/intent-compass.md` contains packet-specific items, draft a relocation proposal into the corresponding packet file's Safety / Invariants.
- Present the classification plan and the relocation proposals, obtain a single batch confirmation via AskUserQuestion, then execute: place the packet files (if a packet with the same `name` already exists under `active/`, treat it as a migration re-run and confirm with the user instead of overwriting), append the plan sections (Walking Skeleton / Recommended First Packet / Deferred) non-destructively, section by section, to the same-named sections of `plan.md`, and regenerate `index.md`.
- Clean up the legacy packets.md: check whether it is Git-tracked with `git ls-files` (read-only); if tracked, delete it (the content remains in git history). If untracked or git is unavailable, do not delete it — rename it aside to `packets.md.migrated` (non-destruction principle).
- After the migration, report the number of split packets, the list of assigned IDs, the placements, the content relocated to plan.md, and whether compass items were relocated.

### Step 2: Apply the mode definition's algorithm
- Open the mode definition that `.intent/mode.md`'s `definition` points to, and read and apply the algo rule (`rules/algo-*.md`) assigned to the Packet decomposition phase (standard → `rules/algo-example-mapping.md`; refactor → `rules/algo-migration-slicing.md`; behavior-unknown → `rules/algo-example-mapping.md` + `rules/algo-characterization-test.md`). The examples are not exhaustive; the mode definition's table is always authoritative.

### Step 3: Decompose into Packets
- Following Example Mapping, expand each L2/L3 capability into "rules, examples, questions, deferred".
- Derive Expected Behavior, Validation, and Rollback from the examples.
- Consolidate into 3–7 packets. Always give each packet a parent intent (a reference to L0/L1/L2/L3).
- Draft each packet as an individual file at `.intent/packets/active/<packet_id>.md`. Read `rules/packet-format.md` and follow it for ID assignment, filling in the 9 frontmatter keys, and the body section structure.
- If existing packet files exist, read them and present additions as differential update proposals rather than overwriting or destroying them.
- Reflect the Compass's **project-universal** invariants into each packet's Safety, and draft packet-specific invariants directly in the packet file's Safety / Invariants (do not write them into the compass).

### Step 4: Present priorities and splits
- Indicate the packets' priority.
- Read `rules/walking-skeleton.md` and apply it according to the rule's applicability conditions.
- Read `rules/first-packet.md` and apply it.
- Present split proposals for packets that are too large.
- For packets confirmed by the user, update `state` from draft to active and regenerate `index.md` (see `rules/packet-format.md` for the regeneration procedure).
- Supersede: when a plan revision replaces an existing packet with a successor, fill in `superseded_by` on the old packet at the same time the successor packet is drafted, move it to `archive/<year>/`, and regenerate the index.
- **In-flight guard**: if the packet being replaced has been exported (has a row in `.intent/export-log.md`) and has no terminal-state (promoted / closed) delta, warn that implementation may be in progress and do not move it without user confirmation.
- Treat a rename request for an exported packet as a supersede, not a rename (the name-mutability rule in `rules/packet-format.md`).
- Do not make implementation changes.

## Output Description
- The packet files under `.intent/packets/active/` (new drafts and differential update proposals for existing ones; 3–7 packets, each with a parent intent)
- Updates to `.intent/packets/plan.md` and `.intent/packets/index.md`
- Migration report (only when a legacy packets.md was detected: number of splits, ID list, placements, relocated content)
- Packet priorities
- Split proposals for packets that are too large
- The recommendation of the packet to start with first (with reasons)
- The packet to export next (the same packet as the recommendation)
- The command to run next: `/intent-export-cc-sdd`

## Safety & Fallback
- If there is no Intent Tree / Compass, stop and guide the user to the corresponding command.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- Do not drop packets too far down into implementation tasks (above an Issue, before a spec).
- Do not delete packet files (move only).
- Do not execute the migration without the batch confirmation of the classification plan. Do not discard sections of unclear ownership without confirmation. Do not delete the legacy packets.md in non-git projects (rename aside only).
- Bash usage is limited to getting the date/time, directory creation (mkdir) and moves under `.intent/packets/`, and the cleanup of the legacy packets.md during migration (the invariant of not changing application code stays).
- Do not change application code.
