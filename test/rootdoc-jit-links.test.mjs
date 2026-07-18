// ルート文書の遅延読み込み導線の実在検査。
// spec: token-diet（A79・C96）/ Anti-594（導線なしの移設＝実質削除の禁止）/ DR231（移動元に導線を残す）。
//
// 【狙い】2026-07-18 の常時ロード層圧縮（c3sj）は、ルート文書の詳細記述を配布済みの参照先
// （.intent/README.md・.intent/compass/README.md）へ移し、移動元に導線を残した。
// この導線が将来の編集で消えると、移した内容へ読み手（AI）が辿れなくなり削除と同じ挙動変更になる。
// 「導線がルート文書に残っている」「導線の指す先が配布物に実在する」の2点を機械検査で恒久化する。

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const LANGS = ["ja", "en"];

const BODY_DOCS = LANGS.flatMap((lang) => [
  path.join("templates", lang, "agents", "claude", "CLAUDE_intent.md"),
  path.join("templates", lang, "agents", "codex", "AGENTS.md"),
  path.join("templates", lang, "agents", "gemini", "GEMINI_intent.md"),
]);

// ルート文書が保持すべき導線（移設先への参照）。
const REQUIRED_LINKS = [".intent/README.md", ".intent/compass/README.md"];

for (const rel of BODY_DOCS) {
  test(`遅延読み込み導線: ${rel} が移設先への参照を保持している`, () => {
    const body = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    for (const link of REQUIRED_LINKS) {
      assert.ok(
        body.includes(link),
        `${rel} に導線 ${link} が無い（Anti-594: 導線なしの移設は実質削除。` +
          `移した内容を別の場所へ再移設したなら、この検査の導線リストを追随更新する）`,
      );
    }
  });
}

for (const lang of LANGS) {
  test(`遅延読み込み導線: ${lang} の移設先が配布物に実在する`, () => {
    for (const rel of [
      path.join("templates", lang, "intent", "README.md"),
      path.join("templates", lang, "intent", "compass", "README.md"),
    ]) {
      assert.ok(
        fs.existsSync(path.join(REPO_ROOT, rel)),
        `導線の指す先が配布物に無い: ${rel}（参照先を消す・動かすなら導線と本検査を同時に更新する）`,
      );
    }
  });
}
