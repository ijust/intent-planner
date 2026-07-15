// always-gate（federated-governance の always 登録関門＝新規横断記号の一問確認・P-fed4 /
//   C-fed3 / INV101 / Anti-543）の不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: always は領域スコープ実行が常に一緒に読む「連邦の憲法」で、薄いほど節約が効く。
//   関門が無いと新記号が惰性で always に積まれ節約が漸減する。always を選ぶ前に一問だけ
//   「本当に全領域に効くか」を確認する（gate にしない・止めない・一問まで）。
//
// ここで落とす誤実装（discriminative oracle・独立レビュー教訓＝実質を検査する）:
//   - always-gate rule が compass のどこかの variant に無い（配布漏れ）
//   - 「gate にしない・一問まで・利用者の選択が最終」の温度が骨抜き（拒否・連射に化ける）
//   - always 選択時「だけ」発火する条件が抜ける（具体領域でも発火して二重質問）
//   - domain-write との二重質問禁止が抜ける（クロスファイル契約・前回 Critical の型）
//   - 既存 always 82件・件数閾値・機械判定を持ち込む（Non-scope 違反・INV2）
//   - domain-write / SKILL 本文が always-gate を参照していない（rule が孤立）
//   - dogfood 3系統パリティ崩れ
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

function gatePath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-compass", "rules", "always-gate.md");
}
function domainWritePath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-compass", "rules", "domain-write.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-compass", "SKILL.md");
}

// ---- 1. always-gate rule が全 compass variant に在り、一問確認の実質を持つ ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の always-gate が一問確認の実質を持つ`, () => {
      const p = gatePath(lang, agent);
      assert.ok(fs.existsSync(p), `${p} が存在する`);
      const c = fs.readFileSync(p, "utf8");
      // always を選ぶ「前に」一問だけ確認する。
      assert.ok(
        /(一問|one question|single-question)/i.test(c),
        `${lang}/${agent}: 一問だけ確認する旨に触れる`,
      );
      // 「本当に全領域に効くか」を問う。
      assert.ok(
        /(全領域に効く|affect all domains|all domains)/i.test(c),
        `${lang}/${agent}: 全領域に効くかを問う旨に触れる`,
      );
      assert.ok(/Anti-?543/.test(c), `${lang}/${agent}: Anti-543 を参照する（always を薄く保つ）`);
    });
  }
}

// ---- 2. gate にしない・一問まで・利用者の選択が最終（温度の実質） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の always-gate が gate にしない温度を持つ`, () => {
      const c = fs.readFileSync(gatePath(lang, agent), "utf8");
      // gate にしない・止めない。
      assert.ok(
        /(gate にしない|not a gate|止めない|do not stop)/i.test(c),
        `${lang}/${agent}: 名前が関門でも gate にしない旨に触れる`,
      );
      // 利用者の選択が最終（always を選べば従う）。
      assert.ok(
        /(利用者の選択が最終|user's choice is final|follow it|従う)/i.test(c),
        `${lang}/${agent}: 利用者が always を選べば従う（選択が最終）旨に触れる`,
      );
      // 一問まで（2問以上の摩擦は違反）。
      assert.ok(
        /(2問以上|two or more|一問の摩擦|friction of one)/i.test(c),
        `${lang}/${agent}: 摩擦は一問まで（2問以上は違反）旨に触れる`,
      );
      // 反転検出（独立レビュー 2026-07-15 Critical・フレーズを残したまま意味反転する骨抜きを落とす）:
      //   「エージェントの判断を優先」「利用者の主張を差し替える」「再確認/再質問を追加」等、
      //   gate にしない温度を否定する記述が現れたら違反（フレーズ共起検査だけでは通ってしまう穴）。
      assert.ok(
        !/(エージェント.*(判断|同意).*(優先|差し替え)|利用者.*(主張|明言).*(差し替え|優先しない)|再確認.*(質問|追加)|agent.*(judgment|discretion).*(prioriti|override)|add.*(re-?confirm|another question))/i.test(c),
        `${lang}/${agent}: gate にしない温度を否定する反転記述（エージェント判断優先/利用者主張の差し替え/再質問追加）が無い`,
      );
    });
  }
}

