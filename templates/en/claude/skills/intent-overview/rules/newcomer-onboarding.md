# Newcomer onboarding view (generated only when requested)

A procedure that aggregates, read-only, a five-part single page from the scattered `.intent/` artifacts so that a newly joined member can grasp the whole picture of intent in a short time, and derives it into `.intent/overview/newcomer-onboarding.md`. Applied in Step 2 of `intent-overview` **only when the user asks for a newcomer entry point (onboarding)** (a default run without the request does not generate this view; leave only the one-line pointer in Output). It is an entry map for reading; it holds no dialogue flow, tutorial, or progress judgement (DR106; A54; C34/DR92).

## Applicability (does not run by default)

- Generate only when the user **asks `/intent-overview` for a newcomer entry point** (natural-language triggers such as "for a new member", "onboarding", "newcomer", "something to show a person who just joined"). Do not bundle it into the default overview automatically (pull discipline; context cost).
- On a default run without the request, do not generate this view; leave only the one-line pointer in overview.md. The default run's output and cost stay unchanged (behavior-preserving).
- When material is thin (glossary empty / absent, zero packets in progress, compass not yet generated, etc.), do not stop; return a **degraded version that explicitly marks the affected sections as "none"** (no error; do not fill with guesses).

## Procedure (five-part structure; DR106)

1. **(1) Summary of purpose and success (L0/L1)**: read `.intent/intent-tree.md`'s L0 (the purpose; North Star equivalent) and L1 (outcomes; success criteria) read-only, and summarize briefly what a newcomer should grasp first: "what this project exists for, and what counts as success". Mirror canonical and inferred (from Assumptions / Open Questions) kept distinct.
2. **(2) Excerpt of the main cross-cutting Invariants**: from `.intent/intent-compass.md` (or the split store `.intent/compass/` if present), excerpt the cross-cutting decision criteria that apply across areas. **Select by reading, guided by existing markers** such as the `[area: always]` tag and headings; do not select by mechanical scoring or count thresholds (INV2). Show each item as a pair of its id (INV/DR etc.) and a one-line plain-language paraphrase.
3. **(3) Work units in progress and who has started**: mirror, read-only, the list of in-progress packets and their `state` from the frontmatter of `.intent/packets/active/*.md` (the source of truth; `index.md` is a derived cache). If assignment declarations exist under `.intent/assignments/`, note "who is working on it" alongside (a declaration and `state` are separate layers; DR99; do not rewrite or reinterpret). With zero packets in progress, state "none" explicitly.
4. **(4) Key terms of the canonical vocabulary**: from `.intent/glossary.md`, excerpt the key terms a newcomer is most likely to stumble on in their first conversations and reading (canonical term + one-line explanation). Select by reading; do not transcribe everything (only what the entry point needs). If the glossary is empty or absent, state "none (canonical vocabulary not yet established)" explicitly.
5. **(5) Reading-order guide**: guide the newcomer, in order, to the files to open next after (1)–(4), having verified each exists (e.g. intent-tree → the relevant compass area → the packet they will touch). **Every reference must be to a file or section verified to exist at generation time** (create no dangling references; emit not a single reference to something that does not exist).
6. **Write `.intent/overview/newcomer-onboarding.md` as a full replacement**: state the generation time at the top (derived; regenerable; manual regeneration only). Writing is confined to `.intent/overview/` (never write to canonical).

## Shape of the output

- Top: generation time; the material read (presence of tree / compass / active packets / assignments / glossary); **that this is derived and not the source of truth**; the intended reader (a newly joined member).
- Body: the five sections ((1) summary of purpose and success / (2) main cross-cutting Invariants / (3) work units in progress and who has started / (4) key terms of the canonical vocabulary / (5) reading-order guide). Keep a section even when its material is missing, marking it "none" explicitly (the five-section skeleton holds even in the degraded version; the newcomer too can see which material is missing).
- Tail: the notice that this is derived and not the source of truth, and the bridge "from here on, read the source of truth directly (intent-tree / compass / the relevant packet)".

## Discipline (what to keep)

- **Inherit the derived-only contract (C34; the most important oracle)**: writing goes to `.intent/overview/newcomer-onboarding.md` only. Never rewrite any canonical `.intent/*.md` (no touching the source of truth; regenerable; manual regeneration only; DR92).
- **Create no dangling references**: every reference, including the (5) reading-order guide, is confined to files and sections verified to exist at generation time. If even one reference to something nonexistent would slip in, drop that reference or mark it "not yet generated" (zero fabrication; the same line as evidence-anchored).
- **Degrade without stopping**: with zero material, do not error or stop; emit a degraded version that explicitly marks "none" (do not fill with guesses; do not force items into existence).
- **No mechanical scoring (INV2)**: select the (2) Invariant excerpt and the (4) key terms by reading, guided by existing markers (tags; headings). Introduce no importance scores, count thresholds, or embedding search.
- **Do not turn onboarding into a process**: hold no dialogue flow, tutorial, or comprehension check (up to a single readable page). The 30-minute guideline (A54/L1-(4)) is an operational observation; this view neither measures nor enforces it.
- **Do not touch existing presets (pure addition)**: do not change the rule bodies or output specs of the existing derived views (decision-inbox / roadmap-projection / assignment-view / mermaid-views etc.). This view is one addition to the reader-specific views (create no new skill or new canonical; Anti-direction 348).
- **Staleness is derived staleness (A31/INV38)**: if the source of truth moves after generation and the view goes stale, that is not a "conflict" but "derived staleness fixed by regeneration". Regeneration happens only on manual runs (DR92).
