# Theory notes: term-drift integration

## Less instruction / clearer intent

intent-planner does not try to maximize instructions. It provides **minimum sufficient steering** where design drift or integration rework would be expensive. Four levels of binding force—Invariant, Scope / Acceptance, Decision, and Preference / Heuristic—make the boundary explicit without prescribing every implementation step. This is **bounded autonomy**: the agent proceeds inside the agreed boundary and returns only boundary-crossing changes for human judgment.

JIT input follows the same principle. It preserves the settled inputs needed for the current decision and carries implementation-time recheck candidates without injecting the full Intent Tree, Compass, or history. A tiny experiment where vibe coding is enough can use the `direct` route or skip the layer.

Status reporting likewise keeps **Process health**, **Unresolved design decisions**, and **User outcomes** distinct. A green process does not prove a successful outcome. When outcome evidence is absent, the outcome remains unobserved; there is no overall PASS or score. The display instead foregrounds the one decision a human needs to make next.

## Unresolved records and permission to proceed are separate

When any of purpose, target users, outcomes, scope, acceptance criteria, promises to preserve, or external contracts is unresolved, it is an important decision in its own right. A hard-to-reverse change and an effect on multiple packets are separate additional conditions for an important decision. The AI provides an answer proposal, its rationale, and the condition that would change the recommendation, then obtains one of three outcomes from the human: a decision, out-of-scope for this work, or scope-limited explicit continuation. A bare “OK” or “next” does not count as a decision or explicit continuation.

Scope-limited explicit continuation is not resolution. The decision remains unresolved and work proceeds only for the authorized item and scope. From reference relationships and other evidence, the AI identifies the downstream effect and will stop only the affected scope. This keeps the open decision visible without blocking unrelated work.

The distinction applies consistently to the discover, compass, and packets stages; every cc-sdd, OpenSpec, Spec Kit, natural-language Spec, and direct exit; intent-plan; and implementation. It preserves intent across the development process, while we do not manage the state or session of external spec or implementation tools.

## Outcome learning closes the loop

Process completion and the user outcome are separate observations. Finished implementation and passing tests do not prove that the intended value appeared. An `Outcome measure:` on L1 states in advance how that value can be recognized. Post-release outcome learning accumulates as history in the Packet-scoped delta, and only the latest result with human approval returns to L1. This closes the learning loop from observation back to intent without using process progress as a substitute for value.

This English companion records selected public theory notes that need to stay aligned across languages. The broader theory of intent-planner is maintained in Japanese in [the main theory document](theory.md).

## Analysis and decomposition methods used by modes

Modes do more than classify a situation. They also select the analysis and decomposition methods used in discover, where intent is explored, and packets, where the work is divided into units that can be handed to implementation. intent-planner does not reproduce the external methods in full. It adapts the parts that can support pre-implementation intent planning through conversation and repository reading.

| intent-planner concept | Underlying idea | Primary sources |
|---|---|---|
| Example Mapping | Jointly making behavior concrete through rules, examples, and questions | Wynne |
| Impact Analysis in `feature-growth` | Tracing candidate effects from the starting points of a change | Bohner & Arnold |
| Migration Slicing in `refactor` | Planning a large change incrementally with a prerequisite graph | Ellnestam & Brolund / Fowler |
| Additive Slicing in `feature-growth` | A composition of Branch by Abstraction, Parallel Change, SPIDR, and Release Toggles | Hammant / Fowler / Sato / Cohn / Hodgson |

**Example Mapping**, introduced by Matt Wynne, is a conversational technique for organizing a story into rules, concrete examples, questions, and items to split out separately. Examples provide a basis for acceptance tests, while questions make visible what is not yet understood. intent-planner does not require physical cards or a meeting. It expands an L2/L3 capability into rules, examples, questions, and deferred items. Examples flow into a packet's Expected Behavior and Validation, questions into Open Questions, and deferred items into candidates for later work. This preserves the original aim of reaching shared understanding while adapting the method to asynchronous conversation between a person and an AI agent.

**Impact Analysis** in `feature-growth` is based on Bohner and Arnold's Change Impact Analysis. The field identifies the possible consequences of a change and estimates what must be modified to make that change. intent-planner does not include a static dependency analyzer. Instead, it reads existing boundaries, contracts, and data flows from the starting points of a change and follows candidate effects one step at a time. The output is therefore not an exhaustive dependency graph. It is a set of candidate impacts with enough supporting evidence to choose the integration points in the next stage.

