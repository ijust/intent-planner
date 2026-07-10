// exit-install-aware-route: 出口判定に (1) speckit 結線 (2) 導入状況を踏まえた候補提示 を足す
// packet: pkt-20260710-exit-install-aware-route-dial（cpsz を supersede して統合）
// intent: C60 / A65 / DR134（+ 継承 C28 / A43 / DR77）
//
// 検証対象:
//   part1  speckit の4系統結線（export-route 値域+明示レーン・discover 追認肢・
//          packets 分岐・writeback-protocol §1 の対象特定）
//   part2  推論レーンの3目印化と候補提示の並び・注記・適合の一言（DR134）
//          — 旧挙動（`.kiro/` 単独観測 / cc-sdd 筆頭固定）に戻すと赤化する反転検査を含む
//
// 分離の理由: export-route.test.mjs（seam スライスの契約・VALID_FORMATS 3値）を
//   書き換えず、本スライスの契約を別ファイルで持つ（writeback-target-by-route の前例）。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const VARIANTS = ["ja/claude", "ja/codex", "en/claude", "en/codex"];
const routeRule = (v) => path.join(ROOT, `templates/${v}/skills/intent-packets/rules/export-route.md`);
const discoverSkill = (v) => path.join(ROOT, `templates/${v}/skills/intent-discover/SKILL.md`);
const packetsSkill = (v) => path.join(ROOT, `templates/${v}/skills/intent-packets/SKILL.md`);
const writebackRule = (v) => path.join(ROOT, `templates/${v}/skills/intent-writeback/rules/writeback-protocol.md`);
const read = (p) => fs.readFileSync(p, "utf8");

// 導入目印（3ツール）。目印の文字列そのものを検査対象にする（観測入力の実体）。
const MARKERS = [
  { tool: "cc-sdd", marker: ".kiro/", exit: "/intent-export-cc-sdd" },
  { tool: "openspec", marker: "openspec/", exit: "/intent-export-openspec" },
  { tool: "speckit", marker: ".specify/", exit: "/intent-export-speckit" },
];

// ---- part1: speckit の4系統結線 ----

test("part1 export-route の format 値域に speckit があり、明示レーンで /intent-export-speckit に対応する（4系統）", () => {
  for (const v of VARIANTS) {
    const body = read(routeRule(v));
    assert.match(body, /`speckit`/, `${v}: 値域に speckit がある`);
    // 誤記を落とす: speckit トークンと出口コマンドが同一行で対応している
    const corresponds = body
      .split("\n")
      .some((l) => /`speckit`/.test(l) && l.includes("/intent-export-speckit"));
    assert.ok(corresponds, `${v}: 明示レーンで speckit → /intent-export-speckit が同一行で対応する`);
  }
});

test("part1 discover SKILL の format 追認肢に speckit がある（書き手は discover のみ・DR26 維持）", () => {
  for (const v of VARIANTS) {
    const body = read(discoverSkill(v));
    assert.match(body, /`speckit`/, `${v}: discover が format 値 speckit に言及する`);
    // 書き手一元化（DR26）の記述が残っている
    const soleWriter = v.startsWith("ja")
      ? /format の書き手は `\/intent-discover` のみ/.test(body)
      : /Only `\/intent-discover` writes the format/i.test(body);
    assert.ok(soleWriter, `${v}: format の書き手は discover のみ、が保たれている`);
  }
});

test("part1 packets SKILL の次の一手分岐に speckit がある（4系統）", () => {
  for (const v of VARIANTS) {
    const body = read(packetsSkill(v));
    const corresponds = body
      .split("\n")
      .some((l) => /`speckit`/.test(l) && l.includes("/intent-export-speckit"));
    assert.ok(corresponds, `${v}: packets の分岐に speckit → /intent-export-speckit の対応がある`);
  }
});

