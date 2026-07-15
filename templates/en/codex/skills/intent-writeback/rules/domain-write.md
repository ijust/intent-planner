# Domain Write (promotion-target domain derivation and owner note)

When writeback promotes a learning into canonical, derive which domain the promotion target (the packet's Expected Behavior / a compass symbol) belongs to from the case context and confirm it, and if the domain being written has an owner declaration from another session, add a read-only one-line note. federated-governance / the writing side of C-fed1 · INV101 / INV91 / DR192-193.

This does **not** replace the existing promotion flow (delta → approval → canonical; the split of approval granularity). It only inserts the promotion-target domain derive+confirm and the owner note (display only).

## 1. Derive the promotion target's domain and confirm it (do not silently default)

When promoting a compass symbol (a new Invariant / Decision Rule from a `[invariant-violation]` / `[decision]` learning), derive its `area` (domain tag) from:

- The domain of the existing symbols named by the target packet's `parent_intents` / Safety, the domain of the case the promoted delta touched, or the domain of nearby compass symbols.
- Cross-check against the domain names in `.intent/domains/README.md` (the domain definitions, if present).

**Confirm the derived area with the user in a single question** (present guesses as guesses). **Do not silently default to `always`** (Anti-543). Promotion into a packet's Expected Behavior (implicit-behavior, etc.) already carries the packet's own domain, so this confirmation is limited to compass symbol promotion. If the domain cannot be derived, do not fix it by guessing — ask the user. In a repo with no `.intent/domains/`, do not fire and proceed as before (backward compatible; same kind as INV101/DR133).

## 2. Notice the owner declaration of the domain being written (display only; do not stop)

If the domain being promoted-into has an owner declaration from **another session** (`.intent/domains/owners/<domain>-<session-rand>.md`), add a read-only one-line note:

> This domain is owner-declared by another session (`<owner>`, `<declared_at>`).

This note inherits the three disciplines of INV91 **without changing a single bit**:

- **Do not stop, do not refuse**: even after showing the note, the promotion completes as usual. Not a gate.
- **Never warn on one's own declaration**: distinguish self from others by the declaration's `session` (random).
- **Multiple sessions' owner declarations co-existing is normal too** (not an error). Enumerate the co-existing other sessions' declarations and add the note (do not stop).

If `.intent/domains/owners/` is absent or empty, this note does not fire and behaves as before (backward compatible).

## 3. A mismatch with the domain definitions goes only as far as the note (do not fix; DR193)

Even if the derived area is a name not in the domain definitions of `.intent/domains/README.md`, do not refuse the promotion. **The source of truth for the symbol→domain mapping is the tags on the symbol file alone** (DR193); a mismatch with the declaration/definition stays only at the display of the note (do not auto-append to the domain definitions or rewrite the area).

## Temperature

The promotion-target domain confirmation is not a gate, the owner note is read-only advice, and the parallel-operation judgment stays with the human (INV91). It does not change the split of approval granularity (`[invariant-violation]` confirmed one by one; others promoted in bulk). It stays effective by reading only the tags on symbol files and the owner declaration files, adding no helper script (INV2/A1).
