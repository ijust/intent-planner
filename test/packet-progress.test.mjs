// packet-progress (intent-planner-packet-progress) の受け入れ検証 (task 4.1 / 4.2)。
// node:test 標準・依存ゼロ。
//
// 本 spec は実行可能な検証エンジンを持たず、検査・移行の規律は自然言語の正本
// (validate-checks.md / packet-format.md) に宣言的に置かれる (実行は intent-validate
// skill)。よって「変異テスト」「移行テスト」はこの repo の確立パターンに従い、正本に
// 検出力・規律が一意に記述されていることを文言として機械検査する形で実装する:
//
//   - task 4.1: validate-checks.md (×4系統) に dependency-cycle / dependency-broken-ref が
//     区分=整合・深刻度=要修正 で存在し、循環 (A→…→A) と壊れた参照の検出セマンティクスと、
//     read-only・参照先解決範囲 (active+archive 全集合) が記述されている (Req 4.1–4.4)。
//   - task 4.2: packet-format.md (×4系統) に 旧 active→implementing 移行案・draft/done 不変・
//     移動のみ削除しない、および depends_on/Evidence 欠落の堅牢読み (依存なし=空集合 /
//     未記入) と遅延補完 (差分追記) が記述されている (Req 2.5, 9.3)。
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

function read(p) {
  assert.ok(fs.existsSync(p), `対象ファイルが実在する: ${p}`);
  return fs.readFileSync(p, "utf8");
}

function validateChecksPath(lang, agent) {
  return path.join(skillDir(lang, agent, "intent-validate"), "rules", "validate-checks.md");
}

function packetFormatPath(lang, agent) {
  return path.join(skillDir(lang, agent, "intent-packets"), "rules", "packet-format.md");
}

// ---- task 4.1: 依存健全性検査の検出力・規律 (Req 4.1–4.4) ----
// カタログ行 (区分=整合・深刻度=要修正) と循環/壊れ参照のセマンティクス、read-only と
// 参照先解決範囲が正本に一意に記述されていることを検査する。実行エンジンが無いため、
// 正常な depends_on で誤検出しないこと = 検査が「常時」ではあるが対象を `depends_on` 内に
// 限定し循環/不在参照のみを違反とする (= 健全な依存は違反でない) と読めることを文言で担保する。
const DEP_CHECK_LITERALS = {
  ja: {
    // | ID | 区分 | 検査 | 実施条件 | 深刻度 | のデータ行 (区分=整合・要修正)。
    cycleRow: /^\| dependency-cycle \| 整合 \|.*循環依存 A→…→A.*\| 常時 \| 要修正 \|$/m,
    brokenRow: /^\| dependency-broken-ref \| 整合 \|.*存在しない packet_id.*\| 常時 \| 要修正 \|$/m,
    readOnly: "read-only",
    scope: "active+archive の packet_id 全集合",
    // 健全な依存を違反としない = 検査対象が depends_on の循環/不在参照に限定される文言。
    healthy: "depends_on",
  },
  en: {
    cycleRow: /^\| dependency-cycle \| Consistency \|.*cyclic dependency A→…→A.*\| always \| must-fix \|$/m,
    brokenRow: /^\| dependency-broken-ref \| Consistency \|.*packet_id that does not exist.*\| always \| must-fix \|$/m,
    readOnly: "read-only",
    scope: "active+archive packet_ids",
    healthy: "depends_on",
  },
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`依存検査: ${lang}/${agent} の validate-checks.md に dependency-cycle / dependency-broken-ref (区分=整合・要修正) と検出セマンティクスがある (4.1, 4.2, 4.4)`, () => {
      const exp = DEP_CHECK_LITERALS[lang];
      const content = read(validateChecksPath(lang, agent));
      assert.match(content, exp.cycleRow, `${lang}/${agent}: dependency-cycle 行 (循環 A→…→A・要修正) がある (4.1, 4.4)`);
      assert.match(content, exp.brokenRow, `${lang}/${agent}: dependency-broken-ref 行 (不在 packet_id・要修正) がある (4.2, 4.4)`);
    });

    test(`依存検査: ${lang}/${agent} の validate-checks.md に read-only と参照先解決範囲 (active+archive 全集合) が明記されている (4.3, 4.2)`, () => {
      const exp = DEP_CHECK_LITERALS[lang];
      const content = read(validateChecksPath(lang, agent));
      // 両検査 ID が read-only の注記の対象として併記されている (検査が packet 正本を変更しない)。
      assert.ok(content.includes(exp.readOnly), `${lang}/${agent}: read-only の記述がある (4.3)`);
      assert.ok(
        content.includes("dependency-cycle") && content.includes("dependency-broken-ref"),
        `${lang}/${agent}: 両検査 ID が記述されている`,
      );
      // 壊れ参照の存在確認は active+archive 全集合に対して行う (archive 済みも存在扱い)。
      assert.ok(content.includes(exp.scope), `${lang}/${agent}: 参照先解決範囲が active+archive 全集合と明記 (4.2)`);
      // 検査対象が depends_on に限定される = 健全な depends_on (循環なし・参照先実在) は違反でない。
      assert.ok(content.includes(exp.healthy), `${lang}/${agent}: 検査対象が depends_on に限定されている`);
    });
  }
}