test("part1 writeback-protocol §1 の対象特定が speckit 下書き（.intent/speckit/）を読む（4系統）", () => {
  for (const v of VARIANTS) {
    const body = read(writebackRule(v));
    assert.match(body, /\.intent\/speckit\//, `${v}: §1 が .intent/speckit/ を読む`);
    assert.match(body, /speckit/, `${v}: format=speckit への言及がある`);
  }
});

// 1系統でも欠けたら落ちる（4系統横断の存在検査＝パリティの判別オラクル）
test("part1 speckit 結線は4系統すべてに揃う（1系統でも欠けたら赤）", () => {
  const missing = [];
  for (const v of VARIANTS) {
    if (!/speckit/.test(read(routeRule(v)))) missing.push(`${v}:export-route`);
    if (!/speckit/.test(read(discoverSkill(v)))) missing.push(`${v}:discover`);
    if (!/speckit/.test(read(packetsSkill(v)))) missing.push(`${v}:packets`);
    if (!/speckit/.test(read(writebackRule(v)))) missing.push(`${v}:writeback`);
  }
  assert.deepEqual(missing, [], `speckit 結線が欠けている系統: ${missing.join(", ")}`);
});

// ---- part2: 導入状況を踏まえた候補提示（DR134） ----

test("part2 export-route の入力節が3ツールの導入目印をすべて観測する（.kiro/ 単独観測に戻すと赤）", () => {
  for (const v of VARIANTS) {
    const body = read(routeRule(v));
    for (const { tool, marker } of MARKERS) {
      assert.ok(
        body.includes(marker),
        `${v}: 導入目印 "${marker}"（${tool}）が観測入力に書かれている`,
      );
    }
  }
});

test("part2 各導入目印がその出口と同一行で対応づく（目印→出口の誤記を落とす）", () => {
  for (const v of VARIANTS) {
    const lines = read(routeRule(v)).split("\n");
    for (const { tool, marker, exit } of MARKERS) {
      const corresponds = lines.some((l) => l.includes(marker) && l.includes(exit));
      assert.ok(corresponds, `${v}: 目印 "${marker}" が同一行で出口 "${exit}"（${tool}）に対応する`);
    }
  }
});

// 並び順は「その語が本文のどこかにある」ではなく、B-2 の番号付き手順で
// 「導入済みを先に置く」段が「未導入を後ろに置く」段より前に現れる位置関係で検査する
// （句の存在だけを見ると、否定文の中にあっても緑になる＝表面マーカー素通り）。
test("part2 推論レーンで「導入済みを先に」の手順が「未導入は後ろに」の手順より前にある（位置関係で検査）", () => {
  for (const v of VARIANTS) {
    const body = read(routeRule(v));
    const ja = v.startsWith("ja");
    // B-2 セクション本体を切り出して、その内側だけを見る
    const section = ja
      ? body.split("#### B-2")[1]
      : body.split("#### B-2")[1];
    assert.ok(section, `${v}: B-2（導入状況で並べる）セクションがある`);
    const body2 = section.split("### C")[0];

    const firstStep = ja
      ? /^\s*1\.\s+\*\*導入済みのツール\*\*/m
      : /^\s*1\.\s+List the \*\*tools that are set up\*\*/mi;
    const secondStep = ja
      ? /^\s*2\.\s+\*\*未導入のツール\*\*/m
      : /^\s*2\.\s+List the \*\*tools that are not set up\*\*/mi;

    const iFirst = body2.search(firstStep);
    const iSecond = body2.search(secondStep);
    assert.ok(iFirst >= 0, `${v}: 手順1が「導入済みのツールを先に並べる」である`);
    assert.ok(iSecond >= 0, `${v}: 手順2が「未導入のツールを後ろに並べる」である`);
    assert.ok(
      iFirst < iSecond,
      `${v}: 導入済みを置く手順が、未導入を置く手順より前にある（順序が逆なら赤）`,
    );

    const needsSetupNote = ja ? /「導入が要る」/.test(body2) : /needs setup/i.test(body2);
    assert.ok(needsSetupNote, `${v}: 未導入への「導入が要る」注記の規約がある`);
  }
});

// 適合の一言は「1行あればよい」ではなく、出口ごとに**互いに異なり**、
// その出口固有の語を含むことを検査する（同一の定型文を全行へコピペしても緑、を防ぐ）。
test("part2 各出口の案件適合の一言が互いに異なり、その出口固有の語を含む", () => {
  // 各出口の一言に必ず現れる固有語（そのツールの流儀を表す語）
  const FIT_MARKERS = {
    "/intent-export-cc-sdd": { ja: [/要件/, /設計/, /タスク/], en: [/requirements/i, /design/i, /tasks/i] },
    "/intent-export-openspec": { ja: [/提案|proposal/], en: [/proposal/i] },
    "/intent-export-speckit": { ja: [/Spec Kit/], en: [/Spec Kit/i] },
    "/intent-to-spec": { ja: [/読める成果物|文書/], en: [/readable artifact|document/i] },
  };

  for (const v of VARIANTS) {
    const body = read(routeRule(v));
    const lang = v.startsWith("ja") ? "ja" : "en";
    // 適合の一言の表は B-2 セクションの内側にある（目印表〔入力節〕と取り違えない）
    const section = body.split("#### B-2")[1];
    assert.ok(section, `${v}: B-2 セクションがある`);
    const lines = section.split("### C")[0].split("\n");
    const notes = {};

    for (const exit of Object.keys(FIT_MARKERS)) {
      // 適合の一言の表行: | `出口` | 一言 |（一言セルは出口コマンドを含まない実文）
      const row = lines.find((l) => {
        if (!l.trim().startsWith("|") || !l.includes(exit)) return false;
        const cells = l.split("|").map((c) => c.trim()).filter(Boolean);
        return cells.length >= 2 && cells.some((c) => !c.includes(exit) && c.length > 10);
      });
      assert.ok(row, `${v}: 出口 "${exit}" に案件適合の一言の表行がある（B-2 の表）`);

      const note = row
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean)
        .find((c) => !c.includes(exit) && c.length > 10);
      notes[exit] = note;

      // 固有語（そのツールの流儀）を含む＝汎用の定型文では通らない
      for (const re of FIT_MARKERS[exit][lang]) {
        assert.match(note, re, `${v}: "${exit}" の一言が固有語 ${re} を含む（汎用の定型文では赤）`);
      }
    }

    // 一言は出口ごとに互いに異なる（同一文のコピペを落とす）
    const values = Object.values(notes);
    assert.equal(
      new Set(values).size,
      values.length,
      `${v}: 各出口の一言が互いに異なる（同一の定型文を並べていない）: ${JSON.stringify(values)}`,
    );
  }
});

