# Changelog

## Unreleased

### Removed

- Removed Graphiti availability preflight, synchronization, stage-specific search, and downstream search conditions from Intent Planner. Operating without an external knowledge store is the normal state. Operating an external knowledge store is the project's responsibility.
- New installations no longer place these Graphiti-specific files:
  - `.claude/skills/intent-graphiti-sync/SKILL.md`
  - `.agents/skills/intent-graphiti-sync/SKILL.md`
  - `.intent/graphiti-safety-boundary.md`
  - `.intent/graphiti-search-boundary.md`
  - `.intent/graphiti-sync-boundary.md`

### Migration

- Existing installations automatically remove only regular files at those paths whose content exactly matches published content, and only after showing the candidates. Edited, unknown, unreadable, linked, and directory entries are retained with their concrete paths and reasons. Use `npx intent-planner --dry-run` to preview them; Graphiti wording left in existing root guidance or `.gitignore` remains for manual inspection.
- Data, configuration, credentials, and connection details in external Graphiti state are never changed or deleted. Retaining or completely deleting external Graphiti remains the project's responsibility.
- If a future gap is confirmed, the old design will not be restored automatically. The problem and division of responsibility must be confirmed through new Intent Planning.
