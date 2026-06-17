---
name: intent-status
description: Read-only guidance skill that reads the current state of .intent/ and recommends a summary of where you are plus exactly one "next move". Never creates, modifies, or deletes any file.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: none
---

# intent-status Skill

## Core Mission
- **Success Criteria**:
  - The existence and fill state of the deliverables under `.intent/` (mode, intent-tree, intent-compass, the packets/ index and packet files, the per-packet cc-sdd draft directories, deltas) are read and a summary of the current position is presented
  - The consistency between `.intent/packets/index.md` and the entities under `active/` (a packet missing from the index, a row without an entity, mismatches in name / state / summary), the lingering of files with done / superseded_by filled in inside active/, and the absence of the latest export-log row's packet from active/ (residing in archive) are checked, and violations are reported in the current-position summary
  - Orphan-spec check: when `.kiro/specs/` has a spec that is in progress / done yet cannot be text-matched to any packet under `active/` or any delta in `deltas.md`, it is reported in the details as "possible un-drafted implementation (suspected to have been implemented without going through a Packet)" (candidate presentation, not an assertion; non-matchability is the normal case so false positives are tolerated, and the next-move first-match is not taken away; this check is not performed in environments without `.kiro/specs/`)
  - A leading mini progress rail (all packets laid out vertically with the five signals ✅/🔵/⚪/🔴/◻, each row also carrying `[current stage → next stage(s) to pass through]`) is placed at the top of the report so that "which packet is 🔵 you are here now, which stages each will pass through next, and where the ⚪ remaining work / 🔴 unreflected items are" is visible at a glance. Internal terms (the matching procedure, the integrity check, enforcement terms) are pushed down into the details (later) rather than led with
  - Exactly one "next move" is recommended via the first-match of `rules/decision-table.md`, accompanied by the reason and the judgment basis (which state of which deliverable it rests on)
  - The recommendation candidates are selected from discover / compass / packets / export / validate / improve / writeback / "no action needed"
  - When the enforcement in mode.md is remind or gate, a freshness check via intent-check is performed, and on detecting a violation (`result=stale` on the judgment line, or `pending` of 1 or more) a freshness warning quoting the intent-check stdout is included alongside the current-position summary (when off, unstated, an invalid value, or not executable, no warning is shown, as before)
  - When drift-watch in mode.md is `on`, drift-log is read and a light tally (`caught N / missed N / false-positive N / unjudged N`) is included as one block alongside the current-position summary (when off, unstated, an invalid value, the section is absent, or mode.md is absent, no block is shown and processing continues as before). drift-log is read only and never written (read-only preserved)
  - The section update dates of intent-compass.md (`Updated (Invariants):` / `Updated (Decision Rules):`) and the `updated_at` of the packets under active/ are cross-checked using Read/Glob/Grep only, and when the count of packets that are "not yet caught up after a compass update" reaches the threshold or more, `/intent-validate` is recommended as the right moment (decision table row 12), with its basis (which section was updated, how many are not caught up) included. It does not make a definitive diagnosis but stays at an estimate, and does not propose below the threshold (read-only preserved)
  - No file has been created, modified, or deleted at all (read-only)
  - Major terms in the output always carry a one-line plain-language explanation in the `term (explanation)` form

## Execution Steps

### Step 1: Confirm that `.intent/` exists
- If `.intent/` does not exist, guide the user through the setup procedure (running `npx github:ijust/intent-planner`) and finish.
- Read `.intent/mode.md`. If absent, continue with the standard default and add "mode undetermined; `/intent-discover` recommended" to the Open Questions (do not stop).

