// packet-files (intent-planner-packet-files) の受け入れ検証 (task 9.1)。
// node:test 標準・依存ゼロ。
//
// 範囲分担 (重複回避):
//   - claude↔codex の rules byte 等価 (packet-format / writeback-protocol を含む全 rules) は
//     agent-rules-parity が担うため、本ファイルでは再検査しない (rules は ×4系統の実テキストを
//     それぞれ読んで検査するが、等価性そのものの assert はしない)。
//   - hash lock (intent-packets / intent-compass / export SKILL / modes / algo の byte lock) は
//     standard-invariance が担う。
//   - plan.md への付け替え済み検査 (Walking Skeleton scaffold = poc-coverage、
//     Recommended First Packet scaffold = review-adoption)・deltas 正本/写し (lifecycle)・
//     ADR 6欄 (review-adoption) は各テストが担う。
//   - ja↔en のファイル集合 1:1 は structure-pack が担う。本ファイルのパリティ検査は
//     本 spec が新設・全面改稿したファイルの見出しレベル列一致に限る。
//
// 本ファイルは design Testing Strategy「構造・文言テスト」の9項目に集中する:
//   1. scaffold 構造: packets/{README,plan,index}.md + compass-archive.md の存在と
//      旧 templates/{ja,en}/intent/packets.md の不在。plan.md の3節。index.md の
//      編集禁止注記と4列ヘッダ (Req 1.3, 4.1)
//   2. packet-format.md (×4系統): 10キー全列挙 (depends_on 含む)・name 正本 (4消費者 +
//      packet_id 禁止)・ID 形式・state 5値域 + superseded 別軸・削除禁止・index 再生成手順・
//      後方互換移行表・## Evidence 節 (Validation の後/Rollback の前)・depends_on 規約
//      (Req 1.1, 1.2, 1.3, 2.1, 2.2, 2.4, 2.5, 2.6, 3.1, 3.3, 3.4, 4.2, 8.2)
//   3. slug 等価: packet-format.md と map-cc-sdd.md のスラッグ規則 subsection の
//      文字列一致 (ja/en。Req 2.2)
//   4. packets SKILL (×4系統): 非破壊・supersede + in-flight ガード・
//      claude のみ AskUserQuestion (Req 3.3, 3.5, 7.1)
//      (旧 packets.md 移行 Step 1.5 は削除済みのため検査しない)
//   5. writeback (×4系統): 完了一連操作 (done・closed_at・spec_refs・archive 移動・
//      index 再生成)・6欄のまま compass-archive 退避・archive 明示例外 (Req 2.5, 3.2, 9.1, 9.5)
//   6. compass 二層: scaffold ja/en + SKILL ×4。普遍のみ・packet ファイル正本・
//      compass-archive 退避。North Star / Current Drift / Direction / Anti-direction
//      見出しの構造不変 (Req 8.1, 9.1)
//   7. 読み手 active 限定: status / validate / improve ×4系統。active/ 限定と
//      archive/ 不読 (writeback の明示例外は項目5で検査) (Req 5.3)
//   8. bare packets.md 不在: templates/ 全域 walk で部分文字列「packets.md」が皆無 (Req 10.5)
//      (旧 packets.md 移行・旧形式案内を削除したため allowlist は廃止)
//   9. ja/en パリティ: 本 spec の新設・全面改稿ファイルの見出しレベル列一致 (Req 10.1)
//
// pre-spec 失敗性 (task 9.1 完了条件の確認。a328f00 = task 1 以前の内容に対して):
//   - 項目1: templates/{ja,en}/intent/packets.md が実在し packets/ scaffold が無い → 両方向で fail
//   - 項目2・3: packet-format.md が存在しない → read() の存在 assert で fail
//   - 項目8: status SKILL 等に修飾なしの `.intent/packets.md` 言及が多数 → fail
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
// (packets/README.md の構造図・packet-format.md の frontmatter 例を比較対象から外すため)。
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

