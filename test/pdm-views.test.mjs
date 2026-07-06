// pkt-20260705-pdm-views-xosx（判断待ちインボックス + ロードマップ射影・overview の2面）の
//   不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: 散在する Open Questions・承認待ち delta・警告を横断集約した「判断待ちインボックス」と、
//   packets の状態・依存・parked から前向きの順序を出す「ロードマップ射影」を、overview 系譜の
//   derived として足す（C34・DR92・INV62）。両ビューは自然言語トリガ時だけ生成し、既定の俯瞰
//   ビューには自動同梱しない（behavior-preserving）。持ってはいけない形＝PM ツール化（日付・
//   ガント・ベロシティ・進捗％）は INV62 で床にする。
//   overview は SKILL 本文を hash lock しない（非 SKILL_BODY_LOCKED）ので本文を正当に編集できる。
//
// ここでは packet の Validation 判別オラクル (a)〜(f) をアンカーで discriminative に守る:
//   (a) 未回答 OQ・未昇格 delta を出所リンク付きで載せる規約（取りこぼしの違反検知）
//   (b) 回答済み OQ・昇格済み delta は載せない規約（過剰列挙の違反検知）
//   (c) ロードマップに depends_on のブロッカー連鎖・parked 区分がある規約
//   (d) ロードマップ出力に日付・進捗％・ベロシティが現れない規約（INV62 の判別オラクル）
//   (e) canonical 不変（書込は .intent/overview/ 配下限定）
//   (f) 旧 packet（depends_on なし・新欄なし）でも「未記入」明示のまま成立（後方互換）
//   + 既定実行では生成しない（behavior-preserving）・4系統パリティ・dogfood 同期
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];

function inboxPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-overview", "rules", "decision-inbox.md");
}
function roadmapPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-overview", "rules", "roadmap-projection.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-overview", "SKILL.md");
}

// ---- 1(a)(b). 判断待ちインボックス rule が4系統に存在し、3源集約と過剰列挙抑止を定義する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1(a)(b): ${lang}/${agent} の decision-inbox rule が存在し3源集約+過剰列挙抑止を定義する`, () => {
      const p = inboxPath(lang, agent);
      assert.ok(fs.existsSync(p), `${lang}/${agent}: rules/decision-inbox.md が存在する`);
      const c = fs.readFileSync(p, "utf8");
      // (a) 3源（Open Questions / 承認待ち delta / 警告）の集約。
      assert.ok(/Open Questions/.test(c), `${lang}/${agent}: (a) 未回答 Open Questions 源がある`);
      const deltaSrc = lang === "ja" ? /承認待ち|未昇格/ : /awaiting approval|unpromoted/i;
      assert.ok(deltaSrc.test(c), `${lang}/${agent}: (a) 承認待ち delta 源がある`);
      const warnSrc = lang === "ja" ? /警告|warn/i : /warn/i;
      assert.ok(warnSrc.test(c), `${lang}/${agent}: (a) 警告源がある`);
      // (a) 出所リンク（答える場所へ辿れる）。
      const srcLink = lang === "ja" ? /出所リンク/ : /source link/i;
      assert.ok(srcLink.test(c), `${lang}/${agent}: 各項目に出所リンクを付ける規約`);
      // (b) 回答済み・昇格済みは載せない（過剰列挙の抑止）。
      const overSuppress = lang === "ja" ? /過剰列挙/ : /over-list/i;
      assert.ok(overSuppress.test(c), `${lang}/${agent}: 回答済み/昇格済みを載せない（過剰列挙の抑止）`);
    });
  }
}

// ---- 2. インボックスは read-only（回答 UI を持たない）・機微を転記しない（INV60/INV62） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の decision-inbox が read-only で機微/PM 化を禁じる`, () => {
      const c = fs.readFileSync(inboxPath(lang, agent), "utf8");
      assert.ok(/INV62/.test(c), `${lang}/${agent}: INV62 に触れる（PM ツール化しない）`);
      assert.ok(/INV60/.test(c), `${lang}/${agent}: INV60 に触れる（機微を転記しない）`);
      const noAnswerUi = lang === "ja" ? /回答 UI/ : /answer UI/i;
      assert.ok(noAnswerUi.test(c), `${lang}/${agent}: 回答 UI を持たない（read-only）明記`);
    });
  }
}

