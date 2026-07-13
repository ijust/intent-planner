// 接合面の結線（pkt-20260711-plugin-seam-wiring-ccak・C63/A68/DR153/DR155/INV83）の不変条件テスト
//   （node:test 標準・依存ゼロ）。
//
// 背景: 造語の検出・救済ツール term-drift（別リポジトリの独立ツール）を intent-planner のプラグインとして
//   繋ぐ4つの接合面。(1) 台帳共有 (2) validate 接続（存在検知で射程を下流へ）(3) installer の導入案内
//   opt-in (4) 検出正本の共有（validate が term-drift の検出 rules を Read で読み LLM 実行）。
//   核心は「term-drift 不在の環境で挙動が1ビットも変わらない」こと（後方互換オラクル）と、
//   「検知・解決で node_modules / npx キャッシュを見ない」こと（そこには過去に publish された古い
//   コピーが落ちてくるため、見に行くと開発中の正本でなく過去版を掴む）。
//   ここでは字面マーカーでなく規定の実質（不在時の沈黙・tool 契約の不変・解決経路の限定・依存の許可域）を
//   検査し、誤実装（不在でも発火する・Bash を足す・node_modules を見る・ijust 配下以外へ依存する）を
//   注入して赤化を実証してから畳む。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { install } from "../src/install.mjs";
import {
  createTermDriftCompatibility,
  inspectTermDrift,
} from "../src/term-drift.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"]; // gemini は codex ツリー共有（専用ファイル無し）。

function checksPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "SKILL.md");
}
function glossaryPath(lang) {
  return path.join(TEMPLATES, lang, "intent", "glossary.md");
}
function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-td-"));
}

const SEAM_AGENT = Object.freeze({
  agentName: "claude",
  termDriftSkillDest: ".claude/skills/term-drift",
});
const SEAM_COMPATIBILITY = createTermDriftCompatibility("fixture-version", {
  commonFiles: {
    ".term-drift/rules/detect.md": "detect fixture\n",
    ".term-drift/rules/workflow.md": "workflow fixture\n",
  },
  skillFiles: {
    "SKILL.md": "skill fixture\n",
    "agents/openai.yaml": "interface: fixture\n",
  },
});

// ---- 1. 詳細healthは対象リポだけを照合する（node_modules・npxキャッシュを見ない） ----
test("1: 詳細healthは目印だけをreadyにせず、一式の不足を報告する", () => {
  const dir = tmpDir();
  assert.deepEqual(inspectTermDrift(dir, SEAM_AGENT, SEAM_COMPATIBILITY), {
    state: "not-installed",
  });
  fs.mkdirSync(path.join(dir, ".term-drift"));
  const markerOnly = inspectTermDrift(dir, SEAM_AGENT, SEAM_COMPATIBILITY);
  assert.equal(markerOnly.state, "inconsistent", "目印だけでは利用可能と判定しない");
  assert.equal(markerOnly.repairability, "additive-compatible");
  assert.ok(markerOnly.issues.every((issue) => issue.code === "missing"));
});

test("1b: node_modules に term-drift のコピーがあっても導入済みと誤判定しない（過去版の影を踏まない）", () => {
  const dir = tmpDir();
  // ツール側のコピー（過去に publish された版）を模す。対象リポには目印を置かない。
  fs.mkdirSync(path.join(dir, "node_modules", "term-drift", ".term-drift"), { recursive: true });
  fs.mkdirSync(path.join(dir, "node_modules", "term-drift", "rules"), { recursive: true });
  fs.writeFileSync(path.join(dir, "node_modules", "term-drift", "rules", "detect.md"), "# 過去版の検出 rules\n");
  assert.deepEqual(
    inspectTermDrift(dir, SEAM_AGENT, SEAM_COMPATIBILITY),
    { state: "not-installed" },
    "node_modules 配下のコピーをhealth判定の入力にしない",
  );
});

test("1c: 検知は read-only（.term-drift/ を作らない・対象リポを改変しない）", () => {
  const dir = tmpDir();
  inspectTermDrift(dir, SEAM_AGENT, SEAM_COMPATIBILITY);
  assert.deepEqual(fs.readdirSync(dir), [], "検知が何も書き込まない");
});

// ---- 2. installer の導入案内は opt-in（既定は何も追加しない・断る操作も要らない） ----
test("2: install は term-drift を配置しない（既定 no・押し付けない）", () => {
  const dir = tmpDir();
  const result = install(dir, { lang: "ja", agent: "claude" });
  assert.equal(Object.hasOwn(result, "termDriftDetected"), false, "旧boolean結果を公開しない");
  assert.deepEqual(inspectTermDrift(dir, SEAM_AGENT, SEAM_COMPATIBILITY), {
    state: "not-installed",
  });
  assert.ok(!fs.existsSync(path.join(dir, ".term-drift")), "install が term-drift を配置しない（opt-in）");
  // 配置物の一覧にも term-drift 由来のファイルが混ざらない。
  assert.ok(
    !result.copied.some((p) => p.includes("term-drift")),
    "配置一覧に term-drift のファイルが無い",
  );
});

