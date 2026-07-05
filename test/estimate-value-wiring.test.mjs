// 見積もり・価値注記の起草手順と export 引き継ぎ (pkt-20260705-estimate-value-wiring-fjg9, A48/DR88/DR89/INV62)。
// node:test 標準・依存ゼロ (INV2)。
//
// 範囲分担: SKILL 本文の lock は standard-invariance (SKILL_BODY_LOCKED / INSTALLER_LOCKED /
// BYTE_LOCKED で4面 or 2面とも正規更新済み) が担う。本ファイルは「内容の存在」+ DR88/DR89/INV62 の
// 判別 + 計数スクリプトの読取専用性 + dogfood 同期を検査する。
//
// 判別オラクル (packet Validation 由来):
//   (a) packets SKILL に価値・見積もり・リスクの記入手順があり、見積もりは提案→承認・3点セット・
//       人の時間・裸数値禁止・判断は機械化しない (DR88/DR89) が明文
//   (b) packets SKILL の state 記述が6値 (parked 含む) に更新されている
//   (c) export-cc-sdd SKILL に parked 除外 + 依存先 parked の warn (止めない) がある
//   (d) map-cc-sdd に価値/リスク/見積もりの引き継ぎがあり、見積もりは要件化しない (参考のみ) と明文
//   (e) 計数スクリプトが実在し、書き込みを一切しない (読取専用) — 実際に走らせて副作用ゼロを確認
//   (f) INV62: 提案文・引き継ぎに日付/ベロシティ/優先度スコアを持ち込まない禁止が明文
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

// (a)(b) packets SKILL — 4面すべて（claude/codex は本文差分ありだが同趣旨の存在を各面で検査）
for (const [lang, agent] of [["ja", "claude"], ["ja", "codex"], ["en", "claude"], ["en", "codex"]]) {
  const skill = read(path.join(TEMPLATES, lang, agent, "skills", "intent-packets", "SKILL.md"));
  test(`packets SKILL ${lang}/${agent}: 価値・見積もりの記入手順 (a) と state 6値 (b)`, () => {
    if (lang === "ja") {
      assert.match(skill, /PdM\/PjM 向けの任意節（価値・見積もり）は、必要な packet に限り\*\*提案→承認\*\*/);
      assert.match(skill, /幅・根拠・主体のどれかを欠いた\*\*裸の数値は書かない\*\*（DR88）/);
      assert.match(skill, /判断を機械化しない\*\*（規模シグナルの計数までは補助スクリプトに委ねてよいが判断は AI 提案\+人承認・DR89）/);
      assert.match(skill, /人が拘束される時間\*\*（レビュー・仕様判断・受入確認）で見積もる/);
      assert.match(skill, /日付コミット・ベロシティ・優先度スコアを持ち込まない（INV62）/);
      assert.match(skill, /`packet-format\.md` の6値域（`draft \| ready \| implementing \| verifying \| done \| parked`）/);
    } else {
      assert.match(skill, /optional PdM\/PjM sections \(value, estimate\) are filled in by \*\*proposal → approval\*\*/);
      assert.match(skill, /\*\*Never write a bare number\*\* missing any of range\/grounds\/implementer \(DR88\)/);
      assert.match(skill, /\*\*Do not mechanize the judgment\*\*/);
      assert.match(skill, /the time a human is tied up\*\* \(review, spec decisions, acceptance checks\)/);
      assert.match(skill, /Bring in no date commitments, velocity, or priority scores \(INV62\)/);
      assert.match(skill, /the 6-value domain \(`draft \| ready \| implementing \| verifying \| done \| parked`\)/);
    }
  });
}

