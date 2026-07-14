# Migration Guide — Upgrading from an Older Version (Claude Code / Codex / Gemini CLI)

How to upgrade (re-install) intent-planner from an older version. **The installer does not destroy your existing deliverables**, but precisely because of that "do no harm" design, you may need one extra step to pull newly introduced mechanisms into an existing project. This guide explains that step per AI tool (Claude Code / Codex / Gemini CLI).

## First: what the upgrade does and does not do

```bash
# Re-run at your project root, matching the AI you use
npx intent-planner            # Claude Code (default)
npx intent-planner --agent codex
npx intent-planner --agent gemini

# To see the diff first (writes nothing)
npx intent-planner --dry-run
```

The installer treats files in two categories.

- **Your deliverables (user-data)** — `.intent/intent-tree.md`, `.intent/intent-compass.md`, everything under `.intent/packets/`, the various logs, `.intent/glossary.md`, etc.: **the canonical files you wrote**. Existing ones are **not overwritten** (only `--force` overwrites). After an upgrade, your intent tree and decision criteria remain as they were.
- **Distributed artifacts (code)** — the `intent-*` skill bodies, rules, and reference docs. These are updated to the new version (code kind only).

So **the upgrade delivers new skills and rules, but does not touch the contents of the `intent-tree.md` / `intent-compass.md` you already wrote.** This is correct as asset protection, but it makes the following retrofit necessary in some cases.

## This version's new features, and the retrofit for existing projects

This version adds **canonical bloat control** (keeping intent-tree / intent-compass from swelling with every feature addition). Three points:

1. **History archive files** — `.intent/intent-tree.history.md` and `.intent/compass-history.md` were added as the destination to move the history of completed features (Impact Analysis, premortem derivations, etc.) out of the body (distinct from `.intent/compass-archive.md`, which is dedicated to superseded Decision Rules).
2. **Search tags** — whether something is live or archived is marked with the frontmatter schema tag `status: active | archived`, so you can separate them with `grep`.
3. **Change in where learnings land** — the promotion target for learnings reverse-extracted by `/intent-writeback` (implicit-behavior, etc.) changed from intent-tree's L3 to **the `## Expected Behavior` of the associated packet**.

### New projects (no `.intent/` yet)

Running `npx intent-planner` includes the empty archive files and the search-tag mechanism from the start. Nothing to do.

### Existing projects (already using `.intent/`)

The upgrade **delivers the empty archive files (the container) and the new archiving discipline (the rule)**, but **the history already accumulated in your existing `intent-tree.md` / `intent-compass.md` stays in the body** (the installer does not overwrite user-data). To actually reduce the bloat, perform the retrofit once: move the accumulated history into the archive files.

You can do the retrofit either way (the same for any AI tool).

- **Let the AI do it (recommended)**: ask your AI (Claude Code / Codex / Gemini CLI) like this:

  > Please **move** the history of completed features accumulated in the body of `.intent/intent-tree.md` (the `## Impact Analysis (…)` sections, the retired `## Feature addition:` sections, and the shipped group of `## L4 Candidate Packets`) into `.intent/intent-tree.history.md`. Do the same for `.intent/compass-history.md`. Archiving is a **move, not an edit** — do not change any heading, numbering, or wording; only move the position. After the heading of each archived block, add a line `> status: archived | archived_at: <datetime> | from: intent-tree.md`. **Add `> status: active` to the live sections.**

  The same discipline (a move, not an edit; the archive notation) is written at the top of the archive files, so the AI will follow it.

- **By hand**: following the "archiving discipline" and "archive notation" at the top of the archive files (`.intent/intent-tree.history.md` / `.intent/compass-history.md`), cut the completed-feature history blocks from the body and append them to the end of the archive file. Add `> status: active` to live sections in the body, and `> status: archived` to archived blocks.

> **Caution (mind the unit when archiving compass)**: the premortem-derivation blocks of `intent-compass.md` (`### <feature>-specific (premortem: …)`) hold **numbered Anti-direction items** under the heading. These numbers are sometimes **referenced** by live Invariants / Decision Rules as "Anti-direction 92". Archiving a whole block removes that number from the body and leaves the reference dangling. When retrofitting compass, the safe approach is to **keep referenced numbered items in the body and only add the `status: archived` tag to distinguish them** (tag, not move), or to archive only the heading and intro. This differs from intent-tree's Impact Analysis (which carries no numbers and is not referenced).

The retrofit is not urgent. Without it, the existing project still works as before (the bloat just remains). At future `/intent-writeback` completions, the new archiving discipline prompts "archive the completed feature's history?", so you can also archive gradually, one finished feature at a time.

## Per-AI-tool notes

The mechanism is agent-independent (`.intent/` is shared); only the entry document and the install command differ.

| | Install | Entry document | Skill location |
|---|---|---|---|
| **Claude Code** | `npx intent-planner` | `CLAUDE.md` (body in a separate file, a reference line appended) | `.claude/skills/intent-*/` |
| **Codex** | `npx intent-planner --agent codex` | `AGENTS.md` (a section appended at the end) | skill tree under `.codex` |
| **Gemini CLI** | `npx intent-planner --agent gemini` | `GEMINI.md` (body in a separate file, a reference line appended) | shares and reads the same skill tree as Codex |

- Existing `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` are **not overwritten**. They are appended to non-destructively after confirmation (existing content is unchanged). In non-interactive environments the append is skipped; `--yes` pre-grants consent.
- **Gemini CLI** has no dedicated skill tree of its own; it reads the skill tree placed for Codex via a cross-tool alias. So no separate skill files are added for Gemini (only the entry document `GEMINI.md` is Gemini-specific).
- If you use multiple AIs, run each `--agent` to set up each entry document (`.intent/` itself is shared, so it does not duplicate).

## Where to look when stuck

- Install options: [docs/guide.en.md](guide.en.md#install-options)
- Design background: [docs/theory.en.md](theory.en.md)

### Opt-in migration to the normalized compass

To move from the legacy single file `.intent/intent-compass.md` to `.intent/compass/` (one file per symbol), run these steps by choice. The installer never performs this move automatically.

1. If the project is Git-managed, commit first. If it is untracked or partially tracked, make a copy of `.intent/` elsewhere for recovery (DR132).
2. Extract each selected symbol from the legacy body (for example, `sed -n '/^# INV1/,/^# /p' .intent/intent-compass.md > .intent/compass/INV1.md`), add `id`, `area`, `status`, and `## Law`, and append `- INV1` to `index.md`. Do not delete the legacy single file.
3. Run one skill and confirm it reads `index.md` then the selected symbol's `## Law`. If a symbol is absent from the split store, confirm that the legacy file is read.
4. If you stop partway, leave the state intact. Revert from Git when tracked, or restore from the copy when untracked.

This procedure was exercised against the dogfood fixture. Legacy-only projects remain a permanent supported path; migration is optional.

- Install option details: [the install section of docs/guide.en.md](guide.en.md#install-options)
- Design background (why archive history, why not use a DB): [the "storage structure" section of docs/theory.en.md](theory.en.md)
- The archiving discipline itself: the top of `.intent/intent-tree.history.md` / `.intent/compass-history.md`
