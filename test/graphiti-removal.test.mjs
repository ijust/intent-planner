import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import {
  applyGraphitiRetirement,
  listPublishedGraphitiArtifacts,
  planGraphitiRetirement,
} from "../src/graphiti-retirement.mjs";
import { install } from "../src/install.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "bin", "cli.mjs");
const PROVENANCE_PATH = path.join(
  ROOT,
  "test",
  "fixtures",
  "graphiti-published-artifacts",
  "provenance.json",
);
const FINGERPRINTS_PATH = path.join(
  ROOT,
  "test",
  "fixtures",
  "graphiti-published-artifacts",
  "fingerprints.json",
);
const PUBLISHED_BYTES_PATH = path.join(
  ROOT,
  "test",
  "fixtures",
  "graphiti-published-artifacts",
  "published-bytes.json.gz.base64",
);
const RETIREMENT_CASES_PATH = path.join(
  ROOT,
  "test",
  "fixtures",
  "graphiti-published-artifacts",
  "retirement-cases.json",
);

const EXPECTED_GRAPHITI_PATHS = [
  "templates/en/claude/skills/intent-graphiti-sync/SKILL.md",
  "templates/en/codex/skills/intent-graphiti-sync/SKILL.md",
  "templates/en/intent/graphiti-safety-boundary.md",
  "templates/en/intent/graphiti-search-boundary.md",
  "templates/en/intent/graphiti-sync-boundary.md",
  "templates/ja/claude/skills/intent-graphiti-sync/SKILL.md",
  "templates/ja/codex/skills/intent-graphiti-sync/SKILL.md",
  "templates/ja/intent/graphiti-safety-boundary.md",
  "templates/ja/intent/graphiti-search-boundary.md",
  "templates/ja/intent/graphiti-sync-boundary.md",
];

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolutePath) : [absolutePath];
  });
}

function snapshotTree(directory) {
  const snapshot = {};

  function visit(current, relative = "") {
    for (const entry of fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = path.join(relative, entry.name);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink()) {
        snapshot[relativePath] = {
          type: "symlink",
          target: fs.readlinkSync(absolutePath),
        };
      } else if (stat.isDirectory()) {
        snapshot[relativePath] = { type: "directory" };
        visit(absolutePath, relativePath);
      } else if (stat.isFile()) {
        snapshot[relativePath] = {
          type: "file",
          bytes: fs.readFileSync(absolutePath).toString("base64"),
        };
      } else {
        snapshot[relativePath] = { type: "special", mode: stat.mode };
      }
    }
  }

  visit(directory);
  return snapshot;
}

function runGit(targetDir, args) {
  const result = spawnSync("git", args, {
    cwd: targetDir,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
  );
  return result.stdout;
}

function runCliWithPreviewWriteHook(targetDir, lang, graphitiSkill, hookSource) {
  const script = `
    import fs from "node:fs";
    import { pathToFileURL } from "node:url";
    const [cli, targetDir, lang, graphitiSkill] = process.argv.slice(1);
    process.argv = [process.execPath, targetDir];
    const { main } = await import(pathToFileURL(cli).href);
    const originalWrite = process.stdout.write.bind(process.stdout);
    let hooked = false;
    process.stdout.write = (chunk, ...args) => {
      const text = String(chunk);
      ${hookSource}
      return originalWrite(chunk, ...args);
    };
    process.argv = [process.execPath, cli, targetDir, "--lang", lang];
    main();
  `;
  return spawnSync(
    process.execPath,
    ["--input-type=module", "-e", script, CLI, targetDir, lang, graphitiSkill],
    { encoding: "utf8" },
  );
}

function assertNoGraphitiDistributionPaths(paths, context) {
  const graphitiPaths = paths.filter((relativePath) => /graphiti/i.test(relativePath));
  assert.deepEqual(graphitiPaths, [], `${context}: Graphiti 固有パスを配布しない`);
}

function assertRetirementSourceBoundary(source) {
  const goldenManifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, "test", "golden-locks.manifest.json"), "utf8"),
  );
  const expectedHash =
    goldenManifest.groups.installerLocked.entries["src/graphiti-retirement.mjs"];
  assert.equal(
    crypto.createHash("sha256").update(source).digest("hex"),
    expectedHash,
    "撤去モジュール全体が承認済み内容と一致する",
  );

  const importLines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("import "));
  assert.deepEqual(importLines.sort(), [
    'import crypto from "node:crypto";',
    'import fs from "node:fs";',
    'import path from "node:path";',
  ]);
  assert.doesNotMatch(source, /\bimport\s*\(|\brequire\s*\(|\bfs\s*\[/);

  const exportLines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("export "));
  assert.deepEqual(exportLines.sort(), [
    "export function applyGraphitiRetirement(targetDir, decisions) {",
    "export function listPublishedGraphitiArtifacts() {",
    "export function planGraphitiRetirement(targetDir) {",
  ]);

  const fsMethods = [...source.matchAll(/\bfs\.([A-Za-z_$][\w$]*)/g)]
    .map((match) => match[1])
    .filter((method, index, methods) => methods.indexOf(method) === index)
    .sort();
  assert.deepEqual(fsMethods, ["lstatSync", "readFileSync", "unlinkSync"]);
  assert.doesNotMatch(
    source,
    /\b(?:const|let|var)\s*\{[^}]+\}\s*=\s*fs\b|node:(?:child_process|dns|http|https|net|tls)|\b(?:fetch|WebSocket|XMLHttpRequest|Reflect\.get)\b/,
  );
}