// 指定した見出し行から次のレベル2/3見出し直前までを節として切り出す。
function sliceSection(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ") || lines[i].startsWith("### ")) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

// ---- 項目1: scaffold 構造 (Req 1.3, 4.1) ----
// packets/ 3ファイル + compass-archive.md の存在、旧 packets.md scaffold の不在、
// plan.md の3節、index.md の編集禁止注記と4列ヘッダ。

const INDEX_HEADER = "| packet_id | name | state | summary |";

const INDEX_LITERALS = {
  ja: ["生成物です", "手動編集しないでください"],
  en: ["Generated artifact", "Do not edit by hand"],
};

for (const lang of LANGS) {
  test(`scaffold 構造: ${lang}/intent に packets/{README,plan,index}.md + compass-archive.md があり旧 packets.md が無い (1.3, 4.1)`, () => {
    const intentDir = path.join(TEMPLATES, lang, "intent");
    for (const file of ["README.md", "plan.md", "index.md"]) {
      assert.ok(
        fs.existsSync(path.join(intentDir, "packets", file)),
        `${lang}: intent/packets/${file} が実在する (1.3)`,
      );
    }
    assert.ok(
      fs.existsSync(path.join(intentDir, "compass-archive.md")),
      `${lang}: intent/compass-archive.md が実在する`,
    );
    // pre-spec では単一ファイル scaffold (templates/<lang>/intent/packets.md) が実在した。
    assert.ok(
      !fs.existsSync(path.join(intentDir, "packets.md")),
      `${lang}: 旧 scaffold intent/packets.md が存在しない (1.3)`,
    );
  });

  test(`scaffold plan.md: ${lang} に Walking Skeleton / Recommended First Packet / Deferred の3節がある (1.3)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "packets", "plan.md"));
    assert.match(content, /^## Walking Skeleton/m, `${lang}: Walking Skeleton 節がある`);
    assert.match(content, /^## Recommended First Packet$/m, `${lang}: Recommended First Packet 節がある`);
    assert.match(content, /^## Deferred/m, `${lang}: Deferred 節がある`);
  });

  test(`scaffold index.md: ${lang} に編集禁止注記と4列ヘッダがある (4.1)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "packets", "index.md"));
    for (const needle of INDEX_LITERALS[lang]) {
      assert.ok(content.includes(needle), `${lang}: 編集禁止注記「${needle}」がある`);
    }
    assert.ok(content.includes(INDEX_HEADER), `${lang}: 4列ヘッダ「${INDEX_HEADER}」がある`);
  });
}

// ---- 項目2: packet-format.md の記載 (Req 1.2, 2.1, 2.4, 2.6, 3.1, 4.2) ----
// 12キー全列挙・name 正本 (export-log / Source Packet / deltas / スラッグ導出の4消費者 +
// packet_id 禁止)・ID 形式・state 5値域 + superseded 別軸・削除禁止・index 再生成手順・
// 後方互換移行・## Evidence 節・depends_on 規約・mode キー（起草時固定・後方互換）。

// intent-planner-packet-progress (task 3.1): 9キー → 10キー（depends_on 追加）、状態遷移3値 →
// 細分化 state（5値域）+ `## Evidence` 節 + depends_on の検査へ更新。
// intent-planner-compass-conformance (task 3.1): 10キー → 11キー（`updated_at` 追加。
// stale 検出に必要な最終更新時点。位置は `created_at` の直後）。`updated_at` の存在・ISO 8601
// 形式・不在許容（後方互換）の検査を追加する。
// intent-planner-mode-scope (task 2.5): 11キー → 12キー（`mode` 追加。
// packet 起草時に確定モードを刻む出自記録。位置は `depends_on` の直後（末尾））。
const ELEVEN_KEYS =
  "`packet_id` / `name` / `state` / `created_at` / `updated_at` / `closed_at` / `parent_intents` / `spec_refs` / `superseded_by` / `summary` / `depends_on` / `mode`";

