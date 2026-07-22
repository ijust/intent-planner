# Graphiti document sync boundary

This contract is used only by the sync operation of `intent-graphiti-sync`. It concretizes the skeleton "Outbound denial skeleton" of the shared contract `graphiti-safety-boundary.md` in the narrowing direction only. The skeleton, capability classification, operation allowlists, and the `status` limit are not redefined here. Preflight does not load this contract and does not run its checks.

This contract fixes only the rules the sync operation actually uses. The limits and screening procedures for `purge` and `search` are not fixed by this contract (the later history/team-sync spec and the stage-specific search spec fix them respectively).

## Range rules

Sync targets are selected from range rules the user explicitly provides. Do not require enumerating documents one by one.

| Rule field | Meaning |
|---|---|
| `allowedDirectories` | Local directories whose contents become sync candidates (recursive) |
| `allowedExtensions` | File extensions that become sync candidates |
| `allowedUrlPrefixes` | Registered URLs or URL prefixes that become sync candidates (HTTP(S) only) |
| `userExclusions` | User-added excluded directories, extensions, and URLs |

- Exclusion rules always override allow rules. A target matching both is excluded.
- Targets outside the allow scope are neither read nor sent and never become sync candidates.
- Caller-built "already allowed" claims are never accepted; the guard itself evaluates every target.

## Hard exclusions

The following targets cannot be lifted by matching an allowed root or extension and are excluded before reading. Dependency directories include `node_modules` and similar; build directories include `dist`, `build`, and similar; cache directories include `.cache` and similar directories defined by the project. This list is a floor; later specs may add to it but never narrow it.

| Hard exclusion | Decision |
|---|---|
| `.git/**` | `deny-before-read` |
| `dependency-directory` | `deny-before-read` |
| `build-directory` | `deny-before-read` |
| `cache-directory` | `deny-before-read` |
| `.env` | `deny-before-read` |
| `.env.*` | `deny-before-read` |
| `*.pem` | `deny-before-read` |
| `*.key` | `deny-before-read` |
| `*.crt` | `deny-before-read` |
| `*.cer` | `deny-before-read` |
| `*.p12` | `deny-before-read` |
| `*.pfx` | `deny-before-read` |
| `id_rsa*` | `deny-before-read` |
| `id_ed25519*` | `deny-before-read` |

## Locator screening procedure

Before sync reads a local file or connects to the web, the guard itself checks read-only in the following order. Caller self-claims such as `allowed`, `public`, or `verifiedBy`, and reuse of previously computed decisions, are never accepted. Case differences, path-separator differences, and symlinks cannot bypass hard exclusions or the allow scope.

| Phase | Guard-owned check | Timing |
|---|---|---|
| `1-normalize` | `case,path-separator,symlink-real-path` | `before-read-or-connect` |
| `2-hard-exclusion` | `resolved-identifier` | `before-read-or-connect` |
| `3-allow-scope` | `resolved-identifier` | `after-hard-exclusion` |
| `4-http-scheme` | `http-or-https` | `before-dns-or-connect` |
| `5-dns-all-addresses` | `every-resolved-address` | `before-connect` |
| `6-pre-connect-dns-recheck` | `every-resolved-address` | `immediately-before-connect` |
| `7-every-redirect` | `prefix,scheme,dns-all-addresses,pre-connect-dns-recheck` | `before-following-redirect` |

- Web retrieval targets only HTTP(S) destinations inside allowed prefixes. Every DNS-resolved address is evaluated, and connections that can reach `localhost`, loopback, private, link-local, unique-local, multicast, reserved, or metadata destinations are denied before any external connection, for both IPv4 and IPv6.
- Redirects are never trusted automatically; each target is rechecked for allowed prefix, scheme, and all addresses before following. A redirect leaving the allow scope is denied.
- Denials are per target and do not stop processing of other targets. Denial reports never include raw values such as URL credentials or query strings.

## Secret detection

Content read or retrieved after locator screening is treated as unverified regardless of origin, and the guard itself inspects it for secrets before handing it to Graphiti. Content that cannot be fully inspected as text is never presumed safe. Secret values are held only during inspection and are never copied into decisions, reports, or records.

| Secret kind | Decision |
|---|---|
| `private-key` | `deny-before-Graphiti-call` |
| `credential` | `deny-before-Graphiti-call` |
| `token` | `deny-before-Graphiti-call` |
| `api-key` | `deny-before-Graphiti-call` |
| `password` | `deny-before-Graphiti-call` |
| `certificate` | `deny-before-Graphiti-call` |
| `environment-variable-secret` | `deny-before-Graphiti-call` |
| `uninspectable-content` | `deny-or-out-of-scope` |

## Bounded sync calls

Sync makes an external call only when the host or MCP client can guarantee, before the call, a limit at or below the values here with zero retries. The exact table value is accepted; if only a longer limit is available, even by one millisecond, or no limit can be enforced, that target alone fails with `bounded-timeout-unavailable`. Shorter limits are allowed. No automatic retries.

| Call kind | maxElapsedMs | retryCount |
|---|---:|---:|
| `upsert` | 30000 | 0 |
| `web-fetch` | 20000 | 0 |

The `web-fetch` limit includes DNS resolution and redirect checks. The `status` limit is defined by the shared contract. The limits for `purge` and `search` are not fixed by this contract.
