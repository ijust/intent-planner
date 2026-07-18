# ⏱ 10-minute walkthrough — from install to "ready to implement"

**What this page promises**: in about 10 minutes, you will walk once through intent-planner — from installing it to having a handoff draft ready for implementation — looking at **real terminal output and real generated files**. The example feature is "I want to build a login feature". By the end, you can run discover → compass → packets → export on your own project without wondering what to type next.

> **An honest note**: every terminal output and generated file on this page was captured from real runs (there are no fabricated samples). The installer output below is from a real English-template run. The skill-generated excerpts are translated from a real Japanese-template run — the English templates are designed to produce the equivalent output in English (the skill excerpts on this page were not separately captured in English). The AI's wording (questions, phrasing) varies from run to run; rely on the flow and the shape of the artifacts, not the exact words. In the measured run, the AI's generation time totaled about 3–4 minutes; "about 10 minutes" is the estimate including your own reading and answers.

## Prerequisites

- Claude Code (Codex / Gemini CLI work the same way — pick with `--agent`)
- Node.js (only used to run the installer)

## Step 0 — Install (under a minute)

At the root of your project:

```bash
npx intent-planner --lang en
```

Actual output from this run (excerpt — the companion-tool status blocks (term-drift / handoff-bridge) and a closing one-line support banner are omitted):

```
Result: placed 164 new, updated 0 (skipped 0) / nothing needs your attention
Placed (164):
  (add --verbose to see the per-file list)

Created .gitignore (keeps .intent/cc-sdd/ drafts out of Git)

Agent: claude (skills: .claude/skills/intent-*/)
  root doc: CLAUDE.md was placed.

What to do next:
  1. Open Claude Code
  2. Type /intent-discover at the prompt and run it (this is where pinning down intent begins)
```

Do what it says: open Claude Code and move on.

> By the way: if you re-run the installer on a project that already uses intent-planner, the guidance changes to "Resume where you left off: type `/intent-status`". Your work in progress is never overwritten.

## Step 1 — `/intent-discover` (AI generation ~1 min in this run, plus your answers)

Type:

```
/intent-discover I want to build a login feature
```

The AI first recommends a "mode" for pinning down the intent and asks you to confirm (translated excerpt from the run — wording varies):

> This is a new feature whose intent isn't in words yet, so I recommend the standard mode. OK?
> Also: may I ask questions to pin down the content? (accept = the result matches your intent more precisely / skip = faster)

After you answer, the AI infers the purpose and asks you to **confirm** it:

> Here is how I read the purpose — "users can log in safely to their own account and pick up their data where they left off." The assumed user: "a regular visitor who comes a few times a week and tends to forget passwords." Does that match?

Answer "yes" and the intent hierarchy (Intent Tree) is written to `.intent/intent-tree.md`. Excerpt from the actual artifact (translated):

```markdown
## L0: Product Purpose
- Users can log in safely to their own account and pick up their data where they left off

## L2: Capabilities
- C1 email+password auth / C2 external account sign-in (OAuth) / C3 session management

## L4: Candidate Packets
- P1 session-management foundation (supports C3; the base P2/P3 build on)
- P2 OAuth sign-in / P3 login UI

## Open Questions
- Whether to add passwordless (email-link) auth later
- A reasonable session lifetime (hours? weeks?)
```

Three things to notice: **confirmed intent and guesses are kept apart** (guesses go to Assumptions), **undecided things stay visible as Open Questions** (never silently filled in), and **the work candidates (P1–P3) come with a foundation-first order**.

## Step 2 — `/intent-compass` (AI generation ~30 s in this run, plus confirmation)

This builds the decision criteria. The star of the show is **Anti-direction** — naming, in advance, the local shortcuts an AI tends to take. Excerpt from the actual artifact (translated):

```markdown
## Anti-direction
1. Redesigning the whole user table "while we're at it" — this intent is login,
   not remodeling member data. Park discoveries in Open Questions.
2. The shortcut of putting the session ID in URLs / localStorage — don't bend
   the httpOnly-cookie intent for implementation convenience.
4. Adding login branches without tests — auth is mostly error paths (failure,
   expiry, concurrent logins). No happy-path-only "done".
```

The invariants to protect (e.g. never store plaintext passwords) and the tie-breaking decision rules (server-side session + httpOnly cookie) are also pinned here. During implementation the AI reads **only the entries related to the current work**, never the whole file.

## Step 3 — `/intent-packets` (AI generation ~30 s in this run, plus confirmation)

The intent is cut into implementable units of work ("packets"). In this run, **P1 session-management foundation** was drafted as the first packet, recommended like this (translated):

> Start with "session-management foundation". Neither P2 (OAuth) nor P3 (UI) can work without the base that keeps you logged in. It is the one slice that goes end to end first.

A packet carries: scope / non-scope / observable behavior when done / invariants to protect / **things not yet decided, with the reason and a revisit condition**. The point is that undecided things are never written as if they were decided.

## Step 4 — `/intent-export-cc-sdd` (AI generation ~30 s in this run)

P1 is converted into a handoff draft for the downstream spec tool (cc-sdd). The head of the actual artifact (translated):

```markdown
# Project Description (draft to hand to cc-sdd's /kiro-spec-init)

Build the foundation that keeps and expires login state. Logging in with valid
credentials issues a session; subsequent requests pass as logged-in. ...

## Invariants
- INV-1: Never store or log passwords in plaintext (MUST NOT)
- INV-2: Never put the session ID in URLs; cookies are httpOnly / Secure (MUST)

## Acceptance Material
- The issue → verify → expire sequence must be observable (MUST): the three
  error paths (logout, expiry, invalid cookie) return 401.
```

If you have cc-sdd installed, pass this draft straight to `/kiro-spec-init` and continue to requirements → design → tasks → implementation. Without cc-sdd, the draft still reads as the instruction sheet you hand to an implementing AI.

## Afterwards

- Once implementation has gone around, run `/intent-writeback` — it returns what you learned to the intent documents (that closes the loop).
- **Whenever in doubt, `/intent-status`** — it tells you where you are and exactly one next move.

## Measured time of this run

| Step | AI generation time (measured) |
|---|---|
| Install | under 1 min |
| discover (Intent Tree) | ~1 min |
| compass (criteria) | ~30 s |
| packets (units of work) | ~30 s |
| export (draft) | ~30 s |
| **Total** | **~3–4 min** (about 10 minutes including your reading and answers) |

## The short course (when you want an even lighter loop)

No new machinery — just lean the existing choices toward speed:

1. In discover's first confirmation, choose "skip the questions (off) = speed first"
2. In packets, finalize **only the first packet** and move on (the rest stay candidates)
3. Go straight to `/intent-export-cc-sdd`

This trades precision for speed, so for anything important, switch back to the default (accept the questions).

---

Learn more: [Feature guide](guide.en.md) (command-by-command) / [README](../README.en.md) (how to start from your situation)
