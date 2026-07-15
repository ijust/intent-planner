// handoff 面の中間状態（1ybs 共通部・外部ツール化 GO 2026-07-12 / DR157）の判別検証。
//
// 経緯: 引き継ぎブリーフの生成は外部ツール化が GO（利用者確定 2026-07-12・compass DR157）。
// 本 repo は overview の俯瞰専任化（共通部）を保ち、互換確認済みの外部 skill がある場合だけ
// packets/writeback の切れ目から生成と受取手順を案内する。
// 旧検証（overview 宿主の rules/6要素）はこの決定で対象が消えたため、本ファイルは中間状態の
// 契約を判別する形に置き換えた（内部レーンの無断再発明を検知するガードを含む）。
//
// 判別オラクル（誤った実装を落とす対比）:
//   (a) 入口不在ガード: templates に intent-handoff スキルが無い（NO-GO 反転＝内部レーンの
//       再発明を赤で検知・裁定変更時はこのテストを人が意識的に更新する）
//   (b) overview の俯瞰専任化: overview に handoff 面（rules/handoff-brief.md・委譲行）が無い
//   (c) 促しの接合と縮退: packets/writeback の促し行は、互換確認済みの handoff-bridge が
//       使える場合だけ .intent/handoff/ への生成と正本照合を案内する。未配置・非互換・確認失敗では
//       案内せず、短いセッションで黙る・損得自問（DR159）の規約は残る
//   (d) installer: `.intent/handoff/*` gitignore と README 再包含（器は外部ツールの出力先として残す）
//   (e) scaffold README: `.intent/handoff/` が正式な派生保存先である旨を案内する
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planGitignore } from "../src/install.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const read = (p) => fs.readFileSync(p, "utf8");

const SYSTEMS = [
  [".claude", "ja"], // dogfood
  [".agents", "ja"], // Codex dogfood
  ["templates/ja/claude", "ja"],
  ["templates/ja/codex", "ja"],
  ["templates/en/claude", "en"],
  ["templates/en/codex", "en"],
];

// ---- (a) 入口不在ガード ----
for (const [sys] of SYSTEMS) {
  test(`handoff 中間状態: ${sys} に intent-handoff スキルが無い（外部化 GO・DR157）`, () => {
    const p = path.join(REPO_ROOT, sys, "skills", "intent-handoff");
    assert.ok(!fs.existsSync(p), `${sys}: 内部入口 intent-handoff は作らない（再決定時はこのガードを人が更新）`);
  });
}

// ---- (b) overview の俯瞰専任化（全実行面） ----
for (const [sys, lang] of SYSTEMS) {
  test(`handoff 中間状態: ${sys} の overview に handoff 面が無い（俯瞰専任・INV87）`, () => {
    const rulesPath = path.join(REPO_ROOT, sys, "skills", "intent-overview", "rules", "handoff-brief.md");
    assert.ok(!fs.existsSync(rulesPath), `${sys}: overview 配下に handoff-brief.md が無い`);
    const c = read(path.join(REPO_ROOT, sys, "skills", "intent-overview", "SKILL.md"));
    assert.ok(!/rules\/handoff-brief\.md/.test(c), `${sys}: overview SKILL に handoff-brief への委譲行が無い`);
    const writeBoundary = lang === "ja" ? /\.intent\/overview\/` 配下限定/ : /limited to (under )?`\.intent\/overview\//;
    assert.match(c, writeBoundary, `${sys}: 書込み境界が overview 配下限定（例外なし）の宣言`);
  });
}

// ---- (c) 促しの接合と縮退（互換時だけ生成・受取案内、守る挙動は残る） ----
for (const [sys, lang] of SYSTEMS) {
  for (const skill of ["intent-packets", "intent-writeback"]) {
    test(`handoff 接合: ${sys}/${skill} の促しが互換時だけ生成と正本照合を案内する`, () => {
      const c = read(path.join(REPO_ROOT, sys, "skills", skill, "SKILL.md"));
      const compatible = lang === "ja" ? /互換確認済み.*handoff-bridge/u : /compatibility-verified.*handoff-bridge/i;
      assert.match(c, compatible, `${sys}/${skill}: 互換確認済みの場合だけ案内する`);
      assert.match(c, /\.intent\/handoff\//, `${sys}/${skill}: 正式な派生保存先を案内する`);
      const receive = lang === "ja"
        ? /source.*read_for.*正本.*authority.*provenance/u
        : /source.*read_for.*canonical.*authority.*provenance/is;
      assert.match(c, receive, `${sys}/${skill}: 次セッションの正本照合手順を案内する`);
      const silent = lang === "ja" ? /短いセッションでは黙る/ : /stay silent in a short session/;
      assert.match(c, silent, `${sys}/${skill}: 短いセッションで黙る規約は残る`);
      const probe = lang === "ja" ? /残作業の性質/ : /nature of the remaining work/;
      assert.match(c, probe, `${sys}/${skill}: 損得自問（DR159）は残る`);
      const degrade = lang === "ja"
        ? /未配置・非互換・確認失敗.*生成.*案内を出さない/u
        : /not installed, incompatible, or verification fails.*do not emit.*generation guidance/is;
      assert.match(c, degrade, `${sys}/${skill}: 未配置縮退の規約は残る`);
    });
  }
}

// ---- (d) installer: gitignore の器 ----
test("handoff 中間状態: .intent/handoff/* が gitignore ブロックに含まれ README 再包含がある (INV82・DR142)", () => {
  const tmp = fs.mkdtempSync(path.join(REPO_ROOT, ".tmp-handoff-test-"));
  try {
    fs.mkdirSync(path.join(tmp, ".git"));
    const plan = planGitignore(tmp);
    assert.equal(plan.action, "create", ".gitignore 不在なので create");
    assert.ok(plan.blockLines.includes(".intent/handoff/*"), "blockLines に .intent/handoff/* が含まれる");
    assert.ok(
      plan.blockLines.includes("!.intent/handoff/README.md"),
      "blockLines に !.intent/handoff/README.md が含まれる (README 再包含)",
    );
    assert.ok(
      plan.blockLines.indexOf(".intent/handoff/*") < plan.blockLines.indexOf("!.intent/handoff/README.md"),
      "除外が再包含より先に並ぶ",
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ---- (e) scaffold README: 正式な派生保存先の案内 ----
for (const lang of ["ja", "en"]) {
  test(`handoff 接合: ${lang}/intent/handoff/README.md が正式な派生保存先を案内する`, () => {
    const p = path.join(TEMPLATES, lang, "intent", "handoff", "README.md");
    assert.ok(fs.existsSync(p), `${lang}: handoff/README.md が実在する`);
    const c = read(p);
    const official = lang === "ja" ? /正式な.*派生.*保存先/u : /official.*derived.*output location/is;
    assert.match(c, official, `${lang}: 正式な派生保存先である旨`);
    assert.match(c, /handoff-bridge/, `${lang}: 外部の生成担当を名指す`);
    assert.ok(!/`\/intent-handoff`|`\/intent-overview`/.test(c), `${lang}: 生成手段として内部コマンドを名指ししない`);
  });
}
