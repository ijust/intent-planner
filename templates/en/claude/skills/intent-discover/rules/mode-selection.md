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

Right before putting a question or confirmation to the user, check these 3 points (if any fails, rewrite the question in plain words before sending; the rewrite must not change the question's meaning or options):

1. **Does it stand on its own?** Would a first-time reader understand the question by itself? Are you transcribing vocabulary straight from the internal documents you just read (compass, packets, rules, etc.)?
2. **Is it overloaded?** Three or more unexplained technical terms in one question is the sign of overload — split it or reword it.
3. **Did you gloss identifiers?** When you surface an identifier (a command name, a symbol, a packet name), attach a one-line plain-words gloss at first mention.

This check is generation-time prevention and works as a pair with the after-the-fact check (`/intent-validate`'s coinage check) — never prevention alone or checking alone.
