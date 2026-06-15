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
  - Each packet has Scope / Non-scope / Expected Behavior / Decisions / Safety(Invariants) / Validation / Evidence / Rollback / cc-sdd Mapping (keep `Evidence` as an empty section when there is no result)
  - In each packet's `## Decisions` section, the common-core slots from `decision-slots.md` (plus the mode-specific diffs) are each closed with one of the 4 statuses (answered / undetermined / not-applicable / ADR candidate) (do not fill in defaults; do not silently skip)
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
- Draft each packet as an individual file at `.intent/packets/active/<packet_id>.md`. Read `rules/packet-format.md` and follow it for ID assignment, filling in the frontmatter keys, and the body section structure (including the `## Decisions` and `## Evidence` sections) — the canonical source is the single source of truth for the key set and value domains.
- Read `rules/decision-slots.md` and seed the completeness-schema slots into each packet's `## Decisions` section (the canonical source for the slot definitions, value domains, and IDs is decision-slots.md; this section is its projection).
  - Seed the common-core slots (the 8 IDs seeded in every mode) into every packet, and add the mode-specific diff slots according to `.intent/mode.md`'s mode (standard / refactor / behavior-unknown / feature-growth). The slot definitions are authoritative in the decision-slots.md table; do not hardcode them into the SKILL body.
  - Close each slot with **exactly one** of the 4 statuses (answered / undetermined / not-applicable / send to ADR candidate) (structurally preventing "silently skipping"). Do not fill in a "reasonable default" or "recommended value" (anchoring avoidance). Do not infer or auto-fill a slot's applicability or value from the artifacts (a human declares them).
  - Reflect the posture that discover recorded directly under tree L3 as "points that need a decision (④)" (even when no concrete value exists, treat the slot's existence as something to close).
  - For slots already covered by existing artifacts, do not recreate them; reference their close target (e.g. `decision-fit-criterion` → `## Validation`, `decision-exception-flow` → `## Expected Behavior`, `decision-characterization` → `algo-characterization-test.md`). Do not write the value twice in `## Decisions`; declare that it "is closed in the existing section" (no duplicate definition).
  - For an `undetermined` slot, also note the reason, the caveat for downstream, and the revisit condition (Revisit when). For a `not-applicable` slot, also note the rationale for non-applicability and do not silently drop it.
- Dosage triage (front-load / defer): sort each decision into "a human fixes it up front (visible rule)" or "delegate it to the agent and defer it (hidden / discretion)".
  - A decision that meets any of the 5 front-loading criteria (irreversible / costly to change later; ripples across multiple modules or external users (external impact); makes acceptance tests or observation weak when left ambiguous (acceptance oracle); a security / regulatory floor; binds multiple packets) is **fixed up front**. An architecture-significant decision meeting two or more is sent to the compass's Decision Rules as an ADR candidate.
  - A decision that can be localized inside the design rules and is reversible (cheap-to-reverse) and explorable is kept as `undetermined (deferred, with revisit condition)` and may be delegated to the agent's discretion zone (do not leave it neglected; always note the revisit condition).
  - Front-loading is not limited to "finalizing the decision itself early"; prioritize **front-loading learning, risk discovery, and test-oracle formation** (do not force an early lock-in of the conclusion).
- Fill in `state` declaratively from the 5-value domain in `packet-format.md`. Do not finalize a progression stage (especially `verifying`/`done`) on the AI's self-report alone; base it on a human or a check gate (results from intent-validate / drift-watch). `state=done` presupposes finalized verification results in the `## Evidence` section.
- In `depends_on`, declaratively list the `packet_id`s of the packets this one depends on (default `[]`; never omit the key even when empty). Tools do not infer or compute dependencies.
- In the `## Evidence` section, record the verification result, the date, the check-axis ID (kebab-case ID from `validate-checks.md`), and the source (intent-validate / drift-watch / human confirmation). Evidence is based on check results or human confirmation, not the AI's self-report, and is recorded so the source is traceable. Keep it as an empty section when there is no result; never fill it in by guessing.
- Present an existing packet's `state: active` as a migration proposal to `implementing`, and a missing `depends_on`/`## Evidence` as a lazy-completion proposal (a differential addition of `depends_on: []`), riding on the existing differential-update-proposal discipline (no forced bulk migration; move only; never delete).
- If existing packet files exist, read them and present additions as differential update proposals rather than overwriting or destroying them.
- Reflect the Compass's **project-universal** invariants into each packet's Safety, and draft packet-specific invariants directly in the packet file's Safety / Invariants (do not write them into the compass).
- Read the constraints held in `.intent/intent-compass.md`'s `## Open Questions` as "packet-specific constraints (candidates)". For each candidate that matches this packet's work scope (Scope/Non-scope), confirm it with the user via AskUserQuestion, then transcribe it into that packet file's Safety / Invariants and remove the transcribed entry from the compass's `## Open Questions` (do not leave the hold duplicated). Candidates that match no packet remain held in the compass's `## Open Questions`.

### Step 4: Present priorities and splits
- Indicate the packets' priority.
- Read `rules/walking-skeleton.md` and apply it according to the rule's applicability conditions.
- Read `rules/first-packet.md` and apply it.
- Present split proposals for packets that are too large.
- For packets confirmed by the user, declaratively update `state` from draft to `ready` (ready to start; dependencies resolved) and regenerate `index.md` (see `rules/packet-format.md` for the value domain and the regeneration procedure). Progression to in-progress/awaiting-verification/done (`implementing`/`verifying`/`done`) is done by subsequent declarations based on a human or a check gate.
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
