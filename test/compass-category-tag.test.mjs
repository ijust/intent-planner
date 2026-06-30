// compass-category-tag-grep-filter（compass を領域タグ+grep フィルタで読む側から部分ロード・C25/A37）の
//   不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: canonical-slimming の OQ-slim7 で「compass は履歴退避で軽くできない（214 Anti-direction 中 115 が
//   現役参照・病因が tree と違う）」と決着した、その別軸。退避(move)で軽くできない密参照を、読む側で
//   部分ロードする＝各 Anti-direction/Invariant/DR に領域タグ（行末 `[領域: <name>]`・横断は
//   `[領域: always]`）を標識し、読み手が「案件領域 + always を grep で引く」。Deep Research（MADR の
//   カテゴリタグ+フィルタ）の依存ゼロ移植。
//
// ここで落とす誤実装（discriminative oracle）:
//   - 横断 Invariant に always タグが付いていない（領域フィルタで落ちて drift＝Anti-direction 226）
//   - 読み手 rule（decision-probe）に「領域タグ + always を grep で引く」pull 規律が無い
//   - grep フィルタを補助スクリプト（intent-check.mjs）に寄せている（INV2/A1・DR71 違反）
//   - 読み手 rule の claude⇔codex パリティが崩れている
//
// 注: compass は user-data（templates に scaffold 無し）ゆえ dogfood `.intent/intent-compass.md` を fixture に
//   する（存在すれば検査・self-apply）。読み手 rule（decision-probe.md）は templates 4系統 + dogfood を検査。
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

function probePath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-packets", "rules", "decision-probe.md");
}

const ALWAYS_TAG = "[領域: always]";

// ---- 1. 読み手 rule（decision-probe）が「領域タグ + always を grep で引く」pull 規律を持つ（4系統） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の decision-probe が領域タグ部分ロードの pull 規律を持つ`, () => {
      const c = fs.readFileSync(probePath(lang, agent), "utf8");
      // 領域タグ記法と always への言及。
      assert.ok(c.includes("領域: always") || c.includes("always"), `${lang}/${agent}: always タグに言及する`);
      assert.ok(/INV47|DR71|compass-category-tag/.test(c), `${lang}/${agent}: INV47/DR71 を典拠に参照する`);
      // grep で部分ロードする旨。
      assert.ok(/grep/i.test(c), `${lang}/${agent}: grep フィルタで引く旨に触れる`);
      // 横断 always を必ず含める（落とすと drift）。
      assert.ok(
        /必ず含める|always.*include|include.*always|落とす.*drift|drift/i.test(c),
        `${lang}/${agent}: 横断 always を必ず含める（落とすと drift）旨に触れる`,
      );
    });
  }
}

// ---- 2. grep フィルタを補助スクリプト（intent-check.mjs）に寄せていない（INV2/A1・DR71） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の decision-probe が grep フィルタを intent-check.mjs に寄せない`, () => {
      const c = fs.readFileSync(probePath(lang, agent), "utf8");
      // 部分ロード規律の段落に「補助スクリプトに寄せない・自然言語規約」が明記される。
      assert.ok(
        /intent-check\.mjs/.test(c),
        `${lang}/${agent}: intent-check.mjs（補助スクリプト）に寄せない旨に触れる`,
      );
      assert.ok(
        /自然言語規約|natural-language convention|INV2\/A1|INV2|A1/.test(c),
        `${lang}/${agent}: 自然言語規約（INV2/A1）に閉じる旨に触れる`,
      );
    });
  }
}

// ---- 3. 読み手 rule の claude⇔codex パリティ（agent-rules-parity・byte 等価） ----
for (const lang of LANGS) {
  test(`3: ${lang} の decision-probe が claude⇔codex で byte 等価`, () => {
    const claude = fs.readFileSync(probePath(lang, "claude"), "utf8");
    const codex = fs.readFileSync(probePath(lang, "codex"), "utf8");
    assert.equal(claude, codex, `${lang}: decision-probe は claude/codex で byte 等価（agent-rules-parity）`);
  });
}

// ---- 4. dogfood compass（self-apply）に always タグと領域タグが seed されている（存在すれば検査） ----
test("4: dogfood compass に横断 Invariant の always タグと領域タグが seed されている（存在すれば検査）", () => {
  const compass = path.join(REPO_ROOT, ".intent", "intent-compass.md");
  if (!fs.existsSync(compass)) return; // dogfood compass は環境により未配置でも green
  const c = fs.readFileSync(compass, "utf8");
  // 横断 Invariant（全作業共通）に always タグが付いている。
  assert.ok(c.includes(ALWAYS_TAG), "dogfood compass に [領域: always] タグが seed されている（横断 Invariant）");
  // INV2（横断・最も参照される）の行に always タグが付いている（落とすと drift）。
  const inv2Line = c.split("\n").find((l) => l.includes("**INV2 ") && l.includes("[領域: always]"));
  assert.ok(inv2Line, "横断 Invariant INV2 の行に [領域: always] タグが付いている（領域フィルタで落とさない）");
  // 領域固有タグ（always 以外）も少なくとも1つ seed されている（領域で出し分けられる）。
  const domainTag = /\[領域: (?!always)[^\]]+\]/.test(c);
  assert.ok(domainTag, "always 以外の領域タグ（例 [領域: 配布]）も seed されている（領域で出し分け可能）");
});

// ---- 5. dogfood decision-probe が parent（ja/claude）と同期している（存在すれば検査） ----
test("5: dogfood decision-probe が ja/claude と同期している（存在すれば検査）", () => {
  const dogfood = path.join(REPO_ROOT, ".claude", "skills", "intent-packets", "rules", "decision-probe.md");
  if (!fs.existsSync(dogfood)) return;
  assert.equal(
    fs.readFileSync(dogfood, "utf8"),
    fs.readFileSync(probePath("ja", "claude"), "utf8"),
    "dogfood decision-probe は ja/claude と byte 同一",
  );
});
