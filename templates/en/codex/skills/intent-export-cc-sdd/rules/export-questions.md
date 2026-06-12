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
