# Theory notes: term-drift integration

## Less instruction / clearer intent

intent-planner does not try to maximize instructions. It provides **minimum sufficient steering** where design drift or integration rework would be expensive. Four levels of binding force—Invariant, Scope / Acceptance, Decision, and Preference / Heuristic—make the boundary explicit without prescribing every implementation step. This is **bounded autonomy**: the agent proceeds inside the agreed boundary and returns only boundary-crossing changes for human judgment.

JIT input follows the same principle. It preserves the settled inputs needed for the current decision and carries implementation-time recheck candidates without injecting the full Intent Tree, Compass, or history. A tiny experiment where vibe coding is enough can use the `direct` route or skip the layer.

Status reporting likewise keeps **Process health**, **Unresolved design decisions**, and **User outcomes** distinct. A green process does not prove a successful outcome. When outcome evidence is absent, the outcome remains unobserved; there is no overall PASS or score. The display instead foregrounds the one decision a human needs to make next.

## Outcome learning closes the loop

Process completion and the user outcome are separate observations. Finished implementation and passing tests do not prove that the intended value appeared. An `Outcome measure:` on L1 states in advance how that value can be recognized. Post-release outcome learning accumulates as history in the Packet-scoped delta, and only the latest result with human approval returns to L1. This closes the learning loop from observation back to intent without using process progress as a substitute for value.

This English companion explains the responsibility boundary for the bundled term-drift integration. The broader theory of intent-planner is currently maintained in Japanese in [the main theory document](theory.md); this note deliberately covers only the public integration contract that must remain equivalent across languages.

## Extending the candidate gate to service design

The read-only candidate gate used for technical practices also covers established service design frames. It uses semantic matching between the case's role lens and the catalog's suitable situations; a shared word or familiar frame name is not enough.

When the fit is weak, the rule will present no candidate and stay silent; a person decides whether to adopt, decline, or defer each suggestion. Before adoption it generates nothing. Only after adoption does it create a derived, regenerable draft at `.intent/nl-spec/design-frame-<frame-id>.md`. It does not change the Intent Tree, Intent Compass, or packet sources of truth, so a suggestion cannot silently become a settled design decision.

Images or diagrams, analytics measurement, experience stages, numeric priorities, date commitments, and progress percentages are out of scope. The frames support deliberation; they do not turn intent-planner into an analytics or project-management system.

## Reading a specification by separate responsibility ranges

Perspective review does not recreate professional personas or a fictional meeting. It reads the same specification through separate responsibility ranges: deciding the product, coordinating delivery only when the work requires it, and designing the experience. This adapts Perspective-Based Reading (PBR), whose different reading perspectives expose defects that one undifferentiated reading can miss, to the conversation before implementation. The profession name is only a clue for finding the responsibility the project needs, not a fixed cast of characters.

When AI stands in for an absent owner, preserving the strength of the evidence matters as much as stating a conclusion. A `confirmed fact` has been confirmed by a person; a `grounded inference` follows from named material but is not yet approved; and an `unverified` item lacks enough material. Keeping these states distinct prevents plausible completion from being mistaken for a decision and leaves room for later correction. An irrelevant concern closes as `not applicable` instead of increasing the question count.

When responsibility ranges call for different judgments, the conflict is kept separate with each basis and unresolved item until a human decision is made. The goal is to expose what is selected and what is given up, not to produce one answer as early as possible. An experience-design frame is an optional organizing tool with a different responsibility: it can structure known material, while perspective review finds concerns that must be checked even when no frame is adopted.

## Why the integration stays loose

intent-planner organizes intent before implementation. term-drift performs a full terminology inspection and applies only rewordings a person approved. Combining those responsibilities would give intent-planner a second copy of term-drift's detection logic and make the two copies drift apart. The integration therefore verifies and delegates; it does not take ownership of term-drift's rules, skill, or user data.

term-drift 0.3.0 is installed by default as an exact direct npm dependency. Normal intent-planner setup invokes the installed owner CLI after the target repository and agent are known, placing `./.term-drift/` and the dedicated agent skill project-locally under the owner's policy. The legacy `--with-term-drift` flag remains accepted for existing scripts but is not a placement gate. The existing `--yes` flag continues to control only appending the intent-planner quickstart to a root document.

