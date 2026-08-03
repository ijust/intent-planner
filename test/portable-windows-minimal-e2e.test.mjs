import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import test from "node:test";

const WORKFLOW_URL = new URL("../.github/workflows/intent-planner-check.yml", import.meta.url);
const HARNESS_URL = new URL("../scripts/portable/windows-minimal-e2e.cmd", import.meta.url);

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
  assert.match(source, /schtasks\.exe \/create[^\r\n]*\/rl LIMITED/i);
  assert.match(source, /schtasks\.exe \/create[^\r\n]*\/ru "\.\\%PORTABLE_E2E_USER%"/i);
  assert.match(source, /schtasks\.exe \/run/i);
  assert.match(source, /schtasks\.exe \/end/i);
  assert.match(source, /schtasks\.exe \/delete/i);
  assert.match(source, /net\.exe user[^\r\n]*\/delete/i);
  assert.ok(source.indexOf("schtasks.exe /end") < source.indexOf("schtasks.exe /delete"));
  assert.ok(source.indexOf("schtasks.exe /delete") < source.indexOf('net.exe user "%PORTABLE_E2E_USER%" /delete'));
  for (const label of ["account_failed", "permissions_failed", "task_create_failed", "restricted_start_failed", "restricted_timeout"]) {
    assert.match(source, new RegExp(`:${label}\\r?\\ncall :cleanup_identity\\r?\\nif errorlevel 1 goto cleanup_failed`, "i"));
  }
  assert.match(source, /net\.exe session/i);
  for (const command of ["node.exe", "npm.cmd", "npx.cmd", "powershell.exe", "pwsh.exe"]) {
    assert.match(source, new RegExp(`where\\.exe ${command.replace(".", "\\.")}`, "i"));
  }
  assert.match(source, /set "PATH=%PORTABLE_E2E_EMPTY_PATH%"/i);
  assert.match(source, /set "HTTPS_PROXY=http:\/\/127\.0\.0\.1:9"/i);
  assert.match(source, /intent-planner\.cmd[^\r\n]*--dry-run[^\r\n]*--lang ja[^\r\n]*--agent claude/i);
  assert.match(source, /portable-e2e: OK/i);
});