**Migration Slicing** in `refactor` uses Ola Ellnestam and Daniel Brolund's Mikado Method before decomposition. Starting from the goal, it works backward by asking what must already be true for each change to be made safely. It records those prerequisites as a Mikado Graph and starts from leaves that have no prerequisite of their own. The original method also values trying a change and reverting it immediately when it fails, but intent-planner does not change code during planning. It preserves that idea in each slice's Rollback and in verification points that show whether behavior remains unchanged. The subsequent decomposition into units that preserve behavior and can be verified and reverted independently combines this method with Fowler's account of refactoring and small changes.

**Additive Slicing** in `feature-growth` is not a direct adoption of one established method. It is intent-planner's composition of several incremental-change patterns. Branch by Abstraction, Feathers's seams, and Parallel Change (expand–migrate–contract) first establish an integration point where a new implementation can be introduced without changing existing behavior. New functionality that is not yet reachable from the existing system is then added and finally activated through that integration point. Mike Cohn's SPIDR (Spike / Paths / Interfaces / Data / Rules) helps split candidates that are too large. Pete Hodgson's Release Toggles separate deployment from release and make the initially disabled scope and the toggle-removal condition explicit. The three-stage order—establish the integration point, add the new functionality, then wire it in—is intent-planner's design choice for combining these methods into a safe path for feature growth.

### Sources for mode methods