function assertNoReplacementModuleNames(moduleNames) {
  assert.deepEqual(
    moduleNames.filter((name) =>
      /(?:knowledge|temporal|timeline|sync|connector|index|persistence|storage|database|state|cache|history|event-store|repository)/i.test(
        name,
      ),
    ),
    [],
  );
}

test("新しい配布元に Graphiti 専用 skill と境界文書を残さない", () => {
  for (const relativePath of EXPECTED_GRAPHITI_PATHS) {
    assert.equal(
      fs.existsSync(path.join(ROOT, relativePath)),
      false,
      `${relativePath} must not remain in the distribution source`,
    );
  }
});

test("通常の Intent Planning 正本は Graphiti の接続・同期・検索を要求しない", () => {
  const canonicalFiles = [];
  for (const lang of ["ja", "en"]) {
    canonicalFiles.push(...listFiles(path.join(ROOT, "templates", lang, "agents")));
    for (const agent of ["claude", "codex"]) {
      const skillsRoot = path.join(ROOT, "templates", lang, agent, "skills");
      for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
        if (
          entry.isDirectory() &&
          entry.name.startsWith("intent-") &&
          !entry.name.startsWith("intent-export-") &&
          entry.name !== "intent-plan"
        ) {
          canonicalFiles.push(...listFiles(path.join(skillsRoot, entry.name)));
        }
      }
    }
  }

  for (const file of canonicalFiles) {
    assert.doesNotMatch(
      fs.readFileSync(file, "utf8"),
      /graphiti/i,
      `${path.relative(ROOT, file)} must not require Graphiti in the canonical workflow`,
    );
  }
});

test("三つの下流出力の正本は Graphiti 固有条件を出力しない", () => {
  const exportSkills = [
    "intent-export-cc-sdd",
    "intent-export-openspec",
    "intent-export-speckit",
  ];
  for (const lang of ["ja", "en"]) {
    for (const agent of ["claude", "codex"]) {
      for (const skill of exportSkills) {
        const skillRoot = path.join(ROOT, "templates", lang, agent, "skills", skill);
        for (const file of listFiles(skillRoot)) {
          assert.doesNotMatch(
            fs.readFileSync(file, "utf8"),
            /graphiti/i,
            `${path.relative(ROOT, file)} must not hand Graphiti conditions downstream`,
          );
        }
      }
    }
  }
});

test("公開中の入口・ガイド・理論文書は Graphiti を現行機能として案内しない", () => {
  const publicDocs = [
    "README.md",
    "README.en.md",
    "docs/guide.md",
    "docs/guide.en.md",
    "docs/theory.md",
    "docs/theory.en.md",
  ];
  for (const relativePath of publicDocs) {
    assert.doesNotMatch(
      fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
      /graphiti/i,
      `${relativePath} must not describe Graphiti as a current feature`,
    );
  }
});

test("日英の移行案内と変更履歴が Graphiti 撤去後の責任分担を説明する", () => {
  const retiredInstalledPaths = [
    ".claude/skills/intent-graphiti-sync/SKILL.md",
    ".agents/skills/intent-graphiti-sync/SKILL.md",
    ".intent/graphiti-safety-boundary.md",
    ".intent/graphiti-search-boundary.md",
    ".intent/graphiti-sync-boundary.md",
  ];
  const documents = [
    {
      paths: ["docs/migration.md", "docs/changelog.md"],
      required: [
        /事前確認[\s\S]*同期[\s\S]*工程別検索/,
        /外部知識基盤を使わない状態が通常/,
        /候補.*表示/,
        /公開済み内容と完全に一致/,
        /編集済み[\s\S]*由来不明[\s\S]*(?:読み取り不能|判定不能)[\s\S]*残/,
        /パス[\s\S]*理由/,
        /(?:dry-run|手動)/i,
        /外部の Graphiti[\s\S]{0,180}(?:変更|削除)しません/,
        /案件側の責務/,
        /旧(?:機能|設計)[\s\S]{0,80}(?:復元しません|復元せず)/,
        /新しい Intent Planning/,
      ],
    },
    {
      paths: ["docs/migration.en.md", "docs/changelog.en.md"],
      required: [
        /preflight[\s\S]*synchronization[\s\S]*stage-specific search/i,
        /without an external knowledge store is the normal state/i,
        /(?:candidates? (?:are )?shown|showing the candidates|preview)/i,
        /exactly matches published content/i,
        /edited[\s\S]*unknown[\s\S]*(?:unreadable|uncertain)[\s\S]*retain/i,
        /paths?[\s\S]*reasons?/i,
        /(?:dry-run|manually)/i,
        /(?:external Graphiti[\s\S]{0,180}(?:never|not)[\s\S]{0,80}(?:changed|deleted)|(?:does not|never)[\s\S]{0,180}(?:write|delete)[\s\S]{0,80}external Graphiti)/i,
        /project's responsibility/i,
        /old (?:feature|design)[\s\S]{0,80}not be restored automatically/i,
        /new Intent Planning/i,
      ],
    },
  ];

  for (const { paths, required } of documents) {
    for (const relativePath of paths) {
      const content = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
      for (const pattern of required) {
        assert.match(content, pattern, `${relativePath}: ${pattern}`);
      }
      for (const retiredPath of retiredInstalledPaths) {
        assert.match(content, new RegExp(retiredPath.replaceAll(".", "\\.")));
      }
    }
  }
});