The delegated version is pinned to term-drift 0.3.0. Pinning makes compatibility review meaningful: intent-planner can verify one published version, its common rules, and the selected agent's dedicated skill as a single set instead of assuming that an unverified latest release is compatible. The verified 0.2.3 and 0.2.5 contracts are retained only as trusted update baselines: their manifest, assets, and actual bytes must all match before an owner update is attempted.

Version 0.3.0 can persist an approved general-term classification in an optional ledger column and restore it in another session. That record covers only the term classification for the default reader; a specialized local use of the same spelling or unclear wording remains subject to review. term-drift's rules and dedicated skill own the classification, persistence, and resume semantics. intent-planner does not duplicate them and verifies only the published asset set.

## Health is evidence, not a marker

The integration reports filesystem health from the complete compatibility set:

| Health | Meaning |
|---|---|
| `not-installed` | No project-local term-drift artifact is present. |
| `ready` | The pinned version, required rules, and selected agent skill form a compatible set. |
| `inconsistent` | At least one required component is missing, incompatible, or unsafe. |

An `inconsistent` installation also carries a repairability classification:

- `additive-compatible` means every existing artifact is compatible and only safe additions are missing. The official owner installer may complete those missing parts without replacing existing files.
- `update-attemptable` means the installation exactly matches a trusted known baseline such as the previously verified 0.2.3 contract, so the official owner update may be attempted.
- `blocked` means an untrusted self-consistent state, future version, mismatch, unsafe path, or partial selected skill prevents automatic processing. The conflicting paths must be resolved through the owner-side procedure first.

`install-failed` is not persistent filesystem health. It describes the current installation attempt and is displayed together with the post-attempt health, so a failed process is not confused with what is actually present on disk.

When health is `ready`, the full terminology inspection starts from the selected agent's dedicated term-drift skill. The intent-planner installer is only the standard placement seam; it does not become the terminology-inspection engine.

## Ownership and update boundary

For `not-installed` or `additive-compatible`, normal setup delegates to the official owner installer for term-drift 0.3.0. For `update-attemptable`, it delegates exactly one attempt to the official owner update. `ready` is a no-op. intent-planner does not directly write, delete, repair, overwrite, or roll back term-drift-owned rules, agent skills, or glossary data. This keeps the owner tool responsible for its own file layout and preserves user data across reruns and failures.

An owner refusal or abnormal response remains an operation failure, and intent-planner always reports post-health from the same inspector instead of claiming success or rolling files back. A `ready` installation is not reinstalled, a `blocked` installation is not silently repaired, and unknown self-consistent or future versions newer than 0.3.0 are never followed automatically. Any future safe update path must come from term-drift's owner contract rather than from intent-planner guessing how to migrate owner files.

The dedicated term-drift path also does not replace `/intent-validate`'s structural checks. The responsibilities form three layers: root-document, pre-question, and export guidance prevent terminology drift; repositories with no project-local term-drift placement retain the lightweight `coinage-suspect` fallback; and repositories with a placement use validate only to guide the user to the normal installer's `--dry-run` health display. Validate does not judge terminology or redetermine version, hashes, required files, or agent-skill compatibility. Only after the installer reports `ready` does full terminology inspection begin from the selected agent's dedicated term-drift skill. This keeps one health source of truth in the installer inspector and one detailed terminology-review entry in the dedicated skill.
# Normalized storage and permanent fallback

The split compass store (one symbol per file) is the default for new installations, while the legacy single-file form remains a permanent reader path. Migration is opt-in and non-destructive; the installer never moves user data.

## Decision lifecycle and relevant working sets

As decision history grows, reviewing every past decision for every new case makes cognitive cost grow with the archive. Readers therefore select only `active` Invariants and Decisions relevant to the case's area and impact. Irrelevant, `superseded`, and archived records remain available as rationale but stay outside the current gate; uncertain relevance is surfaced for confirmation.

A matched `Revisit when` condition is evidence for reconsideration, not an automatic expiry rule. The old decision, new fact, and matched condition are presented together, and a human-approved writeback creates the successor while preserving history. This keeps the design rationale correctable without turning the decision log into a mandatory full-history review.

# Domain governance (federated governance) — delegate governance per domain without splitting the entity

The canonical intent artifacts (compass / tree) come under two scale pressures as cases accumulate: **collisions when multiple concurrent sessions write to the same canonical file**, and **maintenance-loop cost (validate / improve) growing linearly with the total symbol count**. In this repository's own measurements, a single developer running concurrent AI sessions was enough to push the compass past 800 symbols, and a full-scan maintenance loop was already losing to that scale in practice.

