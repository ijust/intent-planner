# Governing the reading scope (specification required · unspecified means recommend → confirm · default exclusions · does not read out of scope)

The source of truth by which the `intent-from-code` skill governs "what to read" before reverse-extracting intent from existing code. SKILL.md holds only the procedure and reporting format; how the reading scope is decided, the default exclusions, and the prohibition on scope excursion refer to this rule. Observation uses direct Read / Glob / Grep or a local read-only analysis or index already available for the target project, and it never modifies target code, input documents, or canonical `.intent/*.md` (writes are only under `.intent/code-ingest/`). This governance is a load-bearing discipline that prevents context waste in a huge repo and unintended scope excursion, working as the entry gate of extraction (part of INV65's read-only · staging-limited).

## Optional code analysis and indexes (do not install or require)

- A local read-only analysis or index already available for the target project may optionally assist with symbols, imports and references, call paths, dependency direction, impact candidates, and narrowing the locations to read directly.
- Analysis is available only when provided by the host and callable under the current skill execution permissions. Even if it is installed or registered, when it is not callable under those permissions, it is unavailable.
- This skill does not install, initialize, require, update, synchronize indexes, or manage state for analysis. When analysis is unavailable (including absent or permission-denied), uninitialized, stale, or insufficient, continue without stopping and fall back to direct code reading with Read / Glob / Grep.
- When the scope is small, locations to read are known, or analysis retrieval and reading is more expensive than direct reading, choose direct code reading without using analysis.
- Analysis output is an observational clue, not confirmation of intent. The LLM reads the current code and raises each intent candidate with an inferred marker and a recovery basis such as a file or symbol.
- When analysis output points outside the confirmed target scope, do not expand the scope implicitly or use that out-of-scope information as extraction input. Ask the user before expanding the scope when needed.
- Do not send code or analysis results to an external API or service.

## Specifying the scope is required (do not make whole-repo scan the default)

- Reverse-extraction **requires the scope (a directory or module) to be specified**. Do not proceed to intent extraction until the scope is fixed.
- Even when it is run without a scope specified, **do not make whole-repository scan the default**. Do not fall an unspecified case toward "read everything"; by default, do not scan the whole repo.
- When unspecified, **propose a recommended scope and ask for the user's confirmation** from the repository structure (the top-level directory layout, entry points, main modules, etc.). Read only the scope the user has confirmed and fixed.
- The recommended-scope proposal is a hypothesis and is treated as provisional until the user fixes it. Do not fix it on your own and start reading.

## Exclude dependencies / generated artifacts by default (the source of truth for the exclusion list)

Even inside the target scope, **exclude dependencies / generated artifacts from reading targets by default**. This rule body is the single source of truth for the concrete elements of exclusion; the following are not read by default.

- Dependency install locations: `node_modules/`, `vendor/`, `.venv/` / `venv/`, `site-packages/`, and other expansion locations for external dependencies fetched by a package manager.
- Build products / artifacts: `dist/`, `build/`, `out/`, `target/`, `.next/`, `coverage/`, and other outputs machine-generated from source.
- Lock files: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `poetry.lock`, `Cargo.lock`, `Gemfile.lock`, and other fixed results of dependency resolution.
- Generated / cached artifacts: minified / bundled generated code, auto-generated code, caches such as `.cache/`.
- Version-control / environment metadata: version-control internal data such as `.git/`.

> These are not sources of intent but results of dependency resolution or building; reading them yields no material for intent extraction and wastes context. Add exclusion elements to this rule body as needed (do not enumerate them in design or the SKILL body). Only when the user explicitly wants to include one, read it exceptionally upon confirmation.

## Do not read outside the fixed scope (prohibition on scope excursion)

- **Do not read files outside** the fixed target scope (and the confirmed recommended scope). **Do not use** files out of scope as input for intent extraction.
- Even if a reference or import into out-of-scope is found mid-extraction, do not follow it to read the out-of-scope file. When a relation is suspected, state explicitly in the output that it is out of scope, and leave the need to expand the scope to the user (do not widen the scope by guessing).
- Do not make out-of-scope files the input to any of the intent candidates / invariant candidates / gaps of silence. Do not mix into the output any description recovered from out of scope.

## Handling empty / absent (do not stop · do not fill in by guessing)

- When the specified target scope is empty, or does not exist, **do not stop** but state explicitly that "there is no readable material."
- At that point do not fill in candidates by guessing but return an empty candidate list (fail-open). Do not fabricate intent from code that does not exist.
