// label-symbols.test.mjs — 配布物への記号→ラベル置換の検証
// (pkt-20260704-shipped-internal-symbols-eu3g / A47 / INV59 / DR87)
//
// 判別オラクル（誤った実装を落とす対比）:
//   (a) 台帳読込: 記号→短名(ja/en)台帳から言語別 Map が作れ、壊れた台帳は生成失敗
//   (b) 置換の正しさ: 散文中の（INV5）が短名に置換される（記号が消える）
//   (c) 除外規律: コードブロック内・URL・定義行の記号は置換されない
//   (d) 言語別: templates/ja は ja 短名・templates/en は en 短名で置換される
//   (e) 取りこぼし gate: 台帳に無い記号が散文中に残ると checkLeaks が検出する
//   (f) 冪等: 置換済みへ再置換しても no-op
//   (g) 実データ: リポの台帳が配布物で参照される全記号を網羅する（gate の前提）
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLabelMap,
  replaceSymbolsInText,
  applyToTree,
  checkLeaks,
} from "../scripts/label-symbols.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const LEDGER = path.join(REPO_ROOT, "scripts", "symbol-labels.json");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ip-label-"));
}

// テスト用の最小台帳を書き、そのパスを返す。
function writeLedger(dir, obj) {
  const p = path.join(dir, "ledger.json");
  fs.writeFileSync(p, JSON.stringify(obj));
  return p;
}

const SAMPLE = {
  _comment: "test ledger",
  INV5: { ja: "実装コードを変えない", en: "don't change app code" },
  A7: { ja: "canonical と inferred を混ぜない", en: "don't mix canonical with inferred" },
};