// 5 値域の各値（相互排他で1段階を一意に判別）。
const STATE_VALUES = ["draft", "ready", "implementing", "verifying", "done"];

const FORMAT_LITERALS = {
  ja: {
    elevenKeys: ["**12キー固定**", ELEVEN_KEYS],
    // updated_at: 最終更新時点 (ISO 8601)・新規作成時は created_at と同値・読み手は読むのみ。
    updatedAt: [
      "`updated_at`",
      "最終更新時点（ISO 8601）",
      "新規作成時は `created_at` と同値",
      "読むのみ",
    ],
    // updated_at 不在の旧 packet をエラーにしない後方互換 (depends_on 不在許容と同型)。
    updatedAtBackcompat: [
      "`updated_at` を持たない既存 packet は欠落として扱い",
      "即時一括移行を強制しない",
      "推測で埋めない",
    ],
    nameCanon: [
      "export-log の `| packet |` 列",
      "`## Source Packet`",
      "deltas の Delta 見出し",
      "スラッグ導出はすべて `name` を用いる",
      "`packet_id` を用いてはならない",
    ],
    id: "`pkt-<YYYYMMDD>-<スラッグ>`",
    // 5値域の宣言（state machine ではない別軸）と superseded 別軸。
    stateDomain: ["`draft | ready | implementing | verifying | done`", "**別軸**"],
    // 旧 active → implementing の後方互換移行表。
    migration: ["後方互換移行", "`implementing`"],
    // Evidence 節（Validation と区別・空節保持・done 前提）。
    evidence: ["## Evidence", "**計画**", "**結果**", "空節で保持"],
    // depends_on（packet_id 参照・空値保持・人が宣言）。
    dependsOn: ["depends_on", "依存を推論・算出しない", "キーを省略しない"],
    // mode（起草時確定モード・既定 standard・起草時固定・遡及更新しない・欠損は停止せず後方互換）。
    mode: [
      "`mode`",
      "standard",
      "起草時固定",
      "遡及更新しない",
      "`mode` を持たない既存 packet は欠落として扱い",
    ],
    noDelete: "**削除禁止**",
    regen: ["**frontmatter のみ**", "**昇順**", "ヘッダのみの空テーブルが正規形"],
  },
  en: {
    elevenKeys: ["**fixed to these 12**", ELEVEN_KEYS],
    updatedAt: [
      "`updated_at`",
      "last-updated timestamp (ISO 8601)",
      "On creation, initialize it equal to `created_at`",
      "only reads",
    ],
    updatedAtBackcompat: [
      "an existing packet without `updated_at` is treated as a missing field",
      "do not force an immediate bulk migration",
      "does not fill it in by guessing",
    ],
    nameCanon: [
      "export-log `| packet |` column",
      "`## Source Packet`",
      "Delta headings in deltas",
      "slug derivation all use `name`",
      "Never use `packet_id` for any of these",
    ],
    id: "`pkt-<YYYYMMDD>-<slug>`",
    stateDomain: ["`draft | ready | implementing | verifying | done`", "separate axis"],
    migration: ["Backward-compatible migration", "`implementing`"],
    evidence: ["## Evidence", "**plan**", "**result**", "empty section"],
    dependsOn: ["depends_on", "tools do not infer or compute dependencies", "do not omit the key"],
    // mode (mode at draft time / default standard / fixed at draft / no retroactive update / missing = backward compatible no stop).
    mode: [
      "`mode`",
      "standard",
      "fixed at draft time",
      "never retroactively update",
      "an existing packet without `mode` is treated as a missing field",
    ],
    noDelete: "**No deletion**",
    regen: ["**only the frontmatter**", "**ascending** `packet_id` order", "header only"],
  },
};

