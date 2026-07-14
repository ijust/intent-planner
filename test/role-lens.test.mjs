// role-aware-planner ロールレンズ (pkt-20260705-role-lens-id90, A48/INV60/INV61/DR91) の構造検証。
// node:test 標準・依存ゼロ (INV2)。
//
// 範囲分担 (重複回避):
//   - rules の claude/codex byte 等価は agent-rules-parity が、algo-qoc.md の golden hash は
//     standard-invariance が担う。本ファイルは追加された「内容の存在」と INV60/INV61 の
//     判別オラクル、および dogfood 同期 (INV9) を検査する。
//   - rules は claude 面のみを検査し、codex 面の追随はパリティテストに委ねる。
//     CONTRACT.md は claude/codex で正当に byte 差分を持つため、4系統すべてを個別に検査する。
//
// 判別オラクル (packet Validation 由来):
//   (a) ロールレンズ手順 (2.4) が存在し、designer-questions の値に関わらず発火する
//   (b) 在=本人 / 不在=代行 の出し分けと inferred 標識の規定がある (勝手代行の禁止形)
//   (c) 記録先は発行ディレクトリのみ・書き手は discover のみ・canonical へ書かない (INV60)
//   (d) 「少数に収めるために問いを削らない・回数を分ける」規定がある (INV61)
//   (e) 発行ディレクトリ不在 (legacy) はスキップし従来動作 (後方互換)
//   (f) 読み手 (CONTRACT / algo-qoc / first-packet) に lens 出し分けの参照がある
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

const dqJa = read(
  path.join(TEMPLATES, "ja", "claude", "skills", "intent-discover", "rules", "designer-questions.md"),
);
const dqEn = read(
  path.join(TEMPLATES, "en", "claude", "skills", "intent-discover", "rules", "designer-questions.md"),
);

test("designer-questions ja: ロールレンズ手順 2.4 が存在し値に関わらず発火する (a)", () => {
  assert.match(dqJa, /2\.4\. \*\*ロールレンズ/);
  assert.match(dqJa, /ロールレンズ（必要な観点の判定と問いの出し分け・designer-questions の値に関わらず発火/);
  // 3観点が列挙されている
  for (const kw of ["PdM", "PjM", "サービスデザイン"]) {
    assert.ok(dqJa.includes(kw), `観点 ${kw} が列挙されている`);
  }
});

test("designer-questions ja: 在=本人/不在=代行の出し分けと inferred 標識 (b)", () => {
  assert.match(dqJa, /\*\*在=本人\*\*／\*\*不在=代行\*\*/);
  assert.match(dqJa, /推測（inferred \/ Assumptions）標識付きで tree 更新案に置いて利用者は承認・修正だけする/);
});

test("designer-questions ja: 記録先は発行ディレクトリのみ・書き手一元・canonical 禁止 (c・INV60)", () => {
  assert.match(dqJa, /`lens:` 行/);
  assert.match(dqJa, /\*\*書き手は本スキルのみ\*\*/);
  assert.match(dqJa, /canonical へ書かない/);
  assert.match(dqJa, /git 非追跡の発行ディレクトリにのみ書き/);
});

test("designer-questions ja: 問いを削らない・回数を分ける (d・INV61) と後方互換 (e)", () => {
  assert.match(dqJa, /案件理解に必要な問いを削らない/);
  assert.match(dqJa, /回数を分けて全部聞く/);
  assert.match(dqJa, /発行ディレクトリが無い旧環境ではスキップし従来動作/);
  // 平易さ (A33) の焼き込み
  assert.match(dqJa, /未説明の専門用語を3つ以上連ねない/);
});

test("designer-questions ja: off でも 2.4 が発火する (a)", () => {
  assert.match(dqJa, /off のとき発火するのは、手順 1〜2 の要否確認と、手順 2\.4（ロールレンズ）/);
});

