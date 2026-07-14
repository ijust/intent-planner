import { test } from "node:test";
import assert from "node:assert/strict";

import { renderTermDriftResult } from "../bin/cli.mjs";

const AGENT = Object.freeze({
  agentName: "codex",
  termDriftSkillDest: ".agents/skills/term-drift",
});
const OWNER_COMMAND = "node /installed/term-drift/bin/cli.mjs --codex";

function render(result, lang, overrides = {}) {
  return renderTermDriftResult(result, {
    lang,
    requested: true,
    dryRun: true,
    agentEntry: AGENT,
    ...overrides,
  });
}

test("requested dry-run renders version, selected agent, executable mode, and reason in ja/en", () => {
  const cases = [
    {
      mode: "fresh-install",
      health: { state: "not-installed" },
      ja: [/term-drift 0\.2\.1/, /codex/, /未導入/, /実行予定/, /新規導入/],
      en: [/term-drift 0\.2\.1/, /codex/, /not installed/i, /would run/i, /fresh install/i],
    },
    {
      mode: "additive-completion",
      health: {
        state: "inconsistent",
        repairability: "additive-compatible",
        issues: [{ code: "missing", path: ".agents/skills/term-drift/SKILL.md" }],
      },
      ja: [/term-drift 0\.2\.1/, /codex/, /安全に追加可能/, /実行予定/, /不足分のみ/],
      en: [/term-drift 0\.2\.1/, /codex/, /safe additive completion/i, /would run/i, /missing components only/i],
    },
  ];

  for (const fixture of cases) {
    const result = {
      action: "planned",
      version: "0.2.1",
      agent: "codex",
      mode: fixture.mode,
      health: fixture.health,
    };
    const ja = render(result, "ja");
    const en = render(result, "en");
    for (const pattern of fixture.ja) assert.match(ja, pattern);
    for (const pattern of fixture.en) assert.match(en, pattern);
  }
});

test("ready reports suppression and starts the full inspection from the selected installed skill", () => {
  const result = {
    action: "already-ready",
    health: {
      state: "ready",
      version: "0.2.1",
      skillPath: ".agents/skills/term-drift",
    },
  };

  const ja = render(result, "ja");
  assert.match(ja, /利用可能/);
  assert.match(ja, /実行抑止/);
  assert.match(ja, /すでに互換な一式/);
  assert.match(ja, /\.agents\/skills\/term-drift\/SKILL\.md/);
  assert.match(ja, /本格的な用語点検/);

  const en = render(result, "en");
  assert.match(en, /ready/i);
  assert.match(en, /suppressed/i);
  assert.match(en, /compatible set is already available/i);
  assert.match(en, /\.agents\/skills\/term-drift\/SKILL\.md/);
  assert.match(en, /full terminology inspection/i);
});

test("blocked reports suppression, its safety reason, and every problematic component path", () => {
  const result = {
    action: "blocked-inconsistent",
    health: {
      state: "inconsistent",
      repairability: "blocked",
      issues: [
        { code: "hash-mismatch", path: ".term-drift/rules/detect.md" },
        { code: "unsafe-path", path: ".agents/skills/term-drift/SKILL.md" },
      ],
    },
  };

  const ja = render(result, "ja");
  assert.match(ja, /部分導入または不整合/);
  assert.match(ja, /実行抑止/);
  assert.match(ja, /自動修復できない/);
  assert.match(ja, /\.term-drift\/rules\/detect\.md \(hash-mismatch\)/);
  assert.match(ja, /\.agents\/skills\/term-drift\/SKILL\.md \(unsafe-path\)/);

  const en = render(result, "en");
  assert.match(en, /partial or inconsistent/i);
  assert.match(en, /suppressed/i);
  assert.match(en, /automatic repair is blocked/i);
  assert.match(en, /\.term-drift\/rules\/detect\.md \(hash-mismatch\)/);
  assert.match(en, /\.agents\/skills\/term-drift\/SKILL\.md \(unsafe-path\)/);
});

test("installed and install-failed messages are honest and semantically paired", () => {
  const installed = {
    action: "installed",
    health: {
      state: "ready",
      version: "0.2.1",
      skillPath: ".agents/skills/term-drift",
    },
    install: { installed: true, agent: "codex", version: "0.2.1" },
  };
  assert.match(render(installed, "ja", { dryRun: false }), /導入と互換性確認が完了/);
  assert.match(render(installed, "en", { dryRun: false }), /installation and compatibility check completed/i);

  const failed = {
    action: "failed",
    health: { state: "not-installed" },
    failure: {
      kind: "nonzero-exit",
      message: "term-drift installer exited with status 9",
      guidance: {
        kind: "retry",
        command: OWNER_COMMAND,
        targetDir: "/repo/project",
      },
    },
  };
  const ja = render(failed, "ja", { dryRun: false });
  assert.match(ja, /導入失敗/);
  assert.match(ja, /導入後の確認/);
  assert.match(ja, /未導入/);
  assert.match(ja, /installer が正常終了しませんでした/);
  assert.doesNotMatch(ja, /term-drift installer exited with status 9/);
  assert.match(ja, /再実行/);
  assert.match(ja, /対象ディレクトリ: \/repo\/project/);
  const en = render(failed, "en", { dryRun: false });
  assert.match(en, /installation failed/i);
  assert.match(en, /post-install check/i);
  assert.match(en, /not installed/i);
  assert.match(en, /installer did not exit successfully/i);
  assert.doesNotMatch(en, /term-drift installer exited with status 9/);
  assert.match(en, /retry/i);
  assert.match(en, /target directory: \/repo\/project/i);
});