function packetFormatPath(lang, agent) {
  return path.join(skillDir(lang, agent, "intent-packets"), "rules", "packet-format.md");
}

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`packet-format: ${lang}/${agent} に 12キー全列挙 (updated_at / depends_on / mode 含む) と name 正本 (4消費者 + packet_id 禁止) がある (1.2, 2.1, 2.4, 3.1, 4.1, 8.2)`, () => {
      const exp = FORMAT_LITERALS[lang];
      const content = read(packetFormatPath(lang, agent));
      for (const needle of exp.elevenKeys) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 12キー記載「${needle}」がある (4.1, 8.2)`);
      }
      // ELEVEN_KEYS リテラルが旧 10 キーを取り違えていない自己検査: updated_at が created_at の
      // 直後に列挙され、mode が depends_on の直後（末尾）に列挙され、キー総数が 12 であること
      // （実装が壊れたら fail する）。
      assert.ok(
        ELEVEN_KEYS.includes("`created_at` / `updated_at`"),
        `${lang}/${agent}: ELEVEN_KEYS で updated_at が created_at の直後に列挙されている (4.1)`,
      );
      assert.ok(
        ELEVEN_KEYS.includes("`depends_on` / `mode`"),
        `${lang}/${agent}: ELEVEN_KEYS で mode が depends_on の直後（末尾）に列挙されている (4.1)`,
      );
      assert.equal(
        ELEVEN_KEYS.split(" / ").length,
        12,
        `${lang}/${agent}: ELEVEN_KEYS が 12 キーを列挙する (4.1)`,
      );
      for (const needle of exp.nameCanon) {
        assert.ok(content.includes(needle), `${lang}/${agent}: name 正本規則「${needle}」がある (2.1, 2.4)`);
      }
    });

    // updated_at の存在・ISO 8601 形式・後方互換（不在許容）の検査 (Req 4.1, 4.4, 6.4)。
    test(`packet-format: ${lang}/${agent} に updated_at の意味・ISO 8601 形式・打刻規律・後方互換（不在許容）の記載がある (4.1, 4.4, 6.4)`, () => {
      const exp = FORMAT_LITERALS[lang];
      const content = read(packetFormatPath(lang, agent));
      // updated_at が単独キーとして言及され、最終更新時点・ISO 8601・打刻規律が記載されている。
      for (const needle of exp.updatedAt) {
        assert.ok(content.includes(needle), `${lang}/${agent}: updated_at 規約「${needle}」がある (4.1)`);
      }
      // frontmatter 例の `updated_at:` 行が ISO 8601 タイムスタンプ値を持つこと（形式の正本）。
      // 例が壊れて非 ISO 値（または値なし）になったら fail する。
      const exampleLine = content
        .split(/\r?\n/)
        .find((l) => /^updated_at:\s/.test(l.trim()));
      assert.ok(
        exampleLine !== undefined,
        `${lang}/${agent}: frontmatter 例に updated_at 行がある (4.1)`,
      );
      assert.match(
        exampleLine,
        /updated_at:\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})/,
        `${lang}/${agent}: updated_at 例が ISO 8601 形式である (4.1)`,
      );
      // 後方互換: updated_at 不在の旧 packet を欠落として扱い、stale 断定・一括移行・推測補完を
      // しない（depends_on 不在＝「依存なし」と同型の遅延補完）。実装が後方互換規律を落としたら fail。
      for (const needle of exp.updatedAtBackcompat) {
        assert.ok(content.includes(needle), `${lang}/${agent}: updated_at 後方互換「${needle}」がある (4.4, 6.4)`);
      }
    });

    test(`packet-format: ${lang}/${agent} に ID 形式・state 5値域 + 別軸・削除禁止・index 再生成手順がある (2.1, 2.6, 4.2)`, () => {
      const exp = FORMAT_LITERALS[lang];
      const content = read(packetFormatPath(lang, agent));
      assert.ok(content.includes(exp.id), `${lang}/${agent}: ID 形式「${exp.id}」がある (2.6)`);
      for (const needle of exp.stateDomain) {
        assert.ok(content.includes(needle), `${lang}/${agent}: state 5値域・別軸「${needle}」がある (2.1)`);
      }
      // 5 値の各値が個別に列挙されている（相互排他で1段階を一意に判別 — Req 2.2）。
      for (const v of STATE_VALUES) {
        assert.ok(content.includes(`\`${v}\``), `${lang}/${agent}: state 値「${v}」が記載されている (2.2)`);
      }
      assert.ok(content.includes(exp.noDelete), `${lang}/${agent}: 「${exp.noDelete}」がある (2.6)`);
      assert.ok(content.includes(INDEX_HEADER), `${lang}/${agent}: 4列ヘッダがある (4.2)`);
      for (const needle of exp.regen) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 再生成手順「${needle}」がある (4.2)`);
      }
    });

    test(`packet-format: ${lang}/${agent} に 後方互換移行表・## Evidence 節・depends_on 規約がある (1.1, 2.5, 3.1)`, () => {
      const exp = FORMAT_LITERALS[lang];
      const content = read(packetFormatPath(lang, agent));
      for (const needle of exp.migration) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 後方互換移行「${needle}」がある (2.5)`);
      }
      for (const needle of exp.evidence) {
        assert.ok(content.includes(needle), `${lang}/${agent}: Evidence 節「${needle}」がある (1.1)`);
      }
      // 本文セクション構成リストで `## Evidence` 行が `## Validation` 行の後・`## Rollback` 行の
      // 前に置かれている（計画と結果を混在させない — 節リストの bullet 形で一意にアンカーする）。
      const vIdx = content.indexOf("- `## Validation`");
      const eIdx = content.indexOf("- `## Evidence`");
      const rIdx = content.indexOf("- `## Rollback`");
      assert.ok(vIdx !== -1 && eIdx !== -1 && rIdx !== -1, `${lang}/${agent}: 節リストに Validation / Evidence / Rollback の3行がある (1.3)`);
      assert.ok(vIdx < eIdx && eIdx < rIdx, `${lang}/${agent}: 節リストで Evidence が Validation の後・Rollback の前にある (1.3)`);
      for (const needle of exp.dependsOn) {
        assert.ok(content.includes(needle), `${lang}/${agent}: depends_on 規約「${needle}」がある (3.1, 3.3, 3.4)`);
      }
    });

    // mode キーの存在・値域・起草時固定・後方互換（不在許容）の検査 (Req 4.1, 4.2, 4.3, 4.5, 4.6)。
    test(`packet-format: ${lang}/${agent} に mode キーの意味・値域・起草時固定・後方互換（不在許容）の記載がある (4.1, 4.2, 4.3, 4.5, 4.6)`, () => {
      const exp = FORMAT_LITERALS[lang];
      const content = read(packetFormatPath(lang, agent));
      // mode キーが単独で言及され、値域・起草時固定・遡及更新しない・後方互換の規律が記載されている。
      for (const needle of exp.mode) {
        assert.ok(content.includes(needle), `${lang}/${agent}: mode キー規約「${needle}」がある (4.1, 4.2)`);
      }
      // frontmatter 例の `mode:` 行が存在すること（12キーの例として明示されていること）。
      const exampleLine = content
        .split(/\r?\n/)
        .find((l) => /^mode:\s/.test(l.trim()));
      assert.ok(
        exampleLine !== undefined,
        `${lang}/${agent}: frontmatter 例に mode 行がある (4.2)`,
      );
    });
  }
}

