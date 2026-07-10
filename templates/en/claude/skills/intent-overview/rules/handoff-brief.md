# Handoff brief (a view generated only when requested)

The procedure for deriving a short handoff brief from the current state of `.intent/` — so the next session can pick up the work when switching sessions — and writing it to `.intent/handoff/`. Applied in `intent-overview`'s Step 2 **only when the user asks for a handoff brief** (a default run does not generate this view and only emits the one-line pointer in Output). It does not read the conversation log and does not measure tokens (that is the harness's domain; INV82, INV22). The brief is derived, not canonical, and the switch-over nudge only guides — it never enforces (C-hb2, INV82, DR142, DR144).

## When it applies (never by default)

- Generate only when the user **asks for a handoff brief** via `/intent-overview` (natural-language triggers "handoff brief", "handoff", "switch sessions", "hand this to the next session", etc.). Do not auto-bundle it into the default overview (pull discipline, context cost).
- On a default run, do not generate this view; leave only the one-line pointer in overview.md. The default run's output and cost are unchanged (behavior-preserving).
- Even when the material is thin (zero active packets, an unfilled plan, etc.), do not stop; return a brief that explicitly marks the relevant element "no material" (do not error, do not fabricate, do not fill by guessing).

## Do not read the conversation log or measurements (separation of layers — most important)

- **Summarizing the conversation history and auto-compaction are the harness's domain**; this view does not touch them (Anti 433). The brief's material is only the state serialized in `.intent/` (the six elements below); it does not take the conversation log or token numbers as input.
- This view also does not judge "context is long / short" (that is handled qualitatively by the nudge side = the one-liner on the completion report). This view simply **generates when asked**.

## Procedure

1. **Gather the material for the six elements from `.intent/` read-only** (all read-only; the six elements proven by the manual prototype):
   - **(1) Where we are (context to grasp in a minute)**: which case, and up to which stage, is in progress. From `.intent/discovery/<slug>-<rand>/mode.md` (the carried-over discovery directory), the latest journey records in `.intent/packets/plan.md`, and the recent `.intent/deltas/`, summarize "the story so far" in one or two paragraphs.
   - **(2) Remaining tasks**: from the frontmatter (`state`, `depends_on`) of `.intent/packets/active/*.md`, and the work-plan section of `.intent/packets/plan.md` if present (recommended order), list what to start next and what is blocked.
   - **(3) Pull pointers to the canonical sources (the minimal reading list)**: cite, **as references**, the canonical sources to read when starting (the relevant packet file, the related symbols in compass [the INV/DR/Anti numbers], the relevant rules). **Do not transcribe the contents in full** (Anti 434; pull discipline INV47). Make it the minimal list of "read just these to start".
   - **(4) Traps (Safety)**: from the packet's `## Safety / Invariants`, cite only the key constraints that cause accidents if tripped (promises to keep, boundaries not to touch).
   - **(5) Repo state**: uncommitted changes, and cautions about other sessions running in parallel. Read uncommitted state from git (if unobtainable, mark "unconfirmed"); read parallel sessions only from the actual declaration files in `.intent/assignments/` (do not write "parallel exists" by guessing).
   - **(6) Live-run oracle**: the means to confirm "did it work" after starting (test commands, live-run confirmation steps). Cite from the packet's `## Validation`.
2. **Respect the boundary of sensitive/local details (INV82-(3))**: show details as pull pointers to the canonical sources; do not transcribe sensitive content raw (starter llm-sensitive-info-boundary). Local details (uncommitted state, parallel assignments, presence/absence of role lenses) may be included precisely because this brief lives in the git-untracked `.intent/handoff/` (do not include them in a tracked location).
3. **Place the required notice at the top**: state the generation time (ISO 8601, obtained via `date`) and "**this is derived, not canonical; do not treat the brief as self-sufficient — pull the canonical sources; when they disagree, the canonical source always wins**" (INV82-(1); Anti 438). If the generation time cannot be obtained, do not write a guessed date; state so explicitly.
4. **Write to `.intent/handoff/<brief name>.md`**: name the file so the case is identifiable (e.g. `handoff-<date>-<case-slug>.md`). Writing is confined to under `.intent/handoff/` (do not write to canonical [tree/compass/packets], and do not write to `.intent/overview/` either = this view has a brief-only explicit-exception write destination). If a file of the same name exists, fully replace it (a disposable derived output; a regeneration fixes it).

## Output shape

- Top: generation time, **that it is derived not canonical and that the canonical source always wins**, and the material read (count of active packets, whether a plan exists, etc.).
- Body: the six elements laid out under headings — Where we are / Remaining tasks / Pull pointers to canonical sources / Traps (Safety) / Repo state / Live-run oracle. Every element is traceable to its source (zero fabrication; same line as evidence-anchored).
- When material is thin: explicitly mark the relevant element "no material" (do not force-fill).
- End: a note that it is disposable, regenerable, and git-untracked.

## Discipline (must hold)

- **Do not read the conversation log or token measurements (Anti 433 — most important oracle)**: the material is only the serialized state of `.intent/`. Do not take the conversation-history summary or token numbers as input (a layer distinct from the harness's compaction).
- **Derived, not canonical (INV82-(1))**: always place the generation time and the "canonical always wins" notice. Pull-pointer-based, not full transcription (Anti 434).
- **Do not transcribe sensitive content raw (INV82-(3))**: show details as references to the canonical sources. Include local details only within the git-untracked `.intent/handoff/`.
- **Do not modify canonical**: writing is only to `.intent/handoff/`. Do not create packets, assign priorities, or write back to Open Questions (a read-only mirror).
- **Emit no entry that is not traceable to a source**: every element traces to the `.intent/` material read (zero fabrication).
- **Do not double as the nudge**: this view stops at generation. The "continue or switch over" nudge at a work break is the completion report's job (intent-packets / intent-writeback) (DR143).
