// 既存ルート文書への intent-planner 節の非破壊追記 (spec: shared-rootdoc-append・INV33/DR51)。
// node:test 標準・依存ゼロ。
//
// 課題 (元バグ): SHARED_RELATIVES (CLAUDE.md / AGENTS.md / GEMINI.md) は decideAction で
//   「shared かつ既存あり → SKIP」になるため、既存ルート文書を持つ利用者 (Claude Code 利用者の
//   ほぼ全員) に quickstart が一度も届かない。append/参照レーンを install 側に外付けして直す。
//
// 受入オラクル (各項目は誤実装なら落ちる discriminative なテスト):
//   1. 元バグ回帰防止: 既存ルート文書 (節なし) があると追記される (SKIP のままなら落ちる)
//   2. 非破壊: 追記前の既存本文のバイト列が不変
//   3. 冪等: 2回流して2回目は追記されない
//   4. 不在は従来 COPY: ルート文書不在なら create (全文配置)・別ファイルを置かない
//   5. 非対話: confirm 不成立で追記されず skipped-no-tty・--yes (同意前渡し) なら追記
//   6. import ハイブリッド: claude/gemini は @参照1行+別ファイル / codex は本文 append
//      (codex に @import 行を書かないこと=沈黙の機能不全を作らない)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  install,
  planRootDoc,
  applyRootDoc,
  makeRootDocConfirm,
  AGENT_REGISTRY,
  defaultTemplatesDir,
  resolveLangRoot,
} from "../src/install.mjs";

const TEMPLATES = defaultTemplatesDir();
const JA_ROOT = resolveLangRoot(TEMPLATES, "ja").langRoot;
const EN_ROOT = resolveLangRoot(TEMPLATES, "en").langRoot;

