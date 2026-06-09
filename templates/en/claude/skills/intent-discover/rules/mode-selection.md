# Mode Selection

The logic for recommending the mode for working out the Intent based on the repository situation. Used at the start of `/intent-discover`. This is also an extension point (when you add a new mode, add its recommendation conditions here).

## Procedure

1. **Enumerate available modes**
   - Glob for `.intent/modes/*.md`. Read each mode's "Applicable situations" section.

2. **Lightly observe the repository situation**
   - Presence/scale of existing code, presence of tests, richness of README/docs, presence of existing `.intent/` deliverables.
   - Do not read deeply. Only the clues needed for a recommendation.

3. **Recommend a mode**
   - The only bundled mode at present is `standard`. Therefore the default recommendation is `standard`.
   - Recommendation guidelines for when more modes are added (extend this section):
     - New / intent not yet articulated → `standard`
     - Large existing codebase / refactor → (a `refactor`-family mode, if any)
     - Legacy with unknown behavior → (a `behavior-unknown`-family mode, if any)

4. **Confirm with the user**
   - Present the recommended mode and the reason, and request confirmation/change via `AskUserQuestion`.
   - **Even when there is only one mode candidate (standard only), always run the recommend → confirm → record wiring**. This keeps the user experience unchanged even when more modes are added later.

5. **Record the confirmed result**
   - Write the confirmed mode to `.intent/mode.md` (mode / selected / reason / definition).

## Adding a new mode to the recommendation targets

When you create a new `.intent/modes/<name>.md`, add to the recommendation guidelines in step 3 above "under what repository situations to recommend <name>".