### Step 2: Read the deliverables
- Read `.intent/intent-tree.md` / `.intent/intent-compass.md` / `.intent/packets/index.md` plus the target packet files (under `.intent/packets/active/`; in normal processing read only these two kinds and never bulk-read the bodies of every packet file) / `.intent/cc-sdd/<slug>/*.md` (the per-packet draft directories) / `.intent/deltas.md` and grasp, for each, its present/absent/unfilled state and notable points (unresolved Questions, deltas with Status: pending, declined items tagged "on-hold", etc.).
- Packets integrity check: cross-check `.intent/packets/index.md` against the entities under `.intent/packets/active/` (reading only the frontmatter of each entity file) and grasp divergences — a packet missing from the index, a row without an entity, mismatches in name / state / summary — as integrity violations. Additionally, when a packet file with `state: done` or a filled `superseded_by` lingers under active/, grasp that lingering as an integrity violation too (report only; never auto-repair).
- When index.md is absent, build the listing directly from the frontmatter under `active/`, continue processing, and prompt in Step 5 for regeneration of the index (by running a skill that changes the canonical).
- Identify the current Source Packet (latest export) by taking the packet name on the latest row (the last data row) of `.intent/export-log.md` as canonical. Resolution order: (1) explicit user specification → (2) the latest row of export-log (canonical) → (3) the `## Source Packet` heading of the drafts (adopt it only when exactly one packet directory exists; when multiple exist, list each directory's heading as candidates and do not assert) → (4) text matching between the draft bodies and index.md / the packet files (stay at presenting candidates in natural language; do not assert). When export-log.md is absent or its latest row cannot be interpreted and you fall back to (3) or later, include that fact in the Step 5 report. When the current Source Packet (the packet on the latest row of export-log) is absent from `active/` (residing in archive), also include that fact in the Step 5 report.
- Check whether the current packet's directory (`.intent/cc-sdd/<slug>/`) exists. Identification between a packet name and a directory takes "the `## Source Packet` heading in the requirements.md inside the directory matches the packet name" as canonical (slug recomputation stays a fast path for searching; do not identify when the heading does not match).
- Read `.kiro/specs/` only when it exists, and use the spec.json and tasks.md check states of each spec as context. The corresponding spec is identified by text matching the Source Packet name against the spec directory names and the body of each spec's requirements.md "Project Description (Input)" (for the detailed matching rules, follow the footnotes of `rules/decision-table.md`).
- Orphan-spec check (detecting a skipped drafting): only when `.kiro/specs/` exists, grasp as an "orphan spec" any spec that is in progress / done (spec.json is at the requirements phase or later, or tasks.md has one or more checked tasks) yet cannot be text-matched to any packet under `active/`, any packet under `archive/`, or any delta in `deltas.md`. Match by the same means as the existing corresponding-spec identification (text matching the spec directory name and the requirements.md "Project Description (Input)" body against packet names and spec_refs; rules per the footnotes of `rules/decision-table.md`), limited to **what is mechanically observable from files** (do not look at git history, code diffs, or timestamps). Report an orphan spec in Step 5 (3) Details as "suspected to have been implemented without going through a Packet (a skipped drafting phase)". Non-matchability is the normal case (a known limitation in the footnotes), so **do not assert** — keep it to a candidate presentation and let it have no effect on the next-move first-match (the same "report only" temperature as the integrity check; false positives are tolerated).

### Step 3: Check freshness (enforcement-linked)
- Check the `enforcement` value in the `## Enforcement (user-managed)` section of `.intent/mode.md` read in Step 1. When it is `off`, unstated, or an invalid value, do not perform this Step (do not run intent-check and show no freshness warning; current behavior is preserved).
- When it is `remind` or `gate`, run `node .intent/scripts/intent-check.mjs` via Bash. When it cannot run (Bash unavailable, script absent, or exit 2), omit this Step and continue with the existing behavior.
- Trust the judgment line on the first line of stdout — `intent-check: result=<ok|stale|not-applicable> enforcement=<off|remind|gate> commits=<N|-> threshold=<M> grace=<in-implementation|-> pending=<K> block=<yes|no>` — as is, and never re-derive it. Treat it as a violation when `result=stale` or `pending` is 1 or more.
- When a violation is detected, include in the current-position summary of Step 5 a freshness warning quoting the intent-check stdout (the judgment line + the human-readable evidence lines). intent-check is a read-only script (it creates, modifies, and deletes no files), so the read-only nature of this skill is preserved.

### Step 3.5: Drift Summary (drift-watch-linked)
- Check the `drift-watch` value in the `## Drift-watch (user-managed)` section of `.intent/mode.md` read in Step 1. When it is not `on` (`off`, unstated, an invalid value, the section absent, or mode.md absent), do not perform this Step (do not add a drift block and continue as before; current behavior is preserved).
- When it is `on`, **read `.intent/drift-log.md` only via Read / Grep** (never Write; do not change the principle that Bash is limited to launching intent-check) and tally the `outcome` and `user-verdict` of each entry. Count `caught` / `missed` / `false-positive` from the `outcome` values, and `unjudged` from the number of `user-verdict=unjudged`.
- Present the tally lightly, at the same position and temperature as the freshness warning, as one block `caught N / missed N / false-positive N / unjudged N` in the current-position summary of Step 5 (do not overload with information). When `.intent/drift-log.md` is absent, omit this block (do not error).
- drift-log is read only and never written (read-only preserved). Read `missed=0` as "a suspicion of missing records," not as "it worked," and present it without asserting.

### Step 3.6: Estimate the right moment for conformance staleness (read-only)
- Purpose: estimate the "right moment" where compass (Invariants / Decision Rules) was updated but a packet has not yet caught up, as material for recommending `/intent-validate` in decision table row 12. The definitive diagnosis (must-fix/recommended) is made by validate's `invariant-stale-vs-compass` etc.; status stays at an estimate.
- Perform the reads with **Read / Glob / Grep only** (do not use Bash = intent-check; like drift-log, do not widen the read-only scope):
  - Read the ISO 8601 values of the `Updated (Invariants):` / `Updated (Decision Rules):` lines of `.intent/intent-compass.md` (`—` is unstamped).
  - Read the frontmatter `updated_at` of each packet under `.intent/packets/active/` (`archive/` is out of scope).
- Determination: count, as "not yet caught up after a compass update," each active packet for which any compass section update date > that packet's `updated_at`. The comparison is the lexicographic order of the ISO 8601 strings. Target only pairs where both ends are actually stamped, and exclude packets with no `updated_at` (do not fill in by guessing = backward-compatibility discipline). When both compass section update dates are `—`, do not perform this Step (produce no right-moment).
- When the not-caught-up count reaches the threshold (default 1, made explicit in decision table row 12) or more, include in the Step 5 (3) Details, as the basis, "which compass section was updated, and how many packets are not caught up". When below the threshold, do not include it (avoid the boy-who-cried-wolf effect). This Step writes nothing (read-only preserved).

### Step 4: Decide on one next move with the decision table
- Read `rules/decision-table.md` and decide exactly one "next move" via first-match (evaluate top-down and adopt only the first matching row).
- Never list multiple candidates side by side (the reason and basis are listed alongside). Even ambiguous cases where multiple recommendations seem visible are folded mechanically into one by the priority order of the decision table.

### Step 5: Report
Structure the report in the order that gets the reader to "where am I, and what do I do next" by the shortest path. Do not lead with internal terms (the matching procedure, the integrity check, enforcement terms); push them down into the details from (3) onward.

- (1) **Progress rail (leading mini-rail)**: lay out all packets vertically and assign each one of the five signals (✅ reflected / 🔵 you are here / ⚪ not started / 🔴 unreflected / ◻ merged), **followed by `[current stage → next stage(s) to pass through]`**. Both the signal determination and the stage annotation follow the same discipline as overview's `progress-readout.md` "Progress rail" (the five signals cross-check `state` × whether export-log has a row × whether deltas has a corresponding entry via first-match; the stage annotation re-reads packet `state` as a position on the fixed pipeline `discover→compass→packets→export→implement→verify→writeback`; neither computes nor infers). Examples: `P2  🔵 you are here [implementing → next: verify→writeback]` / `P3  ⚪ not started [ready → next: export→implement]`. This makes **"which P is you-are-here now, which stages remain after this, and where the ⚪ remaining work / 🔴 unreflected items are" visible at a glance on a single sheet**. Annotate each signal's meaning per the glossary. The rail is a read-only mirror; status changes nothing.
- (2) **The next move (exactly one, one line)**: present the skill name or "no action needed" **on one line** first, then append the recommendation reason + judgment basis (which state of which deliverable it rests on) concisely. Translate the first-match result of the decision table (`rules/decision-table.md`) into **the action a human takes next**, not into the internal row number.
- (3) **Details (the folded position)**: each deliverable's present/absent/unfilled state and notable points that back the signals in (1); the current Source Packet (the packet name based on the latest row of export-log) and whether its directory (`.intent/cc-sdd/<slug>/`) exists. When packets integrity violations were detected (index ↔ active/ divergence, lingering done / superseded_by, the latest export-log row's packet absent from active/), include their content; when index.md is absent, include the regeneration prompt; when a violation was detected in Step 3, include the freshness warning quoting the intent-check stdout; when drift-watch is `on` in Step 3.5, include the drift-log light tally (`caught N / missed N / false-positive N / unjudged N`) as one block at the same position and temperature as the freshness warning; when conformance staleness's right moment (the not-caught-up count at or above the threshold) was detected in Step 3.6, include the basis "which compass section was updated, and how many packets are not caught up" at the same position and temperature as the freshness warning. When an orphan spec (a suspected un-drafted implementation) was detected in Step 2, include one block with its spec name and the guidance "This may have been implemented without going through a Packet. Even after the fact, raise a Packet with `/intent-packets` (making the unfixed spec explicit as Open Questions / Deferred), then return the implementation reality to canonical via `/intent-writeback` — that is the order", at the candidate-presentation temperature that avoids assertion (it does not change the decision-table result for the next move).
- (4) Open Questions: points that need user confirmation. Confirmation stays at presenting candidates in natural language, leaving the next-action decision to the user (one-way reporting).
- **Unset-or-absent display**: when a deliverable is unset or absent, show it in the `term (explanation): state` form — e.g. `Intent Tree (the hierarchical map of what you want to do): not created` — in plain English so that a reader who does not know the term can tell that the deliverable **does not yet exist / has no content**. Consistency-check violations (a stuck `superseded_by`, divergence from the index, an item remaining in archive, etc.) are shown the same way: annotate the term with its explanation and present in plain English **what is stuck / diverging and how**.

