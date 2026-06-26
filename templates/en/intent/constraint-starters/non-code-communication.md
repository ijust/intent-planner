# Constraint Starters — non-code / communication

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: non-code communication (announcements, emails, release notes, and other writing meant to move the reader). These belong to `domain: non-code`.

## id: bluf-message

- name: Lead with the conclusion (BLUF / bottom line up front)
- domain: non-code
- fits when: Writing emails, announcements, requests, or reports that prompt the reader to decide or act. When it starts from background and buries the conclusion at the end, so a busy reader misses the point.
- starter:
  - Anti-direction: Do not start from context/background and place the conclusion at the end. Do not structure it so the reader must read to the end to learn "what to do."
  - Invariant: Put the bottom line (the conclusion, request, deadline — what the reader needs first) up front (Bottom Line Up Front). Add background and rationale afterward. Let the reader decide the next action from the opening alone.
- source: Carnegie Mellon University Student Academic Success Center "BLUF (The Topic Sentence)" handout (https://www.cmu.edu/student-success/other-resources/handouts/comm-supp-pdfs/bluf-topic-sentence.pdf, retrieved 2026-06-26)

## id: changelog-for-humans

- name: Release notes / changelog (for humans, user-impact first)
- domain: non-code
- fits when: Writing release notes or a changelog. When commit logs are pasted as-is or machine-oriented diffs are listed, so users cannot tell "what changed and how it affects me."
- starter:
  - Anti-direction: Do not turn a list of commit messages into the changelog. Do not produce a history missing versions/dates or mixing change types together.
  - Invariant: Write the changelog for humans, not machines. Make an entry per version, show the release date, group the same types of changes (added / changed / fixed / removed, etc.), and put the latest version first. Make each item's meaning (impact) for users readable.
- source: Keep a Changelog 1.1.0 (changelog guidance: for humans, per version, grouped by type, latest first, https://keepachangelog.com/en/1.1.0/, retrieved 2026-06-26)
