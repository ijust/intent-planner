# Question Pack Surfacing (candidate probing-question packs by case type)

The procedure that matches the per-case-type probing-question catalog (`.intent/question-packs.md`) read-only and **presents candidate** packs that look helpful. Used in the probing phase of `/intent-discover` (applied from within the designer-questions procedure). This is a **separate catalog with a separate subject** from the starter-constraint matching (constraint-starters: draft constraints vs. stock questions) — neither replaces the other.

## Discipline (what to keep)

- **Candidates only; adoption is the user's.** Only present matching packs; never auto-write pack content into Anti-direction / Invariants / intent-tree / any catalog or ledger.
- **Stay silent on a weak fit.** Lean toward silence over false positives (narrow the candidates; never push).
- **Where the catalog is absent, skip silently** (do not stop; nothing changes = the usual probing; backward compatible).
- **Never replace the default "infer + confirm" posture.** Do not turn a pack into a checklist or a gate that asks every question in order. Even on adoption, pick only a **few** helpful questions and blend them into the existing probing flow.
- **Inherit the questioning guardrails (INV58)**: few at a time (max 4 per batch), a one-line "why we ask" per question, always offer "later / unknown / not applicable", and never place a plausible default answer first.
- **Match semantically** (read each pack's `fits when` against the case context; do not push this to mechanical scoring or scripts).
- **Write to no log.** The one exception is the adoption ledger: append one line to the inherited issue directory's `constraint-ledger.md` (if present), in the same row format as starter adoptions (`| pack id | phase=discover | verdict | one-line context | date |`). Where the ledger or issue directory is absent, skip recording (do not stop).

## Procedure

1. **Read the catalog**: read `.intent/question-packs.md` read-only. If absent, skip and stay silent (the usual behavior).
2. **Never re-present decided packs**: read the inherited issue directory's `constraint-ledger.md` (silent if absent); packs already decided in the same issue series are not presented again.
3. **Match**: read each pack's `fits when` against the topic and mode (non-code etc.) of the case at hand. It is a weak signal; on a weak fit, present nothing.
4. **Present as a candidate**: present a matching pack in one line (e.g., "This case looks like a fit for the `<id>` (<name>) question pack — want to use it? (your call)"). Even with multiple matches, keep them narrow.
5. **Use the questions only on adoption**: from a pack the user adopted, pick a few helpful questions, attach a one-line "why we ask" to each, and use them within the existing probing flow (infer + confirm). If declined or unanswered, change nothing and proceed as usual.
6. **Record the verdict to the ledger**: per the ledger rules above (skip if absent).
## Plainness check for questions (right before output; shared)

Right before putting a question or confirmation to the user, check these 4 points (if any fails, rewrite the question in plain words before sending; the rewrite must not change the question's meaning or options):

1. **Does it stand on its own?** Would a first-time reader understand the question by itself? Are you transcribing vocabulary straight from the internal documents you just read (compass, packets, rules, etc.)?
2. **Is it overloaded?** Three or more unexplained technical terms in one question is the sign of overload — split it or reword it.
3. **Did you gloss identifiers?** When you surface an identifier (a command name, a symbol, a packet name), attach a one-line plain-words gloss at first mention.
4. **Are you overloading an ordinary word?** Even when a word looks ordinary (e.g. "stand-in", "delivery"), are you using it with a narrow project- or tool-specific meaning? If you (the tool/AI) loaded that meaning onto it, attach a one-line plain-words gloss at its first mention in the conversation or document (leave ordinary words used in their everyday sense, and established technical terms, alone).

This check is generation-time prevention and works as a pair with the after-the-fact check (`/intent-validate`'s coinage check) — never prevention alone or checking alone.
