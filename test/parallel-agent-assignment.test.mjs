// parallel-agent-assignment（並行実装の割当宣言の見える化・C40/A52）の seam スライスの不変条件テスト
//   （node:test 標準・依存ゼロ）。
//
// 背景: packet は並行の作業単位として設計済みだが、「どの packet を誰が実装中か」の割当宣言が無く、
//   二重着手（複数セッションが同一 packet を同時に触る）も空き packet の放置も観測できなかった。
//   本 seam packet（pkt-20260704-parallel-agent-assignment-elcc）は割当宣言の置き場を
//   `.intent/assignments/<packet_id>-<session-rand>.md`（1宣言=1ファイル・git 非追跡・自然キー分割）で
//   確立する。並行書き込みが構造的に衝突しないのは自然キー分割のみ（DR98）— 単一集約ファイルは append
//   衝突（A19 の再来）、packet 本文節は同一 packet への二重宣言が同一ファイルの同時編集になる自己矛盾。
//
// ここでは seam の置き場が satisfy すべき設計不変条件を名指しで検査し、削除・ドリフトを回帰として落とす
//   （discriminative oracle）: ①scaffold README が 4系統（ja/en templates）+ dogfood にあり自然キー分割の
//   置き場・命名・スキーマを明文化する ②README が「1宣言=1ファイル・git 非追跡・agent 非依存・read-only
//   導出・warn-only・機械閾値なし」の床を明示する ③CONTRACT の読み手契約が 4系統 + dogfood にある
//   ④install の GITIGNORE_PATTERNS が assignments/* を非追跡化し README を再包含する ⑤packet frontmatter
//   12キー固定が壊れていない（別レイヤ・DR99）。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"]; // CONTRACT は agent 別。intent/ scaffold は lang 別（agent 不問）。

function assignmentsReadmePath(lang) {
  return path.join(TEMPLATES, lang, "intent", "assignments", "README.md");
}
function contractPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "CONTRACT.md");
}
function statusSkillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-status", "SKILL.md");
}

// ---- 1. 割当宣言の scaffold README が ja/en templates にあり自然キー分割の置き場を明文化する ----
for (const lang of LANGS) {
  test(`1: ${lang} の intent/assignments/README.md が存在し置き場・命名・スキーマを明文化する`, () => {
    const p = assignmentsReadmePath(lang);
    assert.ok(fs.existsSync(p), `${lang}: assignments/README.md が存在する`);
    const c = fs.readFileSync(p, "utf8");
    // 置き場と命名規約（<packet_id>-<session-rand>.md）。
    assert.ok(
      /<packet_id>-<session-rand>\.md/.test(c),
      `${lang}: 宣言ファイルの命名規約 <packet_id>-<session-rand>.md を明記する`,
    );
    // 最小スキーマ（packet_id / declared_at / session）。
    assert.ok(/packet_id/.test(c), `${lang}: スキーマに packet_id を含む`);
    assert.ok(/declared_at/.test(c), `${lang}: スキーマに declared_at を含む`);
    assert.ok(/session/.test(c), `${lang}: スキーマに session を含む`);
  });
}

// ---- 2. README が seam の床（INV66/DR98/DR99）を明示する ----
for (const lang of LANGS) {
  test(`2: ${lang} の assignments/README が INV66 の床（1宣言=1ファイル・非追跡・agent 非依存・warn-only・機械閾値なし）を明示する`, () => {
    const c = fs.readFileSync(assignmentsReadmePath(lang), "utf8");
    // 1宣言=1ファイル（自然キー分割・DR98）。
    assert.ok(
      /1宣言\s*=\s*1ファイル|1 claim\s*=\s*1 file/i.test(c),
      `${lang}: 1宣言=1ファイル（自然キー分割）を明示する`,
    );
    // git 非追跡。
    assert.ok(/git 非追跡|git-untracked/i.test(c), `${lang}: git 非追跡を明示する`);
    // agent 非依存（agent 名/プロセス ID/環境変数から導出しない）。
    assert.ok(
      /agent 名・プロセス ID・環境変数から導出しません|not derived from an agent name/i.test(c),
      `${lang}: <session-rand> を agent 固有ハンドルから導出しない旨を明示する`,
    );
    // warn-only（停止・拒否しない）。
    assert.ok(
      /停止・拒否しません|never stops or refuses/i.test(c),
      `${lang}: 二重宣言は warn のみで停止・拒否しない旨を明示する`,
    );
    // 放置宣言は機械閾値で判定しない。
    assert.ok(
      /機械閾値で自動判定・自動解放しません|no machine threshold on elapsed days/i.test(c),
      `${lang}: 放置宣言を経過日数の機械閾値で自動判定・自動解放しない旨を明示する`,
    );
    // packet state と別レイヤ（frontmatter を書き換えない・DR99）。
    assert.ok(
      /別のレイヤ|別レイヤ|separate layer/i.test(c),
      `${lang}: 割当宣言が packet state と別レイヤである旨を明示する`,
    );
  });
}