function tmpDir(prefix = "ip-rootdoc-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
const yes = () => true;
const no = () => false;

// agent ごとの「既存ルート文書 + 期待される追記マーカー」を表に持つ。
const AGENTS = [
  { agent: "claude", rootDoc: "CLAUDE.md", import: true, refFile: "CLAUDE_intent.md", refLine: "@CLAUDE_intent.md" },
  { agent: "gemini", rootDoc: "GEMINI.md", import: true, refFile: "GEMINI_intent.md", refLine: "@./GEMINI_intent.md" },
  { agent: "codex", rootDoc: "AGENTS.md", import: false },
];

// ---- オラクル 1: 元バグ回帰防止 (最重要) ----
// 既存ルート文書 (intent-planner 節なし) を置いて install → 確かに追記される。
// SKIP のままなら (= shared+既存→SKIP を直していなければ) 落ちる。

for (const a of AGENTS) {
  test(`オラクル1 (元バグ回帰防止): 既存 ${a.rootDoc} に install で quickstart が届く (SKIP のままなら落ちる)`, () => {
    const tgt = tmpDir();
    try {
      const userBody = `# 既存プロジェクト\n\nユーザー独自の規約。\n`;
      fs.writeFileSync(path.join(tgt, a.rootDoc), userBody);
      const result = install(tgt, { agent: a.agent, confirmRootDoc: yes });
      const after = fs.readFileSync(path.join(tgt, a.rootDoc), "utf8");

      if (a.import) {
        // A2: 末尾に参照1行が増え、別ファイルが配置される。
        assert.equal(result.rootDoc, "reference", `${a.agent} は A2 (reference)`);
        assert.ok(
          after.split("\n").some((l) => l.trim() === a.refLine),
          `${a.rootDoc} 末尾に参照行 ${a.refLine} が増える`,
        );
        assert.ok(
          fs.existsSync(path.join(tgt, a.refFile)),
          `別ファイル ${a.refFile} が配置される`,
        );
        // 別ファイルは先頭行が # intent-planner の quickstart 本体。
        const refBody = fs.readFileSync(path.join(tgt, a.refFile), "utf8");
        assert.ok(refBody.startsWith("# intent-planner"), `${a.refFile} は quickstart 本体`);
      } else {
        // A1: 本文末尾に # intent-planner セクションが append される。
        assert.equal(result.rootDoc, "append", `${a.agent} は A1 (append)`);
        assert.ok(after.includes("# intent-planner"), `${a.rootDoc} に quickstart セクションが追記される`);
        // codex には別ファイルを置かない。
        assert.ok(
          !fs.existsSync(path.join(tgt, "AGENTS_intent.md")),
          "codex は別ファイルを置かない (本文 append)",
        );
      }
      // どの agent でも「SKIP のまま (追記ゼロ)」ではないことを明示確認。
      assert.notEqual(result.rootDoc, "none", "既存節なしなのに none (追記ゼロ) はバグ");
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  });
}

// ---- オラクル 2: 非破壊 ----
// 追記前後で既存本文のバイト列が一致 (末尾に足した分以外は不変)。上書き・改変なら落ちる。

for (const a of AGENTS) {
  test(`オラクル2 (非破壊): ${a.rootDoc} の既存本文バイト列は不変 (上書き・改変なら落ちる)`, () => {
    const tgt = tmpDir();
    try {
      // 末尾に改行が無い本文でも、既存バイト列は不変であること (改行補完は末尾に足すだけ)。
      const userBody = `# 既存\n\n末尾改行なしの本文`;
      const userBytes = Buffer.from(userBody);
      fs.writeFileSync(path.join(tgt, a.rootDoc), userBytes);
      install(tgt, { agent: a.agent, confirmRootDoc: yes });
      const afterBytes = fs.readFileSync(path.join(tgt, a.rootDoc));
      // 先頭 N バイトが既存本文と完全一致 (= 上書き・並べ替え・削除をしていない)。
      assert.ok(
        afterBytes.subarray(0, userBytes.length).equals(userBytes),
        `${a.rootDoc} の既存本文バイト列が不変 (追記は末尾のみ)`,
      );
      assert.ok(afterBytes.length > userBytes.length, "末尾に追記されている (純増)");
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  });
}

// ---- オラクル 3: 冪等 ----
// 同じ install を2回流して2回目は追記されない (行数・セクション数が増えない)。毎回追記なら落ちる。

for (const a of AGENTS) {
  test(`オラクル3 (冪等): 既存 ${a.rootDoc} へ2回 install しても2回目は追記しない (毎回追記なら落ちる)`, () => {
    const tgt = tmpDir();
    try {
      fs.writeFileSync(path.join(tgt, a.rootDoc), `# 既存\n\n本文\n`);
      const r1 = install(tgt, { agent: a.agent, confirmRootDoc: yes });
      const after1 = fs.readFileSync(path.join(tgt, a.rootDoc), "utf8");
      const r2 = install(tgt, { agent: a.agent, confirmRootDoc: yes });
      const after2 = fs.readFileSync(path.join(tgt, a.rootDoc), "utf8");

      assert.ok(["reference", "append"].includes(r1.rootDoc), "1回目は追記する");
      assert.equal(r2.rootDoc, "none", "2回目は none (冪等・追記しない)");
      assert.equal(after2, after1, `${a.rootDoc} は2回目で変化しない (重複追記しない)`);
      // 参照行/セクションマーカーが1回だけ出現する。
      const marker = a.import ? a.refLine : "# intent-planner";
      const occurrences = after2.split(marker).length - 1;
      assert.equal(occurrences, 1, `${marker} は1回だけ出現 (重複しない)`);
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  });
}

// ---- オラクル 4: 不在は従来 COPY ----
// ルート文書が不在のとき create (全文配置)・append/参照レーンは無関与・別ファイルを置かない。

for (const a of AGENTS) {
  test(`オラクル4 (不在は従来 COPY): ${a.rootDoc} 不在なら create で全文配置・別ファイルは置かない`, () => {
    const tgt = tmpDir();
    try {
      const result = install(tgt, { agent: a.agent, confirmRootDoc: no });
      assert.equal(result.rootDoc, "create", "不在は create (従来 COPY が全文配置)");
      assert.ok(result.copied.includes(a.rootDoc), `${a.rootDoc} が COPY で配置される`);
      const body = fs.readFileSync(path.join(tgt, a.rootDoc), "utf8");
      assert.ok(body.startsWith("# intent-planner"), "全文 quickstart が配置される");
      if (a.import) {
        // 不在ケースでは A2 の別ファイルは配置されない (本文に全文が入っているため)。
        assert.ok(
          !fs.existsSync(path.join(tgt, a.refFile)),
          `不在ケースでは別ファイル ${a.refFile} を置かない`,
        );
      }
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  });
}

// ---- オラクル 5: 非対話 / --yes ----
// confirm 不成立 (非対話で同意なし) なら追記されず skipped-no-tty。--yes (同意前渡し) なら追記。

for (const a of AGENTS) {
  test(`オラクル5 (非対話): 既存 ${a.rootDoc} は confirm 不成立で追記されず skipped-no-tty (無確認書込なら落ちる)`, () => {
    const tgt = tmpDir();
    try {
      const userBody = `# 既存\n\n本文\n`;
      fs.writeFileSync(path.join(tgt, a.rootDoc), userBody);
      const result = install(tgt, { agent: a.agent, confirmRootDoc: no });
      assert.equal(result.rootDoc, "skipped-no-tty", "同意なしは skipped-no-tty");
      const after = fs.readFileSync(path.join(tgt, a.rootDoc), "utf8");
      assert.equal(after, userBody, `${a.rootDoc} は無確認では書き込まれない`);
      if (a.import) {
        assert.ok(!fs.existsSync(path.join(tgt, a.refFile)), `別ファイル ${a.refFile} も配置されない`);
      }
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  });

  test(`オラクル5 (--yes 前渡し): 既存 ${a.rootDoc} は yes で確認を省いて追記する`, () => {
    const tgt = tmpDir();
    try {
      fs.writeFileSync(path.join(tgt, a.rootDoc), `# 既存\n\n本文\n`);
      // --yes 相当: makeRootDocConfirm({ yes: true }) は常に同意 (非対話でも追記)。
      const confirm = makeRootDocConfirm({ yes: true, isTTY: false });
      const result = install(tgt, { agent: a.agent, confirmRootDoc: confirm });
      assert.ok(["reference", "append"].includes(result.rootDoc), "--yes なら追記される");
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  });
}

// makeRootDocConfirm の挙動を単体で固定 (非対話・yes・の分岐)。ハングしないこと=同期で即決すること。
test("makeRootDocConfirm: yes=true は常に同意・非対話 (isTTY=false) は常に拒否 (ハングしない)", () => {
  assert.equal(makeRootDocConfirm({ yes: true, isTTY: false })(), true, "yes=true は同意");
  assert.equal(makeRootDocConfirm({ yes: true, isTTY: true })(), true, "yes は isTTY を上書きして同意");
  assert.equal(makeRootDocConfirm({ yes: false, isTTY: false })(), false, "非対話は拒否 (案内に留める)");
  assert.equal(makeRootDocConfirm({})(), false, "既定 (yes/isTTY 未指定) は拒否");
});

// ---- オラクル 6: import ハイブリッド ----
// claude/gemini は @参照1行+別ファイル / codex は本文 append。
// codex に @import 行を書いていないこと (沈黙の機能不全を作らない) を明示検査。

test("オラクル6 (import ハイブリッド): claude/gemini は参照1行+別ファイル・codex は本文 append で @import 行を書かない", () => {
  // claude: @CLAUDE_intent.md (素の @)。
  {
    const tgt = tmpDir();
    try {
      fs.writeFileSync(path.join(tgt, "CLAUDE.md"), `# c\n`);
      install(tgt, { agent: "claude", confirmRootDoc: yes });
      const after = fs.readFileSync(path.join(tgt, "CLAUDE.md"), "utf8");
      assert.ok(after.split("\n").some((l) => l.trim() === "@CLAUDE_intent.md"), "claude は @CLAUDE_intent.md");
      assert.ok(fs.existsSync(path.join(tgt, "CLAUDE_intent.md")), "別ファイルあり");
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  }
  // gemini: @./GEMINI_intent.md (./ 明示・Memory Import)。
  {
    const tgt = tmpDir();
    try {
      fs.writeFileSync(path.join(tgt, "GEMINI.md"), `# g\n`);
      install(tgt, { agent: "gemini", confirmRootDoc: yes });
      const after = fs.readFileSync(path.join(tgt, "GEMINI.md"), "utf8");
      assert.ok(after.split("\n").some((l) => l.trim() === "@./GEMINI_intent.md"), "gemini は @./GEMINI_intent.md");
      assert.ok(fs.existsSync(path.join(tgt, "GEMINI_intent.md")), "別ファイルあり");
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  }
  // codex: 本文 append・追記分に @ 始まりの行が無い (沈黙の機能不全=@import を書かない)。
  {
    const tgt = tmpDir();
    try {
      const userBody = `# repo\n\nstuff\n`;
      fs.writeFileSync(path.join(tgt, "AGENTS.md"), userBody);
      install(tgt, { agent: "codex", confirmRootDoc: yes });
      const after = fs.readFileSync(path.join(tgt, "AGENTS.md"), "utf8");
      const appended = after.slice(userBody.length);
      assert.ok(appended.includes("# intent-planner"), "codex は本文に quickstart セクションを追記");
      assert.ok(
        !appended.split("\n").some((l) => l.trim().startsWith("@")),
        "codex の追記分に @import 行が無い (沈黙の機能不全を作らない)",
      );
      assert.ok(!fs.existsSync(path.join(tgt, "AGENTS_intent.md")), "codex は別ファイルを置かない");
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  }
});

// ---- planRootDoc 単体: 計画段階の純粋判定 (書き込みなし) ----

test("planRootDoc: 既存ルート文書あり→ reference (claude) / append (codex)・不在→ create・既在→ none", () => {
  // claude: 不在 → create
  {
    const tgt = tmpDir();
    try {
      const p = planRootDoc(tgt, AGENT_REGISTRY.claude, JA_ROOT);
      assert.equal(p.action, "create", "不在は create");
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  }
  // claude: 既存 (節なし) → reference
  {
    const tgt = tmpDir();
    try {
      fs.writeFileSync(path.join(tgt, "CLAUDE.md"), "# x\n");
      const p = planRootDoc(tgt, AGENT_REGISTRY.claude, JA_ROOT);
      assert.equal(p.action, "reference", "既存節なしは reference");
      assert.equal(p.refLine, "@CLAUDE_intent.md", "参照行");
      // 計画段階では書き込まない (別ファイルも未配置)。
      assert.ok(!fs.existsSync(path.join(tgt, "CLAUDE_intent.md")), "planRootDoc は書き込まない");
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  }
  // claude: 既存 (参照行あり) → none
  {
    const tgt = tmpDir();
    try {
      fs.writeFileSync(path.join(tgt, "CLAUDE.md"), "# x\n\n@CLAUDE_intent.md\n");
      const p = planRootDoc(tgt, AGENT_REGISTRY.claude, JA_ROOT);
      assert.equal(p.action, "none", "参照行既在は none (冪等)");
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  }
  // codex: 既存 (セクションあり) → none
  {
    const tgt = tmpDir();
    try {
      fs.writeFileSync(path.join(tgt, "AGENTS.md"), "# x\n\n# intent-planner ...\n");
      const p = planRootDoc(tgt, AGENT_REGISTRY.codex, JA_ROOT);
      assert.equal(p.action, "none", "セクション既在は none (冪等)");
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  }
});

// en でも同型に追記される (ja/en パリティ・doc-sync の取りこぼし防止)。
test("ja/en パリティ: en テンプレでも既存ルート文書へ同型に追記される", () => {
  for (const a of AGENTS) {
    const tgt = tmpDir();
    try {
      fs.writeFileSync(path.join(tgt, a.rootDoc), "# existing\n");
      const result = install(tgt, { agent: a.agent, lang: "en", confirmRootDoc: yes });
      assert.ok(["reference", "append"].includes(result.rootDoc), `en でも ${a.agent} は追記する`);
      if (a.import) {
        const refBody = fs.readFileSync(path.join(tgt, a.refFile), "utf8");
        assert.ok(refBody.startsWith("# intent-planner"), `en の ${a.refFile} は quickstart 本体`);
      }
      void EN_ROOT;
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  }
});