test("designer-questions en: role lens step 2.4 with the same discipline (a-e)", () => {
  assert.match(dqEn, /2\.4\. \*\*Role lens/);
  assert.match(dqEn, /fires regardless of the designer-questions value/);
  for (const kw of ["PdM", "PjM", "service design"]) {
    assert.ok(dqEn.includes(kw), `perspective ${kw} listed`);
  }
  assert.match(dqEn, /\*\*present = the person\*\* \/ \*\*absent = stand-in\*\*/);
  assert.match(dqEn, /inferred \(Assumptions\) markers/);
  assert.match(dqEn, /only this skill is the writer/);
  assert.match(dqEn, /never to canonical files/);
  assert.match(dqEn, /split them into more rounds and ask them all/);
  assert.match(dqEn, /skip and behave as before/);
  assert.match(dqEn, /step 2\.4 \(the role lens\)/);
});

// (f) 読み手の結線: CONTRACT (4系統・claude/codex は正当に別内容のため個別検査)
const CONTRACT_VARIANTS = [
  ["ja", "claude", /ロールレンズ（`lens:` 行）の読み取り契約/, /書き手は intent-discover のみ/, /canonical（intent-tree \/ compass \/ packets）へ転記しない/],
  ["ja", "codex", /ロールレンズ（`lens:` 行）の読み取り契約/, /書き手は intent-discover のみ/, /canonical（intent-tree \/ compass \/ packets）へ転記しない/],
  ["en", "claude", /The role-lens \(`lens:` line\) reading contract/, /Only intent-discover is the writer/, /never transcribed into canonical files/],
  ["en", "codex", /The role-lens \(`lens:` line\) reading contract/, /Only intent-discover is the writer/, /never transcribed into canonical files/],
];

for (const [lang, agent, ...patterns] of CONTRACT_VARIANTS) {
  test(`CONTRACT ${lang}/${agent}: lens 読み取り契約が存在する (f)`, () => {
    const body = read(path.join(TEMPLATES, lang, agent, "skills", "CONTRACT.md"));
    for (const p of patterns) assert.match(body, p);
  });
}

test("algo-qoc (compass) ja/en: 確認の宛先をロールレンズで出し分ける参照がある (f)", () => {
  const ja = read(path.join(TEMPLATES, "ja", "claude", "skills", "intent-compass", "rules", "algo-qoc.md"));
  const en = read(path.join(TEMPLATES, "en", "claude", "skills", "intent-compass", "rules", "algo-qoc.md"));
  assert.match(ja, /確認の宛先はロールレンズに従う/);
  assert.match(ja, /行が無ければ従来どおり（後方互換）/);
  assert.match(en, /Route the confirmations according to the role lens/);
  assert.match(en, /Without the line, behave as before \(backward compatible\)/);
});

test("first-packet (packets) ja/en: 確認の宛先をロールレンズで出し分ける参照がある (f)", () => {
  const ja = read(path.join(TEMPLATES, "ja", "claude", "skills", "intent-packets", "rules", "first-packet.md"));
  const en = read(path.join(TEMPLATES, "en", "claude", "skills", "intent-packets", "rules", "first-packet.md"));
  assert.match(ja, /確認の宛先はロールレンズに従う/);
  assert.match(en, /Route this confirmation according to the role lens/);
});

// dogfood 同期 (INV9): このテストが所有するロールレンズ専用ファイルは byte 等価。
// algo-qoc.md は別機能も共有するため、下の専用検査でロールレンズ契約だけを固定する。
const DOGFOOD_SYNC = [
  ["intent-discover/rules/designer-questions.md"],
  ["intent-packets/rules/first-packet.md"],
  ["CONTRACT.md"],
];

for (const [rel] of DOGFOOD_SYNC) {
  test(`dogfood 同期: .claude/skills/${rel} == templates/ja/claude/skills/${rel}`, () => {
    const dogfood = read(path.join(REPO_ROOT, ".claude", "skills", rel));
    const master = read(path.join(TEMPLATES, "ja", "claude", "skills", rel));
    assert.equal(dogfood, master, `${rel} が dogfood と templates で byte 等価`);
  });
}

test("dogfood QOC: ロールレンズが所有する読み取り契約はdogfoodとtemplateの両方にある", () => {
  const dogfood = read(path.join(REPO_ROOT, ".claude", "skills", "intent-compass/rules/algo-qoc.md"));
  const master = read(path.join(TEMPLATES, "ja", "claude", "skills", "intent-compass/rules/algo-qoc.md"));
  for (const body of [dogfood, master]) {
    assert.match(body, /確認の宛先はロールレンズに従う/);
    assert.match(body, /行が無ければ従来どおり（後方互換）/);
  }
});
