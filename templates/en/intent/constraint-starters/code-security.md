# Constraint Starters — code / security

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: code security (OWASP family). This does not belong to a single layer — it is a **cross-cutting concern that spans every layer**; it belongs to `domain: code`, and you match it via `fits when` to any work — frontend, API, or backend alike — that touches user input, authentication, secrets, or transport. API-specific boundary concerns (rate limiting, SSRF, mass assignment, excessive data exposure) live in code / API & boundary (`code-api.md`).

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

## id: sensitive-data-in-logs

- name: Prevent sensitive information in logs
- domain: code
- fits when: Work in general that emits application or audit logs in processing that handles authentication, payments, or personal data.
- starter:
  - Anti-direction: Do not log passwords, tokens, keys, card data, connection strings, and the like as-is.
  - Invariant: Do not record credentials, session values, access tokens, encryption keys, payment/account information, or DB connection strings in logs. Sensitive values that must be recorded are masked, hashed, or removed before emitting.
- source: OWASP Logging Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html, retrieved 2026-07-04)

## id: security-response-headers

- name: Security response headers / transport protection
- domain: code
- fits when: Work in general that exposes over HTTP a web app or API used from browsers.
- starter:
  - Anti-direction: Do not allow plaintext HTTP or omit defensive response headers. Do not issue sensitive cookies without Secure/HttpOnly.
  - Invariant: Serve every path over HTTPS and add `Strict-Transport-Security` (HSTS). Set defensive headers such as `Content-Security-Policy` and `X-Content-Type-Options: nosniff`, and attach Secure, HttpOnly, and SameSite to sensitive cookies.
- source: OWASP HTTP Security Response Headers Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html, retrieved 2026-07-04) / OWASP Transport Layer Security Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html, retrieved 2026-07-04)

## id: untrusted-deserialization

- name: Never deserialize untrusted data
- domain: code
- fits when: Work that reconstructs objects from externally sourced serialized data (cookies, request bodies, queues, caches, files). When you see a language-native serialization mechanism (pickle, Java Serializable, PHP unserialize, etc.) being used on external input.
- starter:
  - Anti-direction: Do not pass user-controllable byte sequences straight into a language-native deserializer (it leads directly to remote code execution).
  - Invariant: Exchange data with the outside in data-only formats such as JSON. When native serialization is unavoidable, restrict the reconstructible types with an allow list and perform integrity verification (signing) before deserializing.
- source: OWASP Deserialization Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html, retrieved 2026-07-04)

## id: password-storage-hashing

- name: Password storage (dedicated slow hash; no plaintext / reversible / fast hashes)
- domain: code
- fits when: Work that implements and stores password authentication itself. When you see plaintext storage, reversible encryption, fast hashes such as MD5/SHA-256, or a homegrown scheme without salt.
- starter:
  - Anti-direction: Do not store passwords in plaintext, with reversible encryption, or with general-purpose fast hashes (SHA-256, etc.). Do not invent your own hashing scheme.
  - Invariant: Store passwords with a slow hash dedicated to password storage (first choice Argon2id; alternatively scrypt; PBKDF2 under FIPS requirements; bcrypt for legacy compatibility), at or above the recommended parameters in the source.
- source: OWASP Password Storage Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html, retrieved 2026-07-04)

## id: file-upload-validation

- name: File upload validation (type, storage location, filename sanitization)
- domain: code
- fits when: Work with a feature that lets users upload files. When you see the user-provided filename and Content-Type being trusted and stored as-is.
- starter:
  - Anti-direction: Do not trust the user-provided filename or Content-Type. Do not place uploaded files directly under a web-served directory as-is.
  - Invariant: Validate extensions with an allow list of only the types the business needs, and also verify the file signature (magic bytes). Regenerate the stored filename on the application side (preventing path traversal and injection). Store outside the web root or on segregated storage, and enforce a size limit.
- source: OWASP File Upload Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html, retrieved 2026-07-04)

## id: dependency-vulnerability-management

- name: Dependency vulnerability management (inventory, continuous detection, recorded decisions)
- domain: code
- fits when: Any work with third-party dependencies (npm, PyPI, Maven, etc.). When you see dependencies added and never updated, with no mechanism to detect known vulnerabilities.
- starter:
  - Anti-direction: Do not add dependencies and then leave them unattended. When a known vulnerability (CVE) is published, do not keep deferring the response decision "because it still works."
  - Invariant: Keep the dependencies and versions in use knowable, and build a mechanism that continuously detects known vulnerabilities (a dependency audit tool) into the development flow. When a vulnerability appears, record a decision: update, workaround, or risk acceptance.
- source: OWASP Vulnerable Dependency Management Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html, retrieved 2026-07-04)
