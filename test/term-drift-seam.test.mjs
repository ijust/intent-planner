// 接合面の結線（pkt-20260711-plugin-seam-wiring-ccak・C63/A68/DR153/DR155/INV83）の不変条件テスト
//   （node:test 標準・依存ゼロ）。
//
// 背景: 造語の検出・救済ツール term-drift（別リポジトリの独立ツール）を intent-planner のプラグインとして
//   繋ぐ4つの接合面。(1) 台帳共有 (2) validate の保守的な配置検知 (3) installer の opt-in health 確認
//   (4) 専用 term-drift skill への本格点検委譲。
//   核心は「配置物ありでは validate が用語判定や health 判定を複製せず installer dry-run へ案内する」ことと、
//   「配置物なしでは従来 coinage-suspect の挙動を変えない」こと。詳細 health の正本は
//   src/term-drift.mjs の inspector 一つに保ち、validate は version/hash/必要ファイル集合/agent 対応を持たない。
//   ここでは誤実装（detect.md 直接実行・markerだけでready・health 契約複製・配置なしで従来検出を消す・
//   Bash を足す）を落とせる規定の実質を検査する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_REGISTRY, install } from "../src/install.mjs";
import {
  createTermDriftCompatibility,
  inspectTermDrift,
} from "../src/term-drift.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];
const AGENTS = [
  ...new Set(Object.values(AGENT_REGISTRY).map((entry) => entry.skillSubdir)),
]; // gemini は registry 上で codex ツリー共有（専用ファイル無し）。

function checksPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "SKILL.md");
}
function step36(content) {
  return content.match(/### Step 3\.6[\s\S]*?(?=\n### Step 3\.7)/)?.[0];
}
function termDriftChecksSection(content) {
  const heading = content.match(/^## [^\n]*term-drift[^\n]*$/m);
  if (heading?.index === undefined) return undefined;
  const sectionAndRest = content.slice(heading.index);
  const nextHeading = sectionAndRest.indexOf("\n## ", heading[0].length);
  return nextHeading === -1 ? sectionAndRest : sectionAndRest.slice(0, nextHeading);
}
function coinageCatalogRow(content) {
  return content.match(/^\| coinage-suspect \|.*$/m)?.[0];
}
function assertSelectedAgentArtifactScope(content, lang, label) {
  if (lang === "ja") {
    assert.match(
      content,
      /選択中 agent の設定ディレクトリ/,
      `${label}: 選択中 agent の専用 skill だけを配置物として検知する`,
    );
    assert.doesNotMatch(
      content,
      /対象リポ内の agent 設定ディレクトリ/,
      `${label}: 任意 agent の専用 skill を配置物として扱わない`,
    );
  } else {
    assert.match(
      content,
      /the selected agent's configuration directory/i,
      `${label}: only the selected agent's dedicated skill counts as a placement`,
    );
    assert.doesNotMatch(
      content,
      /\b(?:an|any) agent-configuration directory\b/i,
      `${label}: another arbitrary agent's dedicated skill does not count as a placement`,
    );
  }
}
function glossaryPath(lang) {
  return path.join(TEMPLATES, lang, "intent", "glossary.md");
}
function publicDocPath(lang, surface) {
  const suffix = lang === "ja" ? ".md" : ".en.md";
  return surface === "README"
    ? path.join(REPO_ROOT, `README${suffix}`)
    : path.join(REPO_ROOT, "docs", `${surface}${suffix}`);
}
function assertNoLegacyRulesExecution(content, label) {
  assert.doesNotMatch(
    content,
    /term-drift の検出 rules を\s*(?:Read で)?読み[\s\S]{0,80}(?:規定どおり|LLM.{0,20}実行)/i,
    `${label}: validate が rules を読み実行する旧説明を残さない`,
  );
  assert.doesNotMatch(
    content,
    /(?:read|reads|reading) term-drift(?:'s)? detection rules[\s\S]{0,100}(?:LLM|run them|execute them)/i,
    `${label}: validate が rules を読み実行する旧説明を残さない`,
  );
  assert.doesNotMatch(
    content,
    /`?\.term-drift\/rules\/detect\.md`?[\s\S]{0,80}(?:読(?:み|む)|実行|run|execute)/i,
    `${label}: detect.md 直接実行の旧入口を残さない`,
  );
}
function assertNoProcessExecutionInstruction(content, label) {
  const clauses = content
    .split(/\n|。|；|;|・|\b(?:but|however)\b|ただし|一方で|しかし/iu)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const executionProhibition = [
    /(?:Bash|shell|シェル|CLI|外部プロセス|コマンド|npx)(?:\s*tool)?(?:を|は|で|の|や)?[^\n]{0,40}?(?:使わない|利用しない|使用しない|足さない|加えない|有効にしない|追加しない|許可しない|可能にしない|起動しない|実行しない|呼び出さない)/giu,
    /(?:使わない|利用しない|使用しない|足さない|加えない|有効にしない|追加しない|許可しない|可能にしない|起動しない|実行しない|呼び出さない)[^\n]{0,40}?(?:Bash|shell|シェル|CLI|外部プロセス|コマンド|npx)/giu,
    /\b(?:do|does|must|should|can|may|will)\s+not\s+(?:use|enable|add|allow|permit|grant|invoke|run|execute|launch|spawn|start)\w*\b[^\n]{0,60}/giu,
    /\bnever\s+(?:use|enable|add|allow|permit|grant|invoke|run|execute|launch|spawn|start)\w*\b[^\n]{0,60}/giu,
    /\bwithout\s+(?:using|enabling|adding|allowing|permitting|granting|invoking|running|executing|launching|spawning|starting)\b[^\n]{0,60}/giu,
  ];
  const userGuidance =
    /利用者(?:へ|に)[^\n]*(?:案内|示す)|\b(?:tell|guide|ask)\s+the\s+user\s+to\b|\bgive\s+(?:the\s+user\s+)?(?:one\s+)?short\s+instruction\s*:/iu;
  const executionInstruction = [
    /(?:Bash|shell|シェル)(?:\s*tool)?(?:を|で|の)?[^\n]{0,40}(?:使(?:う|い|って|える)|利用できる|使用(?:する|し)|有効(?:にする|化)|追加(?:する|し)|許可(?:する|し)|可能にする|起動(?:する|し|できる)|実行(?:する|し|できる)|呼び出(?:す|し|せる))/iu,
    /(?:CLI|外部プロセス|コマンド|npx)(?:を|で|の)?[^\n]{0,40}(?:利用できる|実行(?:する|し|できる)|起動(?:する|し|できる)|呼び出(?:す|し|せる)|許可(?:する|し)|可能にする|spawn)/iu,
    /(?:実行|起動|呼び出)(?:する|し)[^\n]{0,40}(?:Bash|shell|シェル|CLI|外部プロセス|コマンド|npx)/iu,
    /\b(?:use|enable|add|allow|permit|grant|invoke|run|execute|launch|spawn|start)\b[^\n]{0,50}\b(?:bash|shell|cli|command|external process|subprocess|npx)\b/iu,
    /\b(?:bash|shell|cli|command|external process|subprocess|npx)\b[^\n]{0,50}\b(?:allowed|enabled|permitted|required|available|used|run|execute|launch|spawn|invoke)\b/iu,
  ];
  const finding = clauses.find((clause) => {
    if (userGuidance.test(clause)) return false;
    const withoutLocalProhibitions = executionProhibition.reduce(
      (remaining, pattern) => remaining.replace(pattern, ""),
      clause,
    );
    return executionInstruction.some((pattern) => pattern.test(withoutLocalProhibitions));
  });
  assert.equal(
    finding,
    undefined,
    `${label}: Bash/CLI/外部プロセスの実行を有効にする指示を含めない${finding ? `: ${finding}` : ""}`,
  );
}
function assertNoTermDriftHealthContract(content, label) {
  const clauses = content
    .split(/\n|。|；|;|(?<=[.!?])\s+(?=[A-Z])/u)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const healthOwnership = [
    /\b(?:term-drift\s+)?(?:compatible\s+)?version\b[^\n]{0,40}\bv?\d+\.\d+\.\d+\b/iu,
    /\.term-drift\/[^\s`]*(?:version|manifest)[^\s`]*/iu,
    /\b(?:sha(?:-?\d+)?|md5|blake\d*)\b|\bhash(?:es)?\s*(?::|=|is\b|are\b|must\b|shall\b)/iu,
    /(?:必要|必須)ファイル(?:集合)?\s*(?:は|:|=)|\brequired(?:-|\s+)files?(?:\s+set)?\s*(?:are\b|is\b|include\b|includes\b|:|=)/iu,
    /(?:agent\s+(?:compatibility\s+)?mapping|agent\s*対応表)\s*(?::|=|は|is\b|are\b)|\b(?:claude|codex|gemini)\s*(?:=>|->|:)\s*`?\.(?:claude|agents|gemini)\//iu,
  ];
  const finding = clauses.find((clause) => healthOwnership.some((pattern) => pattern.test(clause)));
  assert.equal(
    finding,
    undefined,
    `${label}: intent-validate は version/hash/必要ファイル集合/agent 対応の health 契約を所有しない${finding ? `: ${finding}` : ""}`,
  );
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

test("1b: node_modules に term-drift のコピーがあっても導入済みと誤判定しない（過去版を誤って参照しない）", () => {
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
test("2: core install primitive は owner orchestration を内包しない", () => {
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

// ---- 3. validate の接続: 配置検知・installer health への案内・tool 契約・後方互換（4系統） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の validate-checks が配置ありでは health 案内だけ、配置なしでは従来検出を規定する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const responsibility = termDriftChecksSection(c);
      const coinageRow = coinageCatalogRow(c);
      assert.ok(responsibility, `${lang}/${agent}: validate-checks に term-drift 責務境界節がある`);
      assert.ok(coinageRow, `${lang}/${agent}: coinage-suspect カタログ行がある`);
      assertSelectedAgentArtifactScope(coinageRow, lang, `${lang}/${agent} coinage-suspect row`);
      assertSelectedAgentArtifactScope(
        responsibility,
        lang,
        `${lang}/${agent} term-drift responsibility`,
      );
      if (lang === "ja") {
        assert.ok(/`\.term-drift\/`/.test(c), "目印が .term-drift/ である");
        assert.ok(/`skills\/term-drift\/SKILL\.md`/.test(c), "agent skill も配置物として検知する");
        assert.ok(/配置物ありでは用語判定も health 判定もしない/.test(c), "配置ありでは判定しない");
        assert.ok(/`detect\.md` を読まず/.test(c), "detect.md を直接実行しない");
        assert.ok(/配置だけで `ready` と断定しない/.test(c), "marker-only を ready 扱いしない");
        assert.ok(/`npx intent-planner \. --agent <選択中のagent> --with-term-drift --dry-run`/.test(c), "既存 dry-run へ案内する");
        assert.ok(/`ready` と表示された場合だけ/.test(c), "ready 後だけ専用点検へ進む");
        assert.ok(/health の正本は installer inspector 一つ/.test(c), "health 正本が一つである");
        assert.ok(/互換版・hash・必要ファイル集合・agent 対応を複製しない/.test(c), "health 契約を複製しない");
        assert.ok(/配置物が一つも無いときだけ/.test(c), "配置なしだけ従来検出を続ける");
        assert.ok(/同じ射程・温度/.test(c), "配置なしの後方互換を保つ");
        assert.ok(/allowed-tools は `Read, Glob, Grep` のまま/.test(c), "tool 契約が不変である明文");
        assert.doesNotMatch(c, /Read で読み、その規定どおりに LLM/, "旧rules直接実行を残さない");
      } else {
        assert.ok(/`\.term-drift\/`/.test(c), "目印が .term-drift/ である");
        assert.ok(/`skills\/term-drift\/SKILL\.md`/.test(c), "agent skill も配置物として検知する");
        assert.ok(/perform neither terminology judgement nor health judgement/i.test(c), "配置ありでは判定しない");
        assert.ok(/do not read `detect\.md`/i.test(c), "detect.md を直接実行しない");
        assert.ok(/Never label a placement `ready` merely because it exists/i.test(c), "marker-only を ready 扱いしない");
        assert.ok(/`npx intent-planner \. --agent <selected-agent> --with-term-drift --dry-run`/.test(c), "既存 dry-run へ案内する");
        assert.ok(/only when that output says `ready`/i.test(c), "ready 後だけ専用点検へ進む");
        assert.ok(/installer inspector is the one health source of truth/i.test(c), "health 正本が一つである");
        assert.ok(/do not duplicate the compatible version, hashes, required file set, or agent mapping/i.test(c), "health 契約を複製しない");
        assert.ok(/when no project-local term-drift artifact exists/i.test(c), "配置なしだけ従来検出を続ける");
        assert.ok(/same scope and temperature/i.test(c), "配置なしの後方互換を保つ");
        assert.ok(/allowed-tools.*stays `Read, Glob, Grep`/i.test(c), "tool 契約が不変である明文");
        assert.doesNotMatch(c, /have the LLM run them in this context exactly as they specify/i, "旧rules直接実行を残さない");
      }
      assert.ok(
        /新しい検出軸を立てない|No new detection axis/i.test(c),
        `${lang}/${agent}: 新軸を立てない`,
      );
      assertNoProcessExecutionInstruction(
        responsibility,
        `${lang}/${agent} validate-checks term-drift responsibility`,
      );
    });

    test(`3b: ${lang}/${agent} の SKILL Step 3.6 が配置あり/なしを排他的に分岐する`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      const step = step36(c);
      assert.ok(step, `${lang}/${agent}: Step 3.6 がある`);
      assertSelectedAgentArtifactScope(step, lang, `${lang}/${agent} SKILL Step 3.6`);
      if (lang === "ja") {
        assert.ok(/最初に project-local な term-drift 配置物だけを探す/.test(step), "配置検知を先に行う");
        assert.ok(/この Step 3\.6 の残りを実行しない/.test(step), "配置ありでは従来検出を止める");
        assert.ok(/`detect\.md` を読まない/.test(step), "detect.md を読まない");
        assert.ok(/用語の意味判定をしない/.test(step), "用語判定をしない");
        assert.ok(/既存 installer の health を確認/.test(step), "既存healthへ案内する");
        assert.ok(/配置物が一つも無い場合だけ/.test(step), "配置なしだけ従来検出へ進む");
        assert.ok(/従来の `coinage-suspect` の射程・温度を保つ/.test(step), "後方互換を保つ");
        assert.ok(
          /`\.intent\/glossary\.md` が\*\*不在なら[\s\S]{0,80}本検出を一切発火しない/.test(step),
          "台帳不在では term-drift 所見を追加せず coinage-suspect を沈黙させる",
        );
      } else {
        assert.ok(/First look only for project-local term-drift artifacts/i.test(step), "配置検知を先に行う");
        assert.ok(/do not run the rest of Step 3\.6/i.test(step), "配置ありでは従来検出を止める");
        assert.ok(/do not read `detect\.md`/i.test(step), "detect.md を読まない");
        assert.ok(/judge term meaning/i.test(step), "用語判定をしない");
        assert.ok(/inspect health through the existing installer/i.test(step), "既存healthへ案内する");
        assert.ok(/Only when no placement exists/i.test(step), "配置なしだけ従来検出へ進む");
        assert.ok(/preserve the existing scope and temperature/i.test(step), "後方互換を保つ");
        assert.ok(
          /If `\.intent\/glossary\.md` is \*\*absent[\s\S]{0,100}do not fire this detection at all/i.test(step),
          "台帳不在では term-drift 所見を追加せず coinage-suspect を沈黙させる",
        );
      }
      assert.doesNotMatch(step, /\.term-drift\/rules\/detect\.md|multi-layer detection|多層検出/i, "旧rules実行契約を残さない");
      assertNoProcessExecutionInstruction(step, `${lang}/${agent} SKILL Step 3.6`);
    });

    test(`3c: ${lang}/${agent} の validate 規律が installer の詳細health契約を複製しない`, () => {
      const joined = `${fs.readFileSync(skillPath(lang, agent), "utf8")}\n${fs.readFileSync(checksPath(lang, agent), "utf8")}`;
      assertNoTermDriftHealthContract(joined, `${lang}/${agent}`);
    });
  }
}

test("3i: health 契約複製オラクルは具体版に依存せず4分類の再実装を拒否する", () => {
  const allowed = [
    "互換版・hash・必要ファイル集合・agent 対応を複製しない。",
    "Do not duplicate the compatible version, hashes, required file set, or agent mapping.",
  ];
  for (const [index, phrase] of allowed.entries()) {
    assert.doesNotThrow(
      () => assertNoTermDriftHealthContract(phrase, `allowed prohibition ${index + 1}`),
      phrase,
    );
  }

  const forbidden = [
    "Compatible term-drift version: 0.2.3.",
    "Do not duplicate the compatible version. Compatible term-drift version: 0.2.3.",
    "Do not duplicate installer health, but Compatible term-drift version: 0.2.3.",
    "Use BLAKE3 hashes to validate installed artifacts.",
    "Required files are `.term-drift/rules/detect.md` and `.term-drift/rules/workflow.md`.",
    "Agent mapping: claude => `.claude/skills/term-drift`, codex => `.agents/skills/term-drift`.",
    "Agent compatibility mapping is Claude at `.claude/skills/term-drift`.",
    "Agent mapping must not be duplicated, but Agent compatibility mapping is Claude at `.claude/skills/term-drift`.",
  ];
  for (const [index, phrase] of forbidden.entries()) {
    assert.throws(
      () => assertNoTermDriftHealthContract(phrase, `forbidden health contract ${index + 1}`),
      /health 契約を所有しない/,
      phrase,
    );
  }
});

test("3g: 外部実行オラクルは実行許可を拒否し、禁止説明と利用者向け dry-run 案内を許容する", () => {
  const allowed = [
    "intent-validate 自身は Bash・CLI・外部プロセスを起動しない。",
    "Bash を allowed-tools に足したら違反であり、コマンドを実行しない。",
    "利用者へ `npx intent-planner . --dry-run` を実行するよう短く案内する。",
    "intent-validate never launches a command or external process itself.",
    "Adding Bash is a violation; do not execute the CLI.",
    "Briefly tell the user to run `npx intent-planner . --dry-run`.",
  ];
  for (const [index, phrase] of allowed.entries()) {
    assert.doesNotThrow(
      () => assertNoProcessExecutionInstruction(phrase, `allowed phrase ${index + 1}`),
      phrase,
    );
  }

  const forbidden = [
    "Bash を allowed-tools に追加して term-drift CLI を実行する。",
    "外部プロセスを起動して `npx term-drift` を呼び出す。",
    "外部プロセスの起動を可能にする。",
    "Use Bash to run the term-drift CLI.",
    "Launch an external process with `npx term-drift`.",
    "Bash can be used for the health check.",
    "Run the CLI without writing files.",
    "Bash で実行するが、ファイルは変更しない。",
  ];
  for (const [index, phrase] of forbidden.entries()) {
    assert.throws(
      () => assertNoProcessExecutionInstruction(phrase, `forbidden phrase ${index + 1}`),
      /実行を有効にする指示/,
      phrase,
    );
  }
});

test("3h: AGENT_REGISTRY が Codex/Gemini の専用 skill 配置先と共有 Codex 投影を保持する", () => {
  assert.deepEqual(AGENTS, ["claude", "codex"], "registry から4系統の2 template 投影を導く");
  assert.equal(AGENT_REGISTRY.codex.termDriftSkillDest, ".agents/skills/term-drift");
  assert.equal(AGENT_REGISTRY.gemini.termDriftSkillDest, ".gemini/skills/term-drift");
  assert.equal(AGENT_REGISTRY.codex.skillSubdir, "codex");
  assert.equal(
    AGENT_REGISTRY.gemini.skillSubdir,
    AGENT_REGISTRY.codex.skillSubdir,
    "Gemini CLI は Codex の intent-validate SKILL 投影を共有する",
  );
  assert.equal(
    AGENT_REGISTRY.gemini.skillDest,
    AGENT_REGISTRY.codex.skillDest,
    "Codex/Gemini の共有投影は同じ intent-validate 配置先を使う",
  );
  for (const lang of LANGS) {
    const codexProjection = skillPath(lang, AGENT_REGISTRY.codex.skillSubdir);
    const geminiProjection = skillPath(lang, AGENT_REGISTRY.gemini.skillSubdir);
    assert.equal(geminiProjection, codexProjection, `${lang}: Gemini は Codex SKILL 正本を投影する`);
    assert.ok(fs.existsSync(codexProjection), `${lang}: 共有 Codex SKILL 正本が存在する`);
  }
});

// ---- 3d-f. 公開文書: README は入口、guide は手順、theory は責務分離の理由を日英で固定 ----
for (const lang of LANGS) {
  test(`3d: ${lang} README が構造検査と専用用語レビューの入口を分ける`, () => {
    const c = fs.readFileSync(publicDocPath(lang, "README"), "utf8");
    if (lang === "ja") {
      assert.ok(/`\/intent-validate`[\s\S]{0,160}矛盾・カバレッジ漏れ・境界のずれ/.test(c), "validate は構造検査の入口である");
      assert.ok(/`\/intent-validate`[\s\S]{0,200}読み取り専用/.test(c), "validate は read-only である");
      assert.ok(/`\/intent-validate`[\s\S]{0,360}project-local な term-drift 配置物[\s\S]{0,100}用語や health を独自判定せず[\s\S]{0,100}外部コマンドも起動しません/.test(c), "配置ありでも validate 自身は用語・health 判定や外部実行をしない");
      assert.ok(/`\/intent-validate`[\s\S]{0,560}利用者へ通常 installer の `npx intent-planner \. --agent <選択中のagent> --dry-run` でhealthを確認するよう案内し[\s\S]{0,100}`ready` の確認後だけ[\s\S]{0,80}term-drift 専用 skill/.test(c), "配置検知から標準 dry-run を経て ready 後だけ専用 skill へ進む");
      assert.ok(/`ready` になったら[\s\S]{0,120}term-drift 専用 skill から本格的な用語点検/.test(c), "本格点検は ready 後の専用 skill から始める");
    } else {
      assert.ok(/`\/intent-validate`[\s\S]{0,180}contradictions, coverage gaps, and boundary mismatches/i.test(c), "validate は構造検査の入口である");
      assert.ok(/`\/intent-validate`[\s\S]{0,220}read-only/i.test(c), "validate は read-only である");
      assert.ok(/`\/intent-validate`[\s\S]{0,380}project-local term-drift artifacts[\s\S]{0,120}neither judges terminology or health itself nor launches external commands/i.test(c), "配置ありでも validate 自身は用語・health 判定や外部実行をしない");
      assert.ok(/`\/intent-validate`[\s\S]{0,600}run the normal installer's `npx intent-planner \. --agent <selected-agent> --dry-run`[\s\S]{0,120}dedicated term-drift skill only after[\s\S]{0,60}`ready`/i.test(c), "配置検知から標準 dry-run を経て ready 後だけ専用 skill へ進む");
      assert.ok(/Once `ready`[\s\S]{0,140}full terminology inspection[\s\S]{0,100}dedicated term-drift skill/i.test(c), "本格点検は ready 後の専用 skill から始める");
    }
    assertNoLegacyRulesExecution(c, `${lang} README`);
  });

  test(`3e: ${lang} guide が配置なし fallback と dry-run → ready → 専用 skill の手順を示す`, () => {
    const c = fs.readFileSync(publicDocPath(lang, "guide"), "utf8");
    if (lang === "ja") {
      assert.ok(/\*\*予防\*\*[\s\S]{0,300}利用者へ質問を出す直前[\s\S]{0,300}下流の spec ツールへ渡す下書き/.test(c), "日常の予防面を示す");
      assert.ok(/term-drift 配置物が一つもない環境では[\s\S]{0,100}`\/intent-validate` が従来どおり/.test(c), "配置なしでは従来の軽い検出を保つ");
      assert.ok(/配置物が見つかったとき[\s\S]{0,100}`\/intent-validate` は用語や互換性を独自判定せず/.test(c), "配置ありでは validate が用語・health を判定しない");
      assert.ok(/`npx intent-planner \. --agent <選択中のagent> --dry-run`/.test(c), "標準 installer の dry-run 確認を示す");
      assert.ok(/`ready` になった後[\s\S]{0,100}term-drift\s*専用\s*skillから始めます/.test(c), "ready 後だけ専用 skill へ進む");
      assert.ok(/専用経路は\s*`\/intent-validate`\s*の構造検査を置き換えません/.test(c), "構造検査と詳細レビューを分ける");
    } else {
      assert.ok(/\*\*Prevention\*\*[\s\S]{0,320}right before a question goes to you[\s\S]{0,320}downstream spec tool/i.test(c), "日常の予防面を示す");
      assert.ok(/when the repository has no project-local term-drift artifact[\s\S]{0,120}`\/intent-validate` keeps its legacy behavior/i.test(c), "配置なしでは従来の軽い検出を保つ");
      assert.ok(/When a placement is found[\s\S]{0,120}`\/intent-validate` does not judge terminology or compatibility itself/i.test(c), "配置ありでは validate が用語・health を判定しない");
      assert.ok(/`npx intent-planner \. --agent <selected-agent> --dry-run`/.test(c), "標準 installer の dry-run 確認を示す");
      assert.ok(/full terminology inspection[\s\S]{0,100}dedicated term-drift skill only after health is `ready`/i.test(c), "ready 後だけ専用 skill へ進む");
      assert.ok(/dedicated path does not replace `\/intent-validate`'s structural checks/i.test(c), "構造検査と詳細レビューを分ける");
    }
    assertNoLegacyRulesExecution(c, `${lang} guide`);
  });

  test(`3f: ${lang} theory が予防・構造検査・専用レビューと health 正本を分離する`, () => {
    const c = fs.readFileSync(publicDocPath(lang, "theory"), "utf8");
    if (lang === "ja") {
      assert.ok(/責務は三段に分けます/.test(c), "三段の責務分離を明示する");
      assert.ok(/日常の予防はルート規約・質問前点検・export 注入で続けます/.test(c), "日常の予防面を示す");
      assert.ok(/term-drift 配置物がない環境だけ[\s\S]{0,100}`\/intent-validate` の軽い `coinage-suspect`/.test(c), "配置なし fallback を示す");
      assert.ok(/配置物が見つかったら[\s\S]{0,160}validate は用語の意味や version\/hash\/skill の互換性を判定せず[\s\S]{0,120}通常 installer の `--dry-run` health 確認へ案内/.test(c), "validate は判定せず標準 installer health へ案内する");
      assert.ok(/`ready` と確認された後だけ[\s\S]{0,100}term-drift 専用 skill が本格点検の入口/.test(c), "ready 後だけ専用レビューへ進む");
      assert.ok(/health の正本を installer inspector 一つ[\s\S]{0,100}詳細な用語点検の入口を term-drift 専用 skill 一つ/.test(c), "health と詳細レビューの正本を分ける");
    } else {
      assert.ok(/responsibilities form three layers/i.test(c), "三段の責務分離を明示する");
      assert.ok(/root-document, pre-question, and export guidance prevent terminology drift/i.test(c), "日常の予防面を示す");
      assert.ok(/no project-local term-drift placement retain the lightweight `coinage-suspect` fallback/i.test(c), "配置なし fallback を示す");
      assert.ok(/repositories with a placement use validate only to guide the user to the normal installer's `--dry-run` health display/i.test(c), "validate は標準 installer health へ案内するだけである");
      assert.ok(/Validate does not judge terminology or redetermine version, hashes, required files, or agent-skill compatibility/i.test(c), "validate が用語・health を判定しない");
      assert.ok(/Only after the installer reports `ready`[\s\S]{0,120}dedicated term-drift skill/i.test(c), "ready 後だけ専用レビューへ進む");
      assert.ok(/one health source of truth in the installer inspector[\s\S]{0,100}one detailed terminology-review entry in the dedicated skill/i.test(c), "health と詳細レビューの正本を分ける");
    }
    assertNoLegacyRulesExecution(c, `${lang} theory`);
  });
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
  const ALLOWED = new Set(["handoff-bridge", "term-drift"]);
  for (const name of Object.keys(all)) {
    assert.ok(
      ALLOWED.has(name),
      `依存 "${name}" は ijust 配下ではありません（INV3 改訂: 許可されるのは自組織のパッケージのみ）`,
    );
  }
});

// ---- 7. dogfood（.claude / .agents / .intent）が parent と同期している（存在すれば検査） ----
test("7: dogfood の validate-checks / SKILL / glossary が各 ja template と同期している（存在すれば検査）", () => {
  const pairs = [
    [path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "rules", "validate-checks.md"), checksPath("ja", "claude")],
    [path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "SKILL.md"), skillPath("ja", "claude")],
    [path.join(REPO_ROOT, ".agents", "skills", "intent-validate", "rules", "validate-checks.md"), checksPath("ja", "codex")],
  ];
  for (const [dogfood, parent] of pairs) {
    if (fs.existsSync(dogfood)) {
      assert.equal(fs.readFileSync(dogfood, "utf8"), fs.readFileSync(parent, "utf8"), `${dogfood} が対応する ja template と byte 同一`);
    }
  }
  const agentsSkill = path.join(REPO_ROOT, ".agents", "skills", "intent-validate", "SKILL.md");
  if (fs.existsSync(agentsSkill)) {
    assert.equal(
      step36(fs.readFileSync(agentsSkill, "utf8")),
      step36(fs.readFileSync(skillPath("ja", "codex"), "utf8")),
      ".agents intent-validate SKILL の task-owned Step 3.6 が ja/codex template と一致する",
    );
  }
  const dogfoodGlossary = path.join(REPO_ROOT, ".intent", "glossary.md");
  if (fs.existsSync(dogfoodGlossary)) {
    assert.ok(
      /この台帳は term-drift（用語の検出・救済ツール）と共有します/.test(fs.readFileSync(dogfoodGlossary, "utf8")),
      "dogfood glossary にも台帳共有の規約がある",
    );
  }
});
