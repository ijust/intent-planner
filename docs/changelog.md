# 変更履歴

## Unreleased

### 削除

- Graphiti の事前確認、同期、工程別検索、下流への検索条件を Intent Planner から撤去しました。外部知識基盤を使わない状態が通常です。外部知識基盤の導入・運用は案件側の責務です。
- 新規導入では次の Graphiti 固有ファイルを配置しません。
  - `.claude/skills/intent-graphiti-sync/SKILL.md`
  - `.agents/skills/intent-graphiti-sync/SKILL.md`
  - `.intent/graphiti-safety-boundary.md`
  - `.intent/graphiti-search-boundary.md`
  - `.intent/graphiti-sync-boundary.md`

### 移行

- 既存導入の更新では、上記パスのうち公開済み内容と完全に一致する通常ファイルだけを、候補表示後に自動撤去します。編集済み、由来不明、読み取り不能、リンク、ディレクトリは残し、具体的なパスと理由を表示します。`npx intent-planner --dry-run` で先に確認でき、既存のルート案内文書や `.gitignore` に残る記述は手動確認の対象です。
- 外部の Graphiti にあるデータ、設定、認証情報、接続先は変更または削除しません。外部 Graphiti の保持や完全削除は案件側の責務です。
- 将来不足が確認されても旧設計を自動復元せず、問題と責任分担を新しい Intent Planning で確認します。