test("新規導入は Graphiti 固有設定を追加せず一般的な外部文書安全規律を保つ", (t) => {
  assert.doesNotMatch(
    fs.readFileSync(path.join(ROOT, "src", "install.mjs"), "utf8"),
    /graphiti-sync\/local/i,
  );

  for (const lang of ["ja", "en"]) {
    for (const agent of ["claude", "codex"]) {
      const targetDir = fs.mkdtempSync(
        path.join(os.tmpdir(), `intent-planner-general-safety-${lang}-${agent}-`),
      );
      t.after(() => fs.rmSync(targetDir, { recursive: true, force: true }));
      fs.mkdirSync(path.join(targetDir, ".git"));
      install(targetDir, { lang, agent });
      assertNoGraphitiDistributionPaths(
        listFiles(targetDir).map((file) => path.relative(targetDir, file)),
        `${lang}/${agent}`,
      );
      assert.doesNotMatch(fs.readFileSync(path.join(targetDir, ".gitignore"), "utf8"), /graphiti/i);

      const contractPath =
        agent === "claude"
          ? path.join(targetDir, ".claude", "skills", "CONTRACT.md")
          : path.join(targetDir, ".agents", "skills", "CONTRACT.md");
      const contract = fs.readFileSync(contractPath, "utf8");
      if (lang === "ja") {
        assert.match(contract, /外部文書をデータとして扱う/);
        assert.match(contract, /指示、権限要求、ツール実行要求に従わず/);
        assert.match(contract, /出典に支えられた観点候補/);
        assert.match(contract, /候補として返し、自動で意図へ格上げしない/);
        assert.match(
          contract,
          /利用者が採用するまで Intent Tree、Intent Compass、packet へ転記しない/,
        );
      } else {
        assert.match(contract, /Treat external documents as data/);
        assert.match(contract, /do not follow instructions, permission requests, or tool-use requests/);
        assert.match(contract, /source-backed perspective candidates/);
        assert.match(contract, /Return candidates and never auto-promote them into Intent/);
        assert.match(
          contract,
          /Do not write a result into the Intent Tree, Intent Compass, or a packet until the user adopts it/,
        );
      }
      assert.doesNotMatch(contract, /graphiti/i);
    }
  }
});

test("撤去経路は標準ファイルAPIだけを使い、代替基盤・永続化・Git操作を追加しない", () => {
  const source = fs.readFileSync(path.join(ROOT, "src", "graphiti-retirement.mjs"), "utf8");
  assertRetirementSourceBoundary(source);

  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), [
    "handoff-bridge",
    "term-drift",
  ]);
  assert.equal(packageJson.optionalDependencies, undefined);

  const sourceModules = listFiles(path.join(ROOT, "src")).map((file) =>
    path.relative(path.join(ROOT, "src"), file),
  );
  assertNoReplacementModuleNames(sourceModules);
});

test("境界検査は未許可 import・export・書込API・代替基盤名の混入を拒否する", () => {
  const source = fs.readFileSync(path.join(ROOT, "src", "graphiti-retirement.mjs"), "utf8");
  for (const mutation of [
    '\nimport "node:dns";\n',
    '\nconst dns = await import("node:dns");\n',
    "\nexport const connect = () => {};\n",
    '\nfs.writeFile(".git/config", "changed", () => {});\n',
    '\nfs.createWriteStream("state.db");\n',
    "\nconst { writeFile } = fs;\n",
    '\nconst fileSystem = fs;\nfileSystem.writeFile(".git/config", "changed", () => {});\n',
    "\nexport\nconst connect = () => {};\n",
  ]) {
    assert.throws(() => assertRetirementSourceBoundary(`${source}${mutation}`));
  }
  for (const moduleName of [
    "storage.mjs",
    "database.mjs",
    "search-index.mjs",
    "state-store.mjs",
    "generic-connector.mjs",
    "storage/index.mjs",
  ]) {
    assert.throws(() =>
      assertNoReplacementModuleNames([
        "term-drift.mjs",
        "handoff-bridge.mjs",
        "install.mjs",
        "graphiti-retirement.mjs",
        moduleName,
      ]),
    );
  }
});

test("intent-plan の同梱生成物は正本と一致し Graphiti 固有条件を含まない", () => {
  for (const lang of ["ja", "en"]) {
    for (const agent of ["claude", "codex"]) {
      const generatedRoot = path.join(
        ROOT,
        "templates",
        lang,
        agent,
        "skills",
        "intent-plan",
        "generated",
      );
      for (const file of listFiles(generatedRoot)) {
        assert.doesNotMatch(
          fs.readFileSync(file, "utf8"),
          /graphiti/i,
          `${path.relative(ROOT, file)} must not retain Graphiti after regeneration`,
        );
      }
    }
  }
});

function writePublishedGraphitiSkill(targetDir) {
  const record = readPublishedByteRecords().find(
    ({ publishedVersion, sourcePath }) =>
      publishedVersion === "0.27.2" &&
      sourcePath === "templates/en/claude/skills/intent-graphiti-sync/SKILL.md",
  );
  const skillPath = path.join(targetDir, ".claude", "skills", "intent-graphiti-sync", "SKILL.md");
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.writeFileSync(skillPath, Buffer.from(record.bytesBase64, "base64"));
  return skillPath;
}

