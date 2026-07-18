# Assignment view (generated only when requested)

A procedure that read-only aggregates parallel-implementation assignment declarations (`.intent/assignments/`) into a single sheet — "who is implementing which packet, and where is the double-booking" — and derives it to `.intent/overview/assignment-view.md`. In `intent-overview` Step 2, apply this **only when the user asks for assignments (who is implementing what)** (the default run does not generate this view; it only emits the one-line pointer in Output). It goes as far as finding and naming double-booking — it does not stop anything or auto-release (C40/A52 · INV66 · DR99 · DR92).

## Applicability (does not run by default)

- Generate only when the user **requests assignments (who is implementing what)** from `/intent-overview` (natural-language triggers: "assignment", "who is implementing", "double-booking", "declaration", etc.). Do not bundle it into the default overview (pull discipline / context cost).
- On a default run without a request, do not generate this view; leave only the one-line pointer in overview.md. The default run's output and cost are unchanged (behavior-preserving).
- When there are zero assignment declarations (`.intent/assignments/` is absent, or there is no declaration file other than `README.md`), do not stop; return an empty view stating "no assignments" (do not error · backward-compatible · do not fill in by guessing).

## Procedure

1. **Read the assignment declarations read-only**: from each declaration file under `.intent/assignments/*.md` (excluding `README.md`), read the frontmatter `packet_id` / `declared_at` / `session` / `note`. Match the `<packet_id>` part of the file-name pattern `<packet_id>-<session-rand>.md` against the frontmatter `packet_id` (a simple file-name check requiring no semantic judgment). Read only — do not create, delete, or rewrite declarations.
2. **Reconcile with active packets (a separate layer; do not reinterpret state)**: match each declaration's `packet_id` against the frontmatter of `.intent/packets/active/*.md` (the source of truth; `index.md` is a regenerable derived cache), and split into "assigned packets (has a declaration)" and "unassigned packets (no declaration)". An assignment declaration is a **separate layer** from the packet `state` (5 values); do not rewrite or reinterpret `state` (DR99). You may show a declaration alongside `state`, but the derivation is read-only.
3. **Name double declarations (double-booking) — warn only, do not stop**: if **two or more** declaration files carry the same `packet_id`, name it as double-booking (which `session`s are touching the same packet). **Warn only — do not stop or reject** (leave the operational call for parallelism to the human · INV66). Declarations for different `packet_id`s merely sitting side by side are not double declarations (do not conflate them).
4. **Show stale declarations as an observation (no mechanical threshold, no auto-release)**: for a packet whose declaration remains while progress has stalled, show only the elapsed time since `declared_at` **as an observation**. Do not auto-judge, auto-release, or auto-warn on a threshold such as elapsed days (INV2/INV66 · Anti-direction 321).
5. **Show a declaration lingering on an archived packet as an observation**: when a declaration's `packet_id` is not present under `.intent/packets/active/` (e.g. moved to `archive/`), show "a declaration lingers on an archived packet" as an observation (do not auto-delete — releasing a declaration after implementation is a manual action by the session that declared it).
6. **Write to `.intent/overview/assignment-view.md` with full replacement**: state the generation time at the top (derived · regenerable · manual regeneration only). Writes are limited to under `.intent/overview/` (do not write to canonical).

## Shape of the output

- Top: generation time, the material read (declaration-file count, active-packet count), and **that it is derived, not the source of truth**.
- Body: a list of "assigned N / unassigned M" (assigned entries show `packet_id` + `state` + the declaring `session` + `note`). A double-declaration section (naming the `session`s touching the same packet · warn). A stale-declaration section (elapsed time since the declared date, as an observation). If a declaration lingers on an archived packet, a separate section.
- When empty: **state "no assignments"** (do not fabricate a list). In a repo with zero declarations, behave as before, same as the default overview flow (backward-compatible).
- Bottom: a note that it is derived, not the source of truth, and that creating/releasing a declaration is a manual action by the declaring session itself (this view goes as far as the list — no automation).

## Discipline (must hold)

- **Read-only derivation · warn-only · do not stop (INV66 · the most important oracle)**: name double-booking but do not gate it (do not stop export/push). Do not create, delete, or auto-clean declarations. Do not auto-release stale declarations on a mechanical threshold.
- **Declaration and state are separate layers (DR99)**: do not rewrite or reinterpret `state` (draft/ready/implementing/verifying/done). A declaration carries only "who declared start, and when".
- **A double-declaration warn is real harm; a derived drift is not a conflict (A31/INV38)**: name double declarations on the same packet (double-booking in parallel implementation) as real harm, but do not use the word "conflict" to alarm the user about a regeneration drift of the derived artifact (this view) (regeneration is manual-run only · DR92). Do not conflate a parallel conflict on a real file (declaration files, packet body) with a derived drift that a regeneration fixes.
- **No mechanical threshold or scoring (INV2)**: show the elapsed time of a stale declaration only as an observation; do not auto-judge on a day threshold.
- **Do not emit entries you cannot trace to a source**: every entry traces to a declaration file / packet that was read (zero fabrication · same line as evidence-anchored).
- **Do not rewrite canonical**: writes are limited to `.intent/overview/assignment-view.md`. Actually resolving double-booking is the human's call (this view goes as far as the list).
