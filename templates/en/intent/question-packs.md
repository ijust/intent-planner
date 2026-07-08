# Question Packs (elicitation questions by case type)

> The probing phase of `/intent-discover` reads this file as **candidate probing questions** matched to the case type. Presentation stops at **candidates**: the user chooses whether to use a pack, and adopting one never forces answers (you can always pick "later" / "unknown" / "not applicable"). Nothing from a pack is ever auto-written into Anti-direction / Invariants / any ledger. **Where this catalog is absent, nothing happens** (probing falls back to the usual behavior).

## How to read this catalog

- **This is a starting point, not a finished set.** The four bundled types are seeds. Add packs for the case types you actually handle (if the file grows heavy, consider splitting into per-type files).
- **This is a catalog of questions, not constraints.** It shares the "static catalog + context matching" shape with constraint-starters (starter constraints = draft Anti-directions / Invariants), but what accumulates is different, so it lives in a separate file.
- **Each pack is identified by `id` and carries `fits when`** — the hint for when it helps. Matching treats it as a weak signal; a weak fit presents nothing (prefer silence over false positives).
- **Questions never replace the default "infer + confirm" posture.** A pack is not a checklist to run through. Pick a few questions that seem to help, attach a one-line "why we ask" to each, and always allow "later / unknown / not applicable".
- **This is a static document.** It never queries external services at usage time.

## Source discipline (hybrid)

- **Questions grounded in primary sources** (composition theory, research) carry a `source` with the reference (URL, book) and retrieval date. Never fabricate sources.
- **Rule-of-thumb questions** carry an honest `origin` stating what they are based on (never dressed up as citations).
- Follow the same split when you add packs.

## How to write a pack

```markdown
## id: <kebab-case key>
- name: <short name>
- fits when: <what kind of case / topic this pack helps with (matching hint)>
- questions:
  - <question> — why we ask: <one line>
- source/origin: <source + retrieval date for primary-source questions / origin for rules of thumb>
```

---

## id: proposal-planning

- name: Proposals and pitch documents
- fits when: Writing a proposal, pitch, or approval request — a document meant to win someone's approval. You know what you want to build, but whose problem it solves is not yet in words.
- questions:
  - Whose problem, in what situation, does this solve? — why we ask: with a vague target, approvers cannot judge the value, and everything downstream wobbles.
  - How will you know it worked (in an observable form)? — why we ask: a plan with no way to judge success can be neither evaluated nor abandoned later.
  - What is the one conclusion the approver wants first? — why we ask: proposals that bury the conclusion at the end don't get read by busy approvers (bottom line up front).
  - What happens if this is *not* done? — why we ask: a plan that cannot state the cost of inaction loses the priority contest.
  - Which alternatives did you consider, and why not those? — why we ask: without a trace of alternatives, a single "did you consider anything else?" sends it back.
- source/origin: Bottom-line-up-front follows Barbara Minto, "The Pyramid Principle" (conclusion first, supported by grounds). The rest are rules of thumb — this tool's probing patterns (confirming purpose / success / intended user, keeping the trace of alternatives) rephrased for non-code work.

## id: research-summary

- name: Research summaries and notes
- fits when: Condensing what you researched into a single write-up. You gathered plenty, but what conclusion it supports is not yet settled.
- questions:
  - What single question should this research answer (one sentence)? — why we ask: without a question, a summary becomes a pile of information and the reader receives no conclusion.
  - What finding would let you call the research "done"? — why we ask: research without a stopping condition expands forever.
  - How do you distinguish reliability (primary source / hearsay / your own guess)? — why we ask: a summary with mixed provenance can't be re-verified later for how far to trust it.
  - Did you find anything that contradicts your conclusion? — why we ask: a summary built only from convenient findings collapses at the first counterexample (counteracting confirmation bias).
- source/origin: Rules of thumb (this tool's canonical/inferred separation and consider-the-opposite probing, rephrased for research documents).

## id: article-outline

- name: Articles and outbound writing
- fits when: Outlining an article, blog post, or talk script — writing meant to reach a reader. You know what you want to say, but what stays with the reader is vague.
- questions:
  - After reading, what can the reader *do* — what changes for them? — why we ask: an article that can't state the post-read change ends at "nice story" and drives no action.
  - Who is the reader, and what do they already know? — why we ask: misjudging prior knowledge makes the piece either boringly easy or impenetrably hard.
  - Is the reader's goal to learn, to get a task done, to look something up, or to understand? — why we ask: mixing content for different goals in one piece reaches none of the readers.
  - What do the first three lines promise the reader? — why we ask: if the value doesn't land in the opening, the body never gets read no matter how good it is.
- source/origin: The four reader goals follow Diátaxis (tutorials / how-to guides / reference / explanation, https://diataxis.fr/, retrieved 2026-06-26 — same source as constraint-starters' doc-type-separation). The rest are rules of thumb (reader-first composition).

## id: event-planning

- name: Events and workshops
- fits when: Planning a meetup, workshop, or briefing — anything with a "day of". You have a to-do list, but the conditions for the event to succeed are vague.
- questions:
  - What should participants carry home for this to count as a success? — why we ask: designing around the host's agenda instead of the takeaway produces an event that runs smoothly and leaves nothing.
  - What would "failure" on the day look like (list it in advance)? — why we ask: imagining failure beforehand (a premortem) detects failure causes better than ad-hoc listing.
  - What is the minimum — people, gear, conditions — for the event to be viable? — why we ask: without a viability line you can't decide to run or postpone when signups are weak.
  - Which elements cannot be changed on the day (venue, equipment, deadlines)? — why we ask: unless the irreversible parts are fixed first, a last-minute change breaks everything.
- source/origin: Failure-in-advance follows Gary Klein, "Performing a Project Premortem" (Harvard Business Review, 2007 — the premortem). The rest are rules of thumb (fix the irreversible first; make viability explicit).