test("part2 導入状況は gate でない（未導入を消さない・止めない・インストール代行しない）", () => {
  for (const v of VARIANTS) {
    const body = read(routeRule(v));
    const notGate = v.startsWith("ja")
      ? /gate ではない|gate にしない/.test(body)
      : /not a gate|never a gate|do not turn .* into a gate/i.test(body);
    assert.ok(notGate, `${v}: 導入状況を gate にしない旨が明記されている`);

    const keepCandidates = v.startsWith("ja")
      ? /候補から\*\*?消さない|候補から消さない/.test(body)
      : /never drop|do not (drop|exclude)/i.test(body);
    assert.ok(keepCandidates, `${v}: 未導入を候補から消さない旨が明記されている`);
  }
});

test("part2 併存導入済みの間に優先順位を発明しない（Anti-256/414 の維持）", () => {
  for (const v of VARIANTS) {
    const body = read(routeRule(v));
    const noPriority = v.startsWith("ja")
      ? /優先順位を発明せず|優先を発明しない|優先順位を発明しない/.test(body)
      : /do not invent a priority/i.test(body);
    assert.ok(noPriority, `${v}: 併存導入済み間の優先を発明しない旨が明記されている`);
  }
});

test("part2 導入検知をレジストリ・スクリプト・自動診断エンジンに寄せない（Anti-412）", () => {
  for (const v of VARIANTS) {
    const body = read(routeRule(v));
    assert.match(body, /intent-check/, `${v}: 機械検査に寄せない規律が残っている`);
    const noRegistry = v.startsWith("ja")
      ? /ツールレジストリ.*作らない|レジストリ・導入検知スクリプト/.test(body)
      : /do not build a tool registry/i.test(body);
    assert.ok(noRegistry, `${v}: レジストリ・検知スクリプト・自動診断を作らない旨がある`);
  }
});