// ---- 3. dogfood（.intent/assignments/README.md）が ja/claude template と byte 同一で同期している ----
test("3: dogfood .intent/assignments/README.md が ja template と byte 同一で同期されている", () => {
  const dogfood = path.join(REPO_ROOT, ".intent", "assignments", "README.md");
  if (fs.existsSync(dogfood)) {
    assert.equal(
      fs.readFileSync(dogfood, "utf8"),
      fs.readFileSync(assignmentsReadmePath("ja"), "utf8"),
      "dogfood assignments/README.md は ja template と byte 同一",
    );
  }
});

// ---- 4. CONTRACT の読み手契約が 4系統 + dogfood にあり read-only/warn-only/別レイヤを明示する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の CONTRACT が割当宣言の読み手契約を持つ`, () => {
      const c = fs.readFileSync(contractPath(lang, agent), "utf8");
      // .intent/assignments/*.md を対象にした読み手契約。
      assert.ok(
        /\.intent\/assignments\/\*\.md|\.intent\/assignments\//.test(c),
        `${lang}/${agent}: .intent/assignments/ の読み手契約に触れる`,
      );
      // 二重宣言 = 同一 packet_id が2つ以上。
      assert.ok(
        /同一 `?packet_id`? を持つ宣言ファイルが\s*\*?\*?2つ以上|two or more.*claim files carry the same/i.test(c),
        `${lang}/${agent}: 二重宣言＝同一 packet_id が2つ以上の判定に触れる`,
      );
      // 書き手は着手セッション自身。
      assert.ok(
        /書き手は実装に着手するセッション自身|writer is the session that starts implementation/i.test(c),
        `${lang}/${agent}: 書き手が着手セッション自身である旨に触れる`,
      );
    });
  }
}

// ---- 5. dogfood CONTRACT が ja/claude と byte 同一（共有 CONTRACT） ----
test("5: dogfood .claude/skills/CONTRACT.md が ja/claude と byte 同一で同期されている", () => {
  const dogfood = path.join(REPO_ROOT, ".claude", "skills", "CONTRACT.md");
  if (fs.existsSync(dogfood)) {
    assert.equal(
      fs.readFileSync(dogfood, "utf8"),
      fs.readFileSync(contractPath("ja", "claude"), "utf8"),
      "dogfood CONTRACT は ja/claude と byte 同一",
    );
  }
});

// ---- 6. install が assignments/* を非追跡化し README を再包含する（GITIGNORE_PATTERNS の正本） ----
test("6: install.mjs の GITIGNORE_PATTERNS が assignments/* を非追跡化し README を再包含する", async () => {
  const install = fs.readFileSync(path.join(REPO_ROOT, "src", "install.mjs"), "utf8");
  assert.ok(
    install.includes('".intent/assignments/*"'),
    "GITIGNORE_PATTERNS に .intent/assignments/* がある（宣言を非追跡化）",
  );
  assert.ok(
    install.includes('"!.intent/assignments/README.md"'),
    "GITIGNORE_PATTERNS に !.intent/assignments/README.md がある（README を再包含）",
  );
  // README は USER_DATA（upgrade で上書きしない）。
  assert.ok(
    install.includes('".intent/assignments/README.md"'),
    "USER_DATA_RELATIVES に .intent/assignments/README.md がある（upgrade 保護）",
  );
});

// ---- 7. packet frontmatter 12キー固定が壊れていない（別レイヤ・DR99・スキーマ拡張実装を落とす） ----
// 割当宣言は packet frontmatter へキーを足さない。packet-format の 12キー固定の記述が残ることを確認する。
test("7: packet-format が 12キー固定を保つ（割当宣言でスキーマ拡張していない）", () => {
  const pf = path.join(TEMPLATES, "ja", "claude", "skills", "intent-packets", "rules", "packet-format.md");
  const c = fs.readFileSync(pf, "utf8");
  assert.ok(/12キー固定/.test(c), "packet-format が 12キー固定を明記する（割当宣言でキーを足していない）");
  // 割当宣言由来のキー（assignment / claimed_by 等）を frontmatter スキーマに足していない。
  assert.ok(
    !/claimed_by|assigned_to|assignment:/.test(c),
    "packet frontmatter に割当宣言由来のキーを足していない（別レイヤ・DR99）",
  );
});

