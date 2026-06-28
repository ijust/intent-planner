---
name: intent-validate
description: Read-only verification that cross-checks intent-tree, intent-compass, and packets (+ the export draft) and reports contradictions, coverage gaps, boundary inconsistencies, and normative violations with severity. Fixes remain proposals.
allowed-tools: Read, Glob, Grep
argument-hint: none
---

# intent-validate Skill

## Core Mission
- **Success Criteria**:
  - intent-tree, intent-compass, and packets (+ the export draft) are cross-checked, applying all checks in the check catalog (the set of checks, their categories, and their severities are authoritatively defined by the table in `rules/validate-checks.md`)
  - Findings are classified by severity (must-fix / recommended / info), and every item carries its check ID (the ID column of the table in `rules/validate-checks.md`), its evidence (file and the relevant statement), and a fix proposal (the skill to re-run or the fix direction)
  - Unverified targets (missing / unfilled deliverables, plus the IDs of skipped checks) are stated explicitly together with the reason
  - Packets are read statically from the four PBR perspectives (user / operations / test / maintenance), confirming read-only whether each perspective's breakdown conditions are documented
  - No file has been created, changed, or deleted at all (read-only, one-way reporting)

## Execution Steps

### Step 1: Confirm the prerequisites
- If `.intent/` is absent, guide the user through the intent-planner setup steps (running `npx intent-planner`) and finish.
- Partial absence of `intent-tree.md` / `intent-compass.md` / `.intent/packets/` is **non-blocking**: do not stop; run the checks within the verifiable scope and report the missing deliverables as unverified targets (packets count as missing when `.intent/packets/` is absent or `active/` is empty; in that case skip the packet-dependent checks).

### Step 2: Read the deliverables
- Read `.intent/intent-tree.md`, `.intent/intent-compass.md`, `.intent/packets/index.md` and `.intent/packets/plan.md`, and the packet files subject to the checks (for cross-packet checks, read all files under `active/`; do not read `archive/`), plus `.intent/cc-sdd/<slug>/*.md` (the per-packet export drafts, if present) and `.intent/mode.local.md` (falling back to `.intent/mode.md` if absent) for the mode state.
- If both mode.local.md and mode.md are absent, continue with the standard default and announce it (do not stop).

