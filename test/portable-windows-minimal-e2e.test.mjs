import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import test from "node:test";

const WORKFLOW_URL = new URL("../.github/workflows/intent-planner-check.yml", import.meta.url);
const HARNESS_URL = new URL("../scripts/portable/windows-minimal-e2e.cmd", import.meta.url);
const PARITY_HARNESS_URL = new URL("../scripts/portable/windows-parity-e2e.mjs", import.meta.url);
const STANDARD_USER_RUNNER_URL = new URL("../scripts/portable/windows-run-as-standard-user.ps1", import.meta.url);

test("Windows x64ジョブがZIP生成から制約下の最小実行までを同じジョブで行う", async () => {
  const workflow = await fs.readFile(WORKFLOW_URL, "utf8");

  assert.match(workflow, /^  windows-portable-minimal:/m);
  assert.match(workflow, /^    runs-on: windows-2025$/m);
  assert.match(workflow, /node-version: 24\.18\.0/);
  assert.match(workflow, /gpg\.exe --version/);
  assert.match(workflow, /npm run build:portable:windows/);
  assert.match(workflow, /scripts\\portable\\windows-minimal-e2e\.cmd/);

  const job = workflow.slice(workflow.indexOf("  windows-portable-minimal:"));
  assert.doesNotMatch(job, /shell:\s*(?:pwsh|powershell)/i);
});

test("Windows最小実行は展開後の子処理からホスト機能と昇格権限を外す", async () => {
  const source = await fs.readFile(HARNESS_URL, "utf8");
  const runnerSource = await fs.readFile(STANDARD_USER_RUNNER_URL, "utf8");

  assert.match(source, /tar\.exe[^\r\n]*-xf/i);
  assert.match(source, /for \/d[^\r\n]*call :capture_root[^\r\n]*\r?\nif errorlevel 1 goto multiple_roots/i);
  assert.match(source, /RUNNER_ENVIRONMENT%"=="github-hosted/i);
  assert.match(source, /net\.exe user[^\r\n]*\/add/i);
  const user = source.match(/set "PORTABLE_E2E_USER=([^"%]+)"/i)?.[1];
  const passwordTemplate = source.match(/set "PORTABLE_E2E_PASSWORD=([^"]+)"/i)?.[1];
  assert.ok(user && passwordTemplate);
  assert.ok(!passwordTemplate.toLowerCase().includes(user.slice(0, 8).toLowerCase()));
  assert.ok(passwordTemplate.replaceAll(/%RANDOM%/gi, "0").length >= 9);
  assert.ok(passwordTemplate.replaceAll(/%RANDOM%/gi, "32767").length <= 14);
  assert.match(source, /icacls\.exe "%PORTABLE_E2E_WORK%"[^\r\n]*\(OI\)\(CI\)M/i);
  assert.match(source, /windows-run-as-standard-user\.ps1/i);
  assert.match(source, /net\.exe user[^\r\n]*\/delete/i);
  for (const label of ["account_failed", "permissions_failed", "restricted_start_failed", "restricted_timeout", "restricted_termination_failed"]) {
    assert.match(source, new RegExp(`:${label}\\r?\\ncall :cleanup_identity\\r?\\nif errorlevel 1 goto cleanup_failed`, "i"));
  }
  assert.match(runnerSource, /Start-Process[\s\S]*-Credential \$credential/i);
  assert.match(runnerSource, /WaitForExit\(90000\)/i);
  assert.match(runnerSource, /if \(-not \$process\.WaitForExit[\s\S]*taskkill\.exe[\s\S]*\/T \/F/i);
  assert.match(runnerSource, /\$LASTEXITCODE -ne 0[\s\S]*exit 3/i);
  assert.match(source, /net\.exe session/i);
  for (const command of ["node.exe", "npm.cmd", "npx.cmd", "powershell.exe", "pwsh.exe"]) {
    assert.match(source, new RegExp(`where\\.exe ${command.replace(".", "\\.")}`, "i"));
  }
  assert.match(source, /set "PATH=%PORTABLE_E2E_EMPTY_PATH%"/i);
  assert.match(source, /set "HTTPS_PROXY=http:\/\/127\.0\.0\.1:9"/i);
  assert.match(source, /intent-planner\.cmd[^\r\n]*--dry-run[^\r\n]*--lang ja[^\r\n]*--agent claude/i);
  assert.match(source, /portable-e2e: OK/i);
});

test("Windowsジョブは通常版とポータブル版のCLI契約を実行結果で比較する", async () => {
  const workflow = await fs.readFile(WORKFLOW_URL, "utf8");
  const source = await fs.readFile(PARITY_HARNESS_URL, "utf8");

  assert.match(workflow, /node scripts[\\/]portable[\\/]windows-parity-e2e\.mjs/);
  assert.match(source, /dist[\\/]bin[\\/]cli\.mjs/);
  assert.match(source, /intent-planner\.cmd/);
  assert.match(source, /where\.exe/);
  assert.match(source, /node\.exe[\s\S]*npm\.cmd[\s\S]*npx\.cmd/);
  assert.match(source, /127\.0\.0\.1:9/);
  assert.match(source, /PATH: system32/);
  assert.match(source, /commandResult\(process\.execPath, \[normalCli, \.\.\.normalArgs\]/);
  assert.match(source, /normalizeOutput\(portable\.stdout, portableTarget\)[\s\S]*normalizeOutput\(normal\.stdout, normalTarget\)/);
  assert.match(source, /normalizeOutput\(portable\.stderr, portableTarget\)[\s\S]*normalizeOutput\(normal\.stderr, normalTarget\)/);
  assert.match(source, /assertEqual\(portable\.status, normal\.status/);
  assert.match(source, /assertTreeEqual\(normalAfter, normalBefore/);
  assert.match(source, /assertTreeEqual\(portableAfter, portableBefore/);
  assert.match(source, /assertTreeEqual\(portableAfter, normalAfter/);
  assert.match(source, /quote-containing-unsupported-agent/);
  assert.ok(source.includes('co"dex'), "値そのものに引用符を含むfixtureを実行する");
  assert.match(source, /args\.map\(\(value\) => escapeCmdArgument\(value, true\)\)/);
  assert.match(source, /windowsVerbatimArguments: true/);
  assert.match(source, /commandResult\(comspec, \["\/d", "\/s", "\/c"/);
  assert.match(source, /portable-parity-e2e: OK/);
  assert.match(source, /path\.join\(runnerTemp, "intent-planner-portable-parity"\)/);
  assert.match(source, /path\.join\(workRoot, "zip-extract"\)/);
  assert.doesNotMatch(source, /path\.join\(runnerTemp, "intent planner 日本語 parity"\)/);
  assert.match(source, /path\.join\(workRoot, "対象 プロジェクト"\)/);

  for (const fragment of [
    "--dry-run",
    "--lang",
    "--lang=en",
    "--agent",
    "--agent=codex",
    "claude",
    "codex",
    "gemini",
    'co"dex',
    "--unknown-parity-option",
    "対象 プロジェクト",
  ]) {
    assert.ok(source.includes(fragment), `比較ケースに ${fragment} を含む`);
  }
});
