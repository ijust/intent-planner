# Split store for compass symbols (canonical; one symbol = one file)

This is the store that holds the symbols (INV / DR / Anti / C / A) of `.intent/intent-compass.md` (the legacy body) as one file per symbol (INV80; normalized storage). **Even when this store is empty or absent, every skill works on the legacy body as before** (for readers, the legacy path is a permanent fallback = DR133).

## File contract (one symbol = one file)

- File name = symbol ID (e.g. `INV80.md`, `DR131.md`, `Anti-478.md`). **Creating the next-numbered file is itself the numbering declaration** (DR131). There is no central numbering counter. When parallel sessions create the same number, let it surface as a git same-name conflict (never silently shift the number).
- The frontmatter is a minimal schema (promotion of existing concepts only; never invent a new classification axis):

```markdown
---
id: INV80          # symbol ID, identical to the file name
area: derived      # promotion of the legacy body's [domain: <name>] tag (cross-cutting rules: always)
status: active     # active | superseded (write the reason and successor in the Annex)
---
```

- The body has two layers (law / annex):

```markdown
# INV80 <title>

## Law
<normative text, 1–2 sentences; reading this alone is enough to comply>

## Annex
<history, premortems, check oracles, impact paths, addenda, numbering notes>
```

## index.md (derived; never hand-edit)

- `index.md` is a derived cache with one symbol per line: `- <ID> [domain: <area>] <status> — <one-line gist>`
- The skill that changed the canonical content (the symbol files in this store) regenerates it on completion (the same contract as `packets/index.md`). When it drifts from the files, that is "derived drift fixed by regeneration," not a conflict.

## Reader contract (dual-path)

- When this store has the symbol, read `index.md` → that file's `## Law` (per-symbol pull, a few KB or less).
- For symbols not in the store, read the legacy body `.intent/intent-compass.md` with the domain-tag grep (`[domain: <name>|always]`) as before. The legacy path is never removed (DR133).
