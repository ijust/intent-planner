# Export Questions Check

Check unresolved `[by export]` Open Questions and important decisions at the start of the export. This procedure is used at Step 1.7 of `/intent-export-openspec`. Conduct all dialogue as confirmation with the user (follow the confirmation conventions in SKILL.md).

## Detection

- Read Open Questions and undecided items in the Intent Tree (`.intent/intent-tree.md`), Intent Compass (`.intent/intent-compass.md`), and selected packet. Classify each unresolved item as an important decision according to the shared contract in CONTRACT.
- Continue to detect questions marked `[by export]` in the Tree and Compass as before. For the selected packet, check only the Open Questions and decision fields recorded in that packet. Deferred items in `.intent/packets/plan.md` are records of intentional deferral, not questions, so they are outside this check.
- **Do not reference the enforcement setting (the Enforcement section of `.intent/mode.md`)**. This check operates independently of the Step 1.5 enforcement gate.

## Procedure

1. **When there is an important decision**
   - Present a provisional answer proposal, its rationale, the condition that would change the recommendation, and the affected scope to stop with supporting evidence.
   - The only allowed outcomes are a decision by the user, classification as out-of-scope for this work, or scope-limited explicit continuation.
   - Until one of these outcomes is obtained, do not start the export for the affected scope. Work outside that scope may continue.
   - After resolution, recheck the affected artifacts and resume only the affected scope. Explicit continuation keeps the item unresolved and permits only the named item and work scope to proceed.

2. **When nothing is detected (including older scaffolds without the tag convention)**
   - Present nothing and proceed to the next step (no behavior change).

3. **When an Open Question is detected but it is not an important decision**
   - Present the list of detected questions.
   - Ask the user whether to answer before exporting or proceed as is.
   - This is a confirmation, not a stop. An Open Question that is not an important decision may continue as before when the user explicitly instructs it to proceed, and the export may run.

## Discipline

- Do not change code.
- Do not change an external spec tool. This rule only controls the intent-planner export entry check.
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
