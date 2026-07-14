# Design frame candidate surfacing

Use this procedure to match the role lens and case context against the shared design-frame catalog only when needed. This rule stops at candidate presentation. It does not record frame decisions or generate drafts.

## Inputs and output

- Inputs: the confirmed free-text role lens, the case purpose and context, and the optional `.intent/design-frames.md`.
- Output: relevant candidates with a one-line fit reason for each candidate, or no presentation while the existing flow continues.

## Procedure

1. **Judge the experience viewpoint by meaning.** Judge the semantic meaning of the free-text role lens together with the case purpose and context to decide whether an experience-design viewpoint is needed. Do not require an exact match against a fixed job title or fixed viewpoint name.
   - If an experience-design viewpoint cannot be inferred, present no candidate, generate no draft, and continue the existing flow.
   - If the case is limited to pure backend work, present no candidate, generate no draft, and continue the existing flow.
2. **Check the catalog only after it is needed.** Only when an experience-design viewpoint is needed, read `.intent/design-frames.md` read-only. Do not read the catalog before that need is established.
   - If the catalog does not exist, present no candidate, generate no draft, and continue the existing flow. Do not treat absence as an error or stop condition.
3. **Narrow the relevant entries.** Match each entry's `suitable situations` semantically against the current case purpose, user touchpoints, experience flow, and frontstage-backstage coordination. First inspect only headings, names, and `suitable situations`; only the relevant entries are then read. Do not routinely read every entry's scaffold or sources.
   - If the fit is weak, present no candidate, generate no draft, and continue the existing flow. Do not add candidates from speculation.
4. **Present only candidates with reasons.** When a clear fit exists, for each candidate present its established name and a one-line plain-language reason for the fit. Add no numeric rank or score, and wait for the person's decision.

## Silent outcomes

Silence is not a failure. With no experience viewpoint, pure backend work, an absent catalog, or a weak fit, expose neither a frame candidate nor the internal judgment to the user and continue the existing discover flow unchanged.