test("明示的更新は Graphiti 撤去候補をコピー適用前に提示してから削除する", (t) => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-retirement-install-"));
  t.after(() => fs.rmSync(targetDir, { recursive: true, force: true }));
  const graphitiSkill = writePublishedGraphitiSkill(targetDir);
  const discoverSkill = path.join(targetDir, ".claude", "skills", "intent-discover", "SKILL.md");
  fs.mkdirSync(path.dirname(discoverSkill), { recursive: true });
  fs.writeFileSync(discoverSkill, "old discover");

  const events = [];
  const result = install(targetDir, {
    update: true,
    beforeGraphitiRemoval(preview) {
      events.push("preview");
      assert.equal(fs.existsSync(graphitiSkill), true);
      assert.equal(fs.readFileSync(discoverSkill, "utf8"), "old discover");
      assert.deepEqual(preview.candidates, [".claude/skills/intent-graphiti-sync/SKILL.md"]);
      return true;
    },
  });
  events.push("returned");

  assert.deepEqual(events, ["preview", "returned"]);
  assert.equal(fs.existsSync(graphitiSkill), false);
  assert.notEqual(fs.readFileSync(discoverSkill, "utf8"), "old discover");
  assert.equal(result.graphitiRemoval.previewed, true);
  assert.deepEqual(result.graphitiRemoval.removed, [
    ".claude/skills/intent-graphiti-sync/SKILL.md",
  ]);
});

test("提示不能・dry-run・非更新では Graphiti 撤去候補を残す", (t) => {
  const cases = [
    { name: "presenter absent", options: { update: true }, previewed: false },
    {
      name: "presenter false",
      options: { update: true, beforeGraphitiRemoval: () => false },
      previewed: false,
    },
    {
      name: "presenter throws",
      options: {
        update: true,
        beforeGraphitiRemoval() {
          throw new Error("display failed");
        },
      },
      previewed: false,
    },
    {
      name: "dry-run",
      options: { update: true, dryRun: true, beforeGraphitiRemoval: () => true },
      previewed: true,
    },
    {
      name: "not update",
      options: {
        update: false,
        beforeGraphitiRemoval() {
          assert.fail("non-update must not plan or preview Graphiti retirement");
        },
      },
      previewed: false,
      planned: 0,
    },
  ];

  for (const scenario of cases) {
    const targetDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `intent-planner-retirement-${scenario.name.replaceAll(" ", "-")}-`),
    );
    t.after(() => fs.rmSync(targetDir, { recursive: true, force: true }));
    const graphitiSkill = writePublishedGraphitiSkill(targetDir);
    const result = install(targetDir, scenario.options);
    assert.equal(fs.existsSync(graphitiSkill), true, scenario.name);
    assert.equal(result.graphitiRemoval.previewed, scenario.previewed, scenario.name);
    assert.equal(
      result.graphitiRemoval.planned.length,
      scenario.planned ?? 5,
      `${scenario.name}: planned`,
    );
    assert.deepEqual(result.graphitiRemoval.removed, [], scenario.name);
    assert.ok(
      scenario.planned === 0 ||
        result.graphitiRemoval.retained.some(
          ({ relativePath }) =>
            relativePath === ".claude/skills/intent-graphiti-sync/SKILL.md",
        ),
      `${scenario.name}: actual candidate is reported retained`,
    );
  }
});

test("更新統合は利用者データ・共有文書・Git のステージと履歴を変更しない", (t) => {
  const targetDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "intent-planner-retirement-boundaries-"),
  );
  t.after(() => fs.rmSync(targetDir, { recursive: true, force: true }));

  runGit(targetDir, ["init", "--quiet"]);
  const stagedFile = path.join(targetDir, "staged.txt");
  fs.writeFileSync(stagedFile, "committed\n");
  runGit(targetDir, ["add", "staged.txt"]);
  runGit(targetDir, [
    "-c",
    "user.name=Intent Planner Test",
    "-c",
    "user.email=intent-planner-test@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "baseline",
  ]);
  fs.writeFileSync(stagedFile, "staged change\n");
  runGit(targetDir, ["add", "staged.txt"]);

  const userData = path.join(targetDir, ".intent", "intent-tree.md");
  const sharedDoc = path.join(targetDir, "CLAUDE.md");
  const discoverSkill = path.join(
    targetDir,
    ".claude",
    "skills",
    "intent-discover",
    "SKILL.md",
  );
  fs.mkdirSync(path.dirname(userData), { recursive: true });
  fs.mkdirSync(path.dirname(discoverSkill), { recursive: true });
  fs.writeFileSync(userData, "user intent data\n");
  fs.writeFileSync(sharedDoc, "shared project instructions\n");
  fs.writeFileSync(discoverSkill, "old discover\n");
  const graphitiSkill = writePublishedGraphitiSkill(targetDir);

  const before = {
    userData: fs.readFileSync(userData),
    sharedDoc: fs.readFileSync(sharedDoc),
    staged: runGit(targetDir, ["diff", "--cached", "--binary"]),
    head: runGit(targetDir, ["rev-parse", "HEAD"]),
  };
  const events = [];
  const result = install(targetDir, {
    update: true,
    confirmRootDoc: () => false,
    beforeGraphitiRemoval(preview) {
      events.push("preview");
      assert.equal(fs.existsSync(graphitiSkill), true);
      assert.equal(fs.readFileSync(discoverSkill, "utf8"), "old discover\n");
      assert.deepEqual(fs.readFileSync(userData), before.userData);
      assert.deepEqual(fs.readFileSync(sharedDoc), before.sharedDoc);
      assert.equal(runGit(targetDir, ["diff", "--cached", "--binary"]), before.staged);
      assert.equal(runGit(targetDir, ["rev-parse", "HEAD"]), before.head);
      assert.deepEqual(preview.candidates, [
        ".claude/skills/intent-graphiti-sync/SKILL.md",
      ]);
      return true;
    },
  });
  events.push("returned");

  assert.deepEqual(events, ["preview", "returned"]);
  assert.equal(fs.existsSync(graphitiSkill), false);
  assert.notEqual(fs.readFileSync(discoverSkill, "utf8"), "old discover\n");
  assert.deepEqual(fs.readFileSync(userData), before.userData);
  assert.deepEqual(fs.readFileSync(sharedDoc), before.sharedDoc);
  assert.equal(runGit(targetDir, ["diff", "--cached", "--binary"]), before.staged);
  assert.equal(runGit(targetDir, ["rev-parse", "HEAD"]), before.head);
  assert.equal(result.graphitiRemoval.previewed, true);
  assert.deepEqual(result.graphitiRemoval.removed, [
    ".claude/skills/intent-graphiti-sync/SKILL.md",
  ]);
  assert.equal(result.graphitiRemoval.planned.length, 5);
});