// ---- task 4.2: 後方互換移行と欠落キーの堅牢読み (Req 2.5, 9.3) ----
// 旧 active→implementing 提示・draft/done 不変・移動のみ削除しない、および depends_on/Evidence
// 不在の堅牢読み (依存なし=空集合 / 未記入) と遅延補完が正本に記述されていることを検査する。
const MIGRATION_LITERALS = {
  ja: {
    // 移行表の3行 (旧→新)。active→implementing、draft/done は不変。
    migDraft: /^\| `draft` \| `draft` \|/m,
    migActive: /^\| `active` \| `implementing` \|/m,
    migDone: /^\| `done` \| `done` \|/m,
    diffProposal: "差分更新案として提示",
    moveOnly: ["削除しない", "移動のみ"],
    robustRead: ["依存なし（空集合と等価）", "未記入"],
    lazy: "差分追記",
  },
  en: {
    migDraft: /^\| `draft` \| `draft` \|/m,
    migActive: /^\| `active` \| `implementing` \|/m,
    migDone: /^\| `done` \| `done` \|/m,
    diffProposal: "differential",
    moveOnly: ["never delete", "move only"],
    robustRead: ["no dependencies (equivalent to the empty set)", "unfilled"],
    lazy: "differential edit",
  },
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`移行: ${lang}/${agent} の packet-format.md に 旧 active→implementing 移行表・draft/done 不変・移動のみ削除しない がある (2.5, 9.3)`, () => {
      const exp = MIGRATION_LITERALS[lang];
      const content = read(packetFormatPath(lang, agent));
      assert.match(content, exp.migDraft, `${lang}/${agent}: 移行表 draft→draft (不変) がある (2.5)`);
      assert.match(content, exp.migActive, `${lang}/${agent}: 移行表 active→implementing (安全側既定) がある (2.5)`);
      assert.match(content, exp.migDone, `${lang}/${agent}: 移行表 done→done (不変) がある (2.5)`);
      assert.ok(content.includes(exp.diffProposal), `${lang}/${agent}: 差分更新案として提示する旨がある (2.5, 9.3)`);
      for (const needle of exp.moveOnly) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 移動のみ・削除しない「${needle}」がある (9.3)`);
      }
    });

    test(`移行: ${lang}/${agent} の packet-format.md に depends_on/Evidence 欠落の堅牢読みと遅延補完がある (9.3)`, () => {
      const exp = MIGRATION_LITERALS[lang];
      const content = read(packetFormatPath(lang, agent));
      for (const needle of exp.robustRead) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 欠落キーの堅牢読み「${needle}」がある (9.3)`);
      }
      assert.ok(content.includes(exp.lazy), `${lang}/${agent}: depends_on:[] の遅延補完 (差分追記) がある (9.3)`);
    });
  }
}
