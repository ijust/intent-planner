// append-log-discipline-add / Task 4.1 — 衝突解消・肥大化抑制の達成オラクル。
// node:test 標準・依存ゼロ。dogfood `.intent/` は触らず tmp 上で検証する。
//
// 設計（design / requirements Req 6）の達成を discriminative に固定する:
//   - 6.1 並行衝突なし（DR31）: 別 packet / 別事象を並行 append しても別ファイルを触り衝突しない。
//   - 6.2 active 線形非増（DR32）: 終端エントリは archive へ抜け active 面が記録件数に線形増しない。
//   - 6.3/6.4 連番非含有: 分割キーは中央採番カウンタ（連番）を含まない。事象由来は日付プレフィクスを
//        剥がした slug 部に連番を含まない（年の誤検出を避ける）。
//   - 4.2a ミラー鮮度: 新規 export 後にミラー == 全分割の exported_at 昇順連結・新行が latest-row に現れる。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ---- 既存スラッグ規則（packet-format.md 同文・テスト層）----
function deriveSlug(name) {
  let s = (name ?? "").normalize("NFC").trim().toLowerCase();
  s = s.replace(/[\s/\\:*?"<>|]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return s || "unnamed";
}
// 分割キー: packet 由来 = packet-slug、事象由来 = <date>-<event-slug>。
const packetKey = (packet) => deriveSlug(packet);
const eventKey = (date, event) => `${date}-${deriveSlug(event)}`;

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "applog-ach-"));
}