// ---- 3(c). ロードマップ rule が4系統に存在し、ブロッカー連鎖と parked 区分を定義する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3(c): ${lang}/${agent} の roadmap-projection rule が存在しブロッカー連鎖+parked を定義する`, () => {
      const p = roadmapPath(lang, agent);
      assert.ok(fs.existsSync(p), `${lang}/${agent}: rules/roadmap-projection.md が存在する`);
      const c = fs.readFileSync(p, "utf8");
      assert.ok(/depends_on/.test(c), `${lang}/${agent}: depends_on から順序を組む`);
      const blocker = lang === "ja" ? /ブロッカー連鎖/ : /blocker chain/i;
      assert.ok(blocker.test(c), `${lang}/${agent}: (c) ブロッカー連鎖の明記`);
      const parked = lang === "ja" ? /保留.*区分|parked/i : /parked/i;
      assert.ok(parked.test(c), `${lang}/${agent}: (c) parked（保留）区分の明記`);
    });
  }
}

// ---- 4(d). INV62 の判別オラクル: ロードマップ出力に日付・進捗％・ベロシティを出さない ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4(d): ${lang}/${agent} の roadmap-projection が日付・進捗％・ベロシティを禁じる（INV62）`, () => {
      const c = fs.readFileSync(roadmapPath(lang, agent), "utf8");
      assert.ok(/INV62/.test(c), `${lang}/${agent}: INV62 に触れる`);
      const noDate = lang === "ja" ? /日付.*持たない|日付.*出さない/ : /no dates|Carry no dates/i;
      assert.ok(noDate.test(c), `${lang}/${agent}: 日付を持たない明記`);
      const noVelocity = lang === "ja" ? /ベロシティ/ : /velocity/i;
      assert.ok(noVelocity.test(c), `${lang}/${agent}: ベロシティを出さない明記`);
      const noPct = lang === "ja" ? /進捗％|進捗%/ : /progress %/i;
      assert.ok(noPct.test(c), `${lang}/${agent}: 進捗％を出さない明記`);
    });
  }
}

// ---- 5(f). 後方互換: 旧 packet（depends_on なし・新欄なし）でも「未記入」明示で成立 ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5(f): ${lang}/${agent} の roadmap-projection が旧 packet に後方互換（未記入明示）`, () => {
      const c = fs.readFileSync(roadmapPath(lang, agent), "utf8");
      const compat = lang === "ja" ? /後方互換/ : /backward.?compatib/i;
      assert.ok(compat.test(c), `${lang}/${agent}: 後方互換の読み取り契約`);
      const notFilled = lang === "ja" ? /未記入/ : /not filled in/i;
      assert.ok(notFilled.test(c), `${lang}/${agent}: 依存なし/リスク欄なしは「未記入」明示`);
    });
  }
}

// ---- 6(e). 書込境界: 両ビューとも .intent/overview/ 配下限定・canonical を書き換えない ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6(e): ${lang}/${agent} の両ビューの書込が .intent/overview/ 配下限定`, () => {
      const inbox = fs.readFileSync(inboxPath(lang, agent), "utf8");
      const roadmap = fs.readFileSync(roadmapPath(lang, agent), "utf8");
      assert.ok(inbox.includes(".intent/overview/decision-inbox.md"), `${lang}/${agent}: インボックスの出力先が overview 配下`);
      assert.ok(roadmap.includes(".intent/overview/roadmap-projection.md"), `${lang}/${agent}: ロードマップの出力先が overview 配下`);
      const boundary = lang === "ja" ? /canonical へ書かない|canonical を書き換えない/ : /never (write to|rewrite) the canonical/i;
      assert.ok(boundary.test(inbox), `${lang}/${agent}: インボックスが canonical へ書かない明記`);
      assert.ok(boundary.test(roadmap), `${lang}/${agent}: ロードマップが canonical へ書かない明記`);
    });
  }
}