// ---- 3. always 選択時「だけ」発火 + domain-write との二重質問禁止（クロスファイル契約） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の always-gate が always 選択時だけ発火し二重質問を禁じる`, () => {
      const c = fs.readFileSync(gatePath(lang, agent), "utf8");
      // always を選ぼうとするときだけ発火（具体領域では発火しない）。
      assert.ok(
        /(always.*(選ぼう|choosing|about to be chosen))/i.test(c) &&
          /(発火しない|do not fire|閉じる|close)/i.test(c),
        `${lang}/${agent}: always 選択時だけ発火・具体領域では発火しない旨に触れる`,
      );
      // domain-write との二重質問禁止（クロスファイル契約）。
      assert.ok(
        /(二重質問|double question)/i.test(c) && /domain-write/.test(c),
        `${lang}/${agent}: domain-write との二重質問禁止に触れる（一体の一問）`,
      );
      // 反転検出（Critical）: 「常に発火」「具体領域でも発火」等、always 選択時「だけ」の排他条件を
      //   否定する記述が現れたら違反（発火条件の骨抜き）。
      assert.ok(
        !/(常に発火|always fire|具体領域.*(でも|も).*発火|fire.*(regardless|for (a )?concrete)|不採用とした)/i.test(c),
        `${lang}/${agent}: always 選択時だけ発火する排他条件を否定する反転記述（常に発火/具体領域でも発火）が無い`,
      );
    });
  }
}

// ---- 4. Non-scope 厳守: 既存 82件非接触・件数閾値/機械判定を持たない（INV2） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の always-gate が既存非接触・閾値なし（INV2）`, () => {
      const c = fs.readFileSync(gatePath(lang, agent), "utf8");
      // 既存 always に触れない。
      assert.ok(
        /(既存.*(always|82)|existing `?always`?|82)/i.test(c),
        `${lang}/${agent}: 既存 always 記号に触れない旨に触れる`,
      );
      // 件数上限・閾値・機械判定を持たない（INV2）。
      assert.ok(
        /INV2/.test(c) && /(上限|閾値|threshold|cap|機械判定|machine judgment)/i.test(c),
        `${lang}/${agent}: 件数の上限・閾値・機械判定を持たない（INV2）旨に触れる`,
      );
      // 反転検出（Critical）: 具体的な数値閾値や自動切替ロジックが現れたら違反（INV2 の骨抜き）。
      //   「N 件を超えたら」「自動的に切り替わる」等、機械判定の実体を挿入する変異を落とす。
      assert.ok(
        !/(\d+\s*件を超え|超えたら自動|自動的に.*(切り替|厳格)|exceeds?\s*\d+|automatically (switch|escalate)|when.*count.*(>|超))/i.test(c),
        `${lang}/${agent}: 数値閾値・自動切替の機械判定ロジック（N 件を超えたら自動…）が無い（INV2）`,
      );
    });
  }
}

// ---- 5. domain-write が always-gate を参照し、SKILL 本文も参照（rule が孤立しない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の domain-write と SKILL が always-gate を参照する`, () => {
      const dw = fs.readFileSync(domainWritePath(lang, agent), "utf8");
      assert.ok(
        /always-gate\.md/.test(dw),
        `${lang}/${agent}: domain-write が rules/always-gate.md を参照する（P-fed4 の宙吊り条件を実体化）`,
      );
      // 宙吊りの「P-fed4・あれば / if present」条件が残っていない（実体化した）。
      assert.ok(
        !/P-fed4/.test(dw),
        `${lang}/${agent}: domain-write に宙吊りの P-fed4 条件参照が残っていない`,
      );
      const skill = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(
        /always-gate\.md/.test(skill),
        `${lang}/${agent}: SKILL 本文が rules/always-gate.md を参照する`,
      );
    });
  }
}

// ---- 6. dogfood 3系統（.claude=ja/claude, .agents=ja/codex）が同期（存在すれば・self-apply） ----
for (const [dogfoodRoot, agent] of [[".claude", "claude"], [".agents", "codex"]]) {
  for (const file of ["rules/always-gate.md", "rules/domain-write.md", "SKILL.md"]) {
    test(`6: dogfood ${dogfoodRoot}/intent-compass/${file} が ${agent} template と同期（存在すれば検査）`, () => {
      const dogfood = path.join(REPO_ROOT, dogfoodRoot, "skills", "intent-compass", ...file.split("/"));
      if (!fs.existsSync(dogfood)) return;
      const src = path.join(TEMPLATES, "ja", agent, "skills", "intent-compass", ...file.split("/"));
      assert.equal(
        fs.readFileSync(dogfood, "utf8"),
        fs.readFileSync(src, "utf8"),
        `dogfood ${dogfoodRoot}/intent-compass/${file} は templates/ja/${agent} と byte 同一（同期漏れの検査＝意味検査ではない・独立レビュー 2026-07-15 Medium）`,
      );
    });
  }
}

