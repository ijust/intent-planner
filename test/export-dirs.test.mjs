// export-dirs (intent-planner-export-dirs) の受け入れ検証 (task 6.1)。
// node:test 標準・依存ゼロ (INV2)。
//
// 範囲分担 (重複回避):
//   - claude↔codex の rules byte 等価 (map-cc-sdd / writeback-protocol / validate-checks /
//     decision-table を含む全 rules) は agent-rules-parity (両起点の和集合) と
//     lifecycle 項目 b (claude 起点) が担うため、本ファイルでは再検査しない。
//   - ja↔en のファイル集合 1:1 (cc-sdd/README.md の両言語存在を含む) は structure-pack が、
//     deltas.md の ja/en 見出しレベル列一致は lifecycle 項目 c が、
//     hash lock (map-cc-sdd byte lock / export SKILL installer・codex body lock) は
//     standard-invariance が担う。
//   - map-cc-sdd の「## Source Packet」言及 + <slug>/requirements.md パス + 必須見出し節 +
//     scaffold README の存在は lifecycle 項目 d が既に持つが、本ファイルの項目1は
//     design Testing Strategy 1 の要求 (slug 正規化・衝突規則・正確な転記・他 packet 書き込み
//     禁止) を加えた完全形であり、パス形検査のみ意図的に重なる (受け入れ検証の自己完結性)。
//   - gitignore の動作検証は install.test.mjs / cli.test.mjs の所掌 (本ファイル対象外)。
//
// 本ファイルは design Testing Strategy「Unit / 構造テスト」の項目 + パリティ + Req 1.5 に集中する:
//   1. map-cc-sdd (4系統) の構造規則: slug 正規化・衝突規則・`## Source Packet` 出力義務
//      (正確な転記)・<slug>/ パス形・他 packet ディレクトリへの書き込み禁止 (Req 1.1, 2.1–2.3, 1.4)
//   2. 配布物全域の「単一スロット」「最新1 packet 分」文言不在 (全面禁止) (Req 7.2)
//   3. writeback-protocol / status / validate (各4系統) の解決順序記載:
//      export-log 最新行が正典 + フォールバック告知 + ディレクトリ同定規則 (Req 3.1, 3.2)
//   5. scaffold cc-sdd README (ja/en): 構造図・3下書きの役割・Git 非追跡方針・
//      export-log.md への言及 (Req 5.1, 5.2)
//   6. パリティ: 本 spec が変更したファイルの ja↔en 見出しレベル列一致 (Req 8.1)
//   7. writeback 完了後も下書きを削除しない記載 (Req 1.5)
//   (旧形式移行 Step 1.8 を削除したため、旧項目4 の検査は廃止。)
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

function skillDir(lang, agent, skill) {
  return path.join(TEMPLATES, lang, agent, "skills", skill);
}

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

// dir 配下の全ファイルを絶対パスで列挙する (任意のネスト深さ)。
function listFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const parent = e.parentPath ?? e.path;
      return path.join(parent, e.name);
    })
    .sort();
}

// markdown テキストから見出し (#〜###) のレベル列を順序付きで抽出する。fenced code block 内は除外
// (writeback-protocol の内包 deltas テンプレート見出しを比較対象から外すため)。
function extractHeadingLevels(text) {
  const levels = [];
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,3}) /);
    if (m) levels.push(m[1].length);
  }
  return levels;
}

// ---- 項目1: map-cc-sdd の構造規則 (Req 1.1, 1.4, 2.1–2.3) ----
// slug 正規化・衝突規則・`## Source Packet` 出力義務 (正確な転記)・<slug>/ パス形・
// 他 packet ディレクトリへの書き込み禁止が4系統の実テキストに記載されていること。

