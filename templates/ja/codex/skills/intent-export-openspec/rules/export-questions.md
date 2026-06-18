# Export Questions Check

export 実行前に、未回答の `[export まで]` 付き Open Questions を確認する手順。`/intent-export-openspec` の Step 1.7 で使う。対話はすべて利用者への確認として行う（確認の手段は SKILL.md の規約に従う）。

## 検出

- `.intent/intent-tree.md` と `.intent/intent-compass.md` の Open Questions 節を読み、`[export まで]` を含む問いを検出する。節に残っている問い = 未回答として扱う。
- 検出対象はこの2ファイルのみ。問いの正本は両ファイルの Open Questions 節であり、`.intent/packets/plan.md` の Deferred は意図的見送りの記録であって問いではないため対象外。
- **enforcement 設定（`.intent/mode.md` の Enforcement セクション）は参照しない**（Step 1.5 の enforcement ゲートとは独立に動作する）。

## 手順

1. **検出ゼロの場合（タグ規約を持たない旧 scaffold を含む）**
   - 何も提示せず、次のステップへ進む（挙動変化なし）。

2. **検出ありの場合**
   - 検出した問いの一覧を提示する。
   - 「回答してから export するか、このまま続行するか」を利用者に確認する。
   - これは停止ではなく確認である。利用者が明示的に続行を指示したら export を実行する。

## 規律

- コードを変更しない。