test("CLI は ja/en で候補・残す理由・適用結果を削除前から表示する", (t) => {
  for (const lang of ["ja", "en"]) {
    const targetDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `intent-planner-retirement-cli-${lang}-`),
    );
    t.after(() => fs.rmSync(targetDir, { recursive: true, force: true }));
    const graphitiSkill = writePublishedGraphitiSkill(targetDir);
    const editedBoundary = path.join(targetDir, ".intent", "graphiti-search-boundary.md");
    fs.mkdirSync(path.dirname(editedBoundary), { recursive: true });
    fs.writeFileSync(editedBoundary, "project-owned Graphiti notes");

    const result = spawnSync(process.execPath, [CLI, targetDir, "--lang", lang], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(graphitiSkill), false, `${lang}: published skill removed`);
    assert.equal(fs.readFileSync(editedBoundary, "utf8"), "project-owned Graphiti notes");
    assert.match(result.stdout, /\.claude\/skills\/intent-graphiti-sync\/SKILL\.md/);
    assert.match(result.stdout, /\.intent\/graphiti-search-boundary\.md/);
    if (lang === "ja") {
      assert.match(result.stdout, /削除候補/);
      assert.match(result.stdout, /編集済みまたは由来不明/);
      assert.match(result.stdout, /削除しました/);
    } else {
      assert.match(result.stdout, /removal candidates/i);
      assert.match(result.stdout, /edited or unknown/i);
      assert.match(result.stdout, /removed/i);
    }
    assert.ok(
      result.stdout.indexOf(".claude/skills/intent-graphiti-sync/SKILL.md") <
        result.stdout.lastIndexOf(lang === "ja" ? "削除しました" : "Removed"),
      `${lang}: candidate is displayed before the removal result`,
    );
  }
});

test("CLI の dry-run は ja/en で削除予定を示し対象を変更しない", (t) => {
  for (const lang of ["ja", "en"]) {
    const targetDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `intent-planner-retirement-cli-dry-${lang}-`),
    );
    t.after(() => fs.rmSync(targetDir, { recursive: true, force: true }));
    const graphitiSkill = writePublishedGraphitiSkill(targetDir);
    const result = spawnSync(
      process.execPath,
      [CLI, targetDir, "--lang", lang, "--dry-run"],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(graphitiSkill), true);
    assert.match(result.stdout, /\.claude\/skills\/intent-graphiti-sync\/SKILL\.md/);
    assert.match(result.stdout, lang === "ja" ? /削除予定/ : /would be removed/i);
  }
});

test("CLI は ja/en で削除前表示中の変更を再確認し、残した結果を表示する", (t) => {
  for (const lang of ["ja", "en"]) {
    const targetDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `intent-planner-retirement-cli-recheck-${lang}-`),
    );
    t.after(() => fs.rmSync(targetDir, { recursive: true, force: true }));
    const graphitiSkill = writePublishedGraphitiSkill(targetDir);
    const result = runCliWithPreviewWriteHook(
      targetDir,
      lang,
      graphitiSkill,
      `
        if (!hooked && text.includes(".claude/skills/intent-graphiti-sync/SKILL.md")) {
          fs.writeFileSync(graphitiSkill, "edited during removal preview\\n");
          hooked = true;
        }
      `,
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(graphitiSkill, "utf8"), "edited during removal preview\n");
    const pathOccurrences = result.stdout.match(
      /\.claude\/skills\/intent-graphiti-sync\/SKILL\.md/g,
    );
    assert.ok(pathOccurrences?.length >= 2, `${lang}: path is shown before and after recheck`);
    assert.match(
      result.stdout,
      lang === "ja" ? /編集済みまたは由来不明/ : /edited or unknown/i,
    );
  }
});

test("CLI は ja/en で削除前表示に失敗したとき候補を削除しない", (t) => {
  for (const lang of ["ja", "en"]) {
    const targetDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `intent-planner-retirement-cli-output-failure-${lang}-`),
    );
    t.after(() => fs.rmSync(targetDir, { recursive: true, force: true }));
    const graphitiSkill = writePublishedGraphitiSkill(targetDir);
    const result = runCliWithPreviewWriteHook(
      targetDir,
      lang,
      graphitiSkill,
      `
        if (!hooked) {
          hooked = true;
          throw new Error("simulated stdout failure");
        }
      `,
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(graphitiSkill), true, `${lang}: candidate must remain`);
    assert.match(result.stdout, /\.claude\/skills\/intent-graphiti-sync\/SKILL\.md/);
    assert.match(
      result.stdout,
      lang === "ja"
        ? /削除前表示を完了できなかったため未適用/
        : /not applied because the pre-deletion preview did not complete/i,
    );
  }
});

