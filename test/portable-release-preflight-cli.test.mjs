import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { main, mainCore } from "../scripts/preflight-windows-portable-release.mjs";

function harness(result) {
  let stdout = "";
  const calls = [];
  return {
    calls,
    read: () => stdout,
    options: {
      cwd: "/work",
      stdout: { write(value) { stdout += value; } },
      async runPreflight(options) {
        calls.push(options);
        return result;
      },
    },
  };
}

test("CLI success prints JSON first, then a short summary, and returns 0", async () => {
  const result = { status: "pass", checks: [{ id: "all", status: "pass" }], outputs: { outputDir: "/out" } };
  const fixture = harness(result);
  const code = await mainCore(["--release-input", "release/input.json"], fixture.options);
  const lines = fixture.read().trimEnd().split("\n");
  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(lines[0]), result);
  assert.equal(lines.length, 2);
  assert.match(lines[1], /検査に合格/u);
  assert.equal(fixture.calls[0].releaseInputPath, path.resolve("/work", "release/input.json"));
});

test("CLI failed preflight keeps JSON on the first line and returns 1", async () => {
  const result = { status: "fail", checks: [{ id: "input", status: "fail" }] };
  const fixture = harness(result);
  const code = await mainCore(["--release-input", "release-input.json"], fixture.options);
  const lines = fixture.read().trimEnd().split("\n");
  assert.equal(code, 1);
  assert.deepEqual(JSON.parse(lines[0]), result);
  assert.match(lines[1], /不合格/u);
});

test("CLI usage errors do not run preflight and return 2", async () => {
  for (const args of [[], ["--release-input"], ["--other", "x"], ["--release-input", "a", "extra"]]) {
    const fixture = harness({ status: "pass", checks: [] });
    const code = await mainCore(args, fixture.options);
    const lines = fixture.read().trimEnd().split("\n");
    assert.equal(code, 2);
    assert.equal(JSON.parse(lines[0]).status, "usage-error");
    assert.match(lines[1], /--release-input <path>/u);
    assert.deepEqual(fixture.calls, []);
  }
});

test("production CLI exposes no operation injection parameter", () => {
  assert.equal(main.length, 0);
  assert.match(main.toString(), /^async function main\(args = /u);
});