Prior evidence points one way. **Growing a goal model as one giant tree does not scale** — an extended systematic mapping study of i* (Lima et al., CLEI Electronic Journal, 2016) analyzed 126 papers and framed managing complexity and scalability as a key open problem, and KAOS is likewise known to produce incomplete, over-complex models at scale. Meanwhile, the solutions proven at scale all share one shape: the Linux kernel (a single tree plus per-subsystem maintainers), Python's PEPs (delegated deciders), and Google's monorepo (a single repository plus private-by-default API visibility) each **keep the entity single and divide only the governance — who decides, and how far an execution reaches**. Our survey found no success story for splitting the entity itself (a "microservices of intent," so to speak).

intent-planner borrows this shape from Data Mesh's **federated computational governance** (Dehghani, 2022): keep only a minimal set of cross-domain policies at the center, and delegate judgment to domains. Concretely, only the cross-cutting discipline (the `always` tag — the few rules effective across all domains) stays central, and ownership plus execution scope are delegated per **domain** (the value of the domain tag on each symbol).

Three reasons not to split the entity (closer to a modular monolith than to microservices): (1) the property that **one grep pulls "the case's domain + always" across the whole store** is the foundation of JIT supply, and splitting the entity breaks that searchability; (2) cross-domain changes would turn into a multi-repository synchronization problem (the same reason Google keeps a monorepo); (3) it would clash with this tool's stance of keeping external integrations one-way and never carrying bidirectional sync.

Four mechanisms, each a strengthening of an existing structure rather than a new layer:

- **Domain-scoped execution**: when the case's domain is determinable, validate / improve read only "that domain + always" (maintenance cost stops growing with the total symbol count). Axes that inherently watch "what does not move" — decay and dormancy detection — keep their full scan: the trade-off between savings and detection power is split per check axis, not applied uniformly.
- **A place for domain governance**: domain definitions (names and one-line descriptions) are git-tracked shared vocabulary, while owner declarations (who is touching a domain right now) are git-untracked and local — consistent with the existing rule of keeping organizational information off shared artifacts. The truth for symbol→domain mapping is the tags alone; declarations hold no inventory (information never held twice cannot structurally diverge).
- **Writing-side wiring**: when drafting a new symbol, its domain is derived from the case context and confirmed in one question; if another session holds an owner declaration on that domain, a one-line read-only note is surfaced. This never blocks a write — like the assignment claims, it is declarative: it makes people aware, and leaves the parallel-operation judgment to humans.
- **The always gate**: before registering a symbol as cross-cutting (`always`), one question — "does it really affect all domains?" If the central discipline bloats by inertia, the savings of domain scoping erode; if the user chooses `always`, the gate follows (never more friction than one question).

The user's long-standing request — "manage it like a DB, with transactions" — resolves along the same line, without a real database (keeping zero dependencies and grep/git-diff readability): **records = one unit per file (isolating concurrent writes) / transactions = git commits (atomicity and history across files) / views = regenerated derived indexes / filtering = domain-tag grep**. The compass already has this normalization applied; applying it to the tree's per-case records is planned as the final piece.

> **An honest note (scope of the implementation and unverified claims)**: the primary target is a real, observed demand — one developer running concurrent AI sessions, and the measured 800+ symbol scan cost — and human-team ownership workflows stop at "a declaration schema and a read-only reader contract" (no building for demands not yet observed). Whether domain scoping actually raises the maintenance loop's real-world run frequency, and whether concurrent-session write collisions actually reach zero, are **empirical hypotheses that could be measured, not measured results** — the latter closes only after the planned (not yet executed) normalization of the tree's per-case records.

## References (domain governance)

- Zhamak Dehghani, *Data Mesh: Delivering Data-Driven Value at Scale*, O'Reilly, 2022. (Federated computational governance = keep only a minimal set of cross-domain policies at the center and delegate decision authority to the domains; the borrow-source for domain governance here.)
- Rachel Potvin & Josh Levenberg, "Why Google Stores Billions of Lines of Code in a Single Repository," *Communications of the ACM* 59(7), 2016. (A monorepo = the entity stays single while governance is divided — private-by-default APIs and ownership rules.)
- Paulo Rogério Lima et al., "An Extended Systematic Mapping Study about the Scalability of i* Models," *CLEI Electronic Journal*, 2016. (Analyzes 126 papers and frames managing complexity and scalability as a key open problem for growing a goal model as one giant tree.)
