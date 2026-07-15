# Domain Write (writing-side domain derivation and owner note)

When drafting a new symbol (INV / DR / Anti) in compass, derive which domain it belongs to (the `area:` tag / `[領域: <name>]`) from the case context and confirm it, and if the domain being written has an owner declaration from another session, add a read-only one-line note. federated-governance / the writing side of C-fed1 · INV101 / INV91 / DR192-193.

This does **not** replace the existing new-symbol flow (creating a new file in the split store = the numbering declaration; DR131 / regenerating index). It only inserts the derive+confirm question and the owner note (display only).

## 1. Derive the area from the case context and confirm it (do not silently default)

When drafting a new symbol, derive its `area` (domain tag) from:

- The domain of the inherited issue directory, the domain of the existing symbols named by the target case's packet `parent_intents` / Safety, or the domain of nearby compass symbols.
- Cross-check against the domain names in `.intent/domains/README.md` (the domain definitions, if present).

**Confirm the derived area with the user in a single question** (matching the "infer + confirm" pattern of `status` / `first-packet`). **Do not silently default to `always`** — piling symbols onto `always` by inertia, when they are not confirmed to affect all domains, gradually erodes the savings of domain-scoped execution (Anti-543). The `always` choice, when a symbol truly affects all domains, is delegated to the single-question confirmation of `intent-compass/rules/always-gate.md` (P-fed4, if present).

**No double question**: do not ask the area confirmation and the always gate (P-fed4) twice in the same drafting. Only when `always` is being chosen, connect to the always gate's single question; otherwise close with the area confirmation's single question (fold into one combined question).

For a case whose domain cannot be derived (cross-cutting / a new domain), do not fix it by guessing — ask the user "which domain / register as a new domain" (present guesses as guesses; do not silently default to `always`). In a repo with no `.intent/domains/`, do not fire the area confirmation and proceed as before (backward compatible; a permanent fallback of the same kind as INV101/DR133).

## 2. Notice the owner declaration of the domain being written (display only; do not stop)

If the domain being written (the derived, confirmed area) has an owner declaration from **another session** (`.intent/domains/owners/<domain>-<session-rand>.md`), add a read-only one-line note:

> This domain is owner-declared by another session (`<owner>`, `<declared_at>`).

This note inherits the three disciplines of INV91 **without changing a single bit**:

- **Do not stop, do not refuse**: even after showing the note, the write completes as usual. Not a gate (a violation if it turns into refusal, a stop, or an automatic judgment).
- **Never warn on one's own declaration**: distinguish self from others by the declaration's frontmatter `session` (4 random chars; an independent key of the owner declaration schema) — if the `session` of the owner declaration one placed when touching this domain (= one's own session-rand) equals the `session` of the declaration read, it is one's own declaration = do not warn (the schema in `.intent/domains/README.md` is the source of truth). Do not warn oneself about one's own declaration.
- **Multiple sessions' owner declarations co-existing is normal too** (not an error). When they co-exist, enumerate the other sessions' declarations and add the note (do not stop).

If `.intent/domains/owners/` is absent or empty, this note does not fire and behaves as before (backward compatible).

## 3. A mismatch with the domain definitions goes only as far as the note (do not fix; DR193)

Even if the derived area is a name not in the domain definitions of `.intent/domains/README.md`, do not refuse the write. **The source of truth for the symbol→domain mapping is the tags on the symbol file alone** (DR193); a mismatch with the declaration/definition stays only at the display of the note (do not auto-append to the domain definitions or rewrite the area). If a new domain is needed, adding it to the domain definitions is done by a human editing the README (not machine-generated).

## Temperature

The derive+confirm single question helps fix the area when the domain is determinable from the case context; it is not a gate. The owner note is read-only advice, and the parallel-operation judgment stays with the human (INV91). It stays effective by reading only the tags on symbol files and the owner declaration files, adding no helper script (INV2/A1 · same kind as DR71).