// ---- 項目3: slug 等価 (Req 2.2) ----
// packet-format.md のスラッグ規則 subsection が map-cc-sdd.md の該当節と文字列一致する
// (逐語複製の検査)。rules は claude/codex byte 一致が agent-rules-parity で強制されているため
// claude 側のみ比較する。

const SLUG_HEADINGS = {
  ja: "### スラッグ規則（決定的）",
  en: "### Slug rule (deterministic)",
};

for (const lang of LANGS) {
  test(`slug 等価: ${lang} の packet-format.md と map-cc-sdd.md のスラッグ規則節が文字列一致する (2.2)`, () => {
    const heading = SLUG_HEADINGS[lang];
    const formatContent = read(packetFormatPath(lang, "claude"));
    const mapContent = read(
      path.join(skillDir(lang, "claude", "intent-export-cc-sdd"), "rules", "map-cc-sdd.md"),
    );
    const formatSection = sliceSection(formatContent, heading);
    const mapSection = sliceSection(mapContent, heading);
    assert.ok(formatSection !== null, `${lang}: packet-format.md に見出し「${heading}」がある`);
    assert.ok(mapSection !== null, `${lang}: map-cc-sdd.md に見出し「${heading}」がある`);
    assert.ok(formatSection.includes("NFC"), `${lang}: スラッグ規則節に NFC 正規化の記載がある (空節でない)`);
    assert.equal(
      formatSection,
      mapSection,
      `${lang}: スラッグ規則節が逐語一致する (変更時は両方を同時に改訂する規約の検査)`,
    );
  });
}

