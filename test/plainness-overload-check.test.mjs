// overloaded-ordinary-terms（普通の言葉に内輪の狭い意味を載せた語の初出の開き・C84/INV104/DR206/DR207 B層）
//   の判別テスト（node:test 標準・依存ゼロ）。
//
// 背景: 出力直前の平易さ点検の判定基準が「専門用語・識別子か」の字面ベースで、字面が普通の言葉
//   （代行・配布 等）に固有の狭い意味を載せた語を素通ししていた（2026-07-17 の実症状）。
//   rootdoc の出力直前点検と skills の「問いの平易さ点検」節へ第4の観点を追加した。
//
// ここで落とす誤実装（discriminative oracle）:
//   - 「4.」の番号だけ足して判定基準（載せたのは誰か＝自分が狭めた語だけ対象）が無い
//   - 一般語への歯止め（世間の意味のまま使う語には付けない＝訳語狩り Anti-560）が無い
//   - 点検の個数の宣言（3点→4点）が旧文言のまま
//   - 同文節が宿主間で食い違う（一部の宿主だけ更新・byte 同一性の崩れ）
//   - rootdoc（全エージェント本体）側だけ・skills 側だけの片肺更新
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

const read = (p) => fs.readFileSync(path.join(REPO_ROOT, p), "utf8");

// ---- 宿主の列挙（同文節・grep で全列挙＝取りこぼし防止） ----
function grepHosts(pattern, roots) {
  let out = "";
  try {
    out = execFileSync("grep", ["-rl", pattern, ...roots], { cwd: REPO_ROOT, encoding: "utf8" });
  } catch (e) {
    out = e.stdout ?? "";
  }
  return out.split("\n").filter((f) => f && !f.endsWith(".bak"));
}

const JA_RULE_HOSTS = grepHosts("問いの平易さ点検（出力直前・共通）", ["templates/ja", ".claude", ".agents"]);
const EN_RULE_HOSTS = grepHosts("Plainness check for questions", ["templates/en"]);

const JA_ROOTDOCS = [
  "CLAUDE_intent.md",
  "AGENTS.md",
  "templates/ja/agents/claude/CLAUDE_intent.md",
  "templates/ja/agents/codex/AGENTS.md",
  "templates/ja/agents/gemini/GEMINI_intent.md",
];
const EN_ROOTDOCS = [
  "templates/en/agents/claude/CLAUDE_intent.md",
  "templates/en/agents/codex/AGENTS.md",
  "templates/en/agents/gemini/GEMINI_intent.md",
];

// ---- 実質の検査句（表面マーカー「4.」でなく判定基準そのものを見る） ----
const JA_SUBSTANCE = [
  "狭い意味を載せて使っていないか", // 新観点の中核
  "一般語・既存技術用語には付けない", // 訳語狩りへの歯止め（Anti-560）
];
const JA_WHO_LOADED = /載せたのが自分/; // 判定基準＝意味を載せたのは誰か（DR205）
const EN_SUBSTANCE = ["overloading an ordinary word", "everyday sense"];
const EN_WHO_LOADED = /loaded that meaning onto it/;

test("ja の平易さ点検節が全宿主に存在し 4点へ更新されている", () => {
  assert.ok(JA_RULE_HOSTS.length >= 40, `宿主が想定より少ない: ${JA_RULE_HOSTS.length}`);
  for (const f of JA_RULE_HOSTS) {
    const t = read(f);
    assert.ok(t.includes("次の4点を点検する"), `${f}: 個数の宣言が4点になっていない`);
    assert.ok(!t.includes("次の3点を点検する"), `${f}: 旧文言（3点）が残っている`);
    for (const s of JA_SUBSTANCE) assert.ok(t.includes(s), `${f}: 実質句が無い: ${s}`);
    assert.match(t, JA_WHO_LOADED, `${f}: 判定基準（載せたのは誰か）が無い`);
  }
});

test("en の平易さ点検節が全宿主に存在し 4 点へ更新されている", () => {
  assert.ok(EN_RULE_HOSTS.length >= 20, `宿主が想定より少ない: ${EN_RULE_HOSTS.length}`);
  for (const f of EN_RULE_HOSTS) {
    const t = read(f);
    assert.ok(t.includes("check these 4 points"), `${f}: count not updated to 4`);
    assert.ok(!t.includes("check these 3 points"), `${f}: stale 3-point wording remains`);
    for (const s of EN_SUBSTANCE) assert.ok(t.includes(s), `${f}: substance missing: ${s}`);
    assert.match(t, EN_WHO_LOADED, `${f}: who-loaded-it criterion missing`);
  }
});

test("平易さ点検節は言語内で byte 同一（宿主間の食い違いが無い）", () => {
  for (const [hosts, header] of [
    [JA_RULE_HOSTS, "## 問いの平易さ点検（出力直前・共通）"],
    [EN_RULE_HOSTS, "## Plainness check for questions (right before output; shared)"],
  ]) {
    const sigs = new Map();
    for (const f of hosts) {
      const t = read(f);
      const i = t.indexOf(header);
      assert.ok(i >= 0, `${f}: 節見出しが無い`);
      const sec = t.slice(i);
      const h = crypto.createHash("sha256").update(sec).digest("hex");
      if (!sigs.has(h)) sigs.set(h, []);
      sigs.get(h).push(f);
    }
    assert.equal(
      sigs.size,
      1,
      `節の内容が宿主間で食い違う: ${[...sigs.values()].map((v) => v.length + "件").join(" / ")}\n` +
        [...sigs.values()].map((v) => v[0]).join("\n")
    );
  }
});

test("rootdoc（全エージェント本体）の出力直前点検にも第4の観点がある", () => {
  for (const f of JA_ROOTDOCS) {
    const t = read(f);
    assert.ok(t.includes("ユーザーへ出力する直前に必ず点検する"), `${f}: 点検段落が無い`);
    assert.ok(t.includes("(4) 字面が普通の言葉"), `${f}: 第4の観点が無い`);
    assert.match(t, JA_WHO_LOADED, `${f}: 判定基準（載せたのは誰か）が無い`);
    assert.ok(t.includes("一般語・既存技術用語には付けない"), `${f}: 訳語狩りへの歯止めが無い`);
  }
  for (const f of EN_ROOTDOCS) {
    const t = read(f);
    assert.ok(t.includes("(4) Even when a word looks ordinary"), `${f}: 4th check missing`);
    assert.match(t, EN_WHO_LOADED, `${f}: who-loaded-it criterion missing`);
  }
});

test("既存3点の点検は変わらず残っている（追加であって置換でない）", () => {
  for (const f of JA_RULE_HOSTS) {
    const t = read(f);
    for (const s of ["単体で通じるか", "詰め込みすぎていないか", "識別子に言い換えを添えたか"]) {
      assert.ok(t.includes(s), `${f}: 既存の点検項目が消えている: ${s}`);
    }
  }
});