test("part2 目印が読めないときは未導入扱いで判定を止めない（fail-open）", () => {
  for (const v of VARIANTS) {
    const body = read(routeRule(v));
    const failOpen = v.startsWith("ja")
      ? /fail-open|判定を止めない/.test(body)
      : /fail-open|do not stop the decision/i.test(body);
    assert.ok(failOpen, `${v}: 目印が読めないときの fail-open が明記されている`);
  }
});

// 反転検査（DR134）: 旧挙動「standard 系 + .kiro/ 不在 → cc-sdd を筆頭固定」へ
// 戻すと赤化する。導入状況を見ずに cc-sdd を先頭に断定する記述を許さない。
test("part2 [反転・DR134] 未導入の cc-sdd を筆頭に断定する記述が残っていない", () => {
  for (const v of VARIANTS) {
    const lines = read(routeRule(v)).split("\n");
    const asserts = lines.filter((l) => {
      const promotesCcSdd = v.startsWith("ja")
        ? /\/intent-export-cc-sdd.*(候補筆頭|筆頭)/.test(l)
        : /\/intent-export-cc-sdd.*top candidate/i.test(l);
      return promotesCcSdd;
    });
    assert.deepEqual(
      asserts,
      [],
      `${v}: cc-sdd を筆頭固定する行が残っている（DR134 で導入状況による並びへ改訂済みのはず）: ${asserts.join(" / ")}`,
    );
  }
});

test("part2 [反転・DR134] 推論レーンの観測入力が「.kiro/ の有無」だけに戻っていない", () => {
  for (const v of VARIANTS) {
    const body = read(routeRule(v));
    // .kiro/ を書きつつ、他2目印を書いていない＝旧世界
    const onlyKiro =
      body.includes(".kiro/") && !body.includes(".specify/") && !/(^|\W)openspec\//.test(body);
    assert.ok(!onlyKiro, `${v}: 観測入力が .kiro/ 単独に退行している`);
  }
});

// ---- パリティ（rule は byte 等価コピー・SKILL は agent 別本文） ----

test("export-route.md は各言語内で claude⇔codex が byte 等価・ja↔en は翻訳", () => {
  const jaC = read(routeRule("ja/claude"));
  const jaX = read(routeRule("ja/codex"));
  const enC = read(routeRule("en/claude"));
  const enX = read(routeRule("en/codex"));
  assert.equal(jaC, jaX, "ja: claude⇔codex が byte 等価");
  assert.equal(enC, enX, "en: claude⇔codex が byte 等価");
  assert.notEqual(jaC, enC, "ja↔en は翻訳（byte 等価でない）");
});

test("writeback-protocol.md は各言語内で claude⇔codex が byte 等価", () => {
  assert.equal(read(writebackRule("ja/claude")), read(writebackRule("ja/codex")));
  assert.equal(read(writebackRule("en/claude")), read(writebackRule("en/codex")));
});

test("mode.local.md の format 値域説明に5値（speckit / direct 含む）が載る", () => {
  for (const lang of ["ja", "en"]) {
    const body = read(path.join(ROOT, `templates/${lang}/intent/mode.local.md`));
    for (const fmt of ["cc-sdd", "openspec", "speckit", "to-spec", "direct"]) {
      assert.ok(body.includes(fmt), `${lang}: mode.local.md の値域説明に "${fmt}" がある`);
    }
  }
});
