# Constraint Starters — code / AI & LLM

> A per-domain file of the parent catalog `../constraint-starters.md`. `/intent-compass` and `/intent-discover` lazy-load (read-only) only the domains relevant to the work at hand. The schema, reading guide, and source discipline are owned by the parent catalog (this file holds only the convention bodies).
>
> **Domain**: risks specific to work that embeds LLMs / generative AI into a product (chat, summarization, RAG, agents, etc.). This does not belong to a single layer — it is a **cross-cutting concern that spans every layer** and belongs to `domain: code`. Generic injection defenses (SQLi, XSS, authorization, etc.) live in code / security (`code-security.md`) and API-boundary concerns in `code-api.md`; this domain covers only the LLM-specific path — **model input/output and agent authority** — to keep scopes separate (executing or rendering LLM output downstream as-is connects straight to the classics like SQLi/XSS, so run the `code-security.md` conventions alongside when that applies).

## id: prompt-injection-isolation

- name: Prompt injection prevention (never treat external content as instructions)
- domain: code
- fits when: Work where an LLM reads externally sourced content (user input, web pages, documents, RAG retrieval results, email, etc.). When you see external text being concatenated as-is into the same context as the system prompt.
- starter:
  - Anti-direction: Do not treat externally sourced text as "instructions" on par with what the developer wrote. Do not consider "asking the model in the prompt not to follow injected instructions" as a complete defense.
  - Invariant: Pass external content separated as data; do not mix it with instructions to the model (the system prompt). Assume prompt injection can happen: minimize the privileges and operations placed behind the model, and verify important decisions and operations outside the model.
- source: OWASP Top 10 for LLM Applications 2025 — LLM01:2025 Prompt Injection (https://genai.owasp.org/llmrisk/llm01-prompt-injection/, retrieved 2026-07-04)

## id: llm-output-untrusted

- name: Safe handling of LLM output (treat model output as untrusted input)
- domain: code
- fits when: Any work that consumes LLM output downstream — rendering generated text to the screen, executing generated code/SQL/shell commands, forwarding output as-is to another API, etc. When you see model output flowing unvalidated as if it were "a value we produced ourselves."
- starter:
  - Anti-direction: Do not execute, render, or forward model output unvalidated. Do not design the downstream on the assumption that "the model would never return something malicious."
  - Invariant: Treat LLM output as an untrusted value just like user input, and pass it through validation and encoding appropriate to the consuming context (escape when rendering to HTML = XSS prevention, parameterize when used in SQL, sandbox or require human confirmation for code/command execution). Run alongside the conventions in `code-security.md`.
- source: OWASP Top 10 for LLM Applications 2025 — LLM05:2025 Improper Output Handling (https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/, retrieved 2026-07-04)

## id: llm-least-agency

- name: Preventing excessive agency (minimal tools; human approval for irreversible actions)
- domain: code
- fits when: Work where an LLM executes operations via tools, function calling, or plugins (agents). When you see broad-privilege API keys or "can do anything" general-purpose tools being handed to the model.
- starter:
  - Anti-direction: Do not grant the agent more functionality, permissions, or autonomy than the task at hand requires. Do not leave high-impact operations like deletion, payment, or external sending to the model's sole judgment "because it is convenient."
  - Invariant: Narrow the tools and permissions handed to the agent to the minimum the task requires (least privilege). Put a human approval step before irreversible / high-impact operations (deletion, payments, sending to the outside, etc.). Record the agent's actions and keep them traceable.
- source: OWASP Top 10 for LLM Applications 2025 — LLM06:2025 Excessive Agency (https://genai.owasp.org/llmrisk/llm062025-excessive-agency/, retrieved 2026-07-04)

## id: llm-sensitive-info-boundary

- name: Preventing sensitive-information leakage via prompts (minimize before sending; no secrets in system prompts)
- domain: code
- fits when: Work embedding an LLM into a system that handles personal data, confidential data, or proprietary logic. When you see user data or secrets being stuffed unprocessed into prompts/context and sent to an external model API.
- starter:
  - Anti-direction: Do not send sensitive information (personal data, credentials, confidential documents) unprocessed to an external LLM API. Do not place secrets (keys, internal rules) in the system prompt expecting they "won't leak."
  - Invariant: Minimize and mask data before passing it to the model, and decide via data classification what is allowed to be sent. Design the system prompt on the assumption it can leak to users, and put no credentials or secrets there. Also verify that sensitive information does not come back mixed into model output.
- source: OWASP Top 10 for LLM Applications 2025 — LLM02:2025 Sensitive Information Disclosure (https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/, retrieved 2026-07-04) / LLM07:2025 System Prompt Leakage (https://genai.owasp.org/llmrisk/llm072025-system-prompt-leakage/, retrieved 2026-07-04)