// ---- 7. 既定実行では生成しない（behavior-preserving）・両ビューとも自然言語トリガ ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`7: ${lang}/${agent} の両ビューが既定実行で走らない（behavior-preserving）`, () => {
      const inbox = fs.readFileSync(inboxPath(lang, agent), "utf8");
      const roadmap = fs.readFileSync(roadmapPath(lang, agent), "utf8");
      const bp = /behavior-preserving/i;
      assert.ok(bp.test(inbox), `${lang}/${agent}: インボックスが behavior-preserving`);
      assert.ok(bp.test(roadmap), `${lang}/${agent}: ロードマップが behavior-preserving`);
      const optIn = lang === "ja" ? /求めたときだけ|要求した.*ときだけ/ : /only when the user (asks|requests|specif)/i;
      assert.ok(optIn.test(inbox), `${lang}/${agent}: インボックスは求めたときだけ生成`);
      assert.ok(optIn.test(roadmap), `${lang}/${agent}: ロードマップは求めたときだけ生成`);
    });
  }
}

// ---- 8. SKILL が両ビューへの委譲と誘導を持つ ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`8: ${lang}/${agent} の overview SKILL が両ビューへの委譲と誘導を持つ`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(c.includes("rules/decision-inbox.md"), `${lang}/${agent}: Step 2 に decision-inbox への委譲`);
      assert.ok(c.includes("rules/roadmap-projection.md"), `${lang}/${agent}: Step 2 に roadmap-projection への委譲`);
      assert.ok(c.includes(".intent/overview/decision-inbox.md"), `${lang}/${agent}: インボックス出力先の明記`);
      assert.ok(c.includes(".intent/overview/roadmap-projection.md"), `${lang}/${agent}: ロードマップ出力先の明記`);
    });
  }
}

// ---- 9. rule が claude⇔codex で byte 等価（パリティ） ----
for (const lang of LANGS) {
  test(`9: ${lang} の decision-inbox / roadmap-projection が claude⇔codex で byte 等価`, () => {
    assert.equal(
      fs.readFileSync(inboxPath(lang, "claude"), "utf8"),
      fs.readFileSync(inboxPath(lang, "codex"), "utf8"),
      `${lang}: decision-inbox が claude⇔codex で byte 等価`,
    );
    assert.equal(
      fs.readFileSync(roadmapPath(lang, "claude"), "utf8"),
      fs.readFileSync(roadmapPath(lang, "codex"), "utf8"),
      `${lang}: roadmap-projection が claude⇔codex で byte 等価`,
    );
  });
}

// ---- 10. dogfood（.claude）が parent（ja/claude）と同期している ----
test("10: dogfood .claude に両ビューが同期されている（存在すれば検査）", () => {
  const dogfoodInbox = path.join(REPO_ROOT, ".claude", "skills", "intent-overview", "rules", "decision-inbox.md");
  const dogfoodRoadmap = path.join(REPO_ROOT, ".claude", "skills", "intent-overview", "rules", "roadmap-projection.md");
  const dogfoodSkill = path.join(REPO_ROOT, ".claude", "skills", "intent-overview", "SKILL.md");
  if (fs.existsSync(dogfoodInbox)) {
    assert.equal(
      fs.readFileSync(dogfoodInbox, "utf8"),
      fs.readFileSync(inboxPath("ja", "claude"), "utf8"),
      "dogfood decision-inbox は ja/claude と byte 同一",
    );
  }
  if (fs.existsSync(dogfoodRoadmap)) {
    assert.equal(
      fs.readFileSync(dogfoodRoadmap, "utf8"),
      fs.readFileSync(roadmapPath("ja", "claude"), "utf8"),
      "dogfood roadmap-projection は ja/claude と byte 同一",
    );
  }
  if (fs.existsSync(dogfoodSkill)) {
    const c = fs.readFileSync(dogfoodSkill, "utf8");
    assert.ok(c.includes("rules/decision-inbox.md"), "dogfood SKILL が decision-inbox 委譲を含む");
    assert.ok(c.includes("rules/roadmap-projection.md"), "dogfood SKILL が roadmap-projection 委譲を含む");
  }
});