// ===========================================================================
// wire スライス（status 側）: intent-status が .intent/assignments/ を read-only で読み、
//   割当サマリ + 二重宣言 warn + 放置宣言の経過観測を併記する（drift/conformance 併記と同じ温度）。
//   overview 側は並行 pdm-views 案件と intent-overview SKILL が衝突するため本 run では保留（後続）。
// ===========================================================================

// ---- 8. intent-status（4系統）が Step 3.8 として割当併記を結線する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`8: ${lang}/${agent} の intent-status が Step 3.8（assignments 割当併記）を持つ`, () => {
      const c = fs.readFileSync(statusSkillPath(lang, agent), "utf8");
      // 独立 Step 3.8（Step 3.6 の後・Step 4 の前。旧 Step 3.7＝milestone 検査は
      // milestones-decommission で撤去済み＝欠番）。
      assert.ok(
        /### Step 3\.8:/.test(c),
        `${lang}/${agent}: intent-status に Step 3.8 の見出しがある`,
      );
      // .intent/assignments/ を read-only で読む。
      assert.ok(
        /\.intent\/assignments\//.test(c),
        `${lang}/${agent}: Step 3.8 が .intent/assignments/ を読む`,
      );
      // 見出し階層が保たれる（3.6 < 3.8 < 4）。Step 3.7 は撤去済みで存在しない。
      const i36 = c.indexOf("### Step 3.6");
      const i38 = c.indexOf("### Step 3.8");
      const i4 = c.indexOf("### Step 4");
      assert.ok(
        i36 > 0 && i38 > i36 && i4 > i38,
        `${lang}/${agent}: Step 3.6 < 3.8 < 4 の順で見出しが存在する`,
      );
      assert.ok(
        !/### Step 3\.7/.test(c),
        `${lang}/${agent}: 撤去済みの Step 3.7（milestone 検査）が復活していない`,
      );
    });
  }
}

// ---- 9. status の割当併記が warn-only・read-only・機械閾値なし・宣言ゼロで現行どおり を明示する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`9: ${lang}/${agent} の intent-status 割当併記が warn-only・機械閾値なし・後方互換を明示する`, () => {
      const c = fs.readFileSync(statusSkillPath(lang, agent), "utf8");
      // 二重宣言 = 同一 packet_id が2つ以上。
      assert.ok(
        /2つ以上|two or more/i.test(c),
        `${lang}/${agent}: 二重宣言＝同一 packet_id が2つ以上 に触れる`,
      );
      // 次の一手の決定表結果を変えない（warn-only）。
      assert.ok(
        /決定表結果を変えない|do not change the decision-table|does not change the decision-table/i.test(c),
        `${lang}/${agent}: 割当併記が次の一手（決定表）を変えない旨に触れる`,
      );
      // 放置宣言を機械閾値で自動判定しない（INV2/INV66）。
      assert.ok(
        /機械閾値で自動判定・自動解放しない|machine threshold such as elapsed days|no machine threshold/i.test(c),
        `${lang}/${agent}: 放置宣言を機械閾値で自動判定・自動解放しない旨に触れる`,
      );
      // 宣言ゼロで現行どおり（後方互換・宣言ゼロで併記しない）。
      assert.ok(
        /宣言ゼロ|zero claims|no claims/i.test(c),
        `${lang}/${agent}: 宣言ゼロで現行どおり（後方互換）に触れる`,
      );
    });
  }
}

// ---- 10. status が read-only を保つ（Step 3.8 が Write/宣言作成を持ち込まない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`10: ${lang}/${agent} の intent-status Step 3.8 が read-only を保つ`, () => {
      const c = fs.readFileSync(statusSkillPath(lang, agent), "utf8");
      // Step 3.8 節が「read-only 維持」「書き込まない」を明示する（宣言の作成・削除をしない）。
      const step38 = c.slice(c.indexOf("### Step 3.8"), c.indexOf("### Step 4"));
      assert.ok(
        /read-only|宣言の作成・削除はしない|Do not create or delete claims/i.test(step38),
        `${lang}/${agent}: Step 3.8 が read-only（宣言を作成・削除しない）を明示する`,
      );
    });
  }
}

// ---- 11. dogfood intent-status が ja/claude と byte 同一で同期されている ----
test("11: dogfood .claude/skills/intent-status/SKILL.md が ja/claude と byte 同一で同期されている", () => {
  const dogfood = path.join(REPO_ROOT, ".claude", "skills", "intent-status", "SKILL.md");
  if (fs.existsSync(dogfood)) {
    assert.equal(
      fs.readFileSync(dogfood, "utf8"),
      fs.readFileSync(statusSkillPath("ja", "claude"), "utf8"),
      "dogfood intent-status は ja/claude と byte 同一",
    );
  }
});
