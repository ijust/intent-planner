# Design frame candidate surfacing

Use this procedure to match the role lens and case context against the shared design-frame catalog only when needed and connect candidate decisions to the existing decision ledger. This rule does not generate drafts.

## Inputs and output

- Inputs: the confirmed free-text role lens, the case purpose and context, the optional `.intent/design-frames.md`, and the optional inherited issue directory.
- Output: relevant candidates with a one-line fit reason for each candidate and the decision on each candidate, or no presentation while the existing flow continues.

## Procedure

1. **Judge the experience viewpoint by meaning.** Judge the semantic meaning of the free-text role lens together with the case purpose and context to decide whether an experience-design viewpoint is needed. Do not require an exact match against a fixed job title or fixed viewpoint name.
   - If an experience-design viewpoint cannot be inferred, present no candidate, generate no draft, and continue the existing flow.
   - If the case is limited to pure backend work, present no candidate, generate no draft, and continue the existing flow.
2. **Check the catalog only after it is needed.** Only when an experience-design viewpoint is needed, read `.intent/design-frames.md` read-only. Do not read the catalog before that need is established.
   - If the catalog does not exist, present no candidate, generate no draft, and continue the existing flow. Do not treat absence as an error or stop condition.
3. **Narrow the relevant entries.** Match each entry's `suitable situations` semantically against the current case purpose, user touchpoints, experience flow, and frontstage-backstage coordination. First inspect only headings, names, and `suitable situations`; only the relevant entries are then read. Do not routinely read every entry's scaffold or sources.
   - If the fit is weak, present no candidate, generate no draft, and continue the existing flow. Do not add candidates from speculation.
**Check decisions before presenting candidates.** When the inherited issue directory has a `constraint-ledger.md`, read it before presenting candidates. In the same issue series, a frame id that has a decision does not resurface.
   - Semantically compare the one-line context recorded for a decline with the current case. The purpose or context has semantically changed: only then may a declined candidate be re-evaluated. Days, counts, and a resurfacing deadline are mechanical conditions; do not add them. When a frame id has multiple rows, the last row wins.
4. **Present only candidates with reasons.** When a clear fit exists, for each candidate present its established name and a one-line plain-language reason for the fit. Add no numeric rank or score, and wait for the person's decision.
5. **Record the person's decision in the existing container.** When a candidate is adopted, declined, or deferred, append one row in the existing format to the inherited issue directory's `constraint-ledger.md`.

   `| frame id | host | decision | one-line context | date |`

   Use `discover` as the host and add no columns. A declined row must include one-line context that identifies the current purpose and target scope.
   - If the issue directory or `constraint-ledger.md` is absent, skip recording and do not stop. The decision made in the current conversation remains respected while the existing flow continues.

## Silent outcomes

Silence is not a failure. With no experience viewpoint, pure backend work, an absent catalog, or a weak fit, expose neither a frame candidate nor the internal judgment to the user and continue the existing discover flow unchanged. Generate no draft before adoption and change no canonical artifact.