// ---- 項目4: packets SKILL (Req 3.3, 3.5, 7.1) ----
// 非破壊 (破壊せず差分)・supersede + in-flight ガード・claude のみ AskUserQuestion / codex はゼロ。
// (旧 packets.md 移行 Step 1.5 は削除済みのため、移行手順の検査は廃止。)

const PACKETS_SKILL_LITERALS = {
  ja: {
    nonDestructive: ["既存の packet ファイルを破壊していない", "破壊せず差分更新案として提示"],
    supersede: ["`superseded_by` を記入し、`archive/<年>/` へ移動して index を再生成", "改名ではなく supersede として扱う"],
    inFlight: ["**in-flight ガード**", "利用者確認なしに移動しない"],
  },
  en: {
    nonDestructive: ["No existing packet file has been destroyed", "differential update proposals"],
    supersede: ["fill in `superseded_by` on the old packet", "as a supersede, not a rename"],
    inFlight: ["**In-flight guard**", "do not move it without user confirmation"],
  },
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`packets SKILL: ${lang}/${agent} に supersede 手順と in-flight ガードがあり、確認 UI が agent 流儀に従う (7.1, 3.3, 3.5)`, () => {
      const exp = PACKETS_SKILL_LITERALS[lang];
      const content = read(path.join(skillDir(lang, agent, "intent-packets"), "SKILL.md"));
      for (const needle of exp.nonDestructive) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 非破壊「${needle}」がある (3.5)`);
      }
      for (const needle of exp.supersede) {
        assert.ok(content.includes(needle), `${lang}/${agent}: supersede 手順「${needle}」がある (7.1)`);
      }
      for (const needle of exp.inFlight) {
        assert.ok(content.includes(needle), `${lang}/${agent}: in-flight ガード「${needle}」がある (7.1)`);
      }
      if (agent === "claude") {
        assert.ok(
          content.includes("AskUserQuestion"),
          `${lang}/claude: AskUserQuestion による確認がある`,
        );
      } else {
        assert.ok(
          !content.includes("AskUserQuestion"),
          `${lang}/codex: SKILL.md 全体に AskUserQuestion が無い (自然言語確認)`,
        );
      }
    });
  }
}

// ---- 項目5: writeback-protocol (Req 2.5, 3.2, 9.1, 9.5) ----
// §7 完了一連操作 (done・closed_at・spec_refs・archive 移動・index 再生成)・
// 6欄のまま compass-archive へ退避 (要約しない)・archive 明示例外。

const WRITEBACK_LITERALS = {
  ja: {
    completion: [
      "## 7. 完了の一連操作",
      "順序固定の一連の操作",
      "`state: done`・`closed_at`（完了日）・`spec_refs` を記入する",
      "`archive/<closed_at の年>/` へ移動する（削除しない。移動のみ）",
      "`packet_id` 昇順",
    ],
    evacuation: [
      "**6欄のまま**（要約への置換をしない）`.intent/compass-archive.md` の末尾へ移動する",
      "compass-archive.md が不在なら新規作成してから退避する",
    ],
    archiveException: ["**対象解決の archive 例外**", "「通常 archive/ を読まない」原則の唯一の明示例外"],
  },
  en: {
    completion: [
      "## 7. Completion as one sequence of operations",
      "fixed-order sequence of operations",
      "Fill in `state: done`, `closed_at` (completion date), and `spec_refs`",
      "Move the packet file to `archive/<year of closed_at>/` (never delete; move only)",
      "ascending `packet_id` order",
    ],
    evacuation: [
      "**with its 6 fields intact** (no replacement with a summary)",
      "If compass-archive.md is absent, create it anew before evacuating",
    ],
    archiveException: [
      "**Archive exception for target resolution**",
      'the only explicit exception to the principle of "normally never read `archive/`"',
    ],
  },
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`writeback: ${lang}/${agent} に完了一連操作 (done・closed_at・spec_refs・archive 移動・index 再生成) がある (2.5, 3.2)`, () => {
      const content = read(
        path.join(skillDir(lang, agent, "intent-writeback"), "rules", "writeback-protocol.md"),
      );
      for (const needle of WRITEBACK_LITERALS[lang].completion) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 完了一連操作「${needle}」がある`);
      }
    });

    test(`writeback: ${lang}/${agent} に 6欄のまま compass-archive 退避と archive 明示例外がある (9.1, 9.5)`, () => {
      const content = read(
        path.join(skillDir(lang, agent, "intent-writeback"), "rules", "writeback-protocol.md"),
      );
      for (const needle of WRITEBACK_LITERALS[lang].evacuation) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 6欄退避「${needle}」がある (9.1, 9.5)`);
      }
      for (const needle of WRITEBACK_LITERALS[lang].archiveException) {
        assert.ok(content.includes(needle), `${lang}/${agent}: archive 明示例外「${needle}」がある`);
      }
    });
  }
}

// ---- 項目6: compass 二層 (Req 8.1, 9.1) ----
// scaffold (ja/en): 普遍のみ・packet ファイルが正本・compass-archive 退避。
// North Star / Current Drift / Direction / Anti-direction 見出しの構造不変。
// SKILL (×4): 二層解消の Success Criteria。

const COMPASS_SCAFFOLD_LITERALS = {
  ja: {
    universalOnly: "ここに保持するのは**プロジェクト普遍 invariant** のみ",
    packetCanon: ["正本は各 packet ファイル", "Safety / Invariants 節"],
    evacuation: "6欄のまま `.intent/compass-archive.md` へ移動する",
  },
  en: {
    universalOnly: "Only **project-universal invariants** are kept here",
    packetCanon: ["canonical home of **packet-specific invariants**", "Safety / Invariants section of each packet file"],
    evacuation: "with all 6 fields intact to `.intent/compass-archive.md`",
  },
};

const COMPASS_STRUCTURE_HEADINGS = [
  /^## North Star$/m,
  /^## Current Drift$/m,
  /^## Direction$/m,
  /^## Anti-direction$/m,
];

for (const lang of LANGS) {
  test(`compass scaffold: ${lang} が普遍のみ保持・packet ファイル正本・compass-archive 退避を記載し、構造見出しが不変 (8.1, 9.1)`, () => {
    const exp = COMPASS_SCAFFOLD_LITERALS[lang];
    const content = read(path.join(TEMPLATES, lang, "intent", "intent-compass.md"));
    for (const re of COMPASS_STRUCTURE_HEADINGS) {
      assert.match(content, re, `${lang}: 構造見出し ${re} がある (構造不変)`);
    }
    assert.ok(content.includes(exp.universalOnly), `${lang}: 「${exp.universalOnly}」がある (8.1)`);
    for (const needle of exp.packetCanon) {
      assert.ok(content.includes(needle), `${lang}: packet 固有 invariant の正本所在「${needle}」がある (8.1)`);
    }
    assert.ok(content.includes(exp.evacuation), `${lang}: 退避記述「${exp.evacuation}」がある (9.1)`);
  });
}

const COMPASS_SKILL_LITERALS = {
  ja: ["プロジェクト普遍のみが compass に保持され", "packet ファイル（Safety / Invariants）を正本"],
  en: [
    "Only project-universal invariants are kept in the compass",
    "canonical in the packet file (Safety / Invariants)",
  ],
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`compass SKILL: ${lang}/${agent} が Invariants の二層 (普遍 = compass / 固有 = packet ファイル正本) を記載する (8.1)`, () => {
      const content = read(path.join(skillDir(lang, agent, "intent-compass"), "SKILL.md"));
      for (const needle of COMPASS_SKILL_LITERALS[lang]) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 二層記載「${needle}」がある`);
      }
    });
  }
}