// ---- (a) 台帳読込: 言語別 Map が作れる / 壊れた台帳は失敗 ----
test("buildLabelMap: reads ja/en short names, rejects broken ledgers", () => {
  const dir = tmpDir();
  try {
    const p = writeLedger(dir, SAMPLE);
    const ja = buildLabelMap("ja", p);
    const en = buildLabelMap("en", p);
    assert.equal(ja.get("INV5"), "実装コードを変えない");
    assert.equal(en.get("INV5"), "don't change app code");
    assert.ok(!ja.has("_comment"), "_comment メタキーは含めない");

    assert.throws(() => buildLabelMap("ja", path.join(dir, "nope.json")), /見つかりません/);
    fs.writeFileSync(path.join(dir, "broken.json"), "{ not json");
    assert.throws(() => buildLabelMap("ja", path.join(dir, "broken.json")), /JSON が壊れて/);
    fs.writeFileSync(path.join(dir, "empty.json"), JSON.stringify({ _comment: "x" }));
    assert.throws(() => buildLabelMap("ja", path.join(dir, "empty.json")), /空です/);
    fs.writeFileSync(path.join(dir, "nolang.json"), JSON.stringify({ INV5: { ja: "x" } }));
    assert.throws(() => buildLabelMap("en", path.join(dir, "nolang.json")), /不正です/, "en 短名欠落で失敗");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (b) 置換の正しさ: 散文中の（INV5）が短名に置換され、記号が消える ----
test("replaceSymbolsInText: replaces prose references, symbol disappears", () => {
  const map = new Map([["INV5", "実装コードを変えない"], ["A7", "canonical と inferred を混ぜない"]]);
  const input = "自動で書き換えない（A7・INV5）。実装前は触らない（INV5）。";
  const { text, missing } = replaceSymbolsInText(input, map);
  assert.match(text, /canonical と inferred を混ぜない・実装コードを変えない/, "短名に置換される");
  assert.doesNotMatch(text, /INV5|A7/, "記号が消える（トークンノイズが残らない）");
  assert.equal(missing.size, 0, "台帳にある記号は missing にならない");
});

// ---- (c) 除外規律: コードブロック内・インラインコード・URL の記号は置換されない ----
// 注: 配布物には記号定義行が無い（空 scaffold）ため「定義行そのもの」除外はしない。
// SKILL/rules の `- **A30 説明**` のような箇条書きは置換対象（下の (c') で確認）。
test("replaceSymbolsInText: excludes code blocks, inline code, URLs (DR23)", () => {
  const map = new Map([["INV5", "ラベル5"]]);
  const cases = [
    "```\nINV5 はコード内\n```",
    "インラインは `INV5` のまま",
    "参照 https://example.com/INV5 を含む行",
  ];
  for (const input of cases) {
    const { text } = replaceSymbolsInText(input, map);
    assert.match(text, /INV5/, `除外対象で INV5 が残る: ${input.slice(0, 20)}`);
    assert.doesNotMatch(text, /ラベル5/, `除外対象は置換されない: ${input.slice(0, 20)}`);
  }
});

// ---- (c') 箇条書き中の記号参照は置換する（誤除外しない・gate の穴を塞いだ回帰） ----
test("replaceSymbolsInText: replaces symbols in list-item references (not treated as definition)", () => {
  const map = new Map([["A30", "決定地点で仮説を証拠で裏取りする"]]);
  const input = "- **A30 decision-probe とレーンを分ける**: 本レーンは人間から意図を引き出す。";
  const { text } = replaceSymbolsInText(input, map);
  assert.match(text, /決定地点で仮説を証拠で裏取りする/, "箇条書きの A30 が置換される");
  assert.doesNotMatch(text, /A30/, "記号が残らない（配布物に定義行は無い）");
});

// ---- (d) 言語別: ja は ja 短名・en は en 短名で置換される ----
test("applyToTree: uses ja short names for templates/ja and en for templates/en", () => {
  const dir = tmpDir();
  try {
    const p = writeLedger(dir, SAMPLE);
    const maps = { ja: buildLabelMap("ja", p), en: buildLabelMap("en", p) };
    fs.mkdirSync(path.join(dir, "templates", "ja", "x"), { recursive: true });
    fs.mkdirSync(path.join(dir, "templates", "en", "x"), { recursive: true });
    fs.writeFileSync(path.join(dir, "templates", "ja", "x", "a.md"), "実装前は触らない（INV5）。\n");
    fs.writeFileSync(path.join(dir, "templates", "en", "x", "a.md"), "Before implementing, don't touch (INV5).\n");
    const { changedFiles, missing } = applyToTree(dir, maps);
    assert.equal(changedFiles, 2);
    assert.equal(missing.size, 0);
    const ja = fs.readFileSync(path.join(dir, "templates", "ja", "x", "a.md"), "utf8");
    const en = fs.readFileSync(path.join(dir, "templates", "en", "x", "a.md"), "utf8");
    assert.match(ja, /実装コードを変えない/, "ja テンプレは ja 短名");
    assert.match(en, /don't change app code/, "en テンプレは en 短名");
    assert.doesNotMatch(en, /実装コードを変えない/, "en テンプレに日本語短名が混入しない");
    assert.doesNotMatch(ja + en, /INV5/, "両方で記号が消える");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (e) 取りこぼし gate: 台帳に無い記号が散文中に残ると checkLeaks が検出 ----
test("checkLeaks: detects symbols left in prose (missing from ledger)", () => {
  const dir = tmpDir();
  try {
    fs.mkdirSync(path.join(dir, "templates"), { recursive: true });
    fs.writeFileSync(path.join(dir, "templates", "a.md"), "本文に A99 が残る。\n");
    fs.writeFileSync(path.join(dir, "templates", "b.md"), "`A99` はコード内なので検出しない。\n");
    const { leaks } = checkLeaks(dir);
    assert.equal(leaks.length, 1, "散文中の A99 だけ1件検出（インラインコードは除外）");
    assert.equal(leaks[0].symbol, "A99");
    assert.match(leaks[0].file, /a\.md$/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (f) 冪等: 置換済みへ再置換しても no-op ----
test("applyToTree: idempotent (second run changes nothing)", () => {
  const dir = tmpDir();
  try {
    const p = writeLedger(dir, SAMPLE);
    const maps = { ja: buildLabelMap("ja", p), en: buildLabelMap("en", p) };
    fs.mkdirSync(path.join(dir, "templates", "ja"), { recursive: true });
    fs.writeFileSync(path.join(dir, "templates", "ja", "x.md"), "実装前は触らない（INV5）。関連（A7）。\n");
    const first = applyToTree(dir, maps);
    assert.equal(first.changedFiles, 1);
    const afterFirst = fs.readFileSync(path.join(dir, "templates", "ja", "x.md"));
    const second = applyToTree(dir, maps);
    assert.equal(second.changedFiles, 0, "2回目は何も変えない（冪等）");
    assert.deepEqual(fs.readFileSync(path.join(dir, "templates", "ja", "x.md")), afterFirst, "内容不変");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (g) 実データ: リポの台帳が配布物で参照される全記号を網羅する（gate の前提） ----
test("real ledger covers every symbol referenced in templates (ja and en)", () => {
  const ja = buildLabelMap("ja", LEDGER);
  const en = buildLabelMap("en", LEDGER);
  // templates 配下の全 .md から記号参照を集める（散文・コード問わず・網羅の上限確認なので広めに拾う）。
  const referenced = new Set();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) {
        const text = fs.readFileSync(p, "utf8");
        let m;
        const rx = /(?<![0-9A-Za-z])(INV|DR|A|C)(-[a-z]+)?(\d+)(?![0-9A-Za-z])/g;
        while ((m = rx.exec(text)) !== null) referenced.add(`${m[1]}${m[2] || ""}${m[3]}`);
      }
    }
  };
  walk(path.join(REPO_ROOT, "templates"));
  // A01 等の外部用語（OWASP）は URL 内のみに出るため除外する。
  const external = new Set(["A01"]);
  const missing = [...referenced].filter((s) => !external.has(s) && !ja.has(s));
  assert.deepEqual(missing, [], `台帳に無い記号（配布物で参照）: ${missing.join(", ")}`);
  // ja に在る記号は en にも在る（言語対称）。
  for (const s of ja.keys()) assert.ok(en.has(s), `${s} の en 短名が台帳に在る`);
});

// ---- CLI 統合: --check が実データの置換後ツリーで leak ゼロになる（--apply→--check の一気通貫） ----
test("CLI: --apply then --check leaves no un-resolvable symbols (real templates)", () => {
  const dir = tmpDir();
  try {
    // 定義元は要らない（台帳ベース）。templates だけコピーする。
    fs.cpSync(path.join(REPO_ROOT, "templates"), path.join(dir, "templates"), { recursive: true });
    const CLI = path.join(REPO_ROOT, "scripts", "label-symbols.mjs");
    // --apply（取りこぼしがあれば非ゼロ終了する）
    execFileSync(process.execPath, [CLI, "--apply", dir], { encoding: "utf8" });
    // --check（残存があれば非ゼロ終了する）
    const out = execFileSync(process.execPath, [CLI, "--check", dir], { encoding: "utf8" });
    assert.match(out, /引けない記号は残っていません/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
