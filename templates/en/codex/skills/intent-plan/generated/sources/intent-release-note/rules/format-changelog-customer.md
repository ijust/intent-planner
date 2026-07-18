# format mapping: customer-facing changelog (user-impact first)

The definition of the output structure by which the `intent-release-note` skill assembles the git commit history and the result of intent reconciliation into a **customer-/user-facing changelog** — a change log that the people who use the product read to learn "what changes for me". SKILL.md handles the procedure, git reading, and intent reconciliation; "which material goes into which heading, in what order" refers to this rule. It is a third output form alongside the existing `format-changelog.md` (developer-facing, by category) and `format-github-releases.md` (narrative + list).

## Boundary of responsibility (defining output structure, not reading / checking)

- This rule is a **format mapping (output-structure definition)**. It defines only the changelog's section composition, ordering, and the opening of each item.
- Reading the git log, reconciling commits with intent (packet name / parent intent / deltas), and interpreting the range are **SKILL.md's responsibility**, not this rule's.
- That the output goes to a derived directory (`.intent/release-note/`, git-untracked, read-only), and that canonical / git are not rewritten, are the skill's invariants; this rule gives only the structure under that premise.

## Reader and design constraint (user-impact first)

The reader is assumed to be a person who **uses** the product (a customer, an end user). Such a reader wants to know "what changes for how I use it", not commit titles or internal implementation diffs. So this format takes **user-impact first** (DR93's `changelog-for-humans`) as the core of its composition.

- **Open each item with "what changes for the user".** Do not transcribe commit titles or enumerate internal diffs. Lead with the change as the user sees it, as in "you can now …", "… is now faster", "fixed the problem where …".
- **Open up internal-implementation terms (A33).** Do not emit function names, module names, internal identifiers (INV/DR/pkt-), or refactor jargon bare. Paraphrase into the words the user uses, or do not list internal changes that do not affect the user.
- **One output, one purpose (type separation).** The customer-facing changelog stays about conveying user impact; do not mix developer-facing technical detail or migration steps into the same output (a separate format — the developer-facing changelog — carries those; DR93's `doc-type-separation`).
- **Omit changes that do not affect the user.** Commits with no user-visible change — internal refactors, added tests, CI changes — are not listed in the customer-facing view (the developer-facing changelog's Other slot picks them up).

## Composition (top to bottom)

| Order | Section | What goes here |
|---|---|---|
| 1 | Heading (version / range and date) | Identification of the target range (default: previous tag..HEAD) and the generation-time date |
| 2 | What you can now do | What the user can newly do (new features from the user's point of view) |
| 3 | What got better | Improvements to existing usability / speed / experience (as the user-visible change) |
| 4 | What we fixed | Fixes to bugs that troubled the user (what got fixed, from the user's point of view) |

- Every item under each section opens with the user-visible change (do not open with a commit title). Where an item is tied to an intent, add the "why" in one line to the extent it makes sense to the user (do not open up the internal reasons).
- Omit an entire section's heading when there is no matching user impact (do not create empty headings).
- Commits that do not affect the user (internal changes) are not emitted in this format (their destination is the developer-facing changelog).
- Do not invent a change not in the material for the sake of the format. For a commit whose user impact cannot be read, do not fabricate user-facing wording — drop it (the developer-facing view picks it up).

## Invariants

- Do not re-read or change git / canonical (reading and reconciliation are SKILL.md's; writing is SKILL.md's Write to the derived directory).
- Do not break the order that opens each item with "what changes for the user" (the core of user-impact first).
- Do not point internal-implementation terms or internal identifiers at the user bare (A33).
- Do not fabricate a change whose user impact cannot be read, for the sake of the format.
