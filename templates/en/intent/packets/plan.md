# Packet Plan

> Updated by `/intent-packets`. The packet bodies live as individual files under `active/`; this file holds plan-level records only.

## Walking Skeleton (fill in when designer-questions: on)

> Updated by `/intent-packets` when designer-questions=on.

- **Top-priority packet**: (packet name)
- **E2E verdict**: (spans end-to-end / does not span)
- **Confirmation result**: (what the user confirmed. If walking-skeleton conversion is deferred, also record the reason under Deferred)

## Recommended First Packet

> Updated by `/intent-packets`. Records exactly one packet to start with, together with qualitative reasons.

- **Recommended packet**: (packet name)
- **Reasons**: (qualitative criteria: risk reduction / unblocking dependencies / ease of rollback / size of learning / (when poc) cheapness of refuting the hypothesis)
- **Alignment with Walking Skeleton**: (aligned / if not aligned, the reason / Walking Skeleton not recorded)

## Work plan (optional: grouping and order of work)

> An optional section for writing, as human-declared data, the "grouping of work" and "priority within it" that dependencies (`depends_on` on each packet) alone cannot express. If this section is absent, the tools behave as before (they do not infer, and place no defaults). The writer is a human (the `/intent-packets` breakdown dialogue, or hand-editing); the tools only surface a read-only recommended order of work (no enforcing, no auto-assignment, no auto-replanning, no numeric scores, no dates).

**How to write it**:

- Write group headings **in your own words, freely** (`Phase`, `step`, `Sprint`, etc. — anything; **nesting is allowed**). The "Phase 1" below is an example, not a fixed name.
- Under each group, **list the packets numbered. The order itself is the priority** (start from the top). No labels or scores.
- **Items given the same number rank equally** (start either first = parallel work is not blocked).
- Refer to a packet by its name or `packet_id`.

**How the recommended order is read** (the tools derive it read-only): read this section **top to bottom**, skip anything that is `done`, has an unresolved dependency (`depends_on`), or is being worked on by another session, and surface the first remaining item as the next candidate. When the order and `depends_on` conflict, `depends_on` (the technical prerequisite) always wins.

Only for work whose Impact Analysis explicitly marks a shared contract, a thin `shared-contract source | protecting packet | Safety reference | integration oracle` table may be placed at the end of this existing section. The table is an index derivable from packet Safety / Invariants, not a canonical source. When there is no shared contract, add neither the table nor a dedicated heading.

```markdown
### Phase 1: Auth
1. Login (pkt-...-login)
2. Password reminder (pkt-...-reminder)

### Phase 2: Core
1. Main feature (pkt-...-main)
1. Admin screen (pkt-...-admin)   ← same number = start either first
2. Sub feature (pkt-...-sub)
```

## Deferred

Rules / examples intentionally excluded from the current packets, and drifts explicitly deferred with a reason. Record them rather than silently dropping them; they become seeds of follow-up packets or Open Questions.