### Step 3: Apply the check catalog
- Read `rules/validate-checks.md` and apply all checks in the check catalog (the set of checks, their categories, and their severities are authoritatively defined by the table in `rules/validate-checks.md`).
- Severity classification (including the must-fix / recommended decision for the L3 mismatch) follows the criteria in the rules.
- The target of the boundary checks is the directory of the packet on the latest row of `.intent/export-log.md` (identification is authoritatively the exact match of the `## Source Packet` heading in the directory's requirements.md). Drafts of past packets coexist by design and are not treated as violations. If export-log is absent or uninterpretable, fall back to the drafts' Source Packet headings (when multiple directories exist, present them as candidates without asserting one) and report that fact.

### Step 3.5: Statically confirm the four PBR perspectives (read-only; search for breakdown conditions)
- Read the packets (under `active/`, plus the export drafts if present) from the four perspectives below, and statically confirm **whether each perspective's breakdown conditions are documented**. If the documentation is missing, list it as a finding for that perspective in the severity-grouped list (perform no automatic fix or interactive confirmation).
- **User perspective**: whether the breakdown conditions of the behavior for the user (inputs / situations under which the expected behavior collapses) are documented.
- **Operations perspective**: whether a fail-safe design (behaviors such as degradation, rejection, retry) against faults, timeouts, and malicious input is documented.
- **Test perspective**: whether test cases based on equivalence partitioning and boundary-value analysis can be created. If they cannot, report it as a missing boundary condition.
- **Maintenance perspective**: whether the packet holds How internally (fixing a ceiling) and thereby obstructs the free design of the implementing agent.
- For every perspective, do not stop at confirming the happy path; actively search for "the conditions under which this design breaks down (abnormal cases, high load, invalid input)" (confirmation-bias mitigation). When no breakdown condition is found, treat it as "the breakdown-condition documentation is missing" rather than "unexplored".
- This per-perspective confirmation is a static check item; introduce no new interaction loop, state machine, or interactive-confirmation tool. If an interactive per-perspective audit is needed, note in Open Questions / fix proposals that it is delegated to the existing reviewer subagent practice (`kiro-review`, etc.).

### Step 3.6: Name suspected coinages (`coinage-suspect`; read-only; semantic)
- **Read the mother-set**: read `.intent/glossary.md` (the lightweight canonical-vocabulary ledger) read-only, taking the "Canonical term" column and its "Aliases & synonyms" as the mother-set. If `.intent/glossary.md` is **absent, treat the mother-set as empty and do not fire this detection at all** (the existing validate output is unchanged; backward-compatible).
- **Judge (semantic, not a mechanical check)**: among the terms appearing in the intent artifacts (intent-tree / intent-compass / packets, plus the export drafts if present), name as a "suspected coinage" any term found **nowhere** in the mother-set (canonical terms, aliases, synonyms). Judge by a semantic reading (including grasping synonyms / spelling variants in the LLM context), not by a mechanical regex match. Do not push this onto `scripts/intent-check.mjs` in any way.
- **Exclusions**: do not name the following as suspected coinages.
  - Proper nouns (product names, personal names, organization names, etc.).
  - Established English technical terms.
  - **Legitimate new terms that already carry a first-mention one-line explanation per the terminology convention** (do not double-flag what the terminology convention already governs).
- **Tone**: stay a candidate suggestion and never assert (false-positive-tolerant). Raise it as a "this might be a coinage" candidate and do not take the judgment away from the user. When in doubt, do not raise it.
- **Silence**: when there is not a single suspected coinage, **do not fire any coinage-detection output at all** (do not force anything to be treated as a coinage).
- **Attach a rewrite suggestion (presentation only)**: when naming a suspected coinage, attach **the glossary ledger's canonical term(s) the coinage could fold into as a "fix proposal"** (enumerate candidates if several; e.g., "`<coinage>` is a candidate to fold into the glossary's `<canonical term>`"). Like the naming itself, stay a candidate and never assert. When no fitting target is found in the glossary, do not assert a target; instead suggest "consider adding a canonical term to the ledger". The rewrite suggestion rides on the coinage naming: when detection is silent, emit no rewrite suggestion either.
- **The rewrite is presentation only and rewrites nothing**: keep the rewrite / consolidation suggestion to a read-only report, and **do not automatically rewrite** the canonical artifacts (intent-tree / intent-compass / packets) or the glossary ledger. This skill only names the suggestion; it does not edit files. Any actual adoption is a **separate action** taken only after a human approves it (this feature stops at presentation; INV20).
- **No gate**: a suspected coinage is an info-severity one-way report; it never stops export or implementation.

### Step 3.7: Name groundless conclusions (`groundless-conclusion`; read-only; semantic)
- **Background**: an Intent is often given as only "a conclusion a human summarized from events", with the rationale that produced it (reasons, constraints, premises, trade-offs) dropped. A conclusion can be re-derived from its rationale but a rationale cannot be re-derived from its conclusion (the asymmetry). A conclusion whose rationale is gone cannot be corrected even when a contradicting fact arrives (loss of correctability). This detection names, read-only, the places where a conclusion stands alone without traceable rationale, and checks correctability (A29; C18; INV36).
- **Judge (semantic, not a mechanical check)**: among the conclusions appearing in the intent artifacts (intents in intent-tree, Invariants/Decision Rules in intent-compass, decisions in packets, plus the export drafts if present), name as a "suspected groundless conclusion" any conclusion whose rationale (reasons, constraints, premises, trade-offs) is **not traceable** in the artifacts. Judge by a semantic reading (including grasping whether the rationale lives elsewhere — a parent intent, or the Why/Consequences of a related Decision Rule), not by `scripts/intent-check.mjs`, the presence/absence of a required field, or a mechanical regex match (INV2/A1).
- **Exclusions**: do not name the following as groundless conclusions.
  - Self-evident intents (judgments so obvious that stating a rationale is unnecessary).
  - Conclusions that reference a rationale already stated (the rationale lives in the same artifact, a parent intent, or a related Decision Rule).
  - Cases where another intent / Invariant / Decision Rule supplies the rationale.
- **Attach the correctability lens**: for each named conclusion, attach the observation "when a fact contradicting this conclusion arrives, can it be re-evaluated from the rationale?" (rationale not traceable = cannot re-evaluate = risk of being uncorrectable).
- **Tone**: stay a candidate suggestion and never assert (false-positive-tolerant). Raise it as a "the rationale might not be traceable" candidate; do not take the judgment away from the user. When in doubt, do not raise it.
- **Silence**: when there is not a single suspected groundless conclusion, **do not fire any output for this detection at all**.
- **Scope**: keep the target of this detection to the artifacts in scope for this validate run (new / changed artifacts); do not indiscriminately re-scan the whole tree/compass retroactively (to avoid noise; a retroactive sweep is an opt-in separate path).
- **Supplying rationale is presentation only and rewrites nothing**: keep any update proposal that attaches rationale to a read-only report, and **do not automatically rewrite** the canonical artifacts (intent-tree / intent-compass / packets). If the AI fabricates a rationale to retro-justify a conclusion, it worsens the very uncorrectability (brittle memory) we want to prevent. This skill only names "the rationale is not traceable"; writing the rationale is a **separate action** taken only after a human approves it (A7/INV5; INV36).
- **No gate**: a suspected groundless conclusion is an info-severity one-way report; it never stops export or implementation (it does not impede legitimate omission — self-evident intents, references to rationale already stated).

### Step 4: Report (one-way; fixes are proposals only)
- Present the findings as a list grouped by severity (must-fix / recommended / info), citing for every finding its check ID (the ID column of the table in `rules/validate-checks.md`) together with the severity (e.g., `must-fix invariant-conflict: …`).
- Always attach to every item its "evidence (file and the relevant statement)" and a "fix proposal (the skill to re-run or the fix direction)".
- State the unverified targets and their reasons explicitly, identifying skipped checks by their IDs.
- Present the remaining Open Questions.
- Perform no automatic fixes at all.

## Output Description

> **The output target is the terminal.** Use no raw HTML (`<details>` / `<summary>`, etc., collapsible UI) in the output; separate details with plain Markdown headings instead (in a terminal the raw tags are shown literally and become unreadable). Internal notations such as `[[...]]` (wikilinks for memory / delta) are legitimate in records written to delta / memory files, but in human-facing terminal output do not emit them raw — open them into ordinary words (spell the linked name out in plain prose).

**Reader**: a human developer who looks at the findings and decides whether to remediate.
**What this output makes them grasp first**: "**N must-fix / M recommended**. These are what to fix, and this is the command to re-run." The enumeration of check IDs / unverified targets is detail for the decision, so place it after the counts and the must-fix items.

Lead the output with the conclusion (the counts and the must-fix items).

- **Verdict summary (top, one line)**: `N must-fix / M recommended / K info`. If there are 0 must-fix, state explicitly "no critical issues".
- **Must-fix list (next)**: each item with its check ID + evidence (file and the relevant statement) + fix proposal (the skill to re-run or the fix direction). The chunk the reader should tackle first.
- **Details**: the recommended / info-level findings (same format), the unverified targets (including the IDs of skipped checks) and their reasons, and the Open Questions that the human should review.
- Include the command to run next in the fix proposals (e.g., re-running `/intent-compass`).
- For a `coinage-suspect` finding, attach in the fix-proposal area a **rewrite / consolidation suggestion toward the canonical term** (the target canonical term, or — when no fitting target exists — a note to consider adding a canonical term to the ledger). Presentation only, with no automatic rewrite; adoption is a separate action taken only after a human approves it.
- For a `groundless-conclusion` finding, attach in the fix-proposal area **which rationale (reasons, constraints, premises, trade-offs) is not traceable** and the **correctability lens** (whether it can be re-evaluated when a contradicting fact arrives). Supplying the rationale is an update proposal only, with no automatic rewrite; writing it is a separate action taken only after a human approves it.

## Safety & Fallback
- Read-only: create, change, or delete no file whatsoever. Keep fixes as proposals, always attaching the skill to re-run or the fix direction.
- Only the absence of `.intent/` is a stop condition: guide the user through the setup steps and finish.
- Partial absence of deliverables is non-blocking: check only the verifiable scope and state the unverified targets and reasons explicitly.
- The absence of mode.md does not stop; continue with the standard default and announce it.
- Do not change application code (INV6. Being read-only, the skill has no write path in the first place).
