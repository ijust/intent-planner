import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  loadNodeRuntimeConfig,
  validateNodeRuntimeConfig,
} from "../scripts/portable/node-release.mjs";

const EXPECTED_CONFIG = {
  schemaVersion: 1,
  nodeVersion: "24.18.0",
  platform: "win32",
  arch: "x64",
  archiveName: "node-v24.18.0-win-x64.zip",
  archiveSha256: "0ae68406b42d7725661da979b1403ec9926da205c6770827f33aac9d8f26e821",
  releaseBaseUrl: "https://nodejs.org/download/release/v24.18.0/",
  releaseKeysUrl: "https://raw.githubusercontent.com/nodejs/release-keys/b28073028e6d6855cfb53bf7fa0137599c01f967/gpg-only-active-keys/pubring.kbx",
  releaseKeysSha256: "8e6f89521a0694e445f42decd022f48369c634f1b5bcb5975135b69c88629ae8",
};

function changed(field, value) {
  return { ...EXPECTED_CONFIG, [field]: value };
}

test("設計で承認した Node.js Windows x64 の信頼情報を一組で固定する", async () => {
  const raw = await readFile(
    new URL("../scripts/portable/node-runtime.json", import.meta.url),
    "utf8",
  );

  assert.deepEqual(JSON.parse(raw), EXPECTED_CONFIG);
});

test("既定の設定ファイルを検査し、後続処理へ渡せる凍結済み設定だけを返す", async () => {
  const loaded = await loadNodeRuntimeConfig();

  assert.deepEqual(loaded, EXPECTED_CONFIG);
  assert.equal(Object.isFrozen(loaded), true);
});

test("設定項目の欠落を、欠けた項目を示して拒否する", () => {
  for (const field of Object.keys(EXPECTED_CONFIG)) {
    const incomplete = { ...EXPECTED_CONFIG };
    delete incomplete[field];

    assert.throws(
      () => validateNodeRuntimeConfig(incomplete),
      new RegExp(`node-runtime-config: missing field=${field}`),
      field,
    );
  }
});

test("空値・仮値・ゼロ埋めハッシュを取得前に拒否する", () => {
  const placeholders = [
    ["nodeVersion", "TODO"],
    ["archiveName", "replace-me.zip"],
    ["archiveSha256", "0".repeat(64)],
    ["releaseBaseUrl", "https://example.com/release/"],
    ["releaseKeysUrl", "https://example.com/pubring.kbx"],
    ["releaseKeysSha256", "<sha256>"],
  ];

  for (const [field, value] of placeholders) {
    assert.throws(
      () => validateNodeRuntimeConfig(changed(field, value)),
      new RegExp(`node-runtime-config: untrusted field=${field}`),
      field,
    );
  }
});

test("版・アーカイブ・鍵束の一部だけを更新した設定を拒否する", () => {
  const partialUpdates = [
    changed("nodeVersion", "24.19.0"),
    changed("archiveName", "node-v24.19.0-win-x64.zip"),
    changed("archiveSha256", "1".repeat(64)),
    changed(
      "releaseKeysUrl",
      "https://raw.githubusercontent.com/nodejs/release-keys/1111111111111111111111111111111111111111/gpg-only-active-keys/pubring.kbx",
    ),
    changed("releaseKeysSha256", "2".repeat(64)),
  ];

  for (const config of partialUpdates) {
    assert.throws(
      () => validateNodeRuntimeConfig(config),
      /node-runtime-config: untrusted field=/,
    );
  }
});

test("未知の設定項目と JSON 構文エラーを原因付きで拒否する", async () => {
  assert.throws(
    () => validateNodeRuntimeConfig({ ...EXPECTED_CONFIG, archiveUrl: "https://example.com" }),
    /node-runtime-config: unknown field=archiveUrl/,
  );

  const directory = await mkdtemp(path.join(os.tmpdir(), "node-runtime-config-"));
  const configPath = path.join(directory, "node-runtime.json");
  try {
    await writeFile(configPath, "{ invalid json", "utf8");
    await assert.rejects(
      loadNodeRuntimeConfig(configPath),
      /node-runtime-config: invalid JSON/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
