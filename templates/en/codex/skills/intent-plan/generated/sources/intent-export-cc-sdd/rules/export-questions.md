# Export Questions Check

The procedure for confirming unanswered `[by export]` Open Questions before running the export. Used at Step 1.7 of `/intent-export-cc-sdd`. All dialogue is conducted as confirmation with the user (the means of confirmation follows the SKILL.md conventions).

## Detection

- Read the Open Questions sections of `.intent/intent-tree.md` and `.intent/intent-compass.md`, and detect questions containing `[by export]`. A question remaining in the section is treated as unanswered.
- Detection targets only these two files. The canonical source of questions is the Open Questions sections of both files; the Deferred section of `.intent/packets/plan.md` is a record of intentional deferrals, not questions, and is therefore out of scope.
- **Do not reference the enforcement setting (the Enforcement section of `.intent/mode.md`)** (this operates independently of the Step 1.5 enforcement gate).

## Procedure

1. **When nothing is detected (including older scaffolds without the tag convention)**
   - Present nothing and proceed to the next step (no behavior change).

2. **When questions are detected**
   - Present the list of detected questions.
   - Confirm with the user whether to "answer them before exporting, or proceed as is".
   - This is a confirmation, not a stop. When the user explicitly instructs to proceed, run the export.

## Discipline

- Do not change code.
## Plainness check for questions (right before output; shared)

Right before putting a question or confirmation to the user, check these 5 points (if any fails, rewrite the question in plain words before sending; the rewrite must not change the question's meaning or options):

1. **Does it stand on its own?** Would a first-time reader understand the question by itself? Are you transcribing vocabulary straight from the internal documents you just read (compass, packets, rules, etc.)?
2. **Is it overloaded?** Three or more unexplained technical terms in one question is the sign of overload — split it or reword it.
3. **Did you gloss identifiers?** When you surface an identifier (a command name, a symbol, a packet name), attach a one-line plain-words gloss at first mention.
4. **Are you overloading an ordinary word?** Even when a word looks ordinary (e.g. "stand-in", "delivery"), are you using it with a narrow project- or tool-specific meaning? If you (the tool/AI) loaded that meaning onto it, attach a one-line plain-words gloss at its first mention in the conversation or document (leave ordinary words used in their everyday sense, and established technical terms, alone).
5. **Are you conveying meaning only through a metaphor or a vague qualifier?** The foundation is precision: write so the meaning reads unambiguously (plain language is a means of staying easy to read while preserving it). Do not convey meaning only through an ungrounded vague qualifier (e.g. "significantly", "nicely") or a bare metaphor — if you use a metaphor, pair it immediately with a precise restatement (do not force established technical terms, or ordinary words in their everyday sense, into strained paraphrases — that makes things more ambiguous).

This check is generation-time prevention and works as a pair with the after-the-fact check (`/intent-validate`'s coinage check) — never prevention alone or checking alone.
