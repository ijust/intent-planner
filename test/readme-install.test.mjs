// README 簡易インストールの固定検査（INV27）。
//
// 狙い: README から簡易インストールが落ちる・対応 agent の列挙が漏れる回帰を機械検出する。
//   readme-audience-restructure のような README 全面改修で install 節が静かに消えるのを防ぐ。
//
// 検査述語（意味解釈に寄せない素朴な存在検査・INV2/A1）:
//   1. 安定見出しアンカー: 簡易インストール節の見出し（ja `## インストール` を含む見出し /
//      en `## Install`）が README 本文に存在する。
//   2. 現在公開表示する agent 名の存在: claude / codex / gemini が README 本文に出現する。
//   3. 初回入口: Claude は slash、Codex/Gemini は自然文という起動差が明記される。
//   4. npm 公開メタデータ: package description と keywords が3 agentを列挙する。
//
// discriminative: codex を抜いた / 見出しアンカーを消した README で fail することを別途確認する
//   （検査が緩い＝欠落を見逃す誤実装を落とせる）。

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));

// 対象 README とその install 見出しアンカー（現 README の見出し文字列で固定）。
const README_SPEC = [
  { rel: "README.md", anchor: "### インストール", interactiveForce: "対話環境" },
  { rel: "README.en.md", anchor: "### Install", interactiveForce: "interactive terminal" },
];

// 対応 agent 名（CLI help の公開集合と対応・列挙漏れを防ぐ）。
const AGENTS = ["claude", "codex", "gemini"];
const CLI = path.join(REPO_ROOT, "bin", "cli.mjs");

function read(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

// install アンカーの存在を素朴に判定する純関数（行頭の見出しを完全一致で探す）。
function hasInstallAnchor(body, anchor) {
  return body.split(/\r?\n/).some((line) => line.trim() === anchor);
}

// 全 agent 名が本文に出現するかを判定する純関数（大文字小文字を無視＝"Claude Code" も拾う）。
function hasAgent(body, agent) {
  return body.toLowerCase().includes(agent);
}
function hasAllAgents(body) {
  return AGENTS.every((a) => hasAgent(body, a));
}

function cliHelp(lang) {
  return execFileSync(process.execPath, [CLI, "--help", "--lang", lang], { encoding: "utf8" });
}

function installSection(body, anchor) {
  const start = body.indexOf(anchor);
  assert.notEqual(start, -1, `install 見出し「${anchor}」が存在する`);
  const end = body.indexOf("\n---", start);
  return body.slice(start, end === -1 ? body.length : end);
}

function startSection(body) {
  const start = body.indexOf("**どこから始めるか（この2択）**");
  const startEn = body.indexOf("**Where to start (pick one of two entrances)**");
  const resolvedStart = start === -1 ? startEn : start;
  assert.notEqual(resolvedStart, -1, "開始方法の節が存在する");
  const endJa = body.indexOf("### 必要なもの", resolvedStart);
  const endEn = body.indexOf("### Requirements", resolvedStart);
  const resolvedEnd = endJa === -1 ? endEn : endJa;
  assert.notEqual(resolvedEnd, -1, "開始方法の節の終端が存在する");
  return body.slice(resolvedStart, resolvedEnd);
}

function startContractErrors(section, rel) {
  const required = rel === "README.md"
    ? ["Claude Code", "/intent-plan", "Codex / Gemini CLI", "スラッシュを付けず", "`intent-plan` から始めて"]
    : ["Claude Code", "/intent-plan", "Codex / Gemini CLI", "do not add a slash", "start with `intent-plan`"];
  return required.filter((token) => !section.includes(token));
}

function tourSection(body) {
  const startJa = body.indexOf("### 5分で一巡する例");
  const startEn = body.indexOf("### A five-minute end-to-end example");
  const start = startJa === -1 ? startEn : startJa;
  assert.notEqual(start, -1, "短い一巡例の節が存在する");
  const endJa = body.indexOf("### 必要なもの", start);
  const endEn = body.indexOf("### Requirements", start);
  const end = endJa === -1 ? endEn : endJa;
  assert.notEqual(end, -1, "短い一巡例の節の終端が存在する");
  return body.slice(start, end);
}

function tourContractErrors(section, rel) {
  const common = [".intent/intent-tree.md", ".intent/intent-compass.md", ".intent/packets/"];
  const localized = rel === "README.md"
    ? ["実装用下書き", "アプリケーションコードの実装はまだ開始しません"]
    : ["handoff draft", "Application-code implementation has not started"];
  return [...common, ...localized].filter((token) => !section.includes(token));
}

const INSTALL_CONTRACT = [
  { key: "claude skills", token: ".claude/skills/intent-*" },
  { key: "codex/gemini skills", token: ".agents/skills/intent-*" },
  { key: "root CLAUDE.md", token: "CLAUDE.md" },
  { key: "root AGENTS.md", token: "AGENTS.md" },
  { key: "root GEMINI.md", token: "GEMINI.md" },
  { key: "intent scaffold", token: ".intent/" },
  { key: "term-drift placement", token: ".term-drift/" },
  { key: "handoff-bridge placement", token: "skills/handoff-bridge/" },
  { key: "root document consent", token: "--yes" },
  { key: "enforcement hook", token: "--enforce" },
  { key: "CI workflow", token: "--with-ci" },
  { key: "installer-managed ignore rules", token: ".gitignore" },
  { key: "explicit overwrite", token: "--force" },
  { key: "shared-file update", token: "--update-shared" },
  { key: "skip all updates", token: "--no-update" },
  { key: "update backup", token: ".bak" },
];
const CLI_PLACEMENT_TOKENS = INSTALL_CONTRACT.slice(0, 8).map(({ token }) => token);
const CLI_OPTION_TOKENS = ["--yes", "--enforce", "--with-ci", "--force", "--update-shared", "--no-update", ".bak"];

function installContractErrors(section) {
  const errors = INSTALL_CONTRACT
    .filter(({ token }) => !section.includes(token))
    .map(({ key }) => key);
  for (const [name, version] of Object.entries(PACKAGE_JSON.dependencies ?? {})) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
      errors.push(`direct dependency ${name} is not exact`);
    }
    if (!section.includes(`${name} ${version}`)) errors.push(`direct dependency ${name}@${version}`);
  }
  return errors;
}