## Always-annotate rule for terms

The terms that appear in the output are annotated with their meaning in the `term (explanation)` parenthetical form, by referring to the "Glossary" below. The concrete conventions are as follows.

- **Always-annotate rule**: the intent-planner-specific terms that appear in status output (deliverable names, state values, check terms, command names) are **kept in English as the canonical form and are never replaced by a translation**. Each term is annotated with a short plain-language explanation of its meaning, written in the `term (explanation)` parenthetical form. The annotation is **not limited to the first occurrence** — it is repeated every time the term appears in the output (status output is a fragmentary report whose visible items vary with the situation, so "first occurrence" is not stable; the priority is that the meaning is clear on the spot, every time).
- **Avoiding redundancy in practice**: even when the same term recurs within a single output and full annotation would be redundant, no item is **left as the bare term**. In list / table item headers, keep the parenthetical annotation; in repeated in-prose mentions, the form may be tightened as long as the meaning remains traceable from context. When tightening the form, the condition is that the term's meaning stays traceable.

### Glossary

The terms that status refers to when producing output, with a one-line explanation (this glossary is kept self-contained within this SKILL).

**Deliverable names**

| Term | One-line explanation |
|------|----------------------|
| Intent Tree | the hierarchical map of what you want to do (L0 = purpose … L4 = candidate work units) |
| Intent Compass | the decision criteria for preventing local optimizations |
| Packets / packet | the work unit before handing off to cc-sdd (broader than an Issue, just before a spec) |
| Source Packet | the packet a draft originated from (identifies the export origin) |
| delta | the diff record used to update a canonical deliverable after the fact |

