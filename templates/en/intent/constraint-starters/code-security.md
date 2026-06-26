# Constraint Starters — code / security

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: code security (OWASP family). These belong to `domain: code`; use `fits when` to match work involving user input, authentication, or secrets, on the frontend or backend alike.

## id: sql-injection-placeholder

- name: SQL injection prevention (always use placeholders)
- domain: code
- fits when: A web app or similar that builds SQL or queries a database using values that include user input. When you see queries being built by string concatenation.
- starter:
  - Anti-direction: Do not embed user input into SQL by string concatenation. Do not execute a dynamically assembled query string as-is.
  - Invariant: User-derived values must always be passed via placeholders (parameterized queries). Never concatenate values as part of SQL syntax.
- source: OWASP SQL Injection Prevention Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html, retrieved 2026-06-21)

## id: xss-output-encoding

- name: XSS prevention (output encoding / auto-escaping)
- domain: code
- fits when: A web frontend or template that renders user-derived data into HTML / JavaScript / URL / CSS contexts. When you see code bypassing the framework's auto-escaping (`dangerouslySetInnerHTML`, raw `innerHTML`, `bypassSecurityTrust*`, etc.).
- starter:
  - Anti-direction: Do not insert user input into the DOM without escaping. Do not bypass the framework's auto-escaping via casual "escape hatches."
  - Invariant: Pass output variables through output encoding appropriate to the render context (HTML body / attribute / JS / URL / CSS). When HTML must be allowed, use a sanitization library. Pick the correct encoding per context.
- source: OWASP Cross Site Scripting Prevention Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html, retrieved 2026-06-26)

## id: csrf-token

- name: CSRF prevention (tokens / SameSite)
- domain: code
- fits when: A web app using cookie-based session authentication that has state-changing operations (form submit, update, delete, etc.). When an authenticated user's browser could be tricked into sending unintended requests.
- starter:
  - Anti-direction: Do not accept state-changing requests based only on the presence of an auth cookie. Do not assume the framework handles CSRF and proceed unverified.
  - Invariant: Use the framework's built-in CSRF protection first. If absent, attach a CSRF token to state-changing requests and validate it server-side. Combine with the SameSite attribute on session cookies (since XSS can defeat CSRF defenses, run it alongside XSS prevention).
- source: OWASP Cross-Site Request Forgery Prevention Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html, retrieved 2026-06-26)

## id: authorization-least-privilege

- name: Authorization (least privilege / verify server-side every time)
- domain: code
- fits when: Work where accessible resources and operations vary by role or ownership. When authentication (identity) is done but access control design is still ahead, or when one user can touch another's resources by ID (horizontal privilege escalation).
- starter:
  - Anti-direction: Do not treat "authenticated" as "allowed to do anything." Do not place authorization checks only on the client. Do not return a resource by ID without an ownership check.
  - Invariant: Deny by default and grant only the needed permissions (least privilege). Verify the allowed actor and row-level ownership (who may touch which data) server-side on every request. Log authorization violations.
- source: OWASP Authorization Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html; OWASP Top 10 2021 A01 Broken Access Control, retrieved 2026-06-26)

## id: secrets-no-hardcode

- name: Secrets management (no hardcoding / centralized)
- domain: code
- fits when: Work handling secrets such as API keys, DB credentials, SSH keys, or certificates. When you see secrets being written directly into source code or config files.
- starter:
  - Anti-direction: Do not write secrets in plaintext into source code, config files, or the repository. Do not emit secrets into logs or error messages.
  - Invariant: Centralize secrets in dedicated secrets management (env-var injection, a secrets manager, etc.) and control storage, provisioning, auditing, and rotation. Separate code from secrets.
- source: OWASP Secrets Management Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html, retrieved 2026-06-26)
