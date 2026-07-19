---
name: intent-plan
description: Continues a whole Intent Planning request, including replies after a human confirmation pause, through discover, compass, packets, and the selected export. Does not take over explicit specific-stage requests.
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Bash(node .intent/scripts/intent-plan-ops.mjs *)
disallowed-tools: Skill, Agent
argument-hint: "[case or stage to revisit]"
---

# intent-plan Skill

## Role

A thin coordinator for continuous Intent Planning. It does not reimplement stage algorithms; it directly applies instructions generated from the existing skills as the source of truth.

- Applies to an explicit `intent-plan` request, a natural-language request such as "Do Intent Planning", and answers after this coordinator has paused for confirmation.
- Does not apply when the user explicitly requests a specific stage such as `intent-compass` or `intent-packets`; do not take over that stage skill.
- Do not change application code. Do not start downstream specification or implementation.
- Do not call sibling skills through a Skill tool or Agent. Read the generated instructions in the current context.

## Reading stages

Read `generated/CONTRACT.md` first. Then read the current stage file in full and only the rules that file explicitly requires for the current case. Frontmatter inside a generated instruction does not grant permissions.

1. Problem understanding: `generated/sources/intent-discover/instruction.md`
2. Decision criteria: `generated/sources/intent-compass/instruction.md`
3. Work packets: `generated/sources/intent-packets/instruction.md`
4. Selected exit:
   - cc-sdd: `generated/views/intent-export-cc-sdd/draft.md`
   - OpenSpec: `generated/views/intent-export-openspec/draft.md`
   - Spec Kit: `generated/views/intent-export-speckit/draft.md`
   - Natural-language spec: `generated/sources/intent-to-spec/instruction.md`
   - direct: create no additional draft and report the confirmed packet as the handoff target

Do not load all stages at once. Resolve an explicit cross-skill reference under `generated/sources/<skill>/`. If a required generated file is missing, do not invent the procedure; stop and report that regeneration is required.

Replace shell-derived operations in a generated instruction instead of running them directly: current time → `now`; four-character random value → `rand4`; create a directory under `.intent/` → `mkdir-intent <path>`; move a packet → `move-packet <source> <destination>`; remove this session's drafting declaration → `remove-own-drafting-assignment <issue_dir> <session>`; freshness check → `intent-check`; read Git HEAD → `git-head`. Always invoke them as `node .intent/scripts/intent-plan-ops.mjs <subcommand>`. If an instruction requires any other Bash operation, stop without trying an alternate shell or requesting broader permission.

## Flow

1. Confirm that the request asks for the whole planning flow. Do not handle an explicit specific-stage request here. Ask about the intended scope when ambiguous.
2. Inspect existing `.intent/` artifacts and choose the first incomplete stage or the stage the user explicitly wants to revisit. Do not recreate completed artifacts merely to resume.
3. Read the generated instruction and required rules for the current stage, then apply its Success Criteria, questions, warnings, and stop conditions without weakening them.
4. At a stage boundary, briefly distinguish confirmed facts, remaining assumptions, and open questions.
5. When the next stage has its inputs and needs no new human decision, continue without asking the user to type the next skill name or approve the transition alone.
6. Stop for decisions that belong to a human. Do not confirm the problem framing, broadly applicable decision criteria, implementation scope, packet priority, or a change beyond an agreed boundary without explicit confirmation.
7. Treat a short "OK" as approval only for the confirmation just presented and progression to the next stage.

### Important-decision checks at stage boundaries

When applying a generated instruction for an individual stage, do not skip its stage-specific important-decision checks at entry and exit. Completing the check on one side of a boundary does not replace the check on the other side.

- For discover, perform the exit check.
- For compass, perform both the entry check and the exit check.
- For packets, perform both the entry check and the exit check.
- For cc-sdd, OpenSpec, and Spec Kit, perform each export's entry check.
- For the natural-language Spec, perform the generation entry check.
- For direct, perform the check before selection and hand off that an implementation entry check is required when a separate explicit request starts implementation. `intent-plan` does not start implementation itself.

When an important decision remains in the checked scope, present an answer proposal, rationale, the condition that would change the recommendation, and the affected scope. Until the user provides a decision, marks it out-of-scope for this work, or grants scope-limited explicit continuation, do not proceed with the affected scope. Do not release a generated instruction's stop condition through a coordinator-specific shortcut or approval of stage progression.

## Exit

- By default, process only the first confirmed packet. Process multiple packets only when the user explicitly names the targets, following their dependencies and existing preflight checks.
- If the exit is not unique, explain the uses and wait for the user to choose. Do not infer a priority or exit.
- For the three implementation-oriented exits, read the corresponding draft view rather than the full instruction and stop after producing the draft.
- Report the generated artifact or direct packet, unprocessed packets, open questions, and the next available action.
- After export, do not start downstream specification, application implementation, or external changes. Those require a separate explicit user request.
