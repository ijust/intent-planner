# Constraint Library (the constraint ledger you grow)

> A ledger for accumulating and reusing the constraints (Anti-direction / Invariant) you use repeatedly, inside this project's `.intent/`. When `/intent-compass` surfaces drafts, it lists the constraints you have accumulated here alongside the bundled `constraint-starters.md`. **Editing is done by a human; the skill only reads and never auto-modifies.** Writing an adopted constraint into this ledger is also done by a human (or with explicit human approval).

## How to use this ledger

- **This is a file you grow.** As you repeat development in the same domain, constraints accumulate — "I always make this an Anti-direction / Invariant." Append them here and reuse them.
- **It stays within this project.** This ledger is placed only under this repo's `.intent/`, and is never shared across projects (so that even for work where assets cannot leave, constraints do not leak outside the project). Reinstalling or upgrading does not overwrite what you wrote here.
- **It is canonical (human-edited).** The surfacing skill references this ledger read-only and never rewrites it automatically.
- **This is a static document.** It never queries an external service or database when used.

## Entry schema

Append constraints you use repeatedly with the schema below. Make `id` a unique kebab-case key.

```markdown
## id: <kebab-case identifier key>
- name: <short name>
- domain: <code | non-code>
- fits when: <for what kind of work or material you want this constraint to apply>
- constraint:
  - Anti-direction: <the direction to avoid>
  - Invariant: <the invariant to keep>
- origin: <where you learned this constraint / why it is one of your defaults (optional)>
```

- Constraints accumulated here appear as candidates alongside the bundled catalog when `/intent-compass` surfaces drafts (surfacing stops at candidates; a human decides whether to adopt).
- The bundled `constraint-starters.md` (conventions the developers maintain and ship) and this `constraint-library.md` (constraints you grow) are separate files.

---

<!-- Below this line, append your repeatedly-used constraints (following the entry schema above). -->