test("all runner failure kinds map to localized user-facing reasons without leaking internal messages", () => {
  const cases = [
    ["spawn-error", /owner installer を開始できませんでした/, /could not start the owner installer/i],
    ["nonzero-exit", /installer が正常終了しませんでした/, /installer did not exit successfully/i],
    ["invalid-json", /installer の応答を読み取れませんでした/, /installer response could not be read/i],
    ["contract-mismatch", /installer の応答が互換性契約と一致しませんでした/, /installer response did not match the compatibility contract/i],
    ["postcheck-failed", /導入後の互換性確認に失敗しました/, /post-install compatibility check failed/i],
  ];

  for (const [kind, jaReason, enReason] of cases) {
    const result = {
      action: "failed",
      health: { state: "not-installed" },
      failure: {
        kind,
        message: `INTERNAL ENGLISH ${kind}`,
        guidance: {
          kind: "retry",
          command: OWNER_COMMAND,
          targetDir: "/repo/project",
        },
      },
    };
    const ja = render(result, "ja", { dryRun: false });
    const en = render(result, "en", { dryRun: false });
    assert.match(ja, jaReason);
    assert.match(en, enReason);
    assert.doesNotMatch(ja, /INTERNAL ENGLISH/);
    assert.doesNotMatch(en, /INTERNAL ENGLISH/);
  }
});

test("retry and manual guidance render command and target directory on separate lines", () => {
  for (const [guidance, jaCommandLabel, enCommandLabel] of [
    [
      {
        kind: "retry",
        command: OWNER_COMMAND,
        targetDir: "/repo/retry",
      },
      "再実行コマンド",
      "Retry command",
    ],
    [
      {
        kind: "manual-resolution",
        issues: [{ code: "hash-mismatch", path: ".term-drift/rules/detect.md" }],
        afterResolutionCommand: OWNER_COMMAND,
        targetDir: "/repo/manual",
      },
      "解消後の再実行コマンド",
      "Command after resolution",
    ],
  ]) {
    const result = {
      action: "failed",
      health: { state: "not-installed" },
      failure: { kind: "postcheck-failed", message: "internal", guidance },
    };
    const ja = render(result, "ja", { dryRun: false });
    const en = render(result, "en", { dryRun: false });
    assert.match(ja, new RegExp(`${jaCommandLabel}: ${OWNER_COMMAND}\\n  対象ディレクトリ: \\/repo\\/`));
    assert.match(en, new RegExp(`${enCommandLabel}: ${OWNER_COMMAND}\\n  Target directory: \\/repo\\/`, "i"));
  }
});