test("ja/en・Claude/Codex の新規導入に Graphiti 専用物を配置しない", (t) => {
  const installedPaths = [
    ".claude/skills/intent-graphiti-sync/SKILL.md",
    ".agents/skills/intent-graphiti-sync/SKILL.md",
    ".intent/graphiti-safety-boundary.md",
    ".intent/graphiti-search-boundary.md",
    ".intent/graphiti-sync-boundary.md",
  ];
  for (const lang of ["ja", "en"]) {
    for (const agent of ["claude", "codex"]) {
      const targetDir = fs.mkdtempSync(
        path.join(os.tmpdir(), `intent-planner-no-graphiti-${lang}-${agent}-`),
      );
      t.after(() => fs.rmSync(targetDir, { recursive: true, force: true }));
      install(targetDir, { lang, agent });
      assertNoGraphitiDistributionPaths(
        listFiles(targetDir).map((file) => path.relative(targetDir, file)),
        `${lang}/${agent}`,
      );
      for (const relativePath of installedPaths) {
        assert.equal(
          fs.existsSync(path.join(targetDir, relativePath)),
          false,
          `${lang}/${agent}: ${relativePath}`,
        );
      }
    }
  }
});

test("Graphiti 撤去対象の由来は公開済み npm パッケージだけに固定される", () => {
  const provenance = JSON.parse(fs.readFileSync(PROVENANCE_PATH, "utf8"));

  assert.equal(provenance.schemaVersion, 1);
  assert.equal(provenance.packageName, "intent-planner");
  assert.equal(provenance.registry, "https://registry.npmjs.org");
  assert.deepEqual(provenance.discovery, {
    versionsCommand: "npm view intent-planner versions --json",
    filesCommand: "npm pack intent-planner@<version> --dry-run --json",
    graphitiPathPattern: "graphiti",
  });
  assert.equal(provenance.lastVersionWithoutGraphiti.version, "0.26.1");
  assert.equal(provenance.lastVersionWithoutGraphiti.graphitiPathCount, 0);
  assert.match(provenance.lastVersionWithoutGraphiti.integrity, /^sha512-/);

  assert.deepEqual(
    provenance.publishedVersions.map(({ version }) => version),
    ["0.27.0", "0.27.1", "0.27.2"],
  );

  const graphitiPathPattern = new RegExp(provenance.discovery.graphitiPathPattern, "i");
  for (const release of provenance.publishedVersions) {
    assert.match(release.publishedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.equal(
      release.tarball,
      `https://registry.npmjs.org/intent-planner/-/intent-planner-${release.version}.tgz`,
    );
    assert.match(release.integrity, /^sha512-/);
    assert.deepEqual(release.graphitiPaths, EXPECTED_GRAPHITI_PATHS);
    assert.deepEqual(
      release.graphitiPaths.filter((relativePath) => graphitiPathPattern.test(relativePath)),
      EXPECTED_GRAPHITI_PATHS,
      `${release.version}: 再走査条件は全 Graphiti パスを再導出する`,
    );
  }
});

function installedRelativePath(sourcePath) {
  if (sourcePath.includes("/claude/skills/")) {
    return sourcePath.replace(/^templates\/(?:ja|en)\/claude\/skills\//, ".claude/skills/");
  }
  if (sourcePath.includes("/codex/skills/")) {
    return sourcePath.replace(/^templates\/(?:ja|en)\/codex\/skills\//, ".agents/skills/");
  }
  return sourcePath.replace(/^templates\/(?:ja|en)\/intent\//, ".intent/");
}

function catalogFromPublishedBytes(records) {
  const distinct = new Map();
  for (const record of records) {
    const bytes = Buffer.from(record.bytesBase64, "base64");
    const artifact = {
      publishedVersions: [record.publishedVersion],
      sourcePath: record.sourcePath,
      relativePath: installedRelativePath(record.sourcePath),
      byteLength: bytes.length,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    };
    const key = [
      artifact.sourcePath,
      artifact.relativePath,
      artifact.byteLength,
      artifact.sha256,
    ].join("\0");
    const existing = distinct.get(key);
    if (existing) existing.publishedVersions.push(record.publishedVersion);
    else distinct.set(key, artifact);
  }
  return [...distinct.values()];
}

function readPublishedByteRecords() {
  const encoded = fs.readFileSync(PUBLISHED_BYTES_PATH, "utf8").replace(/\s+/g, "");
  return JSON.parse(zlib.gunzipSync(Buffer.from(encoded, "base64")).toString("utf8"));
}

function assertPublishedByteCatalog(records) {
  const fixtureCatalog = JSON.parse(fs.readFileSync(FINGERPRINTS_PATH, "utf8"));
  assert.deepEqual(catalogFromPublishedBytes(records), fixtureCatalog);
  assert.deepEqual(listPublishedGraphitiArtifacts(), fixtureCatalog);
}

test("公開アーカイブの実バイトから指紋一覧を再現して製品の固定一覧と照合する", () => {
  const records = readPublishedByteRecords();
  assert.equal(records.length, 30);
  assertPublishedByteCatalog(records);
});

test("公開バイト fixture の欠落・余分・1バイト変更を拒否する", () => {
  const records = readPublishedByteRecords();
  assert.throws(() => assertPublishedByteCatalog(records.slice(1)));
  assert.throws(() =>
    assertPublishedByteCatalog([
      ...records,
      { ...records[0], sourcePath: `${records[0].sourcePath}.unexpected` },
    ]));

  const mutated = structuredClone(records);
  const bytes = Buffer.from(mutated[0].bytesBase64, "base64");
  bytes[0] ^= 0xff;
  mutated[0].bytesBase64 = bytes.toString("base64");
  assert.throws(() => assertPublishedByteCatalog(mutated));
});

test("固定された Graphiti 配置先を変更せず安全側に分類する", (t) => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-graphiti-plan-"));
  t.after(() => fs.rmSync(targetDir, { recursive: true, force: true }));

  const records = readPublishedByteRecords();
  const publishedSkill = records.find(
    ({ publishedVersion, sourcePath }) =>
      publishedVersion === "0.27.2" &&
      sourcePath === "templates/en/claude/skills/intent-graphiti-sync/SKILL.md",
  );
  const publishedBytes = Buffer.from(publishedSkill.bytesBase64, "base64");

  const claudeSkill = path.join(targetDir, ".claude/skills/intent-graphiti-sync/SKILL.md");
  fs.mkdirSync(path.dirname(claudeSkill), { recursive: true });
  fs.writeFileSync(claudeSkill, publishedBytes);

  const codexSkill = path.join(targetDir, ".agents/skills/intent-graphiti-sync/SKILL.md");
  fs.mkdirSync(path.dirname(codexSkill), { recursive: true });
  fs.writeFileSync(codexSkill, "user edited");

  const intentDir = path.join(targetDir, ".intent");
  fs.mkdirSync(intentDir, { recursive: true });
  fs.symlinkSync(
    "graphiti-safety-boundary.md",
    path.join(intentDir, "graphiti-search-boundary.md"),
  );
  fs.mkdirSync(path.join(intentDir, "graphiti-sync-boundary.md"));

  const decisions = planGraphitiRetirement(targetDir);
  assert.deepEqual(
    decisions.map(({ relativePath, outcome, reason }) => ({ relativePath, outcome, reason })),
    [
      {
        relativePath: ".claude/skills/intent-graphiti-sync/SKILL.md",
        outcome: "remove",
        reason: "published-match",
      },
      {
        relativePath: ".agents/skills/intent-graphiti-sync/SKILL.md",
        outcome: "retain",
        reason: "edited-or-unknown",
      },
      {
        relativePath: ".intent/graphiti-safety-boundary.md",
        outcome: "absent",
        reason: "missing",
      },
      {
        relativePath: ".intent/graphiti-search-boundary.md",
        outcome: "retain",
        reason: "not-regular-file",
      },
      {
        relativePath: ".intent/graphiti-sync-boundary.md",
        outcome: "retain",
        reason: "not-regular-file",
      },
    ],
  );
  assert.deepEqual(fs.readFileSync(claudeSkill), publishedBytes);
  assert.equal(fs.readFileSync(codexSkill, "utf8"), "user edited");
});

test("撤去判定 fixture が一致・編集・不在・リンク・ディレクトリ・読取不能を固定する", (t) => {
  const fixture = JSON.parse(fs.readFileSync(RETIREMENT_CASES_PATH, "utf8"));
  assert.equal(fixture.schemaVersion, 1);
  assert.deepEqual(fixture.applicationCases, [
    "recheck-changed",
    "delete-failed",
    "path-escape-ignored",
    "second-apply-no-change",
  ]);
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-graphiti-cases-"));
  t.after(() => fs.rmSync(targetDir, { recursive: true, force: true }));

  const emptyDecisions = planGraphitiRetirement(targetDir);
  assert.ok(
    emptyDecisions.every(
      ({ outcome, reason }) => outcome === fixture.missing.outcome && reason === fixture.missing.reason,
    ),
  );

  const records = readPublishedByteRecords();
  for (const relativePath of [
    ".claude/skills/intent-graphiti-sync/SKILL.md",
    ".intent/graphiti-safety-boundary.md",
  ]) {
    const record = records.find(
      ({ publishedVersion, sourcePath }) =>
        publishedVersion === "0.27.2" &&
        installedRelativePath(sourcePath) === relativePath,
    );
    const target = path.join(targetDir, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(record.bytesBase64, "base64"));
  }
  const edited = path.join(targetDir, ".agents/skills/intent-graphiti-sync/SKILL.md");
  fs.mkdirSync(path.dirname(edited), { recursive: true });
  fs.writeFileSync(edited, "edited or unknown");
  fs.symlinkSync(
    "graphiti-safety-boundary.md",
    path.join(targetDir, ".intent/graphiti-search-boundary.md"),
  );
  fs.mkdirSync(path.join(targetDir, ".intent/graphiti-sync-boundary.md"));

  const unreadable = path.join(targetDir, ".intent/graphiti-safety-boundary.md");
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = (...args) => {
    if (path.resolve(args[0]) === path.resolve(unreadable)) {
      const error = new Error("simulated unreadable file");
      error.code = "EACCES";
      throw error;
    }
    return originalReadFileSync(...args);
  };
  let decisions;
  try {
    decisions = planGraphitiRetirement(targetDir);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }

  assert.deepEqual(
    decisions.map(({ relativePath, outcome, reason }) => ({ relativePath, outcome, reason })),
    fixture.classification,
  );

  const beforeApply = snapshotTree(targetDir);
  const applied = applyGraphitiRetirement(targetDir, decisions);
  assert.deepEqual(applied.removed, [
    ".claude/skills/intent-graphiti-sync/SKILL.md",
  ]);
  const expectedAfterApply = structuredClone(beforeApply);
  delete expectedAfterApply[".claude/skills/intent-graphiti-sync/SKILL.md"];
  assert.deepEqual(snapshotTree(targetDir), expectedAfterApply);
});

test("中間ディレクトリのリンクを辿って対象外ファイルを撤去候補にしない", (t) => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-graphiti-root-"));
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-graphiti-outside-"));
  t.after(() => {
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  });

  const record = readPublishedByteRecords().find(
    ({ publishedVersion, sourcePath }) =>
      publishedVersion === "0.27.2" &&
      sourcePath === "templates/en/claude/skills/intent-graphiti-sync/SKILL.md",
  );
  const outsideSkill = path.join(outsideDir, "skills/intent-graphiti-sync/SKILL.md");
  fs.mkdirSync(path.dirname(outsideSkill), { recursive: true });
  fs.writeFileSync(outsideSkill, Buffer.from(record.bytesBase64, "base64"));
  fs.symlinkSync(outsideDir, path.join(targetDir, ".claude"));

  const decision = planGraphitiRetirement(targetDir).find(
    ({ relativePath }) => relativePath === ".claude/skills/intent-graphiti-sync/SKILL.md",
  );
  assert.equal(decision.outcome, "retain");
  assert.equal(decision.reason, "not-regular-file");
  assert.deepEqual(fs.readFileSync(outsideSkill), Buffer.from(record.bytesBase64, "base64"));
});

test("適用直前の再照合に一致した固定対象だけを削除する", (t) => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-graphiti-apply-"));
  const outsideDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "intent-planner-graphiti-apply-outside-"),
  );
  t.after(() => {
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  });

  const records = readPublishedByteRecords();
  const claudeRecord = records.find(
    ({ publishedVersion, sourcePath }) =>
      publishedVersion === "0.27.2" &&
      sourcePath === "templates/en/claude/skills/intent-graphiti-sync/SKILL.md",
  );
  const safetyRecord = records.find(
    ({ publishedVersion, sourcePath }) =>
      publishedVersion === "0.27.2" &&
      sourcePath === "templates/en/intent/graphiti-safety-boundary.md",
  );
  const claudeSkill = path.join(targetDir, ".claude/skills/intent-graphiti-sync/SKILL.md");
  const safetyBoundary = path.join(targetDir, ".intent/graphiti-safety-boundary.md");
  fs.mkdirSync(path.dirname(claudeSkill), { recursive: true });
  fs.mkdirSync(path.dirname(safetyBoundary), { recursive: true });
  fs.writeFileSync(claudeSkill, Buffer.from(claudeRecord.bytesBase64, "base64"));
  fs.writeFileSync(safetyBoundary, Buffer.from(safetyRecord.bytesBase64, "base64"));

  const decisions = planGraphitiRetirement(targetDir);
  fs.writeFileSync(claudeSkill, "edited after planning");
  const outsideSentinel = path.join(outsideDir, "outside.md");
  fs.writeFileSync(outsideSentinel, "must remain outside the removal root\n");
  const outsideBefore = fs.readFileSync(outsideSentinel);
  decisions.push({
    relativePath: path.relative(targetDir, outsideSentinel),
    outcome: "remove",
    reason: "published-match",
  });

  const applied = applyGraphitiRetirement(targetDir, decisions);
  assert.deepEqual(applied.removed, [".intent/graphiti-safety-boundary.md"]);
  assert.deepEqual(
    applied.retained.map(({ relativePath, reason }) => ({ relativePath, reason })),
    [
      {
        relativePath: ".claude/skills/intent-graphiti-sync/SKILL.md",
        reason: "edited-or-unknown",
      },
    ],
  );
  assert.equal(fs.readFileSync(claudeSkill, "utf8"), "edited after planning");
  assert.equal(fs.existsSync(safetyBoundary), false);
  assert.deepEqual(fs.readFileSync(outsideSentinel), outsideBefore);

  const beforeSecondApply = snapshotTree(targetDir);
  const outsideBeforeSecondApply = snapshotTree(outsideDir);
  const second = applyGraphitiRetirement(targetDir, decisions);
  assert.deepEqual(second.removed, []);
  assert.deepEqual(snapshotTree(targetDir), beforeSecondApply);
  assert.deepEqual(snapshotTree(outsideDir), outsideBeforeSecondApply);
  assert.equal(fs.readFileSync(claudeSkill, "utf8"), "edited after planning");
});

test("削除失敗を残した対象として返す", (t) => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-graphiti-unlink-"));
  t.after(() => fs.rmSync(targetDir, { recursive: true, force: true }));

  const record = readPublishedByteRecords().find(
    ({ publishedVersion, sourcePath }) =>
      publishedVersion === "0.27.2" &&
      sourcePath === "templates/en/intent/graphiti-search-boundary.md",
  );
  const target = path.join(targetDir, ".intent/graphiti-search-boundary.md");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.from(record.bytesBase64, "base64"));
  const decisions = planGraphitiRetirement(targetDir);

  const originalUnlinkSync = fs.unlinkSync;
  fs.unlinkSync = () => {
    const error = new Error("simulated unlink failure");
    error.code = "EACCES";
    throw error;
  };
  t.after(() => {
    fs.unlinkSync = originalUnlinkSync;
  });

  const applied = applyGraphitiRetirement(targetDir, decisions);
  assert.deepEqual(applied.removed, []);
  assert.deepEqual(
    applied.retained.map(({ relativePath, reason }) => ({ relativePath, reason })),
    [{ relativePath: ".intent/graphiti-search-boundary.md", reason: "delete-failed" }],
  );
  assert.equal(fs.existsSync(target), true);
});