function staleAbsoluteClaims(body, rel) {
  const patterns = rel === "README.md"
    ? [
      /導入しても増えるのは[^。\n]*\.intent\/[^。\n]*だけ/,
      /書くのは[^。\n]*\.intent\/[^。\n]*だけ/,
      /動作時の依存ゼロ/,
    ]
    : [
      /Installing it only adds[^.\n]*\.intent\//i,
      /all it writes is notes inside \.intent\//i,
      /All it writes is Markdown under \.intent\//i,
      /zero runtime dependencies/i,
    ];
  return patterns.filter((pattern) => pattern.test(body)).map(String);
}

for (const { rel, anchor } of README_SPEC) {
  // 6.3/6.1: 簡易インストール見出しアンカーが存在する。
  test(`README install: ${rel} に簡易インストール見出し「${anchor}」がある (6.1, 6.3)`, () => {
    const body = read(rel);
    assert.ok(
      hasInstallAnchor(body, anchor),
      `${rel} に install 見出しアンカー「${anchor}」が無い（README 改修で install 節が落ちた疑い）`,
    );
  });

  test(`README install: ${rel} が現在公開中の claude/codex/gemini を列挙する`, () => {
    const body = read(rel);
    for (const agent of AGENTS) {
      assert.ok(
        hasAgent(body, agent),
        `${rel} に対応 agent 名「${agent}」が無い（列挙漏れ）`,
      );
    }
  });

  test(`README start: ${rel} がClaudeのslash起動とCodex/Geminiの自然文起動を区別する`, () => {
    const section = startSection(read(rel));
    assert.deepEqual(startContractErrors(section, rel), [], `${rel} の開始方法がagentごとの実際の操作と一致する`);
  });

  test(`README tour: ${rel} が入力から実装前の下書きまでの短い一巡例を持つ`, () => {
    const section = tourSection(read(rel));
    assert.deepEqual(tourContractErrors(section, rel), [], `${rel} の一巡例が主要な到達点と実装前の停止を示す`);
  });
}

// 6.4/6.5: discriminative — 偽陽性なし（現 README で pass）＋偽陰性なし（欠落で fail）。
test("README install: 検査は偽陽性なし・偽陰性なし（discriminative・6.4, 6.5）", () => {
  for (const { rel, anchor } of README_SPEC) {
    const body = read(rel);
    // 偽陽性なし: 現 README は両条件を満たす。
    assert.ok(hasInstallAnchor(body, anchor), `現 ${rel} は install アンカーを持つ`);
    assert.ok(hasAllAgents(body), `現 ${rel} は公開中の3 agent を列挙する`);

    // 偽陰性なし: codex を抜いた本文では agent 検査が fail する（大文字小文字無視で除去）。
    const withoutCodex = body.replace(/codex/gi, "XXXX");
    assert.ok(
      !hasAllAgents(withoutCodex),
      `${rel}: codex を抜くと agent 検査が fail する（欠落を落とせる）`,
    );

    // 偽陰性なし: 見出しアンカーを消した本文では anchor 検査が fail する。
    const withoutAnchor = body.split(/\r?\n/).filter((l) => l.trim() !== anchor).join("\n");
    assert.ok(
      !hasInstallAnchor(withoutAnchor, anchor),
      `${rel}: 見出しアンカーを消すと anchor 検査が fail する（欠落を落とせる）`,
    );
  }
});

