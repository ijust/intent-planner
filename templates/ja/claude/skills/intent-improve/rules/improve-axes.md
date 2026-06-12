# Improve: 3軸評価と分類基準

実装後の再整合で `.intent/` 成果物と実装の現実を突き合わせる規則。`intent-improve` skill が使う。writeback が packet 単位の通常経路であるのに対し、improve は packet に紐づかない drift も拾う全体横断の safety net である。

## 評価3軸

- **completeness**（意図した内容が実現されているか）: packets.md の Expected Behavior / Scope が実装とテストに現れているか。未実現・部分実現を検出する。
- **correctness**（実現された内容が意図に合っているか）: 実装された挙動が packet の Why / Expected Behavior と一致しているか。意図と異なる実現・意図外の追加を検出する。
- **coherence**（実装が North Star・Invariants・Decision Rules と整合しているか）: intent-compass.md の North Star / Invariants / Anti-direction / Decision Rules と実装が矛盾していないか。局所最適や invariant 違反を検出する。また、intent-compass.md の Decision Rules の Revisit when 条件の成立が、実装の現実・deltas.md から読み取れる Decision エントリを検出する。検出は既存分類「Decision Rules 更新推奨」として根拠付きで報告する（新しい分類は作らない）。

## 分類（5種・複数該当可）

- **aligned**: ズレなし。3軸とも整合している（是正不要。整合の根拠は添える）。
- **intent 強化推奨**: 実装は妥当だが `.intent/` 側の記述が薄い・暗黙のまま。成果物（intent-tree.md / intent-compass.md / packets.md）の追記・明確化の更新案を提示する。
- **是正 packet 推奨**: 実装側にズレがあり、コード変更が必要。improve はコードを変更しないため、是正作業を新しい packet 案として提示する（packets.md への追加案 → export → cc-sdd 実装の通常経路へ）。
- **Decision Rules 更新推奨**: 実装で得た判断が既存の Decision Rules と食い違う、または新しい判断基準が必要。Revisit when 条件の成立が検出された Decision エントリの見直しもこの分類として報告する。下記の「Decision Rules 変更規約」に従う。
- **invariant 違反検出**: 実装が Invariants に違反している。最優先で報告し、是正 packet 案または invariant 自体の見直し（ユーザー判断）を提示する。

複数該当する場合はすべて挙げ、報告は分類ごとに整理する。

## 証拠の扱い

- 実装の現実の参照元: コードベース（Read/Glob/Grep のみ、変更禁止）、テストの有無と配置、`.kiro/specs/` の進行状況、`.intent/deltas.md`（promoted / pending）。いずれも**読み取りのみ**。
- 評価には必ず根拠（ファイル / 該当記述）を添える。根拠を示せない評価・是正案は提示しない。

## Decision Rules 変更規約（writeback と同一規約）

- Decision Rules を変更する是正は、intent-compass.md の既存 ADR 形式（**Context** / **Decision** / **Why** / **Alternatives considered** / **Consequences** / **Revisit when**）で**新エントリを追加**し、置き換えられる旧エントリに superseded である旨を注記する。
- 旧エントリは削除しない（履歴保持）。独自フィールド（例: Supersedes）を導入しない。
- 6欄形式の導入前に記録された旧4欄エントリ（Alternatives considered / Revisit when を持たないもの）は有効として扱い、欄の不足をエラー・指摘・書き換えの対象にしない。

## writeback 誘導（safety net の役割分担）

- 書き戻し未実施の学び — 現行 Source Packet（最新 export）に対応する delta エントリが deltas.md に無い、または実装に現れた未記録の決定 — を検出したら、自ら delta を書かず `/intent-writeback` の実行を促す。
- 「保留」タグ付きの見送り項目が残っている場合は、再提案または却下への確定を促すのみとする。タグの確定更新（昇格 / 却下確定 / 継続保留）は `/intent-writeback` の責務。
- improve は deltas.md に書き込まない（delta の記録・状態更新はすべて writeback が行う）。