**state (5 values)**

| Term | One-line explanation |
|------|----------------------|
| state: draft | drafting / undetermined |
| state: ready | ready to start (dependencies resolved, awaiting implementation) |
| state: implementing | under implementation |
| state: verifying | implemented, awaiting verification (Evidence undetermined) |
| state: done | evidence obtained / complete |

**Progress rail (5 signals + stage annotation)** (cross-check a packet by `state` × whether export-log has a row × whether deltas has a corresponding entry, and assign one via first-match. Further, annotate each row with `[current stage → next stage(s) to pass through]`, re-reading packet `state` as a position on the fixed pipeline `discover→compass→packets→export→implement→verify→writeback`. The canonical determination lives in overview's `progress-readout.md` "Progress rail," not in `rules/decision-table.md`, but status's leading mini-rail uses the same five-signal vocabulary + stage annotation)

| Signal | One-line explanation |
|--------|----------------------|
| ✅ reflected | implementation complete and written back into intent (`state: done` and a corresponding delta is promoted/closed) |
| 🔵 you are here | the one stage currently being worked on (of the exported-not-yet-reflected, the current Source Packet = the latest export-log row) |
| 🔴 unreflected | evidence of implementation exists but not yet reflected (of the exported-not-yet-reflected, those other than the current Source Packet = past leftovers) |
| ⚪ not started | not yet exported to cc-sdd (no row in export-log) |
| ◻ merged | merged into a successor packet and done with its role (`superseded_by` is non-empty) |

