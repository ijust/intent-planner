# intent-* Skill Shared Contract

The conventions that every `intent-*` skill (intent-discover / intent-compass / intent-packets / intent-export-cc-sdd) follows. They are aligned to the same skeleton as cc-sdd's `kiro-*` skills and coexist non-destructively.

## frontmatter (required fields)

```yaml
---
name: intent-<phase>            # Must start with intent-. Never collide with kiro-*
description: <one-line summary>  # A description that makes clear when to use it
disable-model-invocation: true  # Slash-invocation only
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
argument-hint: <description of arguments>
---
```

- `name` is `intent-*`. The directory name must match it too. Never collide with `kiro-*`.
- `allowed-tools` is **limited to planning-oriented tools**: `Read, Write, Glob, Grep, AskUserQuestion` (add `Agent` if needed).
  - Exception: only `intent-export-cc-sdd` may add `Skill` (to invoke `/kiro-spec-init`. Invocation is limited to this single command).

## Body structure

Align to the cc-sdd style.

```
# <skill-name> Skill

## Core Mission
- Success Criteria: ...

## Execution Steps
### Step 1: ...   (Read and apply rules/*.md as needed)
### Step 2: ...

## Output Description
- The generated update proposal
- Open Questions that the human should review
- The command to run next

## Safety & Fallback
- Behavior on error / missing prerequisites
```

## Shared constraints

- **Output is fundamentally a "proposed update"**. Writing to `.intent/` is allowed.
- **Do not change application code** (INV6).
  - The scope of INV6 is "do not change application code", not "do not invoke other skills". The two are distinct concepts. `intent-export-cc-sdd` invoking `/kiro-spec-init` does not contradict INV6 (it touches no code).
- **Respect the mode**: read `.intent/mode.md` and follow the recorded mode definition. If mode.md is absent, continue with `standard` as the default and add "mode undetermined; `/intent-discover` recommended" to the Open Questions (do not stop).
- **When a prior deliverable is missing**, do not fill the gap with guesses; guide the user to "run the corresponding command first" and stop (distinguish this from the absence of mode.md).

## State sharing across skills

- The only shared point is `.intent/mode.md` (do not create hidden sharing).
