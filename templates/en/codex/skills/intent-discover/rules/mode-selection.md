# Mode Selection

The logic for recommending the mode for working out the Intent based on the repository situation. Used at the start of `/intent-discover`. This is also an extension point (when you add a new mode, add its recommendation conditions here).

## Procedure

1. **Enumerate available modes**
   - Glob for `.intent/modes/*.md`. Read each mode's "Applicable situations" section.

2. **Lightly observe the repository situation**
   - Presence/scale of existing code, presence of tests, richness of README/docs, presence of existing `.intent/` deliverables.
   - Do not read deeply. Only the clues needed for a recommendation.

3. **Recommend a mode**
   - The bundled modes at present are the four: `standard` / `refactor` / `behavior-unknown` / `feature-growth`. Recommend based on the repository situation using these conditions:
     - New / intent not yet articulated → `standard` (default)
     - Large existing codebase / refactor target (large existing code, design drift) → `refactor` (intent-less / vibe-coded existing code also routes to refactor, with Intent Recovery in discover)
     - Legacy with unknown behavior (no/few tests, lost specification) → `behavior-unknown`
     - A **feature addition** to an existing system (extend / integrate / add-to style requests, behavior known, redesign is not the goal) → `feature-growth` (distinguishing: if you want to change the existing structure, use `refactor`; if you want to add onto the existing system, use `feature-growth`)
   - When no condition clearly applies, recommend `standard`.

4. **Confirm with the user**
   - Present the recommended mode and the reason, and request confirmation/change via `AskUserQuestion`.
   - **Whether there is one mode candidate or several, always run the recommend → confirm → record wiring**. This keeps the user experience unchanged as modes are added or removed.

5. **Record the confirmed result**
   - Write the confirmed mode to `.intent/mode.local.md` (the local canonical source for mode state; not tracked by git) (mode / selected / reason / definition). In legacy environments where `mode.local.md` does not exist, reads are handled by the backward-compatible fallback (`mode.local.md` → `mode.md` → standard). Enforcement / Drift-watch reads continue to reference `mode.md`.

## Adding a new mode to the recommendation targets

When you create a new `.intent/modes/<name>.md`, add to the recommendation guidelines in step 3 above "under what repository situations to recommend <name>".
## Plainness check for questions (right before output; shared)

Right before putting a question or confirmation to the user, check these 5 points (if any fails, rewrite the question in plain words before sending; the rewrite must not change the question's meaning or options):

1. **Does it stand on its own?** Would a first-time reader understand the question by itself? Are you transcribing vocabulary straight from the internal documents you just read (compass, packets, rules, etc.)?
2. **Is it overloaded?** Three or more unexplained technical terms in one question is the sign of overload — split it or reword it.
3. **Did you gloss identifiers?** When you surface an identifier (a command name, a symbol, a packet name), attach a one-line plain-words gloss at first mention.
4. **Are you overloading an ordinary word?** Even when a word looks ordinary (e.g. "stand-in", "delivery"), are you using it with a narrow project- or tool-specific meaning? If you (the tool/AI) loaded that meaning onto it, attach a one-line plain-words gloss at its first mention in the conversation or document (leave ordinary words used in their everyday sense, and established technical terms, alone).
5. **Are you conveying meaning only through a metaphor or a vague qualifier?** The foundation is precision: write so the meaning reads unambiguously (plain language is a means of staying easy to read while preserving it). Do not convey meaning only through an ungrounded vague qualifier (e.g. "significantly", "nicely") or a bare metaphor — if you use a metaphor, pair it immediately with a precise restatement (do not force established technical terms, or ordinary words in their everyday sense, into strained paraphrases — that makes things more ambiguous).

This check is generation-time prevention and works as a pair with the after-the-fact check (`/intent-validate`'s coinage check) — never prevention alone or checking alone.

## Question-content check (right before output; shared)

Right before putting a question or confirmation to the user, check the following in addition to plainness. This check does not increase the number of questions; it keeps only the questions needed at the right time.

1. **Do not re-ask known information**: read the materials the user named, the current issue's Intent artifacts, and directly referenced documents only as far as the next important decision requires. Do not ask when the material or an earlier answer already supplies the answer.
2. **Do not widen exploration without a decision**: do not make reading every document a prerequisite for starting questions. Widen reading only when you can name an important decision whose answer is still missing, and stop when the answer is found or the next document cannot be tied to that decision.
3. **Ask only about important decisions**: ask only when the answer can change the purpose, target user, scope, success criteria, user experience, promises to preserve, architecture, or a hard-to-reverse decision. Do not ask from curiosity or merely to reconfirm.
4. **Update the next question after each answer**: update confirmed facts, withdrawn premises, and remaining unresolved items, then build the next question from that state. Do not rephrase and re-ask what the user already answered.
5. **Separate symptoms from causes**: do not confirm a cause or solution from negative feedback alone. Reconsider the layer outside the current work when there is an intent mismatch, a contradiction with newly found material, or a second attempt to treat the same symptom. A wording correction does not restart questioning from the top-level purpose.
6. **Preserve depth guardrails**: apply this check to both `standard` and `deep`. Deep widens the range of decisions examined; it does not permit re-asking known facts or unbounded exploration. Stop asking when the needed decisions are closed.