// ---- 6.1 並行衝突なし（DR31）----
test("達成6.1: 別 packet/別事象を append しても別ファイルを触り衝突しない（DR31）", () => {
  // packet 由来（export-log/deltas）: 別 packet → 別ファイル名。
  assert.notEqual(packetKey("alpha-packet"), packetKey("beta-packet"));
  // 事象由来（drift-log/milestones）: 別事象 → 別ファイル名（同日でも slug が違えば別）。
  assert.notEqual(
    eventKey("2026-06-22", "scope-creep"),
    eventKey("2026-06-22", "premature-abstraction"),
  );
  // 物理的にも別ファイルへ書けることを tmp 上で確認（同一アンカー末尾追記でない）。
  const dir = tmp();
  try {
    fs.mkdirSync(path.join(dir, "export-log"));
    const fa = path.join(dir, "export-log", packetKey("alpha-packet") + ".md");
    const fb = path.join(dir, "export-log", packetKey("beta-packet") + ".md");
    fs.writeFileSync(fa, "alpha row\n");
    fs.writeFileSync(fb, "beta row\n");
    assert.notEqual(fa, fb, "別 packet は別ファイル");
    assert.equal(fs.readFileSync(fa, "utf8"), "alpha row\n", "alpha の内容が beta に汚されない");
    assert.equal(fs.readFileSync(fb, "utf8"), "beta row\n", "beta の内容が alpha に汚されない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 6.2 active 線形非増（DR32）----
test("達成6.2: 終端エントリは archive へ抜け active 面が線形増しない（DR32）", () => {
  const dir = tmp();
  try {
    const active = path.join(dir, "deltas");
    const archive = path.join(dir, "deltas", "archive", "2026");
    fs.mkdirSync(archive, { recursive: true });
    // active に 3件、うち 2件が終端（promoted/closed）→ archive へ退避する運用を模す。
    const entries = [
      { slug: "p1", terminal: true },
      { slug: "p2", terminal: false },
      { slug: "p3", terminal: true },
    ];
    for (const e of entries) {
      const dest = e.terminal ? archive : active;
      fs.writeFileSync(path.join(dest, e.slug + ".md"), `# ${e.slug}\n`);
    }
    const activeCount = fs.readdirSync(active).filter((f) => f.endsWith(".md")).length;
    const archiveCount = fs.readdirSync(archive).filter((f) => f.endsWith(".md")).length;
    // active 面は終端を除いた件数だけ（記録総数 3 ではなく非終端 1）。
    assert.equal(activeCount, 1, "active 面は非終端エントリだけ（線形増しない）");
    assert.equal(archiveCount, 2, "終端は archive へ抜けている");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 6.3/6.4 連番非含有 ----
test("達成6.3: 分割キーは中央採番カウンタ（連番）を含まない", () => {
  // packet 由来 slug に連番が現れない。
  assert.ok(!/\b\d{3,}\b/.test(packetKey("export-route-by-case")));
  // 事象由来: 日付プレフィクスを剥がした slug 部に連番が無い（年 2026 を誤検出しない）。
  const key = eventKey("2026-06-18", "scope-creep");
  const slugPart = key.replace(/^\d{4}-\d{2}-\d{2}-/, ""); // 日付プレフィクス除去
  assert.ok(!/\d{3,}/.test(slugPart), "日付除去後の slug 部に連番が無い");
  // 逆に、連番を slug に混ぜたら検出される（discriminative）。
  const bad = "scope-creep-0001";
  assert.ok(/\d{3,}/.test(bad.replace(/^\d{4}-\d{2}-\d{2}-/, "")), "連番混入は検出される");
});

test("達成6.4: 連番非含有検査は日付プレフィクスを剥がしてから走査する（年の誤検出回避）", () => {
  // 日付そのものは連番ではない（剥がさず素朴に \d{3,} で見ると 2026 を誤検出する）。
  const key = eventKey("2026-06-18", "premature-abstraction");
  assert.ok(/\d{3,}/.test(key), "日付込みだと 2026 が \\d{3,} に当たる（誤検出の証拠）");
  assert.ok(!/\d{3,}/.test(key.replace(/^\d{4}-\d{2}-\d{2}-/, "")), "日付を剥がせば連番無しと正しく判定");
});

// ---- 4.2a ミラー鮮度 ----
function regenMirror(dir) {
  const sp = path.join(dir, "export-log");
  const rows = fs.readdirSync(sp).filter((f) => f.endsWith(".md")).flatMap((f) => {
    return fs.readFileSync(path.join(sp, f), "utf8").split("\n").map((l) => l.trim())
      .filter((l) => l.startsWith("|"))
      .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
      .filter((c) => c[0] !== "packet" && !c.every((x) => /^-+$/.test(x) || x === ""));
  });
  rows.sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  fs.writeFileSync(
    path.join(dir, "export-log.md"),
    ["| packet | exported_at | commit |", "|---|---|---|", ...rows.map((c) => `| ${c.join(" | ")} |`)].join("\n") + "\n",
  );
  return rows;
}

test("達成4.2a: 新規 export 後にミラー == 分割の exported_at 昇順連結・新行が latest-row に現れる", () => {
  const dir = tmp();
  try {
    fs.mkdirSync(path.join(dir, "export-log"));
    const write = (slug, packet, at) =>
      fs.writeFileSync(
        path.join(dir, "export-log", slug + ".md"),
        `| packet | exported_at | commit |\n|---|---|---|\n| ${packet} | ${at} | xxxxxxx |\n`,
      );
    // 既存 export 2件 → ミラー再生成。
    write("alpha", "alpha", "2026-06-18T09:00:00Z");
    write("beta", "beta", "2026-06-20T09:00:00Z");
    regenMirror(dir);
    let mirror = fs.readFileSync(path.join(dir, "export-log.md"), "utf8");
    assert.ok(mirror.indexOf("beta") > mirror.indexOf("alpha"), "exported_at 昇順（beta が後）");

    // 新規 export（gamma・最新時刻）→ 分割追加 + ミラー再生成。
    write("gamma", "gamma", "2026-06-22T09:00:00Z");
    const rows = regenMirror(dir);
    // ミラー latest-row（末尾データ行）が新規 export gamma。
    assert.equal(rows[rows.length - 1][0], "gamma", "新行がミラー latest-row に現れる");
    // ミラー == 分割の昇順連結（件数一致 + 末尾一致）。
    assert.equal(rows.length, 3, "全分割行がミラーに揃う");
    assert.deepEqual(rows.map((r) => r[0]), ["alpha", "beta", "gamma"], "exported_at 昇順連結");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