**Replacement axis**

| Term | One-line explanation |
|------|----------------------|
| superseded_by | the ID of the successor packet that replaced this packet (a separate axis denoting replacement, not a state) |

**enforcement / staleness**

| Term | One-line explanation |
|------|----------------------|
| enforcement | the strength of writeback enforcement (off = no checks / remind = warning only / gate = stops export · push) |
| stale (staleness) | the writeback is out of date (implementation moved on but it has not been reflected back into intent) |
| conformance staleness | compass (Invariants/Decision Rules) was updated but a packet has not yet caught up (status estimates the right moment; the definitive diagnosis is made by `/intent-validate`) |

**drift-watch**

| Term | One-line explanation |
|------|----------------------|
| drift-watch | monitoring of drift (deviation) from intent (off = does nothing / on = matching warnings and recording; both warn only and never stop) |

**The 4 words of the drift tally** (`caught` / `missed` / `false-positive` are **outcome** values, `unjudged` is a **user-verdict** value; do not confuse the kinds)

| Term | Kind | One-line explanation |
|------|------|----------------------|
| caught | outcome | the drift was captured at export (capture succeeded) |
| missed | outcome | the drift could not be prevented and got through |
| false-positive | outcome | it was a false alarm |
| unjudged | user-verdict | a human has not yet judged the validity of the drift (a value of user-verdict, not an outcome) |

## Output Description

**Reader**: a human developer who wants to know, by the shortest path, "where am I now and what should I do next".
**What this makes them grasp first**: (1) from the progress rail, "which packet is 🔵 you are here, and which stages remain after this", then (2) "exactly one next move". Internal terms (the matching, the integrity check, enforcement) are relegated to the details that follow. Compose the output in the order of Step 5 ((1) progress rail → (2) the next move → (3) details → (4) Open Questions).

- (1) **Progress rail** (top, conclusion): lay out all packets vertically and annotate each row with the five signals + `[current stage → next stage(s) to pass through]` (the ⚪ remaining work and 🔴 unreflected items visible at a glance)
- (2) **Exactly one next move** (with the recommendation reason and judgment basis)
- (3) **Details**: the summary of the current position (existence and fill state per deliverable + notable points; includes the current Source Packet and whether its packet directory exists; when an enforcement violation is detected, includes the freshness warning quoting the intent-check stdout; when drift-watch is `on`, includes the drift-log light tally `caught N / missed N / false-positive N / unjudged N` as one block, and when it is not `on`, includes no such block; when conformance staleness's right moment (Step 3.6) is detected, includes the not-caught-up basis as one block, and when below the threshold, includes no such block). Also place here the result of the packets integrity check (the report of index ↔ active/ divergence, lingering done / superseded_by, and the latest export-log row's packet absent from active/; includes the regeneration prompt when the index is absent).
- (4) Open Questions for a human to confirm

## Safety & Fallback
- **Read-only declaration**: never create, modify, or delete any file (the frontmatter does not carry Write; Bash is limited to launching the read-only script `node .intent/scripts/intent-check.mjs` and does not change this property). drift-log is read via Read / Grep only (without widening what Bash launches and without writing to drift-log), and this read-only property is not changed.
- When `.intent/` is absent, guide the user through the setup procedure and finish.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- When enforcement is `off`, unstated, or an invalid value, do not run intent-check and show no freshness warning (current behavior). Even under `remind` or `gate`, when intent-check cannot run (Bash unavailable, script absent, or exit 2), omit the freshness check and continue.
- When drift-watch is not `on` (`off`, unstated, an invalid value, the section absent, or mode.md absent), do not add the drift block and continue byte-equivalent to the current behavior. Even when `on`, when `.intent/drift-log.md` is absent, omit the drift block (do not error).
- When `.intent/export-log.md` is absent or its latest row cannot be interpreted, fall back in order to the drafts' `## Source Packet` heading and then to text matching against index.md / the packet files (text matching stays at presenting candidates; do not assert), and include the fallback fact in the report.
- Works even in environments without `.kiro/specs/` (the applicable row follows the proviso-worded recommendation of `rules/decision-table.md`).