test("2b: marker-only repoをready扱いせず、installは利用者の台帳を壊さない（非破壊）", () => {
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, ".term-drift"));
  fs.writeFileSync(path.join(dir, ".term-drift", "glossary.md"), "# 利用者の台帳（消してはいけない）\n");
  const result = install(dir, { lang: "ja", agent: "claude" });
  assert.equal(Object.hasOwn(result, "termDriftDetected"), false, "旧boolean結果を公開しない");
  assert.equal(
    inspectTermDrift(dir, SEAM_AGENT, SEAM_COMPATIBILITY).state,
    "inconsistent",
    "marker-onlyは詳細healthで不整合になる",
  );
  assert.equal(
    fs.readFileSync(path.join(dir, ".term-drift", "glossary.md"), "utf8"),
    "# 利用者の台帳（消してはいけない）\n",
    "利用者の台帳が無傷（INV3 非破壊）",
  );
});

// ---- 3. validate の接続: 存在検知・rules の Read・tool 契約の不変・後方互換（4系統） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の validate-checks が term-drift 接合を規定する（目印・Read・tool 契約・後方互換）`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      if (lang === "ja") {
        // 目印は対象リポの .term-drift/。
        assert.ok(/`\.term-drift\/`/.test(c), "目印が .term-drift/ である");
        // 検出のやり方を委ねる（正本を二重に持たない＝DR155）。
        assert.ok(/検出のやり方を term-drift の検出 rules に委ねる/.test(c), "検出正本を term-drift に委ねる");
        assert.ok(/検出アルゴリズムの正本を二重に持たない/.test(c), "二重実装しない明文");
        // 読むだけで実行する（外部プロセスを起動しない＝tool 契約 Read/Glob/Grep 不変）。
        assert.ok(/Read で読み/.test(c), "rules を Read で読む");
        assert.ok(/外部プロセス・CLI を起動しない/.test(c), "外部プロセスを起動しない");
        assert.ok(/allowed-tools は `Read, Glob, Grep` のまま/.test(c), "tool 契約が不変である明文");
        assert.ok(/Bash を足したら違反/.test(c), "Bash 追加が違反である明文");
        // 解決経路の限定（過去版の影を踏まない）。
        assert.ok(/`node_modules` や npx のキャッシュを検知・解決の経路にしない/.test(c), "キャッシュを見ない");
        // 後方互換（不在時に挙動が1ビットも変わらない）。
        assert.ok(/不在時に挙動が1ビットも変わらない/.test(c), "後方互換オラクルの明文");
        assert.ok(/不在でも案内・検査を足す実装は誤り/.test(c), "不在で発火する実装が誤りである明文");
        // 温度はこちら側の規律のまま（委ねるのはやり方だけ）。
        assert.ok(/報告の温度ではない/.test(c), "報告の温度は委ねない");
      } else {
        assert.ok(/`\.term-drift\/`/.test(c), "目印が .term-drift/ である");
        assert.ok(/delegates how it detects to term-drift's detection rules/i.test(c), "検出正本を term-drift に委ねる");
        assert.ok(/never keep two sources of truth for the detection algorithm/i.test(c), "二重実装しない明文");
        assert.ok(/\*\*Read\*\* term-drift's detection rules/i.test(c), "rules を Read で読む");
        assert.ok(/[Nn]ever launch an external process or CLI/.test(c), "外部プロセスを起動しない");
        assert.ok(/allowed-tools.*stays `Read, Glob, Grep`/i.test(c), "tool 契約が不変である明文");
        assert.ok(/adding Bash is a violation/i.test(c), "Bash 追加が違反である明文");
        assert.ok(/[Nn]ever make `node_modules` or the npx cache a path/.test(c), "キャッシュを見ない");
        assert.ok(/behavior does not change by a single bit when it is absent/i.test(c), "後方互換オラクルの明文");
        assert.ok(/not the temperature of the report/i.test(c), "報告の温度は委ねない");
      }
      // 新しい検査軸を立てない（coinage-suspect の拡張である）。
      assert.ok(
        /新しい検出軸を立てない|No new detection axis/i.test(c),
        `${lang}/${agent}: 新軸を立てない`,
      );
    });

    test(`3b: ${lang}/${agent} の SKILL Step 3.6 が term-drift の存在検知を結線する（不在なら不発火）`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      if (lang === "ja") {
        assert.ok(/term-drift が導入されていれば検出のやり方を委ねる/.test(c), "存在検知の bullet がある");
        assert.ok(/`\.term-drift\/rules\/detect\.md`/.test(c), "rules の解決先が対象リポの配置物である");
        assert.ok(/目印が無ければ本項は一切発火せず/.test(c), "不在なら不発火（後方互換）");
        assert.ok(/`node_modules` や npx のキャッシュを見ない/.test(c), "キャッシュを見ない");
      } else {
        assert.ok(/If term-drift is installed, delegate how to detect/i.test(c), "存在検知の bullet がある");
        assert.ok(/`\.term-drift\/rules\/detect\.md`/.test(c), "rules の解決先が対象リポの配置物である");
        assert.ok(/Without the marker this bullet does not fire at all/i.test(c), "不在なら不発火（後方互換）");
        assert.ok(/[Nn]ever look at `node_modules` or the npx cache/.test(c), "キャッシュを見ない");
      }
    });
  }
}