const MAP_RULE_LITERALS = {
  ja: {
    slug: ["NFC 正規化", "連続する `-` を1つに圧縮", "unnamed-packet"],
    collision: ["`-2` から始まる連番", "**異なる** packet 名を指す場合のみ衝突"],
    duty: ["`## Source Packet`", "`## Parent Intent`", "`## Invariants`", "`## Acceptance Material`", "正確な転記"],
    slugPath: /\.intent\/cc-sdd\/<packetスラッグ>\/requirements\.md/,
    noCrossWrite: "他 packet のディレクトリへは書き込まない",
  },
  en: {
    slug: ["NFC normalization", "Collapse consecutive `-` into one", "unnamed-packet"],
    collision: ["numbered alternative starting at `-2`", "names a **different** packet"],
    duty: ["`## Source Packet`", "`## Parent Intent`", "`## Invariants`", "`## Acceptance Material`", "exact transcription"],
    slugPath: /\.intent\/cc-sdd\/<packet-slug>\/requirements\.md/,
    noCrossWrite: "Never write into another packet's directory",
  },
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`map-cc-sdd 構造規則: ${lang}/${agent} に slug 正規化・衝突規則・Source Packet 義務・<slug>/ パス・他 packet 書き込み禁止がある (1.1, 1.4, 2.1, 2.2, 2.3)`, () => {
      const exp = MAP_RULE_LITERALS[lang];
      const content = read(
        path.join(skillDir(lang, agent, "intent-export-cc-sdd"), "rules", "map-cc-sdd.md"),
      );
      for (const needle of exp.slug) {
        assert.ok(content.includes(needle), `${lang}/${agent}: slug 規則「${needle}」がある (2.1)`);
      }
      for (const needle of exp.collision) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 衝突規則「${needle}」がある (2.2)`);
      }
      for (const needle of exp.duty) {
        assert.ok(
          content.includes(needle),
          `${lang}/${agent}: requirements 下書きの出力契約「${needle}」がある (1.4)`,
        );
      }
      assert.match(
        content,
        exp.slugPath,
        `${lang}/${agent}: packet 毎パス形 <slug>/requirements.md がある (1.1)`,
      );
      assert.ok(
        content.includes(exp.noCrossWrite),
        `${lang}/${agent}: 不変条件「${exp.noCrossWrite}」がある (1.1)`,
      );
    });
  }
}

// ---- 項目1-openspec: map-openspec の構造規則 + scaffold 出力構造 (Req 9.4) ----
// cc-sdd の項目1 と同型を OpenSpec 版（per-slug パス `.intent/openspec/<slug>/`）で明示追記する。
// skill 名 / map ルール名 hardcode（glob 自動検出ではない）のため追記必須。

const MAP_OPENSPEC_LITERALS = {
  ja: {
    slug: ["NFC 正規化", "連続する `-` を1つに圧縮", "unnamed-packet"],
    collision: ["`-2` から始まる連番", "**異なる** packet 名を指す場合のみ衝突"],
    slugPath: /\.intent\/openspec\/<packetスラッグ>\/proposal\.md/,
    noCrossWrite: "他 packet のディレクトリへは書き込まない",
  },
  en: {
    slug: ["NFC normalization", "Collapse consecutive `-` into one", "unnamed-packet"],
    collision: ["numbered alternative starting at `-2`", "a **different** packet name"],
    slugPath: /\.intent\/openspec\/<packet-slug>\/proposal\.md/,
    noCrossWrite: "Never write into another packet's directory",
  },
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`map-openspec 構造規則: ${lang}/${agent} に slug 正規化・衝突規則・<slug>/ パス・他 packet 書き込み禁止がある (9.4)`, () => {
      const exp = MAP_OPENSPEC_LITERALS[lang];
      const content = read(
        path.join(skillDir(lang, agent, "intent-export-openspec"), "rules", "map-openspec.md"),
      );
      for (const needle of exp.slug) {
        assert.ok(content.includes(needle), `${lang}/${agent}: slug 規則「${needle}」がある`);
      }
      for (const needle of exp.collision) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 衝突規則「${needle}」がある`);
      }
      assert.match(
        content,
        exp.slugPath,
        `${lang}/${agent}: packet 毎パス形 .intent/openspec/<slug>/proposal.md がある`,
      );
      assert.ok(
        content.includes(exp.noCrossWrite),
        `${lang}/${agent}: 不変条件「${exp.noCrossWrite}」がある`,
      );
    });
  }
}

// scaffold（agent 非依存・ja/en のみ）の OpenSpec 形式適合: proposal.md / spec-delta.md の見出し literal。
const OPENSPEC_SCAFFOLD_HEADINGS = {
  proposal: ["## Why", "## What Changes", "## Impact"],
  delta: [
    "## ADDED Requirements",
    "## MODIFIED Requirements",
    "## REMOVED Requirements",
    "### Requirement:",
    "#### Scenario:",
  ],
};

