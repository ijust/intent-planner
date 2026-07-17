# packets/journeys — where journeys (units that bundle multiple packets) live

This directory holds the canonical files for **journeys** (a unit that bundles one change spanning multiple work units = packets; it collects the list of member packets, the order of work, the contracts several packets keep together, and the completion judgment) (journey-formalize / INV103 / DR200–203).

```
.intent/packets/journeys/
  README.md            <- this file (the canonical conventions and schema; git-tracked)
  <slug>.md            <- 1 journey = 1 file (git-tracked; a team-shared planning artifact)
  archive/<year>/      <- where lifecycle: archived files retire (same shape as the packet archive; never deleted)
```

## A journey is an optional mechanism (INV103)

- **Create one only for a multi-packet case.** Never create one for a case that a single packet covers (no padding for form's sake).
- **With this directory absent or empty, every skill behaves exactly as before** (reading via the `.intent/packets/plan.md` route remains forever). Whether journeys exist never changes what may be read or written (no gate, no lock, no automatic judgment).

## The frontmatter schema (7 keys, fixed)

```yaml
---
journey_id: jny-20260717-auth-renewal-a1b2  # immutable; jny-<YYYYMMDD>-<slug>-<rand> (same shape as packet IDs; rand = 4 shell-generated chars)
name: "auth renewal"                        # the canonical journey name; the filename <slug>.md derives from it (slug rules: intent-packets/rules/packet-format.md)
lifecycle: active                           # active | archived; holds only the human-closed state (no progress state — see below)
packets: [pkt-20260717-xxxx-a1b2]           # the member packets' packet_id list (a one-way journey->packet reference)
created_at: 2026-07-17T00:00:00Z            # drafted at (ISO 8601; taken with the shell's date)
updated_at: 2026-07-17T00:00:00Z            # last updated (equals created_at on creation; never stamped without a content change)
summary: "one-line summary"                 # the source for list views
---
```

- **These 7 keys are the only required fields.** Do not add further required fields (a heavy form stops being used). Everything else (the work plan, shared contracts, integration checks, deferred notes, and so on) lives in the **free-form body** (no fixed headings).
- **Progress/completion state is never held in the frontmatter (DR200).** Progress is **derived every time** from the member packets' `state` (each packet file's frontmatter is the canonical source). Holding the same fact in two places breeds contradictions. Completion is observed as "all member packets done + the integration checks green", which **a human confirms** before writing `lifecycle: archived` and moving the file to `archive/<year>/` (a machine never closes a journey automatically).
- **References go one way only, journey->packet (DR203).** Never add a journey key to the packet-side frontmatter (12 keys, fixed). Reverse lookup (packet -> journey) is done by grepping this directory.
- If a listed packet_id does not exist, readers state "not found" and skip it (never guess a match).

## Writers and readers

- **The writer is `/intent-packets`** (in a multi-packet case, it drafts/updates a journey only after the user approves; the procedure is `intent-packets/rules/journey-plan.md`). Humans may edit these files directly too (they are plain Markdown).
- **Readers** (`/intent-status` / `/intent-overview` / `/intent-validate`, etc.) read them read-only. The readers' contract lives in `skills/CONTRACT.md`, "The journey reading contract".
- No numeric scores, no dated estimates, no percent-complete (the work plan is expressed by order and dependencies only).