// ---- 4. validate の tool 契約が実際に不変（frontmatter に Bash が入っていない） ----
test("4: intent-validate の allowed-tools が Read, Glob, Grep のまま（Bash・Write を足していない）", () => {
  for (const lang of LANGS) {
    const c = fs.readFileSync(skillPath(lang, "claude"), "utf8");
    const m = c.match(/^allowed-tools:\s*(.+)$/m);
    assert.ok(m, `${lang}: allowed-tools 行がある`);
    const tools = m[1].split(",").map((t) => t.trim()).sort();
    assert.deepEqual(tools, ["Glob", "Grep", "Read"], `${lang}: read-only の tool 契約が不変（DR155 の不採用代替案＝Bash 追加は違反）`);
  }
});

// ---- 5. 台帳共有の規約（同一台帳・同一スキーマ・承認の関門は同じ） ----
for (const lang of LANGS) {
  test(`5: ${lang} の glossary が term-drift との台帳共有を規定する（同一正本・追加のみの互換契約）`, () => {
    const c = fs.readFileSync(glossaryPath(lang), "utf8");
    if (lang === "ja") {
      assert.ok(/この台帳は term-drift（用語の検出・救済ツール）と共有します/.test(c), "共有の明文");
      assert.ok(/正本として読み\*\*、自分用の台帳を別に作りません/.test(c), "二重台帳を作らない");
      assert.ok(/人が1語ずつ内容を確かめて承認したものだけ/.test(c), "代筆も1語ずつの承認関門を通る");
      assert.ok(/追加のみ・旧い形式は常に読める/.test(c), "バージョン間の互換契約");
    } else {
      assert.ok(/This ledger is shared with term-drift/i.test(c), "共有の明文");
      assert.ok(/does not create a separate ledger of its own/i.test(c), "二重台帳を作らない");
      assert.ok(/only what a human has approved, one term at a time/i.test(c), "代筆も1語ずつの承認関門を通る");
      assert.ok(/additions only; older formats always remain readable/i.test(c), "バージョン間の互換契約");
    }
  });
}

// ---- 6. INV3 改訂のオラクル: npm 依存は ijust 配下のみ（それ以外が入ったら赤） ----
// 依存ゼロの緩和（「自組織 github.com/ijust 配下のパッケージへの依存は許可・それ以外はゼロ」）を守る番人。
// 現時点で実際の依存は0件（検出正本の共有は rules の Read で足りており、決定的層の import 先がまだ無い）。
// 依存を足す将来の変更は、このテストが「ijust 配下か」を必ず問う。
test("6: package.json の依存は ijust 配下のみ（ijust 配下以外の依存があれば赤・INV3 改訂のオラクル）", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  const all = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
  };
  // 自組織（github.com/ijust 配下）のパッケージだけを許可する。
  const ALLOWED = new Set(["term-drift"]);
  for (const name of Object.keys(all)) {
    assert.ok(
      ALLOWED.has(name),
      `依存 "${name}" は ijust 配下ではありません（INV3 改訂: 許可されるのは自組織のパッケージのみ）`,
    );
  }
});

// ---- 7. dogfood（.claude / .intent）が parent と同期している（存在すれば検査） ----
test("7: dogfood の validate-checks / SKILL / glossary が ja/claude と同期している（存在すれば検査）", () => {
  const pairs = [
    [path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "rules", "validate-checks.md"), checksPath("ja", "claude")],
    [path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "SKILL.md"), skillPath("ja", "claude")],
  ];
  for (const [dogfood, parent] of pairs) {
    if (fs.existsSync(dogfood)) {
      assert.equal(fs.readFileSync(dogfood, "utf8"), fs.readFileSync(parent, "utf8"), `${path.basename(dogfood)} が ja/claude と byte 同一`);
    }
  }
  const dogfoodGlossary = path.join(REPO_ROOT, ".intent", "glossary.md");
  if (fs.existsSync(dogfoodGlossary)) {
    assert.ok(
      /この台帳は term-drift（用語の検出・救済ツール）と共有します/.test(fs.readFileSync(dogfoodGlossary, "utf8")),
      "dogfood glossary にも台帳共有の規約がある",
    );
  }
});
