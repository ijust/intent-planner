# domains: domain governance (domain definitions and owner declarations)

This directory is the place for **delegating compass/tree governance per domain** (federated governance; INV101). It does not split the entity (the single `.intent/`, the whole-repo grep). What is delegated per domain is **only ownership (who decides and writes) and execution scope (how much improve/validate covers)**.

```
.intent/domains/
  README.md               ← this file (tracked; the domain definitions live here too)
  owners/                 ← owner declarations (git-untracked; one declaration = one file)
    <domain>-<session-rand>.md
```

## Domain definitions (lower in this file; git-tracked; team-shared)

Domains are the values of the `[領域: <name>]` tags (INV47) attached to each compass symbol. **The source of truth for the symbol→domain mapping is the tags alone**; these definitions are merely a shared vocabulary of domain names and one-line descriptions (declarations do not enumerate symbols = DR193; not holding the same information twice means mismatches cannot structurally arise).

The bundled initial domains are the existing tag values carried over as-is (do not invent new domains = Anti-543). Add a new domain only when one is actually needed.

| Domain | One-line description |
|---|---|
| always | Cross-cutting discipline effective across all domains (Invariants/Decision Rules spanning multiple domains). Always read together under domain-scoped execution. |
| 詰め (elicitation) | Discipline for intent elicitation, questioning, the constraint catalog, and question packs. |
| 派生 (derived) | Discipline for regenerable derived outputs (overview, release-note, nl-spec, index, etc.). |
| 記録 (records) | Discipline for splitting/storing append-only records (deltas, export-log, drift-log, compass-archive). |
| 出口 (exits) | Discipline for handoff/projection to downstream spec tools (cc-sdd/openspec/speckit/to-spec). |
| 語彙 (vocabulary) | Discipline for ubiquitous language, coinage detection, and symbol labels. |
| 配布 (distribution) | Discipline for the installer, template parity, root convention docs, and doc-sync. |
| 検査 (checks) | Discipline for intent-validate check axes, PBR perspectives, and oracles. |
| 並行 (concurrency) | Discipline for concurrent-session coordination, mode-state scoping, and domain governance. |

To add a domain, just add one row ("domain name, one-line description") to this table. Do not write owners or a symbol inventory (owners go in the declarations below; the tags are the truth for symbols).

## Owner declarations (under `owners/`; git-untracked; local-only)

The place to declare "this domain is currently being touched by this session/person." **This is not a mechanism that stops writes** (read-only advice; INV91). When another session tries to touch the same domain, the writing side (`/intent-writeback`, `/intent-compass`) merely surfaces a note that "this domain is owner-declared by another session" — it neither stops nor seizes.

Owners are organizational information, so the declarations are **git-untracked (local-only)** (DR192 = domain definitions are shared, but owners are not put on shared artifacts). Concurrent sessions hold separate files, so they do not collide (same shape as the assignments declarations).

The filename is `<domain>-<session-rand>.md` (`<session-rand>` is 4 chars of `[a-z0-9]`, shell-generated, and written into the `session:` frontmatter too = same shape as the assignments claims). When the writing side (compass / writeback) judges "is this my session's declaration," it compares its own `session` (= its own session-rand, from the owner declaration it placed when touching this domain) against the `session` of the declaration it read (same = its own declaration, do not warn). The content needs only the minimal frontmatter schema (do not mandate more than this — a heavy declaration stops being written and falls out of use; Anti-543):

```markdown
---
domain: 並行                       # domain name (a value from the definitions above)
owner: "self"                      # who owns it (free text; person/team name, etc.)
session: a3f2                      # <session-rand> (4 random chars for this session; same as the filename suffix)
declared_at: 2026-07-15T00:00:00Z  # declaration time (ISO 8601; shell `date`)
---
```

- **An owner declaration with a domain name not in the definitions is allowed too** (not a gate). The consistency check goes only as far as the writing side's surfaced note; it does not reject.
- **Deletion is by hand** (a machine does not auto-delete a declaration = so a live declaration is not deleted; INV91). When done touching it, the session itself deletes it.

## When there are no declarations (permanent fallback; backward-compatible)

In a repo where `.intent/domains/` is absent or empty, domain governance changes nothing (legacy behavior; a permanent fallback of the same kind as INV101/DR133). Domain-scoped execution (improve/validate) also silently falls back to the full read when no domain is determined. Owner declarations are optional too; every skill works as before without them.
