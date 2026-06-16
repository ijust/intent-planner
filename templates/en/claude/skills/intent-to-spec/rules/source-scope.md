# source scope interpretation procedure (read-only, three-layer reading)

The canonical procedure by which the `intent-to-spec` skill interprets the range specified by the user (source scope) and reads the three layers of that range (Intent / steering constraints / requirements) as source material. SKILL.md holds only the procedure and reporting format; "which range to interpret how, and what to read from which heading" is defined by this rule. This rule only **reads** the projection source; it never modifies the canonical `.intent/*.md`, packets, or steering (tech.md etc.) (writes go only under `.intent/nl-spec/`, and that is outside this rule's responsibility).

## posture (hold no custom parser; read and interpret `.intent/` directly)

Range interpretation and three-layer reading are performed by the LLM reading the `.intent/` artifacts directly, holding no custom parser, schema, or index. Introduce no new structure; treat the existing artifacts' headings, columns, and frontmatter as source material as they are. Do not reimplement the recovery / check / drift judgment logic; if they have left output, only read it.

## Range interpretation (arguments + dialogue completion)

Starting from the arguments the user passed to `/intent-to-spec`, interpret the range along the following four axes. For any axis the arguments do not uniquely determine, ask the user, wait for a reply, and only then confirm (do not fill by guessing).

| Axis | What to interpret | Default (when unspecified) |
|---|---|---|
| Intent subtree | which level / which branch of intent-tree to use as source (from where in L0–L4 down) | If the range is not unique, ask. Do not generate while ambiguous |
| packet group | which packets to use as source (enumeration of packet names / "all" / narrowing by state) | If the range is not unique, ask |
| steering constraints | whether to include steering-level constraints (tech.md etc.) as source | Do not include. Include only when explicitly specified (e.g. "+steering") |
| crossing requirements | which range of individual requirements crossing multiple packets to bundle | Follow the packet-group specification above |

- If the arguments uniquely fix the range, do not perform dialogue completion (do not add unnecessary questions).
- When the arguments cannot uniquely fix the range, ask the user only about the axes that cannot be fixed, wait for a reply, and then proceed to reading.

## Three-layer reading (exact references, fixed)

For the confirmed range, read the following three layers across, and bundle them as source material for a single document. Each artifact's headings, columns, and frontmatter are fixed in the table below (if they change, this rule must follow = Revalidation Trigger).

| Layer | File to read | Exact heading / column (fixed) | Treatment as source material |
|---|---|---|---|
| Intent (why / invariants / decision criteria) | `.intent/intent-tree.md` | `## L0`–`## L4` (the hierarchy body) plus `## Assumptions` (plus `## Open Questions` if present) | Read L0–L4 of the specified subtree as canonical why. Treat Assumptions / Open Questions as inferred, in a separate slot |
| Intent (direction and constraints) | `.intent/intent-compass.md` | `## North Star` / `## Anti-direction` / `## Invariants` / `## Decision Rules` | Read North Star as purpose, Invariants as invariants, Decision Rules as decision criteria, Anti-direction as the direction to avoid |
| steering constraints (only when specified) | steering (`tech.md` etc.) | the headings of each steering document | Only when there is a specification to include them in the range, read them as constraints to uphold. If unspecified, do not read |
| requirements (individual requirements) | `.intent/packets/index.md` plus `.intent/packets/active/*.md` | index columns `packet_id \| name \| state \| summary` plus packet body frontmatter (including `depends_on`) and the body `## Evidence` | Read the individual requirements, dependencies, and evidence of the specified packet group, and bundle them as crossing requirements |

- Keep canonical descriptions (the tree's L0–L4 / the compass's 4 sections / packets / steering) and inferred-derived descriptions (Assumptions / Open Questions) distinguished from the reading stage on, and do not mix them.
- Do not read artifacts outside the range (use only the `.intent/` artifacts of the specified range as source material).

## When the range is ambiguous / the relevant artifact is absent (do not generate)

In any of the following cases, do **not** generate the natural-language Spec. Without generating, present the information by which the user can choose the next move, and stop.

- **Range is ambiguous** (no axis is uniquely fixed by arguments or dialogue): name what is ambiguous (which axis), present the **available range** (the actually-existing intent-tree subtrees / the packet list / the presence of steering), and prompt for re-specification of the range.
- **Relevant artifact is absent** (the specified intent-tree / compass / packet / steering does not exist, or is unfilled): name the **missing artifact**, and guide to the relevant skill that prepares it (discover / compass / packets etc.). Do not substitute by guessing.

In either case, do not write.

## Reading boundary (read-only)

- Treat the projection source (intent-tree / compass / packets / steering) as **read-only**; do not create, modify, or delete it.
- This rule's responsibility ends at "range interpretation" and "three-layer reading"; mapping the read material into the document is the responsibility of the format rules, and trace attribution / inferred marking is the responsibility of the fabrication-guard rule.
- Pass the read material on while preserving which layer, which heading, and which packet it came from, so that the subsequent mapping can trace back to the projection source.