for (const lang of LANGS) {
  test(`openspec scaffold: ${lang} の proposal.md / spec-delta.md が OpenSpec 形式の見出しを含む (9.4)`, () => {
    const proposal = read(path.join(TEMPLATES, lang, "intent", "openspec", "proposal.md"));
    for (const needle of OPENSPEC_SCAFFOLD_HEADINGS.proposal) {
      assert.ok(proposal.includes(needle), `${lang}: proposal.md に「${needle}」がある`);
    }
    const delta = read(path.join(TEMPLATES, lang, "intent", "openspec", "spec-delta.md"));
    for (const needle of OPENSPEC_SCAFFOLD_HEADINGS.delta) {
      assert.ok(delta.includes(needle), `${lang}: spec-delta.md に「${needle}」がある`);
    }
  });
}

// ---- 項目2: 配布物全域の単一スロット文言不在 (Req 7.2) ----
// templates/ 全ファイルを走査し、単一スロット前提の文言が一切残っていないことを検査する。
// 旧形式移行 (Step 1.8) を削除したため、旧形式を「名前」として言及する allowlist も不要になった。
// 「単一スロット」「single-slot」「single slot」「最新1 packet 分」を全面禁止する。

test("単一スロット文言不在: templates/ 全域に単一スロット前提の文言が無い (7.2)", () => {
  const files = listFiles(TEMPLATES);
  assert.ok(files.length > 0, "templates/ にファイルがある");

  for (const filePath of files) {
    const rel = path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
    const content = fs.readFileSync(filePath, "utf8");
    const lower = content.toLowerCase();

    assert.ok(!content.includes("最新1 packet 分"), `${rel}: 「最新1 packet 分」が無い`);
    assert.ok(!lower.includes("single slot"), `${rel}: "single slot" (空白区切り) が無い`);
    assert.ok(!content.includes("単一スロット"), `${rel}: 「単一スロット」が無い`);
    assert.ok(!lower.includes("single-slot"), `${rel}: "single-slot" が無い`);
  }
});

// ---- 項目3: 解決順序の記載 (Req 3.1, 3.2) ----
// writeback-protocol / status SKILL / validate SKILL (各4系統) が「現行 packet」の判定について
// export-log 最新行を正典とし、フォールバック使用時の告知を記載していること。
// writeback-protocol はあわせてディレクトリ同定規則 (見出し一致が正) を持つこと。

const RESOLUTION_LITERALS = {
  ja: {
    writeback: [
      "export-log.md 最新行（正典）",
      "フォールバック",
      "告知する",
      "ディレクトリ同定規則",
      "`## Source Packet` 見出しが packet 名と一致する",
    ],
    status: ["②export-log 最新行（正典）", "フォールバックした場合は、その事実"],
    validate: ["`.intent/export-log.md` 最新行の packet のディレクトリ", "違反として扱わない", "フォールバック"],
  },
  en: {
    writeback: [
      "latest row of export-log.md (canonical)",
      "fallback",
      "announce",
      "Directory identification rule",
      "matches the packet name",
    ],
    status: ["(2) the latest row of export-log (canonical)", "fall back to (3) or later"],
    validate: ["latest row of `.intent/export-log.md`", "not treated as violations", "fall back"],
  },
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`解決順序: ${lang}/${agent} writeback-protocol が export-log 最新行を正典とし同定規則を持つ (3.1, 3.2)`, () => {
      const content = read(
        path.join(skillDir(lang, agent, "intent-writeback"), "rules", "writeback-protocol.md"),
      );
      for (const needle of RESOLUTION_LITERALS[lang].writeback) {
        assert.ok(content.includes(needle), `${lang}/${agent}: writeback-protocol に「${needle}」がある`);
      }
    });

    test(`解決順序: ${lang}/${agent} status SKILL が export-log 最新行を正典としフォールバックを告知する (3.1, 3.2)`, () => {
      const content = read(path.join(skillDir(lang, agent, "intent-status"), "SKILL.md"));
      for (const needle of RESOLUTION_LITERALS[lang].status) {
        assert.ok(content.includes(needle), `${lang}/${agent}: status SKILL に「${needle}」がある`);
      }
    });

    test(`解決順序: ${lang}/${agent} validate SKILL が export-log 最新行を対象とし過去下書きを違反としない (3.1, 3.2)`, () => {
      const content = read(path.join(skillDir(lang, agent, "intent-validate"), "SKILL.md"));
      for (const needle of RESOLUTION_LITERALS[lang].validate) {
        assert.ok(content.includes(needle), `${lang}/${agent}: validate SKILL に「${needle}」がある`);
      }
    });
  }
}

