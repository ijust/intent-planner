# Context Cost Cues (catalog of context-eating situations)

> Read by `/intent-discover` and `/intent-improve` (when `drift-watch: on`). **These are cues to make you notice situations that eat context; they do not deny or correct you.** Installing many skills or loading full content can be a legitimate choice that improves accuracy. **Nothing is recorded to any log** (consumption is not measurable, and recording it would intrude on privacy such as your settings and skill setup). This is a file you grow by appending the types you actually hit in your own project.

## How to read this catalog

- **This is not exhaustive.** The types listed here are only a starting point (4 seeds). The premise is that you append the context-eating situations you actually hit in your own project as types and grow this file over time.
- Each type is identified by its aggregation key (`id`). The more types you add, the wider the range over which you can notice "this might be eating context".
- **This is awareness, not a norm.** A type "matching" is not a confirmation of waste. Installing many skills or loading full content can be a deliberate, legitimate choice. When a type matches, it only **makes you notice** "this might be eating context", and leaves the judgment of waste-or-not to you. It does not say "fix it".
- **Nothing is recorded to any log.** Consumption cannot be measured, and what eats context legitimately differs per person, so recording it would intrude on privacy. The cue stays a read-only suggestion.

## How to write a type

Append a new type with the schema below. Make `id` a unique kebab-case aggregation key.

```markdown
## id: <kebab-case aggregation key>
- name: <short name>
- symptom: <cue about the subject / how it is progressing; a weak cue discover or improve matches against the subject>
- If this is unintentional:
  - Instead: <a light alternative to recall if it was working unintentionally (thin entry point / JIT pull / limited input); an optional choice, not a command>
```

- Write `symptom` as a cue for matching, not as a strong decision condition meaning "if this matches it is definitely waste" (keeping it a weak cue avoids fixation).
- "If this is unintentional" is an **optional light alternative** to recall when this type is suspected. Do not use imperatives ("fix it", "stop it"), and do not deny a deliberate high-cost choice.

---

## id: full-compass-load

- name: Full compass load
- symptom: You may be reading the whole of intent-compass.md (the decision-criteria document) when you only need one point. A way of progressing where you load the entire document into context just to check a single Invariant / Decision Rule.
- If this is unintentional:
  - Instead: there is a lighter alternative of pulling the needed Decision Rule / Invariant JIT by heading (reading only that section from a thin entry point). If you genuinely need the whole document, leave it as is.

## id: whole-tree-read

- name: Whole intent-tree read
- symptom: You may be reading all of intent-tree.md every time when you only need one of L0–L3. A way of progressing where you load the entire tree into context when you only want to reference a specific outcome or capability.
- If this is unintentional:
  - Instead: there is a lighter alternative of reading only the layer you need by name, rather than pasting the whole tree into a fixed-load context. If you need the full overview, leave it as is.

## id: steering-bloat

- name: Fixed-load context bloat
- symptom: You may be bloating the fixed context that gets loaded every time with generated steering or reference documents. A way of progressing where the always-loaded set grows each time you add a responsibility, so context swells linearly.
- If this is unintentional:
  - Instead: there is a lighter alternative of keeping the fixed load thin and offloading details to references, pulling them only when needed. If you are sure that context is always needed, leave it as is.

## id: redundant-reread

- name: Redundant re-read
- symptom: You may be re-reading a file you just read or edited, even though its content has not changed. A way of progressing where you load the same content into context multiple times in a short interval.
- If this is unintentional:
  - Instead: there is a lighter alternative of using what you just read/edited as is and skipping the re-read. If you want to confirm a possible change (e.g. from a concurrent edit), leave it as is.
