// milestones 機構の撤去（pkt-20260711-milestones-decommission-s0am・DR148）の判別テスト。
//
// 撤去は3段で行う。各段は「消えたこと」と「残すべきものが健在なこと」を対で検査する
// （Anti 446: 「消すだけだからテストは減る」に流れず、消し忘れと巻き添えの両方を落とす）。
//
//   段① 照合停止 … test/improve-induction.test.mjs（読み手4経路の反転検査）
//   段② 配布停止 … 本ファイル（配られない・既存ファイルは触られない）
//   段③ 痕跡整理 … 本ファイル（CONTRACT 5→4・残り4ファイルの規約は byte 不変）
//
// 撤去語の表記ゆれ（milestones.md / milestones/ / 節目イベント / 未消化 milestone）は
// 寛容な regex で拾う。ただし普通名詞の "milestone"（「実装の節目に improve を回す」等）は
// 撤去対象ではないため、機構を指す語だけを判別する。

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { computeCopyPlan, install, classifyFile, resolveLangRoot } from "../src/install.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const TEMPLATES = path.join(ROOT, "templates");
const LANGS = ["ja", "en"];

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "ip-milestones-"));
const read = (p) => fs.readFileSync(p, "utf8");

// ---------------------------------------------------------------------------
// 段② 配布停止
// ---------------------------------------------------------------------------

// (1) templates から scaffold が消えている（消し忘れが赤になる）。
for (const lang of LANGS) {
  test(`段②: templates/${lang} に milestones の scaffold が存在しない`, () => {
    assert.ok(
      !fs.existsSync(path.join(TEMPLATES, lang, "intent", "milestones.md")),
      `${lang}: milestones.md が配布物に残っていない`,
    );
    assert.ok(
      !fs.existsSync(path.join(TEMPLATES, lang, "intent", "milestones")),
      `${lang}: milestones/ ディレクトリが配布物に残っていない`,
    );
  });
}

