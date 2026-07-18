// CLI 入口ルーティング（再訪分岐と入口二分岐）の discriminative テスト
//   pkt-20260710-cli-entry-routing-9yv4・C57/A64/DR126・INV56。
//
// 狙い: インストーラー末尾の次アクション案内が「新規/再訪」で出し分けられることを、
//   文言の断片一致でなく**実質**（既存 .intent/ の user-data skip の有無で分岐する）で固定する。
//   新規インストールの案内は従来どおり（/intent-discover が出て /intent-status 案内は出ない）、
//   再実行では「続きは /intent-status」が出る、--force を挟むと新規扱いへ戻る、の対比が
//   誤実装（常に resume を出す・常に discover を出す・force でも resume を出す）を落とす。
//
// node:test + node:assert/strict・依存ゼロ。
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "..", "bin", "cli.mjs");
const ROOT = path.join(__dirname, "..");

function runCli(args) {
  return execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ip-entry-routing-"));
}

// 次アクション節（出力末尾の「次にやること」以降）だけを切り出す。
// 本文中の他の案内（HELP 等）と混同しないため、判定はこの節に限定する。
function nextActionSection(out) {
  const idx = out.lastIndexOf("次にやること");
  assert.ok(idx >= 0, "出力に次アクション節（次にやること）がある");
  return out.slice(idx);
}

// ---- 1. 新規インストール: 従来どおり discover 案内・resume 案内は出ない ----
test("fresh install shows intent-plan next-action and no status-only guidance", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir]);
    const tail = nextActionSection(out);
    assert.match(tail, /\/intent-plan/, "新規は /intent-plan 案内");
    assert.doesNotMatch(tail, /\/intent-status/, "新規の次アクションに /intent-status は出ない");
    assert.doesNotMatch(out, /作業中の \.intent\//, "新規に再訪向けの前置きが出ない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 2. 再実行（既存 .intent/ の user-data が保護スキップされる）: resume 案内が出る ----
test("re-run over existing .intent/ shows intent-plan resume and status-only alternative", () => {
  const dir = tmpDir();
  try {
    runCli([dir]);
    const out = runCli([dir]);
    // 実質の前提: 再実行では user-data の保護スキップが実際に起きている
    assert.match(out, /あなたのデータを保護/, "再実行で user-data 保護スキップが起きている");
    const tail = nextActionSection(out);
    assert.match(tail, /\/intent-plan/, "再実行は /intent-plan（続き）を案内する");
    assert.match(tail, /\/intent-status/, "現在地だけの確認として /intent-status も併記する");
    assert.ok(
      tail.indexOf("/intent-plan") < tail.indexOf("/intent-status"),
      "resume 案内は /intent-plan を先頭に置く",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 3. --force 再実行: user-data も上書き＝新規扱いで discover 案内に戻る ----
test("--force re-run returns to intent-plan guidance (does not recommend status right after data reset)", () => {
  const dir = tmpDir();
  try {
    runCli([dir]);
    // 非対話（テスト実行）では --force の明示自体が同意扱いで実行される
    const out = runCli([dir, "--force"]);
    const tail = nextActionSection(out);
    assert.match(tail, /\/intent-plan/, "--force 後は intent-plan 案内");
    assert.doesNotMatch(tail, /\/intent-status/, "--force 後の次アクションに /intent-status は出ない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 4. en でも同じ分岐（ja/en カタログ対・english-cli-messages 規律の実挙動側） ----
test("resume branching works in en too (What to do next section)", () => {
  const dir = tmpDir();
  try {
    const first = runCli([dir, "--lang", "en"]);
    assert.match(first, /What to do next/, "en の次アクション節が出る");
    assert.doesNotMatch(
      first.slice(first.lastIndexOf("What to do next")),
      /\/intent-status/,
      "en 新規の次アクションに /intent-status は出ない",
    );
    const out = runCli([dir, "--lang", "en"]);
    const tail = out.slice(out.lastIndexOf("What to do next"));
    assert.match(tail, /\/intent-status/, "en 再実行は /intent-status を案内する");
    assert.ok(
      tail.indexOf("/intent-plan") < tail.indexOf("/intent-status"),
      "en でも intent-plan（続き）が先頭",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 5. resume 文言のカタログが ja/en 対で存在し、危険側操作を通常経路として案内しない（INV56） ----
test("nextActionResume exists in both ja/en catalogs and never mentions --force", () => {
  const src = fs.readFileSync(path.join(ROOT, "bin", "cli.mjs"), "utf8");
  const occurrences = src.match(/nextActionResume:/g) ?? [];
  assert.equal(occurrences.length, 2, "nextActionResume は ja/en 両カタログに1つずつ");
  // resume 案内・入口二分岐のどの文言も --force（全上書き）を通常経路として含めない
  const dir = tmpDir();
  try {
    runCli([dir]);
    const out = runCli([dir]);
    const tail = nextActionSection(out);
    assert.doesNotMatch(tail, /--force/, "resume 案内は --force に言及しない（INV56）");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 6. --help: 再開案内が ja/en 両方に1行ある ----
test("--help mentions /intent-status as the resume entrance (ja and en)", () => {
  const ja = runCli(["--help"]);
  assert.match(ja, /\/intent-status/, "ja HELP に /intent-status の再開案内がある");
  const en = runCli(["--help", "--lang", "en"]);
  assert.match(en, /\/intent-status/, "en HELP に /intent-status の再開案内がある");
});
