# Discovery issue directories (local-only)

This directory is a container for the **per-issue working state created by each `/intent-discover` run**. Every time you run discover, one **self-contained issue directory** is created here:

```
.intent/discovery/
  README.md                       ← this file (tracked; explanatory)
  <slug>-<rand>/                  ← 1 discover issue = 1 directory (git-untracked)
    mode.md                       ← that issue's mode state (mode / designer-questions / purpose / format / question-depth)
    (future) ...                  ← place for that issue's discover extension data
  <other-slug>-<rand>/            ← a different issue (never collides, even across parallel sessions)
    mode.md
```

Mode state is just the **first resident** of each issue directory; the directory is the general place for that discover run's working data, not a mode-only container. The "constraint ledger" in the next section is a second resident of this issue directory.

## Constraint decision ledger (constraint-ledger.md; optional; issue-scoped)

Candidate surfacing from the constraint starters catalog (`.intent/constraint-starters.md`) and the personal ledger (`.intent/constraint-library.md`) fires at several moments (hosts): `/intent-compass`, `/intent-packets`, `/intent-db-design`, `/intent-discover` (always-on matching), at implementation start, and `/intent-validate` (A40, DR83). So the same convention does not resurface at every stage and tire the user, we record **which convention got which decision** lightly in this issue directory's `constraint-ledger.md` (skip if absent; backward compatible).

```
.intent/discovery/<slug>-<rand>/
  mode.md              ← mode state (first resident)
  constraint-ledger.md ← constraint decision ledger (second; optional)
```

### Two levels of recording (DR84, DR74)

`constraint-ledger.md` holds **two levels** in one append-only file. Both use the row schema `| convention-id | host | decision | one-line context | date |` (a Markdown table).

- **Decision rows (always recorded)**: when the user attaches a decision (`adopted` / `declined` / `deferred`) to a candidate, record that one row. This is the **necessary condition for suppressing resurfacing** (a decided convention does not resurface at later hosts in the same issue series; DR84), so it is written regardless of the instrument on/off. A `declined` row must carry the **one-line context** (what was being built when it was declined = purpose / target scope).
- **Full surfacing trace (instrument, off by default)**: to keep "when / which convention / at which host was surfaced" including surfacings that received no decision, record it only when `constraint-firing-trace: on` is set in `mode.md` (DR74, A40-(2) making firing observable). The default is off; only those who later want to count how many times which convention was effective turn it on. Even on, it records only "the fact that it was surfaced" and does not automate decisions.

### Suppression and revival of resurfacing (DR84)

- **Suppression (rule)**: within the same issue series (the same `<slug>-<rand>/`), a convention that has received a decision does not resurface at later hosts. Each host reads `constraint-ledger.md` first, then surfaces only conventions that newly fit (and have no decision yet).
- **Revival (exception)**: only when the case's **purpose/context has changed from the one-line context recorded at decline time** do declined conventions return to matching (e.g. "API-only" → UI becomes needed as work proceeds; a presentation's audience changes so a previously declined convention is now needed). This judgment is made by LLM semantic matching and holds **no numeric conditions such as days or counts** (INV2). When a `convention-id` has multiple rows, the **last row wins** (expressing revival / re-decline as last-writer-wins).

### Tracked / untracked

`constraint-ledger.md`, like the rest of the issue directory's contents, is **git-untracked** (local-only; issue-scoped natural key). Decisions are not written to shared tracked files or to canonical (compass / packets). Parallel sessions have separate issue directories, so they do not collide.

## Why split into directories (resolving same-machine concurrent collision)

With a single `.intent/mode.local.md` file, running multiple sessions/worktrees in parallel on the same machine means a later `/intent-discover` overwrites and erases the earlier session's mode state (and since it is git-untracked, no merge-conflict detection catches it).

So we use **the same technique as packets (`.intent/packets/active/<packet_id>.md`)**: split per discover issue into separate directories. The directory name `<slug>-<rand>` mirrors the packet ID, and the trailing random 4 characters guarantee **no collision even across parallel sessions** (no central numbering counter).

## Issue directory naming

`<slug>-<rand>`:

- `<slug>`: an alphabetic slug describing the issue this discover handles (derived from the issue name by `/intent-discover`).
- `<rand>`: 4 lowercase-alphanumeric characters `[a-z0-9]` (generated by the shell at creation). Prevents concurrent collision.

## Reader identification (which issue to read)

When `/intent-discover` creates an issue directory, it **outputs that issue directory name**. Downstream `/intent-compass` / `/intent-packets` etc. **inherit that issue name** and read the `mode.md` of their own series (no need to search the listed issues for "mine").

Read backward-compatibility (read fallback): readers resolve **the inherited issue directory's `mode.md` → else the single `.intent/mode.local.md` (legacy) → else the mode state in the old `.intent/mode.md` → else the `standard` default**, in that order. Old scaffolds (existing environments without issue directories) keep working.

## Tracked / untracked

- This directory itself (`README.md`) is git-tracked (for explanation).
- Issue directories (`<slug>-<rand>/`) and their contents are **git-untracked** (mode state is local-only; the installer registers them in `.gitignore`).
- Policies you want to share (Enforcement / Drift-watch) remain in the still-tracked `.intent/mode.md`.
