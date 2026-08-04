import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateDependencyLock } from "../scripts/portable/dependencies.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function registryLock(overrides = {}) {
  return {
    name: "fixture",
    version: "1.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: "fixture",
        version: "1.0.0",
        dependencies: { alpha: "1.0.0" },
      },
      "node_modules/alpha": {
        version: "1.0.0",
        resolved: "https://registry.npmjs.org/alpha/-/alpha-1.0.0.tgz",
        integrity: "sha512-YWxwaGE=",
      },
    },
    ...overrides,
  };
}

test("root package.json の dependencies と固定済み lockfile が一致する", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const packageLock = JSON.parse(fs.readFileSync(path.join(ROOT, "package-lock.json"), "utf8"));

  const result = validateDependencyLock(packageJson, packageLock);

  assert.deepEqual(result, [
    { name: "handoff-bridge", version: "0.2.2" },
    { name: "term-drift", version: "0.3.6" },
  ]);
});

test("配布用 dependencies と lockfile root の不足・余分・版違いを拒否する", () => {
  const packageJson = { dependencies: { alpha: "1.0.0", beta: "2.0.0" } };

  assert.throws(
    () => validateDependencyLock(packageJson, registryLock()),
    /dependency declaration mismatch.*beta.*expected=2\.0\.0.*actual=missing/,
  );

  const extra = registryLock();
  extra.packages[""].dependencies.extra = "3.0.0";
  assert.throws(
    () => validateDependencyLock({ dependencies: { alpha: "1.0.0" } }, extra),
    /dependency declaration mismatch.*extra.*expected=missing.*actual=3\.0\.0/,
  );

  const wrongVersion = registryLock();
  wrongVersion.packages[""].dependencies.alpha = "1.1.0";
  assert.throws(
    () => validateDependencyLock({ dependencies: { alpha: "1.0.0" } }, wrongVersion),
    /dependency declaration mismatch.*alpha.*expected=1\.0\.0.*actual=1\.1\.0/,
  );
});

test("直接依存の解決済み top-level entry が lockfile に無ければ拒否する", () => {
  const packageLock = registryLock();
  delete packageLock.packages["node_modules/alpha"];

  assert.throws(
    () => validateDependencyLock({ dependencies: { alpha: "1.0.0" } }, packageLock),
    /resolved dependency mismatch.*alpha.*expected=1\.0\.0.*actual=missing/,
  );
});

test("直接依存の宣言版と解決済み top-level entry の版が違えば拒否する", () => {
  const packageLock = registryLock();
  packageLock.packages["node_modules/alpha"].version = "2.0.0";

  assert.throws(
    () => validateDependencyLock({ dependencies: { alpha: "1.0.0" } }, packageLock),
    /resolved dependency mismatch.*alpha.*expected=1\.0\.0.*actual=2\.0\.0/,
  );
});

test("package.json と lockfile root の local file / Git 依存宣言を拒否する", () => {
  for (const dependency of [
    "file:../alpha",
    "../alpha",
    "git+https://github.com/example/alpha.git#abc123",
    "github:example/alpha#abc123",
  ]) {
    const packageLock = registryLock();
    packageLock.packages[""].dependencies.alpha = dependency;
    assert.throws(
      () => validateDependencyLock({ dependencies: { alpha: dependency } }, packageLock),
      /unsupported dependency source.*alpha/,
      dependency,
    );
  }
});

test("間接依存を含む lockfile の local file / Git / link を拒否する", () => {
  const invalidEntries = [
    { version: "1.0.0", resolved: "file:../nested", integrity: "sha512-bmVzdGVk" },
    { version: "git+ssh://git@github.com/example/nested.git#abc123" },
    { version: "1.0.0", resolved: "git+https://github.com/example/nested.git#abc123" },
    { version: "1.0.0", resolved: "../nested", link: true },
  ];

  for (const entry of invalidEntries) {
    const packageLock = registryLock();
    packageLock.packages["node_modules/alpha/node_modules/nested"] = entry;
    assert.throws(
      () => validateDependencyLock({ dependencies: { alpha: "1.0.0" } }, packageLock),
      /unsupported dependency source.*nested/,
      JSON.stringify(entry),
    );
  }
});

test("registry 依存に完全な版・取得元・完全性情報がなければ拒否する", () => {
  for (const missingField of ["version", "resolved", "integrity"]) {
    const packageLock = registryLock();
    delete packageLock.packages["node_modules/alpha"][missingField];
    assert.throws(
      () => validateDependencyLock({ dependencies: { alpha: "1.0.0" } }, packageLock),
      new RegExp(`incomplete registry dependency.*alpha.*${missingField}`),
      missingField,
    );
  }
});

test("固定された package 名と版の組み合わせをパス順に依存せず安定して返す", () => {
  const packageLock = registryLock();
  packageLock.packages["node_modules/alpha/node_modules/shared"] = {
    version: "2.0.0",
    resolved: "https://registry.npmjs.org/shared/-/shared-2.0.0.tgz",
    integrity: "sha512-c2hhcmVkMg==",
  };
  packageLock.packages["node_modules/shared"] = {
    version: "1.0.0",
    resolved: "https://registry.npmjs.org/shared/-/shared-1.0.0.tgz",
    integrity: "sha512-c2hhcmVkMQ==",
  };

  assert.deepEqual(validateDependencyLock({ dependencies: { alpha: "1.0.0" } }, packageLock), [
    { name: "alpha", version: "1.0.0" },
    { name: "shared", version: "1.0.0" },
    { name: "shared", version: "2.0.0" },
  ]);
});

test("同じ固定入力は記録順や開発専用依存に左右されず同じ本番依存の組み合わせを返す", () => {
  const first = registryLock();
  first.packages["node_modules/alpha/node_modules/shared"] = {
    version: "2.0.0",
    resolved: "https://registry.npmjs.org/shared/-/shared-2.0.0.tgz",
    integrity: "sha512-c2hhcmVkMg==",
  };
  first.packages["node_modules/dev-tool"] = {
    version: "9.0.0",
    resolved: "https://registry.npmjs.org/dev-tool/-/dev-tool-9.0.0.tgz",
    integrity: "sha512-ZGV2LXRvb2w=",
    dev: true,
  };
  const second = {
    ...first,
    packages: Object.fromEntries(Object.entries(first.packages).reverse()),
  };

  const expectedProductionDependencies = [
    { name: "alpha", version: "1.0.0" },
    { name: "shared", version: "2.0.0" },
  ];
  assert.deepEqual(
    validateDependencyLock({ dependencies: { alpha: "1.0.0" } }, first),
    expectedProductionDependencies,
  );
  assert.deepEqual(
    validateDependencyLock({ dependencies: { alpha: "1.0.0" } }, second),
    expectedProductionDependencies,
  );
});