// ---- 項目5: scaffold cc-sdd README の内容 (Req 5.1, 5.2) ----
// 構造 (packet 毎ディレクトリのパス形)・3下書きの役割 (3ファイルそれぞれの説明)・
// Git 非追跡方針・export-log.md への言及。存在のみの検査は lifecycle 項目 d が持つため、
// ここでは内容を検査する。

const README_LITERALS = {
  ja: {
    slugDir: "<packetスラッグ>/",
    rolesHeading: "## 3下書きの役割",
    untracked: "非追跡",
  },
  en: {
    slugDir: "<packet-slug>/",
    rolesHeading: "## Role of the 3 drafts",
    untracked: "untracked",
  },
};

for (const lang of LANGS) {
  test(`scaffold README: ${lang}/intent/cc-sdd/README.md が構造・3下書きの役割・非追跡方針を記載する (5.1, 5.2)`, () => {
    const exp = README_LITERALS[lang];
    const content = read(path.join(TEMPLATES, lang, "intent", "cc-sdd", "README.md"));
    assert.ok(content.includes(exp.slugDir), `${lang}: packet 毎ディレクトリ「${exp.slugDir}」の構造記載がある`);
    assert.ok(content.includes(exp.rolesHeading), `${lang}: 見出し「${exp.rolesHeading}」がある`);
    for (const draft of ["**requirements.md**", "**design.md**", "**tasks.md**"]) {
      assert.ok(content.includes(draft), `${lang}: 3下書きの役割に ${draft} の説明がある`);
    }
    assert.ok(content.includes(exp.untracked), `${lang}: Git 非追跡 (${exp.untracked}) の方針記載がある`);
    assert.ok(content.includes("export-log.md"), `${lang}: export-log.md への言及がある`);
  });
}

// ---- 項目6: ja↔en パリティ (Req 8.1) ----
// 本 spec が変更したファイルの ja↔en 見出しレベル列 (順序付き) の一致。
// 意図的に再検査しないもの:
//   - claude↔codex の rules byte 等価 → agent-rules-parity + lifecycle 項目 b が担保
//   - ja↔en のファイル集合 1:1 (存在パリティ) → structure-pack が担保
//   - deltas.md の ja/en 見出しレベル列 → lifecycle 項目 c が担保
//   - byte lock (hash) → standard-invariance が担保
// rules は claude/codex byte 一致が既に強制されているため claude 側のみ比較する。
// SKILL.md は agent 間で本文が設計上異なるため claude / codex を個別に比較する。

const PARITY_FILES = [
  ...AGENTS.flatMap((agent) =>
    ["intent-export-cc-sdd", "intent-status", "intent-validate", "intent-writeback"].map(
      (skill) => path.join(agent, "skills", skill, "SKILL.md"),
    ),
  ),
  path.join("claude", "skills", "intent-export-cc-sdd", "rules", "map-cc-sdd.md"),
  path.join("claude", "skills", "intent-writeback", "rules", "writeback-protocol.md"),
  path.join("claude", "skills", "intent-validate", "rules", "validate-checks.md"),
  path.join("intent", "cc-sdd", "README.md"),
];

for (const rel of PARITY_FILES) {
  const relPosix = rel.split(path.sep).join("/");
  test(`ja/en パリティ: ${relPosix} の見出しレベル列が一致する (8.1)`, () => {
    const ja = extractHeadingLevels(read(path.join(TEMPLATES, "ja", rel)));
    const en = extractHeadingLevels(read(path.join(TEMPLATES, "en", rel)));
    assert.ok(ja.length > 0, `ja/${relPosix} に見出しがある`);
    assert.deepEqual(
      en,
      ja,
      `${relPosix}: ja/en の見出しレベル列 (順序含む) が一致する (翻訳での節欠落・余剰なし)`,
    );
  });
}

// ---- 項目7: writeback 完了後も下書きを削除しない (Req 1.5) ----

const NO_DELETE_LITERALS = {
  ja: "は**削除しない**",
  en: "**never deleted**",
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`下書き保持: ${lang}/${agent} writeback-protocol が writeback 完了後も下書きを削除しないと記載する (1.5)`, () => {
      const content = read(
        path.join(skillDir(lang, agent, "intent-writeback"), "rules", "writeback-protocol.md"),
      );
      assert.ok(
        content.includes(NO_DELETE_LITERALS[lang]),
        `${lang}/${agent}: 「${NO_DELETE_LITERALS[lang]}」の記載がある`,
      );
    });
  }
}
