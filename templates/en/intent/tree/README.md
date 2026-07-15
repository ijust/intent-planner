# Split store for intent-tree case records (canonical; one case = one file)

The skeleton of `.intent/intent-tree.md` (the body) — the L0–L4 core, product validation hypotheses, screen-sketch references, and Open Questions — stays in the body. This store holds the **per-case records** (`## 機能追記:` / `## 機能撤去:` / `## 履歴:` / `## 再起案:`) as one file per case (INV80; normalized storage, the same shape as `.intent/compass/`). **Even when this store is empty or absent, every skill works on the legacy form in the body as before** (for readers, the legacy path is a permanent fallback = DR133).

The point of normalizing is to remove the last source of collisions (O1): a parallel discover for another case writing the same tail of the body at the same time. One case = one file = a record (isolates concurrent writes); a git commit = a transaction; the derived index = a view (the "manage it like a DB with transactions" the user has asked for since 2026-06-29 = DR194). No real DB is introduced (INV2).

## File convention (one case = one file)

- File name = the case's feature slug (e.g. `federated-governance.md`). **A new discover's case record is born as a new file in this directory** (not appended to the tail of the body). Parallel sessions discovering different cases land in different files, so they do not collide.
- Frontmatter is a minimal schema (promoting existing concepts only; do not invent a new classification axis — INV2):

```markdown
---
feature: federated-governance     # same as the file name (feature slug)
status: active                    # active (case records are kept as a ledger; removals/history/re-proposals are active records too)
kind: 機能追記                     # 機能追記 | 機能撤去 | 履歴 | 再起案
---
```

- Below the frontmatter is the case record's body exactly as it was in the tree body (starting from its `## 機能追記: <feature>（…）` heading). This is a **move, not an edit**: the wording, numbering, and meaning are preserved (INV80's four things you must not lose = (1) meaning, (2) reachability of existing references, (3) the approval gate, (4) the immutability of append-only records).

## All git-tracked (compass type)

The contents here are canonical (intent data shared across the team), so the README, the index, and each `<feature>.md` are **all git-tracked** (never added to `.gitignore`). Do not follow the discovery/domains type (which gitignores individual files for ephemeral declarations / org info) — that would leak the migrated data out of git.

## index.md (derived; do not edit)

- `index.md` is a derived, one-line-per-case cache: `- <feature> [<kind>] <status> — <one-line summary>`.
- A skill that touches a case record regenerates it on completion (the same rule as `.intent/compass/index.md` and `.intent/packets/index.md`). Drift from the real files is a "regenerate-to-fix derived drift", not a collision.

## Reader contract (both new and old; permanent fallback)

- If this store exists, read `index.md` → the relevant `<feature>.md` (per-case pull). The skeleton (L0–L4) is still read from the body `.intent/intent-tree.md` as before.
- If this store is absent, case records are still read from the tail of the body `.intent/intent-tree.md` (the legacy `## 機能追記:` group) as before. The legacy path is never removed (DR133).
- When the same feature exists in both the split store and the body, "the split store wins; the body is legacy" (the same rule as compass's Current Drift).
