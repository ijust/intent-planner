# intent-planner Feature Guide

This document is a plain reference to what each intent-planner feature is for and how to use it. The README is kept to an overview and situation-based entry points, so open this when you want one more level of detail on an individual feature.

> When you want the "why this procedure" with theory and references, see [docs/theory.md](theory.md) (Japanese). This document covers "how to use it"; theory.md covers "why it is the way it is".

## Table of contents

- [The overall flow](#the-overall-flow)
- [Command cheat sheet](#command-cheat-sheet)
- [What each command does](#what-each-command-does)
- [Recover intent from existing code](#recover-intent-from-existing-code)
- [The files it creates (`.intent/`)](#the-files-it-creates-intent)
- [Modes (switching how to proceed)](#modes-switching-how-to-proceed)
- [Designer-questions](#designer-questions)
- [Perspective review](#perspective-review)
- [Experience-design frame suggestions](#experience-design-frame-suggestions)
- [Screen-design probing and draft](#screen-design-probing-and-draft)
- [Journeys (bundling a multi-packet case, optional)](#journeys-bundling-a-multi-packet-case-optional)
- [Enforcement (checks for missed write-backs, optional)](#enforcement-checks-for-missed-write-backs-optional)
- [Drift-watch (monitoring for drift, optional)](#drift-watch-monitoring-for-drift-optional)
- [Coined-term management (optional)](#coined-term-management-optional)
- [Constraint starters (supplying and accumulating conventions, optional)](#constraint-starters-supplying-and-accumulating-conventions-optional)
- [Domain governance (ownership and execution scope for concurrent sessions, optional)](#domain-governance-ownership-and-execution-scope-for-concurrent-sessions-optional)
- [Handoff to cc-sdd / OpenSpec / Spec Kit](#handoff-to-cc-sdd--openspec--spec-kit)
- [Notes when running it on a loop (`/loop`)](#notes-when-running-it-on-a-loop-loop)
- [Installation options](#installation-options)

## The overall flow

intent-planner is one round-trip loop: before you ask the AI for a sizable implementation, you and the AI work out "what to build / what to protect"; after implementation, you write the learnings back into the documents.

```
1. Organize intent       2. Hand off       3. Implement      4. Write back
discover → compass        export           (in cc-sdd, etc.)  writeback
  → packets                                                   → improve
        └────────────── when in doubt, status / validate ──────────────┘
```

- **1. Organize** — `/intent-discover` (the big picture) → `/intent-compass` (criteria to uphold) → `/intent-packets` (decompose into work units)
- **2. Hand off** — `/intent-export-cc-sdd`, `/intent-export-openspec`, or `/intent-export-speckit` converts a selected work unit into a draft for the implementation tool
- **3. Implement** — hand the draft to cc-sdd / OpenSpec / Spec Kit (intent-planner only goes as far as the draft)
- **4. Write back** — `/intent-writeback` (record and reflect the learnings), and at milestones `/intent-improve` (re-align the whole)

Each step's deliverable is Markdown under the `.intent/` folder. Review it before moving on. **When in doubt, run `/intent-status`** — it tells you where you are and recommends exactly one "next move".

For one continuous flow, ask for **`intent-plan`** or say “Do Intent Planning.” It applies the same rules as the existing commands while moving through discover → compass → packets → export, and waits wherever a human must decide the problem framing, broad criteria, or implementation scope. By default it exports only the first packet and does not start downstream specification or implementation. Use an existing stage command when you want only that stage, or `/intent-status` when you only want your current position.

### Do not hand off important decisions unresolved

When any of purpose, target users, outcomes, scope, acceptance criteria, promises to preserve, or external contracts is unresolved, it is an important decision in its own right. A hard-to-reverse change and an effect on multiple packets are separate additional conditions for an important decision. Whenever it asks, the AI provides an answer proposal, its rationale, and the condition that would change the recommendation. The user chooses one of three outcomes: a decision, out-of-scope for this work, or scope-limited explicit continuation. A bare “OK” or “next” does not count as a decision or explicit continuation.

With scope-limited explicit continuation, the decision remains unresolved and work proceeds only for the authorized item and scope. From reference relationships and other evidence, the AI identifies the downstream effect and will stop only the affected scope, rather than unrelated work.

This check applies to the discover, compass, and packets stages; every cc-sdd, OpenSpec, Spec Kit, natural-language Spec, and direct exit; intent-plan; and work resumed from a packet or implementation. intent-planner can return an implementation-time design problem to the related intent, but we do not manage the state or session of external spec or implementation tools.

Record each important Open Question as one item, for example:

| Field | Example |
|---|---|
| Decision deadline | Before making the packet ready |
| Owning stage | packets |
| Proposed answer | Only administrators can retry |
| Rationale | Preserve the external contract and existing authorization boundary |
| Change when | Retry by general users becomes an acceptance criterion |
| Outcome | continue-authorized |
| Continuation date | 2026-07-20 |
| Item | Build only the administrator retry route |
| Authorized scope | The packet's administrator route and tests |
| Remaining risk | Requirements for general users remain undecided |
| Revisit condition | Before starting a general-user route |

Even when `Outcome` is `continue-authorized`, the Open Question remains `unresolved`. Check again before work goes beyond the authorized item and scope.

| Stage or route | Check timing |
|---|---|
| discover | At the end |
| compass | At the start and end |
| packets | At the start and end, including before ready status and route selection |
| export (cc-sdd / OpenSpec / Spec Kit / natural-language Spec) | At the start |
| direct | Before selection |
| implementation | At the start, and whenever a new important decision appears during implementation |

### Use only what the case needs

intent-planner provides **minimum sufficient steering** for work where design drift, repeated explanation, or integration rework is costly. More instructions are not the goal. The aim is **Less instruction / clearer intent**: fewer prescribed implementation steps, with the intent that must not be lost made explicit. For a tiny experiment where vibe coding is enough, the full flow may be overkill; implement a packet through the `direct` route or skip this layer. No new light mode is introduced.

Runtime information has four levels of binding force. An Invariant cannot be violated; a packet's Scope / Acceptance is required for this change; a Decision is the current design basis; and a Preference / Heuristic remains optional guidance. This enables **bounded autonomy**: the AI proceeds within agreed boundaries and returns only boundary-crossing proposals to a human. When a work unit declares its expected size, a suspected declaration-implementation gap (overbuilt or thin) is warned exactly once during implementation (warning-only by default, strengthenable to a stop via a setting; nothing happens without a declaration). JIT input is also split between **settled inputs** and **recheck candidates** that matter only if implementation makes them real, instead of injecting unrelated history in full.

## Command cheat sheet

| Command | When | In one line |
|---|---|---|
| `intent-plan` | To plan and hand off in one continuous flow | Move from discover through export, pausing for necessary decisions |
| `/intent-discover` | First | Build the overall picture of what you want to make |
| `/intent-compass` | After discover | Build the criteria to uphold (invariants, directions not to take) |
| `/intent-packets` | After compass | Split into work units (packets) that can be handed to implementation |
| `/intent-export-cc-sdd` | When handing off | Convert a work unit into a cc-sdd draft |
| `/intent-export-openspec` | When handing off | Convert a work unit into an OpenSpec draft |
| `/intent-export-speckit` | When handing off | Convert a work unit into a Spec Kit draft |
| `/intent-writeback` | After implementation | Record the learnings and reflect them into the documents |
| `/intent-improve` | At a milestone | Fix the gaps between documents and implementation in bulk |
| `/intent-status` | Anytime you're lost | Tell you where you are and one "next move" (read-only) |
| `/intent-validate` | Before handoff | Check contradictions / gaps / overlaps across documents (read-only) |
| `/intent-overview` | To see the whole | Aggregate scattered deliverables onto one page (read-only) |
| `/intent-from-spec` | When you have an existing spec or fragmentary notes | Surface "unwritten intent" from a spec or notes (read-only) |
| `/intent-from-code` | When only existing code remains | Organize inferred intent candidates with recovery evidence (read-only) |
| `/intent-to-spec` | When you want a readable doc | Write the intent out as one natural-language spec (read-only) |
| `/intent-release-note` | At release | Build a release note that supplies "why it changed" from git history (read-only) |
| `/intent-db-design` | When DB design is involved | Build a DB design draft from intent, invariants, and the existing schema, and inspect it along DB-specific axes (manual activation) |
| `intent-graphiti-sync` | Checking an optionally installed Graphiti and syncing an allowed range | Runs only on explicit invocation; it does not sync during preflight, sync runs only after range rules and an approved batch confirmation, and complete deletion only after an explicit confirmation of targets and impact. Team use defaults to a local Graphiti with a single writer on shared setups. Stage searches run only when needed, read-only, with confirmation on the canonical source; search conditions travel to downstream stages via the export drafts |

The "read-only" commands change nothing, so the AI may run them automatically from context. `intent-graphiti-sync` is the exception: it runs only when the user explicitly requests it. If Graphiti is absent or stopped, existing Intent Planning, SDD, and implementation continue from canonical Markdown and source artifacts. Stage-specific commands that rewrite documents (discover / compass / packets / writeback / improve / export) run only when you invoke them explicitly. `intent-plan` also starts from a natural-language request such as “Do Intent Planning,” but it does not take over a request for a specific stage.

## What each command does

### Planning phase (run these first, in order)

**`/intent-discover` — build the big picture.**
The AI asks you a few questions about your problem or idea, organizes the intent into a hierarchy (L0 purpose … L4 work candidates), and writes it to `.intent/intent-tree.md`. It also recommends and confirms how to proceed (the [mode](#modes-switching-how-to-proceed)) and confirms and records how far to pin things down at the entry point (the [designer-questions](#designer-questions)). When the solution space is still divergent, the AI offers hypotheses, counterexamples, and alternative problem framings, all as provisional. It does not settle the decision: in the next `/intent-compass`, the human decides what is allowed, excluded, and invariant. Later implementation operates only within the resulting compass and packet boundaries.

**`/intent-compass` — build the criteria to uphold.**
It builds the rulers in `.intent/intent-compass.md`, mainly four kinds:
- **North Star** — where this project is headed
- **Anti-direction** — what you've decided not to do
- **Invariants** — properties that must never break no matter what
- **Decision Rules** — records of decisions that keep "compared to what, and why we chose it"

These become criteria handed to the AI on every implementation run, preventing changes that "work correctly but drift from the design intent".

Implementation reads only the `active` Invariants and Decisions relevant to the case's area and impact, not the entire history. Irrelevant or `superseded` decisions stay out of the gate; uncertain relevance becomes a confirmation candidate instead of being silently dropped. Even when a `Revisit when` condition is met, the old decision is not automatically expired or deleted. The old decision, new fact, and matched condition are presented together, and only a human-approved update is applied through writeback.

**`/intent-packets` — split into work units.**
It decomposes the work into units (packets) that can be handed to implementation. Each packet is one file, with a reference to its parent intent, its scope, and the invariants to uphold. It plants easily-missed technical decisions (consistency, idempotency, error behavior, authorization, etc.) as "slots to decide", keeping undecided ones with a reason. It also recommends one packet to start with, with a reason.

### Hand off to implementation (choose one)

**`/intent-export-cc-sdd`** — convert one selected packet into a [cc-sdd](https://github.com/gotalab/cc-sdd) draft. The requirements draft includes the packet's expected behavior and fit criterion (how acceptance is measured) as "acceptance material" (the `## Acceptance Material` section), so the downstream requirements generation can write acceptance criteria without inventing them. The handoff guidance also covers handing over the phase-specific hint files (design.md / tasks.md) when you proceed to the design / tasks phases (even without steering set up, the draft supplies the context).
**`/intent-export-openspec`** — convert one selected packet into an [OpenSpec](https://github.com/Fission-AI/OpenSpec) proposal draft + hints.
**`/intent-export-speckit`** — convert one selected packet into a [Spec Kit](https://github.com/github/spec-kit) specify input + spec hints.

The target depends on the case (it is not hardcoded). The "next move" from `/intent-packets` proposes the exit from the case's exit setting, mode, and prerequisites (presence of `.kiro/` or `openspec/` folders). If it cannot be uniquely determined, it lists candidates. If enforcement is configured, it checks for missed write-backs before handing off.

### Check constraint selection after export

All three exports pass only constraints related to the target packet into the downstream draft. After export, open `constraint-selection.md` in the selected target's output directory: `.intent/cc-sdd/<slug>/`, `.intent/openspec/<slug>/`, or `.intent/speckit/<slug>/`. It is an internal record for reviewing selection, not an input to pass to the downstream specification tool.

1. With `selection_status: applied`, `Selected` lists the constraints passed downstream and `Confirmation Candidates` lists candidates requiring human confirmation. Zero selected constraints is a valid result. Use `sources` to see the canonical material read, and `source_mode` plus `degraded_reasons` to see how sources were read and why the run degraded.
2. For a confirmation candidate, `kind` distinguishes uncertain relevance from missing information needed for the downstream projection. Read `evidence` (what is known) and `missing` (the missing information), then have a human confirm that missing information. Do not move a confirmation candidate directly into `Selected` or a downstream MUST, Invariant, or acceptance criterion.
3. Based on that confirmation, update or correct canonical material such as the Compass or packet through its normal approval path, then run the same export again. Re-export replaces both the draft and the selection record with the contents of the same run. Do not resolve it by manually appending to `constraint-selection.md` or the downstream draft.
4. When `source_mode` is `mixed-compass` or `legacy-compass` and `degraded_reasons` contains `index-missing`, `split-store-missing`, or `symbol-missing`, a run that could use the execution contract still has `selection_status: applied`. Review its selected constraints and confirmation candidates as the result produced from the available split Compass and legacy Compass sources.
5. `selection_status: legacy-not-applied` means the execution contract was absent and the new common selection was not applied. Do not treat `Selected` or `Confirmation Candidates` as selection results; continue with the existing downstream output named under `Legacy Output`. If you need the new selection result, place the execution contract and re-export.

### Maintenance phase (after implementation)

**`/intent-writeback` — write the learnings back.**
The learnings from implementation (newly decided things, invariant violations, implicit behavior, resolved deferrals) are first recorded in `.intent/deltas.md` as "deltas" (candidate diffs). At this point the original documents are not rewritten. Only items you approve are reflected into the Intent Tree / Compass / Packets. The approval effort varies by the kind of learning: only heavy learnings that change decision criteria are confirmed one by one; for the rest, "specify only the items to stop, and the remainder is applied in bulk".

### Record post-release outcomes

In addition to an implementation learning, `/intent-writeback` can record what happened for users after release. It uses this path only when the user explicitly says they are recording an outcome learning.

1. Add one `Outcome measure:` line to the target L1 in Intent Tree. It says how you will know that user value appeared. It is separate from `Measurement criteria:`, which supports development acceptance, and `Verification oracle:`, which checks whether a protected promise broke.
2. Give `/intent-writeback` the outcome learning. Choose `value delivered | value not delivered | not known yet`, summarize the result without pasting raw data, and add the provenance fields `Who measured`, `When measured`, and `Where measured`.
3. The record is first appended to the Packet-scoped delta as `pending` (awaiting approval). Intent Tree is unchanged at this point. A later observation is appended without overwriting the earlier one.
4. After a human approves it, the latest result and summary are reflected in the target L1's `Outcome learning:` line. A declined record remains in history but does not change the L1.
5. `/intent-status` and `/intent-overview` show `awaiting post-release results` when a measure exists without an approved result. When a result exists, they show the result value and summary instead. A pending record is never treated as confirmed.

When provenance is incomplete, `outcome-provenance-missing` (the warning for missing provenance on an outcome record) names the missing fields. It does not stop recording, approval, or validation. This feature does not fetch outcome data from external services or automatically judge numeric results; it handles only a human-reviewed summary. It also does not automatically merge the record into bug triage.

**`/intent-improve` — re-align the whole.**
At a milestone after several packets or before a release, it cross-checks `.intent/` against implementation reality on three axes — completeness / correctness / coherence — and proposes corrections for the gaps. Corrections are applied only after approval. It catches the "in the implementation but not in the documents / in the documents but at odds with the implementation" that per-packet writeback cannot.

### Read-only commands (anytime)

They change nothing, so they're safe to use.

- **`/intent-status`** — leads with exactly one **thing the human decides next**, then separates **Process health**, **Unresolved design decisions**, and **User outcomes**. In the progress rail, each short ID is followed by the Packet name; names longer than 32 characters are truncated there and remain available in full under Details. A healthy process is not treated as proof of a successful outcome; without explicit evidence, user outcomes remain **unobserved**. The progress rail, Candidate Packets, and dangerous notices remain, while supporting detail moves behind the main summary. It never collapses these dimensions into an overall PASS or score.
- **`/intent-validate`** — before handoff, reports contradictions / gaps / boundary overlaps across documents with severity. It also checks vague wording and whether the Compass criteria reach every packet.
- **`/intent-overview`** — aggregates the deliverables across the board and shows a tree diagram, a progress rail, progress, and gaps on one page. It also keeps Process health, Unresolved design decisions, and User outcomes separate; absent outcome evidence remains unobserved. Specifying "for a new member" produces a separate five-part entry page for a newly joined member — the purpose and success criteria, the main decision criteria, work in progress, key terms, and a reading order.
- **`/intent-from-spec`** — takes an existing spec (PRD, issue, etc.) or fragmentary notes / scribbles / voice transcripts and surfaces the unwritten intent (invariants, assumptions) as "gaps" measured against the rulers. Fragments are first bundled by topic and sorted into "decided / undecided" before extraction, so you can step into the intent entrance even while your head is still scattered. Extractions are presented as hypotheses.
- **`/intent-from-code`** — reads an existing codebase when no specification remains and organizes intent candidates, invariant candidates, and gaps as inferred items with recovery evidence under `.intent/code-ingest/`.
- **`/intent-to-spec`** — writes the intent out as one readable natural-language spec. Statements without support are marked "inferred" to prevent fabrication. You can choose how deeply to write (output depth: brief / standard / detailed); if unspecified it asks once before generating (an axis orthogonal to range and shape — choosing "detailed" produces a deep document that draws on the packet body as material; reader-narrowed shapes — one-pager, status report, decision memo — are thickness-fixed and do not apply output depth).
- **`/intent-release-note`** — reads the git commit history, matches each commit against intent to supply "why it changed", and builds a release note. Commits not tied to intent are kept as thin lines to surface the gap between documents and implementation. Specifying "trajectory note" (`trajectory`) builds an inward-facing sheet at `.intent/release-note/trajectory.md` that retraces "when, what was decided, what changed" from the change history under `.intent/`, newest first (changes with no recorded reason are marked "no recorded reason").

### Recover intent from existing code

`/intent-from-code` directly reads code within the confirmed scope and records intent candidates as inferred, backed by files or symbols verified in the current code. Local read-only analysis already available in the target project, such as CodeGraph, may be used as an optional aid to find symbols, references, call paths, and dependency directions and to narrow the locations to read. Installing such a tool is not required: `/intent-from-code` works as-is in an environment with none.

Installing, initializing, updating, synchronizing indexes, or managing analysis state is neither an intent-planner responsibility nor an intent-planner dependency. No particular product name, API, or command becomes part of the common contract. Even if a capability is registered in the host, it is unavailable when the current skill permissions cannot call it. If it cannot be used, the skill falls back to direct code reading.

Analysis output alone does not determine or confirm intent. After analysis identifies a possible location, the skill checks the current code and cites the verified file or symbol. If output is stale, incomplete, or conflicts with the current code, the current code prevails; material that cannot be verified is omitted as a candidate or left unverified. Analysis never silently expands the confirmed scope, and the skill asks before reading beyond it.

### DB-design view (manual activation)

- **`/intent-db-design`** — for a packet that designs a persistent data model, reads the three layers of intent, invariants, and the existing schema (migration/DDL), and builds a DB design **draft** under `.intent/db-design/` — table definitions, constraints, indexes, and naming — tracing each statement back to its projection source (statements without support are marked "inferred" / "unverified"). The output is a design draft, not requirements, and is not mixed into the export (requirements). It also inspects DB-specific axes (normalization breaks, missing indexes, N+1-inducing schema, missing constraints, naming consistency), conformance to invariants (immutable, etc.), and irreversibility (the migration cost after data lands) — all warn-only, non-stopping, non-modifying. After implementation, `/intent-validate` finds the drift between "draft vs. the actual schema" and `/intent-writeback` records "why the design ended up different". Activation is manual; `/intent-status` may recommend this command but never runs it automatically.

## The files it creates (`.intent/`)

All of intent-planner's deliverables are Markdown under the `.intent/` folder. The principles: "one unit = one file", "separate active from done", "separate the team-shared canonical history from personal work artifacts".

```
.intent/
├── intent-tree.md        # the intent hierarchy (L0 purpose … L4 work candidates)
├── intent-compass.md     # criteria: North Star / Anti-direction / Invariants / Decision Rules
├── compass-archive.md    # where overturned decision rules go (history; one of the split records below)
├── packets/
│   ├── index.md          # list of in-progress packets (auto-generated; don't edit by hand)
│   ├── plan.md           # plan-level records
│   ├── active/           # in-progress packets. 1 packet = 1 file
│   └── archive/<year>/   # done / superseded packets. they move here, never deleted
├── cc-sdd/<slug>/        # drafts handed to the implementation tool (local, Git-untracked)
├── deltas.md             # the catch-all for learnings (reflected into documents after approval; one of the split records below)
├── export-log.md         # history of handoffs (1 line = 1 handoff; one of the split records below)
└── mode.md, modes/       # records and definitions of how to proceed
```

> **The append-only records (deltas / export-log / drift-log / compass-archive) are split.** The single files like `deltas.md` above are the "thin current projection (a generated mirror)"; the actual entries split by natural key into **one file per unit** (e.g. `deltas/<unit>.md`), and finalized past entries move to `deltas/archive/`. This structurally removes tail-write collisions during concurrent work, delegating history to git and `archive/`. Reading the scattered records as a whole is machine-generated by `/intent-overview`, which shows the active side and archive split (no need to aggregate by hand).

### What you touch, and what you leave to the commands

| How you're involved | Target | What you do |
|---|---|---|
| **Read and approve** | packets in active/, learnings in deltas.md, criteria in compass | Approve/edit the proposals the commands present. This is the human's main job |
| **You may write directly** | answers to Open Questions in tree / compass | Edit directly, or tell it in conversation and it's reflected on the next command run |
| **Don't touch (auto-managed)** | index.md, export-log.md, drafts in cc-sdd/ | No manual editing needed |

### Packets never disappear

A packet is born as one file in active/, becomes in-progress on your approval, and moves to archive/ when implementation and writeback are done. A packet replaced by a plan revision remains as "superseded". **Nothing is deleted, so no past judgment is lost no matter how many times you redo planning.**

### Git: just commit as usual

Almost all of `.intent/` is committed (the team-shared canonical history). The local artifacts (drafts under cc-sdd/ and the issue directories under `.intent/discovery/`) are handled by the installer setting up `.gitignore` automatically, so **you never have to think about Git config**. "Which packet was handed off" is decided identically for everyone by the committed `export-log.md`, and no merge conflicts occur.

The selected mode and how you're pinning the work down (state that varies per person and per session) is saved locally in an **issue directory** that `/intent-discover` creates on each run: `.intent/discovery/<slug>-<rand>/mode.md`. discover prints that issue directory's name, and the later skills (`/intent-compass`, `/intent-packets`, etc.) **carry that name forward** to read their own `mode.md` (parallel sessions get separate directories, so modes never collide). The old single-file form `.intent/mode.local.md` remains as a backward-compatible read fallback (used only if no issue directory is found). Only the team-shared enforcement / drift-watch settings are committed in `.intent/mode.md`.

## Modes (switching how to proceed)

You can switch how you pin down the intent as a "mode" to match the project situation. `/intent-discover` looks at the situation, recommends one, and records it.

- **standard** — the default general-purpose mode. For new products, and for not-yet-verbalized feature areas inside an existing project
- **refactor** — for refactoring / redesigning an existing large project. Includes steps to reverse-engineer intent from code
- **behavior-unknown** — for legacy with no spec documents and unknown behavior
- **feature-growth** — for adding features to a running system. Includes impact analysis and decomposition into addition units
- **non-code** — for non-program deliverables (documents, operations, research). Switches to a path that produces a readable deliverable without going through cc-sdd/openspec

A new mode can be added by dropping one file into `.intent/modes/` (see `.intent/modes/README.md`).

If you choose `non-code` and run `/intent-to-spec` with a non-program exit, a readable deliverable (article outline, operations manual, research brief, etc.) is produced under `.intent/nl-spec/` without going through cc-sdd/openspec.

## Designer-questions

As an axis separate from the mode, you can choose **how far to pin things down** at the entry point. `/intent-discover` explains what the flow will ask on your behalf (measurable success criteria, whether to thread an E2E first = walking skeleton, a screen rough if there's UI, and for validation cases the hypothesis and GO/NO-GO), then confirms and records whether to enable them.

- Turning it **on** enables the three common questions (measurable criteria, walking skeleton, screen rough) and the checks. It also confirms "PoC or production", and for a PoC adds questions about "what observation would reject the hypothesis (falsification criteria)" and the GO/NO-GO criteria.
- When **off**, the only addition is one question asking whether to enable it.

When questions are on, `standard` closes applicable concerns about purpose, target user, scope, success criteria, promises to preserve, overall structure, and hard-to-reverse decisions. You can explicitly choose **deep** to additionally work through major-feature behavior, preconditions, edge cases, counterexamples, performance, and failures in operations.

The number of questions is not fixed or set in advance. A detailed correction can require zero questions; a vague concept can require several batches. Both depths ask at most 4 questions per batch, but that is a readability limit, not a limit on the total number of questions or rounds. Before each batch, the flow states what has been confirmed and what remains. If you stop questioning, it asks no new questions and does not pass a scope affected by an important unconfirmed concern to the next stage; only scopes shown to be unaffected continue. New concerns require a source in your answer or material that was read, must not duplicate an existing concern, and must remain within the selected depth and scope.

Regardless of on/off, when it judges that the request nearly uniquely determines the target shape (turning it into a cron job, a CLI, etc.), it doesn't make you detour through neutral options — it confirms in one question: "the shape you're aiming for is this, right?"

## Perspective review

Perspective review is available when you accept designer questions and choose deep review. For detailed review, use it only when `deep` is selected. The `deep` setting is the only depth that starts this detailed review; disabling designer questions or choosing `standard` keeps the existing question volume. The feature does not act out job personas. It reads the same specification separately through the product-decision perspective, the delivery-coordination perspective when applicable, and the experience-design perspective. These are responsibility ranges, not a closed list of professions, so another specialist perspective may be added when the project needs it.

- The product-decision perspective checks the problem and evidence, target users and context, alternatives, offered value and its success signal, priority, scope, exclusions, and trade-offs.
- The delivery-coordination perspective applies when any one of these conditions is present: multiple people, multiple workstreams, an external dependency, a deadline, an approval, a handoff, or release coordination. It checks the decision-making role, dependencies, order, approval points, risks, alternatives, release conditions, and rollback.
- The experience-design perspective checks the journey before, during, and after use; touchpoints; user-visible and backstage support; waiting; handoffs; failures; drop-off; resumption; accessibility; user-facing language; and tone.

For example, in a solo project with none of those conditions, delivery coordination is `not applicable`, so there are no delivery questions. A solo project with a deadline does use the delivery-coordination perspective. A team working under an external approval also uses the delivery-coordination perspective to clarify the decision-making role, dependencies, approval points, release conditions, and rollback.

When a perspective has an owner, questions are directed to that owner. When a perspective has no owner, AI explicitly states that it is standing in and gives a provisional answer with its basis. Each answer is marked as a `confirmed fact`, `grounded inference`, `unverified`, or `not applicable`. An AI answer without a basis remains unverified; the review never invents market research, user interviews, or usage-data analysis.

When perspectives conflict, their judgments, bases, unresolved information, and the role needed for the human decision remain separate. The review does not automatically merge them into one confirmed specification before that decision. It uses the existing deep conversation: each batch contains a maximum of four questions. You can stop in any batch; the review asks nothing further and sends every remaining unverified concern to Open Questions.

An experience-design frame is an optional organizing tool, not a prerequisite for perspective review. Without adopting a frame, the review still checks touchpoints, failures, and backstage support. It does not decide screen information priority, navigation, layout, or visual direction; those belong to later visual-design work.

### Supplementing a specialist perspective missing from internal material

When an important case decision needs a specialist perspective that has no basis in internal practices, question packs, design frames, adopted perspectives, or user-provided material, external research becomes a candidate regardless of whether the depth is `standard` or `deep`. Before any request is sent, the flow shows the missing perspective, decision to close, exact outgoing wording, outgoing-information boundary, method, and expected load, then obtains explicit approval. Nonpublic, personal, or confidential outgoing information is shown separately and needs separate approval.

Research uses a detailed method available in the current environment without fixing the workflow to one provider. When no method is available, access is refused, execution fails, or evidence is missing, the flow offers only an `unconfirmed` role-framed provisional proposal. Results remain sourced perspective and question candidates under `.intent/research/<date>-<topic>/`; nothing is auto-written into the Intent Tree, Intent Compass, or a packet before a person adopts it.

## Experience-design frame suggestions

`/intent-discover` suggests established frames only when an experience-design viewpoint fits the case, using the existing role lens as its cue. The five available frames are Persona, Jobs to Be Done, Customer Journey Map, Service Blueprint, and User Story Mapping. It limits the list to clear fits and gives a one-line reason for each candidate. When experience design is irrelevant or the fit is weak, it adds nothing and the existing flow continues.

After seeing the candidates, a person decides whether to adopt, decline, or defer each one. It does not generate a file before adoption. Only an adopted frame produces a derived Markdown draft at `.intent/nl-spec/design-frame-<frame-id>.md`. The draft may contain inferences and can be regenerated; it is reference material, not a source of truth. It does not automatically change the Intent Tree, Intent Compass, or packet.

In Compass, the "Experience promise" category covers four perspectives: tone and voice, accessibility, stance during errors, and perceived speed and processing-state feedback. It starts by considering what happens when the normal path fails, including whether the language avoids blaming the user and makes the next action clear. These remain proposals: only content a person adopts can enter the existing classification as a candidate criterion.

This feature is limited to preparation before implementation. It does not generate images or diagrams. It does not measure behavior through analytics. It does not add experience-stage fields or views. It does not add numeric priority, date commitments, or progress percentages.

## Screen-design probing and draft

For cases that include user-facing screens (UI), you can probe the design of the screens themselves in dialogue before implementation, separately from the whole service experience. It starts only for cases that accepted the probing questions (designer-questions) and either chose deep or adopted "the perspective that designs the screens" through the role lens. For cases with no UI, cases that skipped the questions, and standard cases that did not choose screen examination, neither the questions nor the artifacts grow.

For each main screen it confirms the screen's purpose and the user's next action, the information priority, the key states (normal, empty, loading, failure, insufficient permission, completed), navigation between screens, layout with mobile support and accessibility, and the visual direction with references to draw on and expressions to avoid. It does not end on vague words such as "simple" or "modern" alone; it opens them up into information density, whitespace, the role of color, and the order of emphasis. If the frontend starter catalog exists (accessibility, mobile-first, state design, design tokens, and so on), it matches read-only and mentions only strong fits as candidates (a person decides adoption). Questions start from the unsettled points whose answer changes the outcome most, in the order overall direction → screen structure → details (a question strategy grounded in source-verified research; the amount of questioning and the deferrable guardrails stay unchanged).

The answers come together as a screen-design draft at `.intent/nl-spec/screen-design-brief.md`. It separates confirmed content, inferences (inferred), and unverified points, and keeps the visual direction as multiple inferred candidates or unverified when there is nothing to draw on (it never fixes a brand or trendy look on its own). It does not generate images, a design system, or a brand guide. When an existing screen rough exists, that material wins and no contradicting inference is added. The reference to the draft is recorded in the intent-tree's "Screen Rough Reference", so the spec generation (`/intent-to-spec`) and the exports carry this draft through the existing route unchanged.

After the draft is settled, it asks one question — whether to also build a viewable, clickable mock — and generates one at `.intent/nl-spec/screen-design-mock.html` only when the user wants it. The default is a single self-contained HTML file (no external resources) viewable just by opening it; for cases such as mobile apps the screens are presented inside a device-frame viewport (the format is not fixed to web/HTML, and another format is chosen only when explicitly asked). The key states settled in the draft (empty, loading, failure, and so on) can be switched inside the mock. While the visual direction is still unsettled, the mock starts with multiple switchable theme proposals to compare, and once one is picked the loop iterates on that single proposal (with no mechanical run condition). Revision requests update the same file, and the loop continues until the requester's agreement or an explicit stop (the AI never cuts it off by declaring satisfaction on its own). Each round leaves a light record (what changed, the requester's reaction) in the mock's comment, and "go back to the previous one" regenerates that state from the record (only the current version of the file is kept; no version files accumulate). The mock's reference is recorded alongside in the "Screen Rough Reference", and the mock is never written into the app's source (implementation remains the downstream stage's job).

Before the mock is presented it passes the **critique gate** — the AI's self-check against established design principles put into checkable, sourced criteria (line length, visual hierarchy, contrast, and so on). What can be fixed is fixed before presenting; what cannot is never hidden but stated explicitly with its source. The judgment is made by the AI reading the mock for meaning, with no scoring scripts (only calculations defined by public standards, such as the WCAG contrast ratio, assist). When a preference the requester stated conflicts with a criterion, the gate adds one sourced note and the decision stays with the requester.

## Journeys (bundling a multi-packet case, optional)

When one case splits into several units of work (packets), "the order of the steps", "the contracts several packets jointly protect, with their integration-time checks", and "the completion judgment for the case as a whole" cannot be written into any single packet. A journey is the unit that bundles the whole case into one file.

- **How one gets created** — Only when a case splits into two or more packets, `/intent-packets` asks a single question — whether to draft a journey that bundles them — and creates `.intent/packets/journeys/<slug>.md` only when you approve. If you decline or defer, nothing is created and the flow continues as before. For a case one packet can cover, it never asks (no bundling for its own sake).
- **How to read and write it** — One journey = one file (git-tracked, shared with the team). The frontmatter has only seven entries, including the list of constituent packets. The step order, the jointly protected contracts, and the integration-time checks go into the body in free form. It is plain Markdown, so editing it by hand is fine.
- **Progress is not written in the file** — Each packet's `state` is the source of truth, and `/intent-status` derives each journey's current position from it every time. The `/intent-overview` roadmap can additionally group the constituent packets by journey, and `/intent-validate` also cross-checks the journey for missing owners of jointly protected contracts and missing integration-time checks. Writing the same fact in two places makes them diverge, so the journey deliberately holds no progress.
- **You are the one who closes it** — Once you confirm all constituent packets are done and the integration-time checks are green, change `lifecycle:` to `archived` and move the file to `journeys/archive/<year>/` (never delete it). No command closes a journey automatically.
- **You can skip it entirely** — With `journeys/` absent or empty, every command works exactly as before.

> Note: this is different from the "Customer Journey Map" in [Experience-design frame suggestions](#experience-design-frame-suggestions). That is the name of an established method for charting a user's experience; this is a planning container that bundles units of work.

## Enforcement (checks for missed write-backs, optional)

If you skip the post-implementation `/intent-writeback` and move on, `.intent/` quietly drifts from implementation reality. Enforcement is an **optional** layer that mechanically detects this "missed write-back execution". **The default is off**, and nothing changes unless you configure it.

There are three strengths. Switch by directly editing the "Enforcement" section of `.intent/mode.md`.

| Value | Behavior |
|---|---|
| `off` (default) | No check |
| `remind` | Warn only on detecting a miss. Doesn't stop |
| `gate` | Stop export / push on detecting a miss |

What's checked is mainly "learnings recorded but left unapproved / unreflected (pending deltas)". If you want a checkpoint at push, adding `--enforce` at install time also places a pre-push hook. If you want a checkpoint at PRs, adding `--with-ci` places a GitHub Actions check template (`.github/workflows/intent-planner-check.yml`): the writeback-staleness check only shows a warning and never fails the PR, while your own tests activate once you rewrite one line in the template and fail the PR when red. It runs on script-based checks alone — no API keys — and a normal re-run never overwrites an existing file of the same name (except `--force` / `--update-shared`).

> Enforcement guarantees only that "the write-back **procedure** was executed", not the correctness of what was written back (that's the job of `/intent-improve` and human review). Because false positives structurally remain, the default is off. Even if it stops, an explicit instruction to continue lets export run, and push can pass with `git push --no-verify`.

## Drift-watch (monitoring for drift, optional)

Even after you set the intent, the more you implement, the more it can drift from the original intent (e.g. the AI over-fitting to virtues like "split it and decouple it" and producing a structure more complex than the intent). Drift-watch is an **optional** layer that catches this drift **before it fully derails**. **The default is off.** Setting the "Drift-watch" section of `.intent/mode.md` to `on` enables it.

When `on`, light hooks are inserted into three stages.

| Stage | What it does |
|---|---|
| `/intent-discover` | Before starting, match the "situation prone to drift" against a type catalog, name it, and have you write the directions to uphold first (prevention) |
| export time | Just before handoff, check against the Compass criteria and warn if off. Also check whether the implementation instruction exceeds the handed-off packet's scope (interception) |
| `/intent-improve` | At a milestone, record the drift and produce a report tallying what worked / didn't (after the fact) |

**All of these warn only; they don't stop** (because false positives are assumed). Detections are merely recorded locally in `.intent/drift-log.md` and are never sent externally. The records keep "prevented / caught" and "missed / false-positive" symmetrically, structurally avoiding the confirmation bias of keeping only convenient records.

When drift-watch is `on`, `intent-status` tallies the records across all five outcomes — `prevented / caught / missed / false-positive / not-applicable` — plus `unjudged` for entries awaiting human judgment. Zeroes remain visible for stable comparison. Missing or unfamiliar outcome values are shown separately as `unknown` instead of being guessed into a known category.

The type catalog (`.intent/drift-patterns.md`) is not exhaustive — it's meant to be grown by adding the drift types you hit in your own work.

## Coined-term management (optional)

The more you use it, the more the AI tends to invent words not in "the agreed correct vocabulary" (coined terms); a fractured vocabulary breaks the very intent alignment. intent-planner manages coined terms by **prevention, detection, and rephrasing**.

- **The canonical glossary** — `.intent/glossary.md` (correct terms + spelling variants + a one-line explanation) collects "this is the correct term". It's a glossary you grow; no command ever rewrites it on its own (a tool may only write on your behalf what you approved, one term at a time).
- **Term status (optional)** — each row can record how far the team has agreed on the term: `approved` (a common term the team agreed on) / `provisional` (someone's provisional term) / `rejected` (a term you decided not to adopt). **Everything works as before if you write no status** (a row without one is read as provisional, and older 3-column glossaries stay valid as they are). Keeping a rejected term in the glossary — instead of deleting the row — lets you notice when the same word gets invented again ("a reinvention of a term we already turned down"). Registering a term, and promoting it from provisional to approved, happen **one term at a time, after checking its one-line explanation** (there is no bulk approval).
- **Lightweight detection and rephrasing (when no term-drift placement exists)** — when the repository has no project-local term-drift artifact, `/intent-validate` keeps its legacy behavior: it names words not in the glossary as "suspected coined terms" and attaches a rephrasing suggestion to a canonical term. **It warns only; it doesn't stop.** Proper nouns, existing English technical terms, and legitimate new words with a one-line explanation on first use are excluded. Rephrasing is reflected only after your approval.
- **Prevention** — the distributed convention document (CLAUDE.md / AGENTS.md) includes the discipline "don't invent words not in the glossary; if you do, attach a one-line explanation on first use". On top of that, there is a check **right before a question goes to you** (does it stand on its own? is it overloaded with jargon? did every identifier get a plain-words gloss? did a narrowly-loaded ordinary word ("stand-in") get its first-use gloss?), a check **right before a report goes to you** (progress, completion, items needing confirmation — internal notes are restated in plain words rather than transcribed; identifiers come after a sentence that stands on its own, as trailing references, and are never deleted for the sake of plainness) and a line **bundled into the draft handed to the downstream spec tool** ("write the documents and questions generated from this spec in words a first-time reader understands"). Instructions fade as the context deepens, so prevention is always paired with an after-the-fact check.
- **Ordinary words loaded with a narrow meaning** — words like "stand-in" or "delivery" that look ordinary but carry a tool-specific meaning are never replaced; instead they arrive with a one-line plain-words gloss at their first mention in a conversation or document (once only; everyday words used in their everyday sense are left alone). The role-lens confirmation in discover (person / stand-in) has these glosses written directly into its question wording, and frequent cases can be registered in the glossary with a rewording example.
- **Precision principle** — the right-before-output checks also include "do not convey meaning only through a metaphor or an ungrounded vague qualifier (e.g. 'significantly'); pair any metaphor with a precise restatement right after it, and never force established technical terms or everyday words into strained paraphrases". Precision is the foundation; plain language is the means of staying easy to read while preserving it. The same principle covers how internal records (such as work packets) are written, and the language-discipline line bundled into downstream spec drafts adds "distinguish requirement levels (must / must not / should / may) with explicit words".
- **If your terminology is already full of coinages (a bundled separate tool)** — [term-drift](https://github.com/ijust/term-drift) finds not only words missing from the glossary, but also ordinary words borrowed into an in-group meaning. Guided review keeps human decisions group by group; when the user explicitly delegates a bounded scope, the agent may decide low-risk rewrites. term-drift 0.3.6 is an exact npm dependency installed by default; normal setup passes the selected agent to the official installer or update, which places `./.term-drift/` and the dedicated skill project-locally under the owner's policy. Version 0.3.6 centralizes detection and workflow semantics in the rule files and removes duplicated guidance from the dedicated skill loaded on every invocation. A tracked file with unstaged changes may be updated when the source text matches uniquely, preserving unrelated edits. An untracked file remains blocked unless the user explicitly approves that path after the recovery risk is explained. Its new application record distinguishes human approval from delegated judgment and records the decision time and delegation scope. Unresolved meaning and legal, security, public-API, or runtime-sensitive wording still require human review. When a placement is found, `/intent-validate` does not judge terminology or compatibility itself; it guides you to run `npx intent-planner . --agent <selected-agent> --dry-run` and inspect health and the planned operation through the normal installer. Start the full terminology inspection from the selected agent's dedicated term-drift skill only after health is `ready`. The dedicated path does not replace `/intent-validate`'s structural checks, but terminology inspection after placement has one entry: the dedicated skill.

## Constraint starters (supplying and accumulating conventions, optional)

Writing Anti-directions / Invariants (what to protect, what you don't want done) from scratch every time in `/intent-compass` is hard work. intent-planner offers domain conventions (e.g., "always build SQL with placeholders," "write slides conclusion-first") as **draft candidates** up front, and lets you keep the ones you adopt for next time. This **does not replace** building your judgment criteria (C2); it **supplements** it by adding candidates ahead of the derivation.

- **Surfacing candidates** — before the derivation in `/intent-compass`, it reads the bundled convention catalog (`.intent/constraint-starters.md`, with sources) and the ledger you've grown (`.intent/constraint-library.md`), and surfaces conventions that may fit the current case as "how about this as a starter?". It **does not auto-write into the compass.** You decide whether to adopt; only adopted ones are taken in by hand (if the fit is weak, it stays silent).
- **Adopt, then accumulate into the ledger** — among the candidates, constraints you adopt as "this is my standard" can be appended to the personal ledger `.intent/constraint-library.md`, so next time they surface as candidates alongside the bundled catalog (your own conventions grow over time). **Appending happens by your hand or under your explicit approval only**; it never accumulates on its own. When the ledger is absent or you adopt nothing, it silently does nothing.
- **Stays inside this project only** — accumulated constraints are kept only inside that project's `.intent/`. There is no cross-project sharing and no carrying them outside the repository (so a confidential project's constraints don't leak out — cross-project accumulation is deliberately not provided). The personal ledger is not overwritten on reinstall.

## Domain governance (ownership and execution scope for concurrent sessions, optional)

As the compass (`.intent/compass/`) and the intent tree (`.intent/tree/`) grow with accumulated cases, two pressures appear: (1) multiple sessions writing the same canonical file collide, and (2) maintenance cost (validate / improve) grows linearly with the total symbol count. intent-planner eases this by **not splitting the entity (a single `.intent/`, whole-repo grep preserved) and delegating only ownership and execution scope per "domain."** When there are no declarations, everything behaves exactly as before (a permanent fallback).

- **Where domain definitions and owner declarations live** — write domain names and one-line descriptions in `.intent/domains/README.md` (**git-tracked, team-shared** vocabulary). A session currently touching a domain creates `.intent/domains/owners/<domain>-<session-rand>.md` itself and **deletes it by hand** when done (**git-untracked, local-only** — owners are organizational info and stay off shared artifacts). The truth for which domain a symbol belongs to is the symbol file's area tag (`area`) alone; declarations hold no symbol inventory (not held twice, so they cannot diverge).
- **Domain-scoped execution** — when the case's domain is determinable, `/intent-validate` and `/intent-improve` read only "that domain + `always`" (cross-cutting) from the compass, so maintenance stops growing with the total symbol count. Axes that watch "what does not move" (decay / dormancy detection) keep their full scan (the savings-vs-detection trade-off is split per check axis). If the domain isn't determinable, it falls back to the full read.
- **Writing-side note** — when drafting a new symbol, its domain is derived from the case context and confirmed in **one question**. If another session holds an owner declaration on that domain, a one-line note is surfaced. This is **a warning only — it never blocks or seizes** (the parallel-operation judgment is left to humans).
- **The always gate** — only when registering a symbol as cross-cutting (`always`), one question confirms "does it really affect all domains, and where doesn't it?" (if the central discipline bloats by inertia, domain-scoping's savings erode).

It has no lock, mutual exclusion, auto-assignment, or state machine — it stays read-only guidance. With `.intent/domains/` absent or empty, every command behaves as before. For the rationale (why the entity is not split, why no real DB) see [the "Domain governance" section of docs/theory.en.md](theory.en.md).

## Handoff to cc-sdd / OpenSpec / Spec Kit

What intent-planner produces is **only the draft**. The spec body is generated by the downstream implementation tool, and you review it at each phase.

**cc-sdd** — if cc-sdd (`.kiro/`) is present at the install destination, the installer detects it and guides you. Handing the draft from `/intent-export-cc-sdd` to cc-sdd's `/kiro-spec-init` flows the organized intent straight into the requirements → design → tasks flow. Invariants and the upper intent are passed in a form easy to carry into tasks, so the overall intent keeps working at implementation time.

**OpenSpec** — supported as another exit, [OpenSpec](https://github.com/Fission-AI/OpenSpec). `/intent-export-openspec` converts the selected packet into a proposal draft (Why / What Changes / Impact) + delta spec hints, and on your instruction to continue launches `/opsx:propose` to bridge into the change-proposal flow. As with the cc-sdd target, the input is limited to one target packet + selected relevant constraints (a low-cost contract), and it stops at the launch (completing the spec body is left to OpenSpec).

**Spec Kit** — `/intent-export-speckit` converts the selected packet into a specify input + spec hints and, when you tell it to continue, bridges to `/speckit.specify`. As with the other targets, intent-planner owns only the draft and selection record; completion and review of the spec body remain with Spec Kit.

## Notes when running it on a loop (`/loop`)

intent-planner's stages are by default advanced by a human receiving the "next move" via `/intent-status`, but a harness like `/loop` can also advance the stages automatically.

However, the commands that rewrite documents (discover / compass / packets / writeback / improve / export) **intentionally assume human approval** — a brake against unsupervised development (vibe coding). Skipping approval with `/loop` trades speed for losing the following:

- **The chance to notice drift** — fewer chances for a human to see the deliverable and notice "this drifts from the intent"
- **Protection of the documents** — a wrong learning could be reflected into the intent documents as-is
- **Review of decisions that require human confirmation** — filling in questions a human should settle, without approval, could fix a guess as a settled fact

**The recommendation is hybrid.** Delegate the inner "implement → test → fix" to `/loop` to iterate quickly, and have a human review each stage boundary (compass confirmation, packet decomposition, writeback approval, resolving important questions). The read-only commands (status / validate / overview) need no approval, so they keep emitting decision material safely inside `/loop`. Rather than "running everything without human approval", "concentrating approval on important decisions" is the way to balance speed and safety.

## Installation options

```bash
npx intent-planner                       # into the current directory
npx intent-planner ./my-project          # into a specified directory
npx intent-planner --dry-run             # check first what will happen
npx intent-planner --lang en --agent codex   # English + Codex
npx intent-planner --enforce             # also place the pre-push hook
npx intent-planner --with-ci             # also place the CI check template (GitHub Actions)
npx intent-planner --lang en --agent codex  # install intent-planner and term-drift for Codex by default
```

| Option | Description |
|---|---|
| `dir` | Destination directory (default: current) |
| `--force` | Overwrite every file even if it exists (your data under `.intent/` is lost too; interactive terminals ask for confirmation first. Default: skip; root docs are appended to) |
| `--update-shared` | Also refresh the shared files (CLAUDE.md / AGENTS.md / GEMINI.md / pre-push) to the distributed version (saved to `<file>.bak` first; your `.intent/` data is never touched) |
| `--dry-run` | Don't write; only show the list of files to place/skip (full list) |
| `--verbose` | List every placed/skipped file one by one (default: counts only) |
| `--lang <value>` | Language: `ja` (default) / `en` |
| `--agent <value>` | Target agent: `claude` (default) / `codex` / `gemini` |
| `--enforce` | Place the pre-push hook (default: don't) |
| `--with-ci` | Place the CI check template `.github/workflows/intent-planner-check.yml` (default: don't; a normal re-run never overwrites an existing file) |
| `--with-term-drift` | term-drift 0.3.6 is placed by default; accepted as a legacy compatibility flag |
| `--yes`, `-y` | Consent to appending to an existing root doc without prompting (non-interactive: skipped by default) |
| `--help`, `-h` | Show help |

What's placed:

```
.claude/skills/intent-*/   the actual slash commands (with --agent codex / gemini: .agents/skills/ + AGENTS.md / GEMINI.md)
.intent/                   scaffold for the Intent Tree / Compass / Packets / deltas / modes
CLAUDE.md / AGENTS.md / GEMINI.md  a thin entry that teaches the AI how to use it
```

An existing root doc (`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`) is **never overwritten** — after confirmation it is **appended to non-destructively** (the existing bytes are left unchanged). Claude Code / Gemini CLI place the quickstart body in a separate file (`CLAUDE_intent.md` / `GEMINI_intent.md`) and add a one-line reference (`@CLAUDE_intent.md` / `@./GEMINI_intent.md`), which is loaded via recursive import. Codex appends the quickstart section directly to the end of `AGENTS.md` (since Codex has no `@import` syntax). Re-running never appends twice (idempotent). In non-interactive environments (CI, etc.) the append is skipped and you're guided instead; pass `--yes` to consent up front.

term-drift 0.3.6 is an exact npm dependency and a standard part of normal intent-planner setup. After the target repository and agent are known, intent-planner starts the installed owner's process to place `./.term-drift/` and the dedicated agent skill. `--yes` still controls only the root-document prompt and does not gate standard term-drift placement. A dry run never starts the owner process and always shows term-drift 0.3.6, the selected agent, the planned `install` / `update` / no-op, and why it would run or be suppressed.

Installation health is `not-installed`, `ready` (the version, rules, and selected agent's dedicated skill form a compatible set), or `inconsistent` (partial or mismatched). An `inconsistent` installation is `additive-compatible` when the official installer can safely add only missing components, `update-attemptable` for a trusted known state such as a complete match to the verified 0.2.3 or 0.2.5 baseline, or `blocked` when automatic processing is refused. `install-failed` describes the current owner-operation attempt separately from persistent filesystem health and is shown with post-health from the same inspector even after failure. `ready` is a no-op and is not reinstalled; the full terminology inspection starts from the selected agent's dedicated term-drift skill. For `blocked`, intent-planner reports the problem paths and does not recommend an immediate retry.

New installations and safe additions are delegated to the official term-drift 0.3.6 installer; updates from a trusted known baseline are delegated to the official update. If the owner refuses for safety, intent-planner reports post-health and does not independently roll back. `ready` is a no-op, and intent-planner does not automatically follow unknown self-consistent or future versions newer than 0.3.6. It never independently repairs, overwrites, or deletes term-drift-owned rules, skills, or glossary data.
# Normalized compass migration

New installations read the split `.intent/compass/` store. Existing projects may opt in using the [migration guide](migration.en.md); the legacy single compass reader is a permanent fallback.
