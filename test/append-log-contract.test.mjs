// append-log-discipline-seam (task 2.1) の規約存在テスト。
// node:test 標準・依存ゼロ (INV2)。
//
// 目的: 「append-only 記録の分割・archive 規約」の5点が、CONTRACT の5箇所
//   (dogfood `.claude/skills/CONTRACT.md` + templates/{ja,en}/{claude,codex}/skills/CONTRACT.md)
//   すべてに存在することを機械的に固定する (Req 1.1–1.6, 5.2)。
//
// 検査方針: 規約は body prose (frontmatter ではない) なので、言語ごとに同文で全 agent に
//   現れるべき。言語別の安定マーカー (規約見出し + 5点 + スラッグ参照) の存在を確認する。
//   CONTRACT は agent-rules-parity の byte 等価対象外のため、5箇所すべてを直接検査する。
//   RED 実証: 本テストは CONTRACT への規約追記前 (規約節が無い状態) では
//   「規約見出しがある」アサーションで失敗する。追記後に全マーカーが揃い green になる。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

// 検査対象の CONTRACT 5箇所 (言語付き)。
const CONTRACT_TARGETS = [
  { lang: "ja", rel: ".claude/skills/CONTRACT.md", abs: path.join(REPO_ROOT, ".claude", "skills", "CONTRACT.md") },
  { lang: "ja", rel: "templates/ja/claude/skills/CONTRACT.md", abs: path.join(TEMPLATES, "ja", "claude", "skills", "CONTRACT.md") },
  { lang: "ja", rel: "templates/ja/codex/skills/CONTRACT.md", abs: path.join(TEMPLATES, "ja", "codex", "skills", "CONTRACT.md") },
  { lang: "en", rel: "templates/en/claude/skills/CONTRACT.md", abs: path.join(TEMPLATES, "en", "claude", "skills", "CONTRACT.md") },
  { lang: "en", rel: "templates/en/codex/skills/CONTRACT.md", abs: path.join(TEMPLATES, "en", "codex", "skills", "CONTRACT.md") },
];

// 規約見出し + 5点 + スラッグ参照のマーカー (言語別)。
// 各マーカーは「規約のどの要件 (Req) を機械検出するか」をラベルにする。
const MARKERS = {
  ja: {
    heading: ["append-only 記録の分割・archive 規約"], // 節見出し (Req 1.1–1.6 の置き場)
    points: [
      { req: "1.1 active/履歴分離", any: ["active 面（現在の射影）と履歴（archive）を分ける"] },
      { req: "1.2 分割キー2分類", any: ["packet 由来＝packet 単位ファイル"] },
      { req: "1.2 事象由来", any: ["事象由来＝日付+slug 単位ファイル"] },
      { req: "1.3 連番禁止・日付+slug", any: ["連番採番は用いず日付+slug を用いる"] },
      { req: "1.4 archive 退避 archive/<年>/", any: ["`archive/<年>/` 構造を踏襲"] },
      { req: "1.5 merge=union 不使用", any: ["merge=union を用いない"] },
      { req: "1.6 スラッグ規則参照・再定義しない", any: ["packet-format.md", "新しい採番規則を再定義しない"] },
      // add (task 2.1): 残る記録ファイルの置き場が全コピーで同文で存在する（Req 1.1–1.3）。
      // milestones は milestones-decommission（DR148）で撤去済み＝規約は 5→4 ファイル。
      { req: "add export-log packet 単位", any: ["`export-log/<packet-slug>.md`"] },
      { req: "add drift-log 日付+slug 単位", any: ["`drift-log/<date>-<slug>.md`"] },
      { req: "add compass-archive rule 単位", any: ["`compass-archive/<rule-slug>.md`"] },
    ],
  },
  en: {
    heading: ["Split and archive convention for append-only records"],
    points: [
      { req: "1.1 active/history separation", any: ["Separate the active surface (the current projection) from history (archive)"] },
      { req: "1.2 split key packet-origin", any: ["packet-origin = a file per packet"] },
      { req: "1.2 event-origin", any: ["event-origin = a file per date+slug"] },
      { req: "1.3 no sequential numbering; date+slug", any: ["Do not use sequential numbering; use date+slug"] },
      { req: "1.4 archive eviction archive/<year>/", any: ["`archive/<year>/` structure"] },
      { req: "1.5 no merge=union", any: ["Do not use merge=union"] },
      { req: "1.6 reference slug rule; do not redefine", any: ["packet-format.md", "does not redefine a new numbering scheme"] },
      // add (task 2.1): placement for the remaining files present in all copies (Req 1.1–1.3).
      // milestones was removed by milestones-decommission (DR148); the convention is now 5→4 files.
      { req: "add export-log packet-unit", any: ["`export-log/<packet-slug>.md`"] },
      { req: "add drift-log date+slug-unit", any: ["`drift-log/<date>-<slug>.md`"] },
      { req: "add compass-archive rule-unit", any: ["`compass-archive/<rule-slug>.md`"] },
    ],
  },
};

for (const target of CONTRACT_TARGETS) {
  const spec = MARKERS[target.lang];

  test(`append-log 規約: ${target.rel} に分割・archive 規約節がある (Req 1.1)`, () => {
    assert.ok(fs.existsSync(target.abs), `対象が実在する: ${target.rel}`);
    const content = fs.readFileSync(target.abs, "utf8");
    for (const h of spec.heading) {
      assert.ok(
        content.includes(h),
        `${target.rel}: 規約見出し「${h}」がある (規約の置き場)`,
      );
    }
  });

  for (const point of spec.points) {
    test(`append-log 規約: ${target.rel} に Req ${point.req} の記述がある`, () => {
      assert.ok(fs.existsSync(target.abs), `対象が実在する: ${target.rel}`);
      const content = fs.readFileSync(target.abs, "utf8");
      const hit = point.any.some((s) => content.includes(s));
      assert.ok(
        hit,
        `${target.rel}: Req ${point.req} のマーカー (${point.any.join(" / ")}) のいずれかがある`,
      );
    });
  }
}