// (2) 新規インストールの配置計画に milestones が現れない
//     （templates に残した・installer から抜き忘れた実装が赤になる）。
for (const lang of LANGS) {
  test(`段②: 新規インストールの配置計画に milestones が現れない (${lang})`, () => {
    const tgt = tmpDir();
    try {
      const { langRoot } = resolveLangRoot(TEMPLATES, lang);
      const plan = computeCopyPlan(langRoot, tgt, {});
      const hits = plan.filter((e) => /milestones/i.test(e.relative));
      assert.equal(
        hits.length,
        0,
        `${lang}: 配置計画に milestones が現れない（現れた: ${JSON.stringify(hits)}）`,
      );
      // 隣接の .intent/ 配布物は従来どおり計画に載る（巻き添えで配布ごと壊していない）。
      assert.ok(
        plan.some((e) => e.relative === path.join(".intent", "README.md")),
        `${lang}: 隣接の .intent 配布物は従来どおり計画に載る`,
      );
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  });
}

// (3) 非破壊（本 packet の最大リスク）: 既存の milestones ファイルを持つ環境で
//     アップグレードしても、当該ファイルが読まれず・触られず・削除もされない。
//     installer から USER_DATA_RELATIVES のエントリを抜いた結果、万が一 templates に
//     同名パスが残っていると分類が code に落ち、既存利用者のファイルを上書きしうる。
test("段②: 既存の milestones ファイルは触られない（非破壊・最大リスクの見張り）", () => {
  const tgt = tmpDir();
  try {
    install(tgt, { lang: "ja" });

    // 利用者が育てた milestones を模す（台帳本体 + 分割形の実エントリ）。
    const mdRel = path.join(".intent", "milestones.md");
    const splitRel = path.join(".intent", "milestones", "2026-06-18-本番構成を確定.md");
    fs.mkdirSync(path.dirname(path.join(tgt, splitRel)), { recursive: true });
    fs.writeFileSync(path.join(tgt, mdRel), "USER-MILESTONES-LEDGER");
    fs.writeFileSync(path.join(tgt, splitRel), "USER-MILESTONE-ENTRY");
    const mtimeBefore = fs.statSync(path.join(tgt, mdRel)).mtimeMs;

    // upgrade（update）でも force でも触られないこと。force は「上書きする」経路なので、
    // ここで触られたら分類が code に落ちている（＝最大リスクが顕在化している）。
    for (const opts of [{ lang: "ja" }, { lang: "ja", update: true }, { lang: "ja", force: true }]) {
      const result = install(tgt, opts);
      const touched = [...(result.copied ?? []), ...(result.updated ?? [])].filter((r) =>
        /milestones/i.test(r),
      );
      assert.equal(
        touched.length,
        0,
        `install(${JSON.stringify(opts)}): milestones を触っていない（触った: ${JSON.stringify(touched)}）`,
      );
    }

    assert.equal(read(path.join(tgt, mdRel)), "USER-MILESTONES-LEDGER", "台帳の中身が保持される");
    assert.equal(read(path.join(tgt, splitRel)), "USER-MILESTONE-ENTRY", "分割形の中身が保持される");
    assert.equal(
      fs.statSync(path.join(tgt, mdRel)).mtimeMs,
      mtimeBefore,
      "台帳は書き直されない（mtime 不変）",
    );
    assert.ok(fs.existsSync(path.join(tgt, splitRel)), "分割形は削除されない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// (4) 隣接 user-data エントリが従来どおり保護される
//     （USER_DATA_RELATIVES を「整理」した実装が赤になる）。
test("段②: 隣接の user-data エントリは user-data 分類のまま（巻き添えの見張り）", () => {
  for (const rel of [
    path.join(".intent", "glossary.md"),
    path.join(".intent", "constraint-library.md"),
    path.join(".intent", "drift-patterns.md"),
    path.join(".intent", "packets", "plan.md"),
  ]) {
    assert.equal(
      classifyFile(rel),
      "user-data",
      `${rel} は user-data 分類のまま（撤去の巻き添えで分類が変わっていない）`,
    );
  }
});

// ---------------------------------------------------------------------------
// 段③ 痕跡整理
// ---------------------------------------------------------------------------

const CONTRACT = (lang, agent) =>
  path.join(TEMPLATES, lang, agent, "skills", "CONTRACT.md");
const AGENTS = ["claude", "codex"];

// (5) CONTRACT の append-only 規約から milestones が消え、残り4ファイルは健在。
//     「ついでに整理」した実装（Anti 443）は、残り4ファイルの検査で赤になる。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`段③: CONTRACT の append-only 規約が4ファイル（${lang}/${agent}）`, () => {
      const c = read(CONTRACT(lang, agent));
      assert.ok(!/milestones/i.test(c), "milestones が append-only 規約から消えている");
      // 残り4ファイルの規約が健在（巻き添えで消していない）。
      for (const keep of ["deltas", "export-log", "drift-log", "compass-archive"]) {
        assert.ok(
          c.includes(keep),
          `残り4ファイルの規約が健在: ${keep}（撤去の巻き添えで消していない）`,
        );
      }
      // 分類（packet 由来 / 事象由来 / rule 単位）の規約そのものが健在。
      // milestones は「事象由来」の一例だったが、drift-log が残るため分類自体は生きる
      // （機能を消しても普遍規律は残し主語だけ開く＝A67）。
      const byPacket = lang === "ja" ? /packet 由来/ : /packet-origin/;
      const byEvent = lang === "ja" ? /事象由来/ : /event-origin/;
      assert.ok(byPacket.test(c), "packet 由来 の分類規約が健在");
      assert.ok(byEvent.test(c), "事象由来 の分類規約が健在（drift-log が残るため分類は生きる）");
      assert.ok(
        /drift-log\/<date>-<slug>\.md/.test(c),
        "事象由来の実例（drift-log の日付+slug 単位）が健在",
      );
    });
  }
}

// (6) 配布物に milestones 機構への言及が残らない（表記ゆれ含む）。
//     普通名詞の "milestone"（「実装の節目に improve を回す」等）は撤去対象ではないため、
//     機構を指す語（.intent/milestones.md・milestones/ ディレクトリ・節目イベント台帳）で判別する。
test("段③: 配布物に milestones 機構への言及が残らない（表記ゆれ含む）", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile() && p.endsWith(".md")) {
        const c = read(p);
        // 機構を指す表現だけを拾う（普通名詞の milestone は対象外）。
        if (
          /\.intent\/milestones/i.test(c) ||
          /milestones\.md/i.test(c) ||
          /未消化 milestone/i.test(c) ||
          /節目イベント/.test(c)
        ) {
          offenders.push(path.relative(ROOT, p));
        }
      }
    }
  };
  walk(TEMPLATES);
  assert.deepEqual(offenders, [], `配布物に milestones 機構への言及が残っている: ${offenders}`);
});
