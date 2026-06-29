# Constraint Starters — code / VCS hygiene

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: Git (version control) operations and history hygiene. These belong to `domain: code` (the development-process side); use `fits when` to match work involving Git in general, or making a repository public / mirroring it.
>
> **How this differs from `secrets-no-hardcode` in `code-security.md`**: `secrets-no-hardcode` covers **prevention before writing** (do not hardcode secrets into code/config; separate code from secrets). This domain covers **the separate path of Git operations and history** (a mistakenly committed secret lingers in history; secrets written into commit messages; the whole history leaking when a public mirror is pushed). Prevention-before-writing is `secrets-no-hardcode`; Git history, messages, and the publishing path are here (some work surfaces both).

## id: git-secret-history-removal

- name: A mistakenly committed secret needs history removal AND rotation (a delete commit alone does not remove it)
- domain: code
- fits when: A secret (API key, token, password, connection string) was committed by mistake. When you see the assumption that "adding a new commit that removes the file with the secret will make it gone." Any Git work where a secret may have entered history.
- starter:
  - Anti-direction: Do not treat a secret as "gone" just because you added a later commit that removes it (it lingers in past commits, forks, clones, and host-side cached views). Do not leave a leaked secret valid just to avoid rewriting history.
  - Invariant: When a secret enters history, **first revoke/rotate that secret** (once leaked it is compromised and can no longer be trusted). Then, if needed, remove it from history with a history-rewriting tool (e.g. `git filter-repo`), coordinating with collaborators on the assumption that it also lingers in forks, other clones, and host-side caches. History rewriting changes commit hashes and has large side effects, so when rotation alone suffices, prefer that.
- source: GitHub Docs "Removing sensitive data from a repository" (https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository, retrieved 2026-06-28) / OWASP DevSecOps Guideline "Secrets Management" (https://owasp.org/www-project-devsecops-guideline/latest/01a-Secrets-Management, retrieved 2026-06-28)

## id: git-commit-message-no-secrets

- name: Do not write confidential data into commit messages or history
- domain: code
- fits when: When you see internal URLs, customer names, raw incident details, temporary passwords, or confidential ticket data about to be written into a commit message, PR body, or tag annotation. Work on a repository that may later be made public / open-sourced.
- starter:
  - Anti-direction: Do not write commit messages or PR bodies assuming "only insiders read this" and leave internal URLs, customer names, temporary credentials, or incident details in them. Do not guard only the code while leaving the message/history text exposed.
  - Invariant: Commit message, PR, and tag bodies are part of history too — do not bring confidential data into them (publishing exposes the whole history; later deletion can still linger in history and caches). When you must refer to something confidential, keep it to an identifier (a ticket number, etc.) and do not write the secret itself into the body.
- source: OWASP DevSecOps Guideline "Secrets Management" (secrets linger in commits/history; remain searchable on the web after removal · https://owasp.org/www-project-devsecops-guideline/latest/01a-Secrets-Management, retrieved 2026-06-28)

## id: git-prevent-secret-commit

- name: Block secret commits at the entry point (.gitignore, pre-commit detection)
- domain: code
- fits when: Work handling files that may contain secrets — `.env`, key files, certificates, config with credentials. When you want to block secrets at the entry point rather than removing them after they enter history. Any Git work in general.
- starter:
  - Anti-direction: Do not proceed without blocking secret-bearing files in `.gitignore`, inviting accidental commits. Do not rely on after-the-fact cleanup ("just remove it once it's in") — once it enters history, removal cost spikes.
  - Invariant: **Block patterns of secret-bearing files in `.gitignore` first** (`.env`, `*.pem`, keys, credential files, etc.). The ideal is to stop secrets before they enter the repository (pre-commit detection — a pre-commit hook or secret scanner that catches them before the commit). Prefer entry-point prevention over post-entry removal (`git-secret-history-removal`).
- source: OWASP DevSecOps Guideline "Secrets Management" (pre-commit hooks prevent secrets from entering the code base · https://owasp.org/www-project-devsecops-guideline/latest/01a-Secrets-Management, retrieved 2026-06-28) / example secret scanner = gitleaks (secret-detection tool for git repos · https://github.com/gitleaks/gitleaks, retrieved 2026-06-28; as of 2026-06 feature-complete [security patches only], author migrating to successor Betterleaks. Adopt the "add pre-commit detection" principle, not the tool name)

## id: git-history-audit-before-public

- name: Audit history before making a repository public / mirroring it
- domain: code
- fits when: Work that makes a previously private repository public (open-sourcing, creating a public mirror). A moment where not just the current code but the entire past history is exposed externally at once.
- starter:
  - Anti-direction: Do not publish judging only by the current snapshot ("the current code has no secrets, so it's safe") — if a mistakenly committed secret remains in past history, it leaks with the whole history the moment you publish. Do not forget that even if you notice and delete it after publishing, it lingers in forks and caches.
  - Invariant: Before publishing/mirroring, **audit the entire history** for confidential data (scan the whole history to surface secrets and confidential messages remaining in past commits). If found, do history removal and rotation (`git-secret-history-removal`) before publishing. Treat publishing as irreversible (once history is out, you cannot take it back) and make the pre-publish check the last gate.
- source: GitHub Docs "Removing sensitive data from a repository" (lingers in forks, clones, caches; limits of post-publish removal · https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository, retrieved 2026-06-28)