// ---- 項目7: 読み手の active 限定 (Req 5.3) ----
// status / validate / improve (各4系統) が横断読みを active/ に限定し、archive/ を読まない
// (writeback の明示例外は項目5で検査済み) と記載していること。

const READER_LITERALS = {
  ja: {
    "intent-status": ["通常の処理ではこの2種のみを読み", "active/ 不在（archive 在中）"],
    "intent-validate": ["`active/` 配下の全件を読む。`archive/` は読まない"],
    "intent-improve": ["active/ 配下の packet ファイル", "archive/ は読まない"],
  },
  en: {
    "intent-status": ["read only these two kinds", "absent from `active/` (residing in archive)"],
    "intent-validate": ["read all files under `active/`; do not read `archive/`"],
    "intent-improve": ["the packet files under active/", "do not read archive/"],
  },
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    for (const skill of Object.keys(READER_LITERALS[lang])) {
      test(`active 限定: ${lang}/${agent} ${skill} が横断読みを active/ に限定し archive/ を読まない (5.3)`, () => {
        const content = read(path.join(skillDir(lang, agent, skill), "SKILL.md"));
        for (const needle of READER_LITERALS[lang][skill]) {
          assert.ok(content.includes(needle), `${lang}/${agent}: ${skill} に「${needle}」がある`);
        }
      });
    }
  }
}