// (c) export-cc-sdd SKILL — parked 除外 + 依存 warn（4面）
for (const [lang, agent] of [["ja", "claude"], ["ja", "codex"], ["en", "claude"], ["en", "codex"]]) {
  const skill = read(path.join(TEMPLATES, lang, agent, "skills", "intent-export-cc-sdd", "SKILL.md"));
  test(`export-cc-sdd SKILL ${lang}/${agent}: parked 除外 + 依存 warn (c)`, () => {
    if (lang === "ja") {
      assert.match(skill, /\*\*parked 除外\*\*/);
      assert.match(skill, /候補列挙から外す/);
      assert.match(skill, /依存先が保留中（<packet 名>）」を1行 warn する（\*\*止めない\*\*/);
    } else {
      assert.match(skill, /\*\*Parked exclusion\*\*/);
      assert.match(skill, /leave out\*\* packets with `state: parked`/);
      assert.match(skill, /a dependency is parked \(<packet name>\)" \(\*\*do not stop\*\*/);
    }
  });
}

// (d)(f) map-cc-sdd — 価値/リスク/見積もりの引き継ぎ・見積もりは要件化しない（ja/en claude、codex は byte 等価）
for (const lang of ["ja", "en"]) {
  const map = read(path.join(TEMPLATES, lang, "claude", "skills", "intent-export-cc-sdd", "rules", "map-cc-sdd.md"));
  test(`map-cc-sdd ${lang}: 価値/リスク/見積もりの引き継ぎと要件化しない (d)`, () => {
    if (lang === "ja") {
      assert.match(map, /`## 価値（誰に何が起きるか）` 節があれば/);
      assert.match(map, /`## リスク` 節があれば/);
      assert.match(map, /見積もりは design ヒントへ参考転記に留める/);
      assert.match(map, /タスク見積もりを\*\*生成・確定しない\*\*/);
      assert.match(map, /見積もりを要件・受入基準に化けさせない/);
    } else {
      assert.match(map, /`## Value \(what happens for whom\)` section/);
      assert.match(map, /`## Risks` section/);
      assert.match(map, /The estimate is carried into the design hints as a reference note only/);
      assert.match(map, /do \*\*not\*\* generate or finalize cc-sdd\/kiro task estimates/);
      assert.match(map, /Do not let the estimate turn into a requirement or acceptance criterion/);
    }
  });
}

// (e) 計数スクリプトは実在し、書き込みを一切しない（読取専用）
test("estimate-signals.mjs: 実在し規模シグナルを出す・書き込みゼロ (e)", () => {
  const script = path.join(REPO_ROOT, "scripts", "estimate-signals.mjs");
  assert.ok(fs.existsSync(script), "計数スクリプトが実在する");
  const body = read(script);
  // 書き込み系 API を一切使わないことをソースで確認（読取専用の静的保証）
  for (const forbidden of ["writeFileSync", "writeFile(", "appendFile", "rmSync", "unlinkSync", "mkdirSync", "rename"]) {
    assert.ok(!body.includes(forbidden), `書き込み系 API ${forbidden} を使わない`);
  }
  // 実際に走らせて JSON が出る（規模シグナルの4キー）・かつ対象に副作用が無いことを mtime で確認
  const target = path.join(REPO_ROOT, "scripts", "symbol-labels.json");
  const before = fs.statSync(target).mtimeMs;
  const out = execFileSync("node", [script, "--json", target], { encoding: "utf8" });
  const sig = JSON.parse(out);
  for (const key of ["files", "lines", "testFiles", "depsHint"]) {
    assert.ok(typeof sig[key] === "number", `規模シグナル ${key} が数値`);
  }
  const after = fs.statSync(target).mtimeMs;
  assert.equal(before, after, "計数対象のファイルが書き換えられていない（読取専用）");
});

// dogfood 同期 (INV9) — export SKILL / map-cc-sdd / packets SKILL は dogfood=ja/claude ミラー
for (const rel of [
  "intent-packets/SKILL.md",
  "intent-export-cc-sdd/SKILL.md",
  "intent-export-cc-sdd/rules/map-cc-sdd.md",
]) {
  test(`dogfood 同期: .claude/skills/${rel} == templates/ja/claude/skills/${rel}`, () => {
    const dogfood = read(path.join(REPO_ROOT, ".claude", "skills", rel));
    const master = read(path.join(TEMPLATES, "ja", "claude", "skills", rel));
    assert.equal(dogfood, master, `${rel} が dogfood と templates で byte 等価`);
  });
}
