# Constraint Starters — code / API & boundary

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: boundary concerns when exposing or designing an API to the outside (validating incoming input, curbing abuse, controlling binding, narrowing the data returned). These belong to `domain: code`. Cross-layer security (SQLi, XSS, CSRF, authorization, secrets, defensive headers, sensitive logs) is gathered in code / security (`code-security.md`).

## id: input-validation-fail-fast

- name: Input validation (early, at the boundary / fail-fast)
- domain: code
- fits when: Work that processes or persists data received from external sources (web clients, system integrations, partner feeds, etc.). When untrusted input flows downstream unchecked.
- starter:
  - Anti-direction: Do not pass input downstream (DB, other components) without validation. Do not scatter validation deep inside the processing.
  - Invariant: For every untrusted input source, validate as early in the data flow as possible (right after receiving from the external party) so that only well-formed data proceeds. Define the return contract for unexpected/empty input (fail-fast). Note: input validation is not a substitute for the primary defenses against XSS/SQLi (it runs alongside them as a supplement).
- source: OWASP Input Validation Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html, retrieved 2026-06-26)

## id: api-rate-limiting

- name: Rate limiting / throttling (public endpoints)
- domain: code
- fits when: Work exposing to the outside a public API callable even before authentication, an abuse-prone endpoint such as login or password reset, or an endpoint with heavy processing.
- starter:
  - Anti-direction: Do not accept requests to public endpoints without a limit on count or bandwidth, allowing brute force or resource exhaustion.
  - Invariant: Set a request rate limit per client or API key and reject on excess. Set especially tight limits on abuse-prone paths (authentication, password reset, etc.) and on costly processing.
- source: OWASP Denial of Service Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html, retrieved 2026-07-04)

## id: ssrf-prevention

- name: SSRF prevention (validate outbound requests / allow-list)
- domain: code
- fits when: Work where the server fetches a URL or host specified by the user (webhooks, image ingestion, URL preview, relaying an external API, etc.).
- starter:
  - Anti-direction: Do not fetch the whole user-supplied URL from the server as-is. Do not rely on a block-list to reject internal destinations.
  - Invariant: Limit destinations with an allow-list. Do not take the whole URL as-is; validate the hostname and IP individually. Block internal, cloud-metadata, and loopback destinations, and disable following redirects.
- source: OWASP Server Side Request Forgery Prevention Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html, retrieved 2026-07-04)

## id: mass-assignment

- name: Mass assignment prevention (allow-list of bindable fields)
- domain: code
- fits when: Work that binds the request body directly to a model or entity to update data (the standard shape in many web frameworks).
- starter:
  - Anti-direction: Do not bind the whole request body onto the model. Do not build it so a user can send `isAdmin` and rewrite privilege or internal fields.
  - Invariant: Explicitly allow-list the non-sensitive fields that may be bound. Or receive through a DTO holding only editable fields, excluding sensitive/internal fields from binding.
- source: OWASP Mass Assignment Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html, retrieved 2026-07-04)

## id: excessive-data-exposure

- name: Prevent excessive data exposure in API responses
- domain: code
- fits when: APIs that return objects as JSON, etc., in general. Especially work returning resources that contain sensitive information or PII, or work prone to serializing whole models.
- starter:
  - Anti-direction: Do not serialize and return whole objects, relying on client-side display control to hide sensitive fields.
  - Invariant: Return responses by explicitly selecting only the necessary fields (do not leave it to bulk serialization like `to_json()`). Identify sensitive information / PII before returning, and do not depend on client-side filtering.
- source: OWASP API Security Top 10 — API3:2019 Excessive Data Exposure (https://owasp.org/API-Security/editions/2019/en/0xa3-excessive-data-exposure/, retrieved 2026-07-04)
