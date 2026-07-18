# Mermaid views (generated only when requested)

A procedure that draws the whole picture of intent and the order/blocking of work as "a single figure to grasp at a glance" in Mermaid, and derives it to `.intent/overview/mermaid-views.md`. In `intent-overview` Step 2, apply this **only when the user asks for a figure (mindmap / roadmap figure)** (the default run does not generate this view; it only emits the one-line pointer in Output). This view exists for the experience that a figure conveys the whole faster than a text hierarchy; its purpose differs from the default tree figure `mermaid-tree.md` (the detailed graph TD view) (C51/A59 · DR116 · INV62 applied to figures).

## Applicability (does not run by default)

- Generate only when the user **requests a figure** from `/intent-overview` (natural-language triggers: "mindmap", "show me a figure", "roadmap as a figure", etc.). Do not bundle it into the default overview (pull discipline / context cost).
- On a default run without a request, do not generate this view; leave only the one-line pointer in overview.md. The default run's output and cost are unchanged (behavior-preserving).
- When the intent-tree is empty/ungenerated, or there are zero packets, omit that figure and state the reason (same as the existing rules' empty-display discipline — do not create a new error surface, do not fabricate nodes by guessing).

## The two figures (both in one rule)

### Figure 1: whole-picture mindmap (centered on intent tree L0–L2)

- **Purpose**: a figure to grasp "the whole picture of my thinking" in one sheet. It is separate from `mermaid-tree.md` (the default view drawing L0→L4 in detail as graph TD); it narrows to the upper intents (L0 purpose / L1 desired outcomes / L2 capabilities) and prioritizes graspability.
- **Draw target**: the items under each `## L0:`–`## L2:` heading of `intent-tree.md`. Being a grasping figure, it does not include L3/L4 by default (leave the detail to the default tree figure).
- **Rendering floor (render compatibility · most important)**: stay within notation that GitHub / VSCode render by standard. Because Mermaid's `mindmap` notation renders inconsistently across environments, **by default draw a pseudo-mindmap in `graph TD`** (L0 at the apex, radiating to L1 · L2). Use `mindmap` notation only when, at generation time, you actually verify it renders in the major environments (GitHub / VSCode) (DR116 Revisit when). Do not mix experimental notation, extended diagram types, external renderers, or theme extensions (INV2 · Anti 372).
- **Node ID / label discipline**: reuse the discipline of `mermaid-tree.md` (IDs as `L<level>_<index>`; labels as `ID["..."]`; forbidden characters `( ) [ ] " /` mechanically removed; truncate at length 40; edges upper→lower). Keep L numbers / C numbers in labels so nodes trace back to the intent-tree description (the metric of Example 1).

### Figure 2: roadmap figure (packet order and blocking · no dates)

- **Purpose**: grasp "what is blocking what (the order of work)" as a figure. It is the figure version of `roadmap-projection.md` (the forward order in text), going as far as order and blocking (does not carry dates, progress %, or Gantt).
- **Draw target**: the frontmatter of `.intent/packets/active/*.md` (the source of truth; `index.md` is a regenerable derived cache) — `packet_id` / `name` / `state` / `depends_on`.
- **How to draw**: in `graph LR` (left→right), connect `depends_on`'s "what is needed first → what waits on it" with a `dependency --> dependent` edge. You may append `state` to the node label (`state` is only mirrored read-only, not computed). Make it visible in the figure **which packet is still blocked (its dependency is not yet done)** (e.g. keep the state word in the label; color/class decoration is optional but must stay within GitHub-rendered scope). Draw cycles and unresolved dependencies (a dependency on a packet not in active) as they are (do not flatten them).
- **Forbidden label characters (apply Figure 1's floor to Figure 2 too)**: do not include `( ) [ ] " /` in node labels (the `mermaid-tree.md` discipline). When appending `state`, use a separator rather than parentheses (`— implementing`, etc.) — a parenthesized annotation like `packet (implementing)` breaks rendering. Use a short stable key derivable from `packet_id` (alphanumerics and underscore only) as the ID.
- **No dates (INV62 · most important oracle)**: never put dates, deadlines, progress %, Gantt, or velocity into the figure. Keep it to order (precedence), `state`, and blocking.

## Procedure

1. Generate this view only on a trigger meeting the applicability (by default only the one-line pointer in overview.md).
2. Read which figure was requested (mindmap / roadmap figure / both). If the request is ambiguous, you may emit both.
3. Read Figure 1 from `intent-tree.md` L0–L2 and Figure 2 from active packet frontmatter, read-only, and write out the Mermaid at the rendering floor above. Immediately after each figure, **also provide the corresponding text as the source of truth** (Figure 1: the L0–L2 hierarchy; Figure 2: the order and blocking as a bullet list), so that reading does not stall in an environment that does not render the figure (same line as `mermaid-tree.md` R3.2).
4. Write to `.intent/overview/mermaid-views.md` with full replacement. State the generation time at the top (derived · regenerable · manual regeneration only). Writes are limited to under `.intent/overview/` (do not write to canonical).

## Shape of the output

- Top: generation time, the material read (whether intent-tree L0–L2 exists, active-packet count), and **that it is derived, not the source of truth**.
- Body: Figure 1 (mindmap-style Mermaid + text hierarchy) / Figure 2 (roadmap figure Mermaid + order/blocking text). Emit only the figures requested.
- When empty: if the intent-tree is empty, omit Figure 1 and state the reason (point to `/intent-discover`). If there are zero packets, omit Figure 2 and state "no packets".
- Bottom: a note that it is derived, not the source of truth, and that in an environment that does not render the figure, read the accompanying text.

## Discipline (must hold)

- **Do not put dates, progress %, Gantt, or velocity into the figure (INV62 applied to figures · most important oracle)**: even in the roadmap figure, go as far as order, `state`, and blocking. Do not turn calendar / Gantt / velocity into a figure (Anti 371).
- **Rendering floor (Anti 372 · L1-d metric)**: stay within notation that GitHub / VSCode render by standard. Use inconsistent notations like `mindmap` only when verified by measurement; the default is the `graph` family. Do not depend on external renderers, plugins, or image generation (INV2).
- **Do not alter the body of the default tree figure (`mermaid-tree.md`)**: this view is a separate view in a separate file; keep the existing tree figure's graph TD discipline and default output byte-unchanged (pure addition).
- **Always provide the text as the source of truth**: attach the corresponding text to each figure so reading does not stall if the figure breaks (do not make the figure's correctness depend on the renderer implementation).
- **Do not compute or infer `state`**: mirror the frontmatter `state` read-only. Do not flatten progress into a single %.
- **Do not emit nodes/edges you cannot trace to a source**: every node traces to the intent-tree / packet frontmatter (zero fabrication).
- **Do not rewrite canonical**: writes are limited to `.intent/overview/mermaid-views.md`. Actually changing the work order after seeing the figure is the human's call (this view goes as far as the projection).