- Shawn A. Bohner & Robert S. Arnold (eds.), *Software Change Impact Analysis*, IEEE Computer Society Press, 1996
- Ola Ellnestam & Daniel Brolund, *The Mikado Method*, Manning, 2014
- Martin Fowler, ["Branch By Abstraction"](https://martinfowler.com/bliki/BranchByAbstraction.html), 2014
- Danilo Sato, ["Parallel Change"](https://martinfowler.com/bliki/ParallelChange.html), 2014
- Pete Hodgson, ["Feature Toggles (aka Feature Flags)"](https://martinfowler.com/articles/feature-toggles.html), 2017
- Matt Wynne, ["Introducing Example Mapping"](https://cucumber.io/blog/bdd/example-mapping-introduction/), 2015
- Mike Cohn, ["SPIDR: Five Simple but Powerful Ways to Split User Stories"](https://www.mountaingoatsoftware.com/blog/five-simple-but-powerful-ways-to-split-user-stories)
- Michael Feathers, *Working Effectively with Legacy Code*, Prentice Hall, 2004
- Martin Fowler, *Refactoring* (2nd ed.), Addison-Wesley, 2018

## Extending the candidate gate to service design

The read-only candidate gate used for technical practices also covers established service design frames. It uses semantic matching between the case's role lens and the catalog's suitable situations; a shared word or familiar frame name is not enough.

When the fit is weak, the rule will present no candidate and stay silent; a person decides whether to adopt, decline, or defer each suggestion. Before adoption it generates nothing. Only after adoption does it create a derived, regenerable draft at `.intent/nl-spec/design-frame-<frame-id>.md`. It does not change the Intent Tree, Intent Compass, or packet sources of truth, so a suggestion cannot silently become a settled design decision.

Images or diagrams, analytics measurement, experience stages, numeric priorities, date commitments, and progress percentages are out of scope. The frames support deliberation; they do not turn intent-planner into an analytics or project-management system.

Screen-design probing (only for UI cases that chose deep or adopted the screen-design perspective) extends the same prototyping idea from the screen-rough confirmation: confirming each screen's purpose, information priority, key states, and visual direction lifts information architecture and state design from the implementer's implicit guesses into reviewable requirement material. What lacks material stays inferred in a derived draft at `.intent/nl-spec/screen-design-brief.md`, keeping confirmed and inferred content apart so that guesses do not flow into implementation disguised as decisions. Beyond the draft, and only when the user wants it, a viewable, clickable mock (`.intent/nl-spec/screen-design-mock.html`; derived, self-contained) lets the requester check the screens with their own eyes and request revisions before implementation. Before it is presented, the mock passes a critique gate — a self-critique against checkable criteria derived from source-verified design principles — and any shortfall that cannot be fixed is stated explicitly with its source; the judgment of generated quality is not left to implicit taste, is made by the AI reading for meaning, and embeds no scoring scripts. The mock stays within the derived `.intent/` artifacts; implementation (the walking skeleton and beyond) remains the downstream stage's job.

Question completion is likewise coverage-based rather than count-based. The touched L0-L4 branches are crossed with common, selected-depth, stage-specific, and adopted specialist perspectives. `standard` closes purpose, target user, scope, success, promises, structure, and hard-to-reverse decisions; `deep` adds behavior, preconditions, edge cases, counterexamples, performance, and operational failures. At most four questions are shown per batch, but no total question or round limit determines completion. A fixed checklist, model intuition alone, or a score cannot establish absolute completeness; completion is bounded to the selected depth, materials read, and perspectives adopted.

## Reading a specification by separate responsibility ranges

Perspective review does not recreate professional personas or a fictional meeting. It reads the same specification through separate responsibility ranges: deciding the product, coordinating delivery only when the work requires it, and designing the experience. This adapts Perspective-Based Reading (PBR), whose different reading perspectives expose defects that one undifferentiated reading can miss, to the conversation before implementation. The profession name is only a clue for finding the responsibility the project needs, not a fixed cast of characters.

When AI stands in for an absent owner, preserving the strength of the evidence matters as much as stating a conclusion. A `confirmed fact` has been confirmed by a person; a `grounded inference` follows from named material but is not yet approved; and an `unverified` item lacks enough material. Keeping these states distinct prevents plausible completion from being mistaken for a decision and leaves room for later correction. An irrelevant concern closes as `not applicable` instead of increasing the question count.

When responsibility ranges call for different judgments, the conflict is kept separate with each basis and unresolved item until a human decision is made. The goal is to expose what is selected and what is given up, not to produce one answer as early as possible. An experience-design frame is an optional organizing tool with a different responsibility: it can structure known material, while perspective review finds concerns that must be checked even when no frame is adopted.

When a necessary specialist perspective has no basis in internal practices or user-provided material, assigning a role to the LLM still produces only a plausible unverified hypothesis. External research can add sources and opportunities for refutation, but it also introduces outgoing-information, cost, and unreliable-source risks. The workflow therefore considers it only for an important decision with no internal basis, obtains human approval of the exact outgoing wording and information boundary, and keeps the result as a sourced candidate until a person adopts it. This avoids relying entirely on model prior knowledge without turning research itself into an unapproved decision-maker.

## Why the integration stays loose

intent-planner organizes intent before implementation. term-drift performs a full terminology inspection and applies only rewrites reviewed by a human or judged low-risk within an explicit delegation scope. Combining those responsibilities would give intent-planner a second copy of term-drift's detection logic and make the two copies drift apart. The integration therefore verifies and delegates; it does not take ownership of term-drift's rules, skill, or user data.

term-drift 0.3.3 is installed by default as an exact direct npm dependency. Normal intent-planner setup invokes the installed owner CLI after the target repository and agent are known, placing `./.term-drift/` and the dedicated agent skill project-locally under the owner's policy. The legacy `--with-term-drift` flag remains accepted for existing scripts but is not a placement gate. The existing `--yes` flag continues to control only appending the intent-planner quickstart to a root document.

The delegated version is pinned to term-drift 0.3.3. Pinning makes compatibility review meaningful: intent-planner can verify one published version, its common rules, and the selected agent's dedicated skill as a single set instead of assuming that an unverified latest release is compatible. The verified 0.2.3, 0.2.5, and 0.3.0 contracts are retained only as trusted update baselines: their manifest, assets, and actual bytes must all match before an owner update is attempted.

Version 0.3.3 adds structured decision metadata to application dictionaries: `human-approved` records a human decision, while `delegated-agent` records a low-risk judgment made within a user-specified scope, together with its decision time and delegation scope. Legacy dictionaries remain readable but report unknown decision authority. On tracked documents with unstaged changes, term-drift may now apply an unambiguous replacement while preserving unrelated edits and emitting a warning. term-drift's rules, dedicated skill, and CLI own these judgment, validation, and application semantics. intent-planner does not duplicate them and verifies only the published asset set.

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

For `not-installed` or `additive-compatible`, normal setup delegates to the official owner installer for term-drift 0.3.3. For `update-attemptable`, it delegates exactly one attempt to the official owner update. `ready` is a no-op. intent-planner does not directly write, delete, repair, overwrite, or roll back term-drift-owned rules, agent skills, or glossary data. This keeps the owner tool responsible for its own file layout and preserves user data across reruns and failures.

An owner refusal or abnormal response remains an operation failure, and intent-planner always reports post-health from the same inspector instead of claiming success or rolling files back. A `ready` installation is not reinstalled, a `blocked` installation is not silently repaired, and unknown self-consistent or future versions newer than 0.3.3 are never followed automatically. Any future safe update path must come from term-drift's owner contract rather than from intent-planner guessing how to migrate owner files.

The dedicated term-drift path also does not replace `/intent-validate`'s structural checks. The responsibilities form three layers: root-document, pre-question and pre-report checks, and export guidance prevent terminology drift; repositories with no project-local term-drift placement retain the lightweight `coinage-suspect` fallback; and repositories with a placement use validate only to guide the user to the normal installer's `--dry-run` health display. Validate does not judge terminology or redetermine version, hashes, required files, or agent-skill compatibility. Only after the installer reports `ready` does full terminology inspection begin from the selected agent's dedicated term-drift skill. This keeps one health source of truth in the installer inspector and one detailed terminology-review entry in the dedicated skill.
# Normalized storage and permanent fallback

The split compass store (one symbol per file) is the default for new installations, while the legacy single-file form remains a permanent reader path. Migration is opt-in and non-destructive; the installer never moves user data.

## Decision lifecycle and relevant working sets

As decision history grows, reviewing every past decision for every new case makes cognitive cost grow with the archive. Readers therefore select only `active` Invariants and Decisions relevant to the case's area and impact. Irrelevant, `superseded`, and archived records remain available as rationale but stay outside the current gate; uncertain relevance is surfaced for confirmation.

A matched `Revisit when` condition is evidence for reconsideration, not an automatic expiry rule. The old decision, new fact, and matched condition are presented together, and a human-approved writeback creates the successor while preserving history. This keeps the design rationale correctable without turning the decision log into a mandatory full-history review.

# Scaling intent governance — federated governance without separate sources of truth

Federated governance is a core design for keeping intent maintainable as a project and its contributors grow; it is not an auxiliary operating convention. The canonical intent artifacts (compass / tree) remain one logical source of truth, while decision responsibility and execution scope are divided by domain.

Those artifacts come under two scale pressures as cases accumulate: **collisions when multiple concurrent sessions write to the same canonical file**, and **maintenance-loop cost (validate / improve) growing linearly with the total symbol count**. In this repository's own measurements, a single developer running concurrent AI sessions was enough to push the compass past 800 symbols, and a full-scan maintenance loop was already losing to that scale in practice.

Prior evidence points one way. **Growing a goal model as one giant tree does not scale** — an extended systematic mapping study of i* (Lima et al., CLEI Electronic Journal, 2016) analyzed 126 papers and framed managing complexity and scalability as a key open problem, and KAOS is likewise known to produce incomplete, over-complex models at scale. Meanwhile, the solutions proven at scale all share one shape: the Linux kernel (a single tree plus per-subsystem maintainers), Python's PEPs (delegated deciders), and Google's monorepo (a single repository plus private-by-default API visibility) each **keep the entity single and divide only the governance — who decides, and how far an execution reaches**. Our survey found no success story for splitting the entity itself (a "microservices of intent," so to speak).

intent-planner borrows this shape from Data Mesh's **federated computational governance** (Dehghani, 2022): keep only a minimal set of cross-domain policies at the center, and delegate judgment to domains. Concretely, only the cross-cutting discipline (the `always` tag — the few rules effective across all domains) stays central, and ownership plus execution scope are delegated per **domain** (the value of the domain tag on each symbol).

Three reasons not to split the entity (closer to a modular monolith than to microservices): (1) the property that **one grep pulls "the case's domain + always" across the whole store** is the foundation of JIT supply, and splitting the entity breaks that searchability; (2) cross-domain changes would turn into a multi-repository synchronization problem (the same reason Google keeps a monorepo); (3) it would clash with this tool's stance of keeping external integrations one-way and never carrying bidirectional sync.

Four mechanisms, each a strengthening of an existing structure rather than a new layer:

- **Domain-scoped execution**: when the case's domain is determinable, validate / improve read only "that domain + always" (maintenance cost stops growing with the total symbol count). Axes that inherently watch "what does not move" — decay and dormancy detection — keep their full scan: the trade-off between savings and detection power is split per check axis, not applied uniformly.
- **A place for domain governance**: domain definitions (names and one-line descriptions) are git-tracked shared vocabulary, while owner declarations (who is touching a domain right now) are git-untracked and local — consistent with the existing rule of keeping organizational information off shared artifacts. The truth for symbol→domain mapping is the tags alone; declarations hold no inventory (information never held twice cannot structurally diverge).
- **Writing-side wiring**: when drafting a new symbol, its domain is derived from the case context and confirmed in one question; if another session holds an owner declaration on that domain, a one-line read-only note is surfaced. This never blocks a write — like the assignment claims, it is declarative: it makes people aware, and leaves the parallel-operation judgment to humans.
- **The always gate**: before registering a symbol as cross-cutting (`always`), one question — "does it really affect all domains?" If the central discipline bloats by inertia, the savings of domain scoping erode; if the user chooses `always`, the gate follows (never more friction than one question).

The user's long-standing request — "manage it like a DB, with transactions" — resolves along the same line, without a real database (keeping zero dependencies and grep/git-diff readability): **records = one unit per file (isolating concurrent writes) / transactions = git commits (atomicity and history across files) / views = regenerated derived indexes / filtering = domain-tag grep**. Both the compass and the tree's per-case records now use this one-unit-per-file form.

> **An honest note (scope of the implementation and unverified claims)**: the primary target is a real, observed demand — one developer running concurrent AI sessions, and the measured 800+ symbol scan cost — and human-team ownership workflows stop at "a declaration schema and a read-only reader contract" (no building for demands not yet observed). Whether domain scoping actually raises the maintenance loop's real-world run frequency, and how much it reduces concurrent-session write collisions, remain **empirical hypotheses that could be measured, not measured results**. Completion of the storage migration and proof of its operational effect are separate claims.

## References (domain governance)

- Zhamak Dehghani, *Data Mesh: Delivering Data-Driven Value at Scale*, O'Reilly, 2022. (Federated computational governance = keep only a minimal set of cross-domain policies at the center and delegate decision authority to the domains; the borrow-source for domain governance here.)
- Rachel Potvin & Josh Levenberg, "Why Google Stores Billions of Lines of Code in a Single Repository," *Communications of the ACM* 59(7), 2016. (A monorepo = the entity stays single while governance is divided — private-by-default APIs and ownership rules.)
- Paulo Rogério Lima et al., "An Extended Systematic Mapping Study about the Scalability of i* Models," *CLEI Electronic Journal*, 2016. (Analyzes 126 papers and frames managing complexity and scalability as a key open problem for growing a goal model as one giant tree.)

# Bundling cross-cutting change — journeys (one change spanning multiple packets)

A packet is a vertical unit of work, but real cases often split into several packets — a skeleton first, connections next, documentation to close. The step order, the contracts several packets jointly protect (with their integration-time checks), and the case-level completion judgment belong to no single packet. In this repository's own operation, that bundle kept emerging as handwritten prose in the plan file, which collides under concurrent sessions and cannot be read structurally by commands. Large-scale practice points the same way: work spanning many change units is handled by a dedicated bundling unit (Google's Large-Scale Changes being the canonical example — though this section's scope differs from its main target; see the note at the end).

intent-planner therefore makes the bundle first-class as a **journey**: one journey = one git-tracked file under `.intent/packets/journeys/`. The design reapplies the proven packet pattern — frontmatter schema, one unit per file, retirement to `archive/` — rather than inventing a new notation.

- **Only seven frontmatter keys are required** (id, name, lifecycle, packet list, timestamps, one-line summary). Step plans, shared contracts, and integration-time checks live in free-form body text; heavy mandatory structure would push users back to handwritten prose.
- **A journey holds no progress state.** Readers derive progress every time from the constituent packets' `state` (each packet's frontmatter is canonical); holding the same fact twice breeds divergence. The only stored state is the human-closed `lifecycle: active | archived`.
- **References run one way, journey→packet.** Packet frontmatter (twelve fixed keys) gains no journey key; reverse lookup is a grep over `journeys/`.
- **No machine closes a journey.** A human confirms "all constituent packets done + integration-time checks green," writes `lifecycle: archived`, and moves the file to `archive/<year>/` (never deleted, no day-count thresholds).
- **No numeric scores, date estimates, or percentages** — steps are expressed by order and dependency only.

The writer is `/intent-packets`: only when a case splits into two or more packets does it propose a journey in a single question, and it drafts one only on approval (no bundling ritual for single-packet cases). Readers (`/intent-status` / `/intent-overview` / `/intent-validate`) are read-only: status derives each journey's position, the overview roadmap can additionally group packets by journey, and validate cross-checks shared-contract coverage from the journey file as an added source. All of this is purely additive — repositories without `journeys/` behave exactly as before, and the plan-file reading path remains a permanent fallback.

> **An honest note**: only the observed type — feature-work bundles — is first-class. Mechanical repository-wide mass changes (the original main target of Large-Scale Changes) are deliberately out of scope until a real instance appears, as a guard against overfitting the mechanism to a few examples. Team-level ownership and review delegation are a projected use of the canonical bundle, not a verified one: the team-facing build-out stops at the storage location and schema.

## References (journeys)

- Titus Winters, Tom Manshreck & Hyrum Wright (eds.), *Software Engineering at Google*, O'Reilly, 2020. (Ch. 22 "Large-Scale Changes" — the proven practice of handling work that spans many change units through a dedicated bundling unit; the borrow-source for this section.)