// ---- 項目8: bare packets.md 不在 (Req 10.5) ----
// templates/ 全域を走査し、旧 `.intent/packets.md` の言及が一切残っていないことを検査する。
// 旧 packets.md 移行 (Step 1.5) と旧形式案内を削除したため、修飾付きを許す allowlist は不要になった。
// 部分文字列「packets.md」が配布物のどこにも現れないことを検査する
// (「packets/index.md」等のパスは部分文字列「packets.md」を含まないため対象外)。

test("bare packets.md 不在: templates/ 全域に旧 packets.md の言及が無い (10.5)", () => {
  const files = listFiles(TEMPLATES);
  assert.ok(files.length > 0, "templates/ にファイルがある");

  for (const filePath of files) {
    const rel = path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
    const content = fs.readFileSync(filePath, "utf8");
    assert.ok(
      !content.includes("packets.md"),
      `${rel}: 「packets.md」の言及が無い`,
    );
  }
});

// ---- 項目9: ja/en パリティ (Req 10.1) ----
// 本 spec が新設・全面改稿したファイルの ja↔en 見出しレベル列 (順序付き) の一致。
// 意図的に再検査しないもの:
//   - claude↔codex の rules byte 等価 → agent-rules-parity が担保
//   - hash lock → standard-invariance が担保
//   - plan.md の Walking Skeleton 節パリティの既存版 → poc-coverage が plan.md へ付け替え済み
// rules は claude/codex byte 一致が強制されているため claude 側のみ比較する。

const PARITY_FILES = [
  path.join("claude", "skills", "intent-packets", "rules", "packet-format.md"),
  path.join("intent", "packets", "README.md"),
  path.join("intent", "packets", "plan.md"),
  path.join("intent", "compass-archive.md"),
];

for (const rel of PARITY_FILES) {
  const relPosix = rel.split(path.sep).join("/");
  test(`ja/en パリティ: ${relPosix} の見出しレベル列が一致する (10.1)`, () => {
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