test("repository-derived display values escape control characters and remain single-line", () => {
  const malicious = ".term-drift/rules/bad\nname\r\t\u001b[31m.md";
  const blocked = {
    action: "blocked-inconsistent",
    health: {
      state: "inconsistent",
      repairability: "blocked",
      issues: [{ code: "unsafe\ncode", path: malicious }],
    },
  };
  const blockedOutput = render(blocked, "ja", {
    agentEntry: { agentName: "co\tdex", termDriftSkillDest: ".agents/skills/term-drift" },
  });
  assert.match(blockedOutput, /agent: co\\tdex/);
  assert.match(blockedOutput, /bad\\nname\\r\\t\\x1b\[31m\.md \(unsafe\\ncode\)/);
  assert.doesNotMatch(blockedOutput, /[\r\t\u001b]/);

  const ready = {
    action: "already-ready",
    health: { state: "ready", version: "0.2.1", skillPath: ".agents/skills/bad\n\u001bskill" },
  };
  const readyOutput = render(ready, "en");
  assert.match(readyOutput, /\.agents\/skills\/bad\\n\\x1bskill\/SKILL\.md/);
  assert.doesNotMatch(readyOutput, /\u001b/);

  const failed = {
    action: "failed",
    health: { state: "not-installed" },
    failure: {
      kind: "spawn-error",
      message: "internal",
      guidance: {
        kind: "retry",
        command: OWNER_COMMAND,
        targetDir: "/repo/bad\n\u001bdir",
      },
    },
  };
  const failedOutput = render(failed, "en", { dryRun: false });
  assert.match(failedOutput, /Target directory: \/repo\/bad\\n\\x1bdir/);
  assert.doesNotMatch(failedOutput, /\u001b/);
});

test("unrequested dry-run skipped result renders no fictional term-drift plan", () => {
  const output = renderTermDriftResult(
    { action: "skipped", health: { state: "not-installed" } },
    { lang: "ja", requested: false, dryRun: true, agentEntry: AGENT },
  );
  assert.equal(output, "");
});

test("0.3.0 dry-run plans distinguish install and update with equivalent ja/en facts", () => {
  for (const operation of ["install", "update"]) {
    const result = {
      action: "planned",
      operation,
      version: "0.3.0",
      agent: "codex",
      mode: operation === "install" ? "fresh-install" : "additive-completion",
      health:
        operation === "install"
          ? { state: "not-installed" }
          : {
              state: "inconsistent",
              repairability: "update-attemptable",
              issues: [{ code: "version-mismatch", path: ".term-drift/version.json#/version" }],
            },
    };
    for (const lang of ["ja", "en"]) {
      const output = render(result, lang, { version: "0.3.0" });
      assert.match(output, /0\.3\.0/);
      assert.match(output, /codex/);
      assert.match(output, operation === "install" ? /install|新規導入/i : /update|更新/i);
      assert.match(output, operation === "install" ? /not installed|未導入/i : /inconsistent|不整合/i);
    }
  }
});

test("install and update successes give the dedicated skill entry in ja/en", () => {
  for (const [action, operation] of [["installed", "install"], ["updated", "update"]]) {
    const result = {
      action,
      operation,
      health: { state: "ready", version: "0.3.0", skillPath: AGENT.termDriftSkillDest },
    };
    for (const lang of ["ja", "en"]) {
      const output = render(result, lang, { dryRun: false, version: "0.3.0" });
      assert.match(output, operation === "install" ? /installation|導入/i : /update|更新/i);
      assert.match(output, /0\.3\.0/);
      assert.match(output, /\.agents\/skills\/term-drift\/SKILL\.md/);
    }
  }
});

test("unrequested inconsistent state is a warning without a fictional plan", () => {
  const result = {
    action: "skipped",
    health: {
      state: "inconsistent",
      repairability: "update-attemptable",
      issues: [{ code: "version-mismatch", path: ".term-drift/version.json#/version" }],
    },
  };
  for (const lang of ["ja", "en"]) {
    const output = renderTermDriftResult(result, {
      lang,
      requested: false,
      dryRun: true,
      agentEntry: AGENT,
      version: "0.3.0",
    });
    assert.match(output, /warning|警告/i);
    assert.match(output, /version-mismatch/);
    assert.doesNotMatch(output, /would run|実行予定/i);
  }
});

test("unrequested blocked action remains a warning and does not claim suppression by request", () => {
  const result = {
    action: "blocked-inconsistent",
    health: {
      state: "inconsistent",
      repairability: "blocked",
      issues: [{ code: "unsafe-path", path: ".agents/skills/term-drift/SKILL.md" }],
    },
  };
  for (const lang of ["ja", "en"]) {
    const output = renderTermDriftResult(result, {
      lang,
      requested: false,
      agentEntry: AGENT,
      version: "0.3.0",
    });
    assert.match(output, /warning|警告/i);
    assert.match(output, /unsafe-path/);
    assert.doesNotMatch(output, /action:|実行抑止|suppressed/i);
  }
});

test("retry guidance sanitizes command and labels it as the safe next action", () => {
  const result = {
    action: "failed",
    operation: "install",
    health: { state: "not-installed" },
    failure: {
      operation: "install",
      kind: "spawn-error",
      message: "hidden stderr",
      guidance: {
        kind: "retry",
        command: "npx\n--yes\tterm-drift@0.3.0\u001b",
        targetDir: "/repo/project",
      },
    },
  };
  for (const lang of ["ja", "en"]) {
    const output = render(result, lang, { dryRun: false, version: "0.3.0" });
    assert.match(output, /safe next action|安全な次の操作/i);
    assert.match(output, /npx\\n--yes\\tterm-drift@0\.3\.0\\x1b/);
    assert.doesNotMatch(output, /[\r\t\u001b]/);
  }
});

test("update failure shows operation, kind, post-health issue, target and safe action without stderr", () => {
  const result = {
    action: "failed",
    operation: "update",
    health: {
      state: "inconsistent",
      repairability: "blocked",
      issues: [{ code: "hash-mismatch", path: ".term-drift/rules/detect.md" }],
    },
    failure: {
      operation: "update",
      kind: "nonzero-exit",
      message: "SECRET OWNER STDERR\nsecond line",
      guidance: {
        kind: "manual-resolution",
        issues: [{ code: "hash-mismatch", path: ".term-drift/rules/detect.md" }],
        afterResolutionCommand: "node /installed/term-drift/bin/cli.mjs update --codex",
        targetDir: "/repo/project",
      },
    },
  };
  for (const lang of ["ja", "en"]) {
    const output = render(result, lang, { dryRun: false, version: "0.3.0" });
    assert.match(output, /update|更新/i);
    assert.match(output, /nonzero-exit/);
    assert.match(output, /hash-mismatch/);
    assert.match(output, /\/repo\/project/);
    assert.match(output, /manual|手動/i);
    assert.doesNotMatch(output, /SECRET OWNER STDERR/);
  }
});
