# Walking Skeleton Check

The procedure for confirming whether the top-priority packet spans the primary user journey end to end (i.e., is a walking skeleton). Used at the priority presentation (Step 4) of `/intent-packets`, only when the purpose in `.intent/mode.md` is `poc`. All dialogue is conducted as confirmation with the user (the means of confirmation follows the SKILL.md conventions).

## Applicability

- Read `purpose` in `.intent/mode.md`. Apply this procedure to the Step 4 priority presentation only when it is `poc`.
- **When purpose is not poc or is unrecorded, do not apply this procedure and do not change the existing Step 4 behavior** (notification for the unrecorded case follows the `.intent/mode.md` conventions).

## Procedure

1. **E2E verdict**
   - Read the top-priority packet's Scope and Expected Behavior, and judge whether it spans the primary user journey end to end (input → processing → observable output).
   - Ground the verdict in the packet's descriptions. A packet that stops at an intermediate layer (processing only, UI only, etc.) is judged "does not span".

2. **Present the verdict and rationale, and confirm**
   - Present the verdict (spans end-to-end / does not span) and its rationale to the user, and confirm.

3. **Propose remedies (when judged "does not span")**
   - Propose how to make the first packet a walking skeleton, in one of the following forms:
     - **Reordering proposal**: reorder the priorities so that a packet spanning E2E comes first.
     - **Merge proposal**: merge the Scopes of multiple packets to create a packet that spans E2E.
   - If the user intentionally defers the walking-skeleton conversion, accept that as a choice (do not silently drop it — record it; see step 4).

4. **Record the confirmation result**
   - Record in the "Walking Skeleton" section of `packets.md`: **Top-priority packet** (packet name) / **E2E verdict** (spans end-to-end / does not span) / **Confirmation result** (what the user confirmed).
   - For an intentional deferral, also record it together with the reason under the Deferred section.
   - **Non-destructive append for older scaffolds**: if `packets.md` lacks a "Walking Skeleton" section, append the section while preserving the existing recorded content, then record.

## Discipline

- The confirmation result is referenced by intent-validate. Do not omit the record.
- Do not change code.