test("README install: 日英版が package.json と CLI help の導入範囲を同じ意味で説明する", () => {
  for (const [{ rel, anchor, interactiveForce }, lang] of README_SPEC.map((spec, index) => [spec, index === 0 ? "ja" : "en"])) {
    const body = read(rel);
    const section = installSection(body, anchor);
    const help = cliHelp(lang);
    assert.deepEqual(
      installContractErrors(section),
      [],
      `${rel} の install 節が直接依存・標準配置先・条件付き変更をすべて説明する`,
    );
    assert.deepEqual(
      staleAbsoluteClaims(body, rel),
      [],
      `${rel} に「.intent/ だけ」「依存ゼロ」という古い無条件の断定が残っていない`,
    );
    for (const token of [...CLI_PLACEMENT_TOKENS, ...CLI_OPTION_TOKENS]) {
      assert.ok(help.includes(token), `${lang} CLI help が導入契約 ${token} を示す`);
      assert.ok(section.includes(token), `${rel} が CLI help の導入契約 ${token} を示す`);
    }
    assert.ok(help.includes(interactiveForce), `${lang} CLI help が --force の確認を対話環境に限定する`);
    assert.ok(section.includes(interactiveForce), `${rel} が --force の確認を対話環境に限定する`);
  }
});

test("README install: 依存または標準配置先を片言語から削る誤実装を判別する", () => {
  for (const { rel, anchor } of README_SPEC) {
    const baseline = installSection(read(rel), anchor);
    assert.deepEqual(installContractErrors(baseline), [], `${rel} の基準説明は完全である`);

    for (const { key, token } of INSTALL_CONTRACT) {
      const mutated = baseline.split(token).join("REMOVED");
      assert.ok(
        installContractErrors(mutated).includes(key),
        `${rel}: ${token} を削ると ${key} の欠落として検出する`,
      );
    }

    for (const [name, version] of Object.entries(PACKAGE_JSON.dependencies ?? {})) {
      const expected = `${name} ${version}`;
      const mutated = baseline.split(expected).join(`${name} REMOVED`);
      assert.ok(
        installContractErrors(mutated).includes(`direct dependency ${name}@${version}`),
        `${rel}: ${expected} が古くなると直接依存の不一致を検出する`,
      );
    }
  }
});

test("README start: agent別の開始方法を削る誤実装を判別する", () => {
  for (const { rel } of README_SPEC) {
    const baseline = startSection(read(rel));
    assert.deepEqual(startContractErrors(baseline, rel), [], `${rel} の基準説明は完全である`);
    const tokens = rel === "README.md"
      ? ["/intent-plan", "Codex / Gemini CLI", "スラッシュを付けず", "`intent-plan` から始めて"]
      : ["/intent-plan", "Codex / Gemini CLI", "do not add a slash", "start with `intent-plan`"];
    for (const token of tokens) {
      const mutated = baseline.replace(token, "REMOVED");
      assert.ok(startContractErrors(mutated, rel).includes(token), `${rel}: ${token} を削ると開始方法の欠落として検出する`);
    }
  }
});

test("README tour: 一巡例の主要な到達点を削る誤実装を判別する", () => {
  for (const { rel } of README_SPEC) {
    const baseline = tourSection(read(rel));
    assert.deepEqual(tourContractErrors(baseline, rel), [], `${rel} の基準例は完全である`);
    for (const token of [".intent/intent-tree.md", ".intent/intent-compass.md", ".intent/packets/"]) {
      const mutated = baseline.replace(token, "REMOVED");
      assert.ok(tourContractErrors(mutated, rel).includes(token), `${rel}: ${token} を削ると一巡例の欠落として検出する`);
    }
  }
});

test("package metadata: description と keywords が公開中の3 agentを列挙する", () => {
  for (const agent of AGENTS) {
    assert.ok(hasAgent(PACKAGE_JSON.description, agent), `package description が ${agent} を示す`);
    assert.ok(PACKAGE_JSON.keywords.includes(agent), `package keywords が ${agent} を示す`);
  }
  assert.ok(PACKAGE_JSON.keywords.includes("gemini-cli"), "package keywords が Gemini CLI の正式名を示す");
});
