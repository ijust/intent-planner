// packet 書式の PdM 拡張 (pkt-20260705-packet-schema-pdm-fwvt, DR88/INV62/A48) の構造検証。
// node:test 標準・依存ゼロ (INV2)。
//
// 範囲分担: rules の claude/codex byte 等価は agent-rules-parity、SKILL 本文の lock は
// standard-invariance (SKILL_BODY_LOCKED・本 packet で4面とも正規更新済み) が担う。
// 本ファイルは packet-format.md (claude 面 ja/en) の「内容の存在」+ INV62 の判別 + dogfood 同期を検査する。
//
// 判別オラクル (packet Validation 由来):
//   (a) 見積もり節は3点セット (幅+算出根拠+実装主体) 必須・裸数値禁止が明文
//   (b) parked: 6値・export 候補外・依存 warn (止めない)・active/ 置き・復帰は人の宣言・終端でない
//   (c) 後方互換: 新5節不在=未記入・旧 packet 従来どおり、が読み取り契約に明文
//   (d) INV62: 日付コミット・ガント・ベロシティ・数値マトリクスを持ち込まない禁止文言が定義側に存在
//   (e) frontmatter 12キー固定は不変 (キー列挙が変わっていない)
//   (f) SKILL の切る基準は質的のまま (数合わせしない文言が残り、旧文言の単純削除でない)
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

const fmtJa = read(path.join(TEMPLATES, "ja", "claude", "skills", "intent-packets", "rules", "packet-format.md"));
const fmtEn = read(path.join(TEMPLATES, "en", "claude", "skills", "intent-packets", "rules", "packet-format.md"));

test("packet-format ja: 見積もり節=3点セット必須・裸数値禁止 (a)", () => {
  assert.match(fmtJa, /## 見積もり` — \*\*任意\*\*。書くときは\*\*3点セット必須\*\*/);
  for (const kw of ["幅", "算出根拠", "実装主体", "human | AI | mixed"]) {
    assert.ok(fmtJa.includes(kw), `見積もり定義に ${kw} がある`);
  }
  assert.match(fmtJa, /裸の数値は書かない/);
  assert.match(fmtJa, /人が拘束される時間/);
});

test("packet-format ja: parked の意味論 (b)", () => {
  assert.match(fmtJa, /`draft \| ready \| implementing \| verifying \| done \| parked` の6値/);
  assert.match(fmtJa, /\*\*export の候補に出さない\*\*/);
  assert.match(fmtJa, /「依存先が保留中」を warn する（止めない/);
  assert.match(fmtJa, /`draft \| ready \| implementing \| verifying \| parked` → `active\/`/);
  assert.match(fmtJa, /復帰は人が `state` を戻す宣言のみ/);
  assert.match(fmtJa, /`parked` は終端でない/);
  assert.match(fmtJa, /「ずっとやらない」は compass の Anti-direction が担い/);
});

test("packet-format ja: 後方互換の読み取り契約 (c)", () => {
  assert.match(fmtJa, /任意節（価値\/見積もり\/リスク\/体験段階\/保留の理由と再検討の目安\/想定規模）の不在\*\* → 「未記入」として読む/);
  assert.match(fmtJa, /\*\*`state: parked`\*\* → 「保留中（進行しない）」として読む/);
});

test("packet-format ja: INV62 の禁止文言と定性リスク (d)", () => {
  assert.match(fmtJa, /日付コミット・ガント・ベロシティ・優先度スコアは持ち込まない/);
  assert.match(fmtJa, /確率×影響の数値マトリクスは持ち込まない/);
  // 体験段階は自由記述（語彙固定しない）
  assert.match(fmtJa, /語彙は固定しない＝自由記述/);
});

test("packet-format ja/en: frontmatter 12キー固定は不変 (e)", () => {
  for (const body of [fmtJa, fmtEn]) {
    assert.match(body, /packet_id` \/ `name` \/ `state` \/ `created_at` \/ `updated_at` \/ `closed_at` \/ `parent_intents` \/ `spec_refs` \/ `superseded_by` \/ `summary` \/ `depends_on` \/ `mode`/);
  }
  assert.match(fmtJa, /12キー固定/);
  assert.match(fmtEn, /fixed to these 12/);
});

test("packet-format en: the same schema definitions exist (a-d)", () => {
  assert.match(fmtEn, /## Estimate` — \*\*Optional\*\*\. When written, a \*\*3-part set is mandatory\*\*/);
  assert.match(fmtEn, /Never write a bare number/);
  assert.match(fmtEn, /the time a human is tied up/);
  assert.match(fmtEn, /`draft \| ready \| implementing \| verifying \| done \| parked` \(see "State value domain"\)/);
  assert.match(fmtEn, /\*\*Never offered as an export candidate\.\*\*/);
  assert.match(fmtEn, /a dependency is parked/);
  assert.match(fmtEn, /`parked` is not terminal/);
  assert.match(fmtEn, /no probability×impact numeric matrix/i);
  assert.match(fmtEn, /read as "unfilled" \(do not fill in by guessing; every old packet behaves as before\)/);
});

test("packets SKILL 4面: 切る基準は質的のまま・見積もりは書式正本参照へ (f)", () => {
  const targets = [
    ["ja", "claude"], ["ja", "codex"], ["en", "claude"], ["en", "codex"],
  ];
  for (const [lang, agent] of targets) {
    const skill = read(path.join(TEMPLATES, lang, agent, "skills", "intent-packets", "SKILL.md"));
    if (lang === "ja") {
      assert.match(skill, /\*\*切る基準\*\*に工数見積もり等の数値を持ち込まない/, `${lang}/${agent}`);
      assert.match(skill, /「見積もり」節の規律＝幅\+算出根拠\+実装主体のセットに従う/, `${lang}/${agent}`);
      assert.match(skill, /数を目標に数合わせをしない/, `${lang}/${agent}`);
    } else {
      assert.match(skill, /into the \*\*slicing criteria\*\*/, `${lang}/${agent}`);
      assert.match(skill, /the set of range \+ grounds \+ implementer/, `${lang}/${agent}`);
      assert.match(skill, /do not target a count or pad it/, `${lang}/${agent}`);
    }
  }
});

// dogfood 同期 (INV9)
for (const rel of ["intent-packets/rules/packet-format.md", "intent-packets/SKILL.md"]) {
  test(`dogfood 同期: .claude/skills/${rel} == templates/ja/claude/skills/${rel}`, () => {
    const dogfood = read(path.join(REPO_ROOT, ".claude", "skills", rel));
    const master = read(path.join(TEMPLATES, "ja", "claude", "skills", rel));
    assert.equal(dogfood, master, `${rel} が dogfood と templates で byte 等価`);
  });
}