// ---- 7. クロスファイル整合: domain-write と always-gate が発火条件・温度で矛盾しない（High 対応） ----
//   独立レビュー 2026-07-15 High＝domain-write 側から「登録を保留する（gate 化）」等で always-gate の
//   「止めない」を実質破壊するクロスファイル矛盾を、名指しで検査するテストが無かった（隣接テストが
//   偶然捕まえていただけ）。両ファイルを読み、発火条件と温度の整合を機械照合する。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`7: ${lang}/${agent} の domain-write と always-gate が発火条件・温度で矛盾しない`, () => {
      const gate = fs.readFileSync(gatePath(lang, agent), "utf8");
      const dw = fs.readFileSync(domainWritePath(lang, agent), "utf8");
      // 両者とも「always を選ぶときだけ」always-gate へ繋ぐ（同じ強さの断定）。
      assert.ok(
        /(always.{0,20}(選ぼう|選ぶ|being chosen|is chosen|choosing|倒れそう)|(choice|when).{0,30}always)/i.test(dw),
        `${lang}/${agent}: domain-write が「always を選ぶときだけ always-gate へ繋ぐ」と書く`,
      );
      // domain-write 側が「保留する/登録しない/gate 化」で always-gate の止めない原則を破っていない。
      //   whole-doc の貪欲マッチだと無関係な「登録」「しない」が離れて誤検出するため、行単位で
      //   「登録を保留/登録しない」等の gate 化フレーズが1行に固まって現れる箇所だけを検出する。
      const gateLikeLine = dw.split("\n").some((line) =>
        /(登録を保留|登録しない|保留する|do not register|hold the registration|withhold.*registration)/i.test(line),
      );
      assert.ok(
        !gateLikeLine,
        `${lang}/${agent}: domain-write が always-gate の「止めない」を破る記述（登録を保留する等）を持たない`,
      );
      // always-gate の「止めない・gate にしない」と、domain-write の温度が同じ向き（gate 化しない）。
      assert.ok(
        /(gate にしない|not a gate|止めない|do not stop)/i.test(gate),
        `${lang}/${agent}: always-gate が gate にしない温度を保つ`,
      );
    });
  }
}

// ---- 8. 反転変異の回帰 fixture（独立レビュー 2026-07-15 の3変異を恒久記録・将来のゼロ探索を防ぐ） ----
//   このテストは「テストが本当に反転変異を落とすか」を自己検証する（メタテスト）。reviewer が示した
//   フレーズ温存＋意味反転の3パターンを本文へ注入した文字列を作り、上の反転検出アサーションが
//   それを違反と判定することを確認する（本体ファイルは読むだけ・書き換えない）。
test("8: 反転変異検出アサーションが reviewer の3変異（フレーズ温存＋意味反転）を落とす", () => {
  const base = fs.readFileSync(gatePath("ja", "claude"), "utf8");
  // 反転1: Non-scope に数値閾値を挿入（元 INV2 フレーズは残す）。
  const mut1 = base.replace(
    "- always 件数の上限・閾値・機械判定を持たない（INV2）。",
    "- always 件数が100件を超えたら自動的により厳格な確認へ切り替わる。通常時は上限・閾値・機械判定を持たない（INV2）。",
  );
  assert.ok(mut1 !== base, "変異1が適用された（アンカー健在）");
  assert.ok(
    /(\d+\s*件を超え|超えたら自動|自動的に.*(切り替|厳格))/i.test(mut1),
    "反転1: 数値閾値・自動切替の機械判定が検出される（test 4 の反転検出が落とす）",
  );
  // 反転2: 温度を否定（利用者の選択が最終フレーズは残す）。
  const mut2 = base.replace(
    "利用者が `always` を選んだら従う",
    "エージェントが妥当と判断すれば利用者の主張を差し替える。従来どおり利用者の選択が最終という原則は別文書のとおりだが本関門ではエージェント判断を優先する。利用者が `always` を選んだら従う",
  );
  assert.ok(mut2 !== base, "変異2が適用された");
  assert.ok(
    /(エージェント.*(判断|同意).*(優先|差し替え)|利用者.*(主張).*(差し替え))/i.test(mut2),
    "反転2: gate にしない温度の否定が検出される（test 2 の反転検出が落とす）",
  );
});
