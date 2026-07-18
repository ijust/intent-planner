import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const jaWrapper = path.join(repoRoot, "templates", "ja", "intent", "scripts", "intent-plan-ops.mjs");
const enWrapper = path.join(repoRoot, "templates", "en", "intent", "scripts", "intent-plan-ops.mjs");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "intent-plan-ops-"));
  fs.mkdirSync(path.join(root, ".intent", "scripts"), { recursive: true });
  fs.mkdirSync(path.join(root, ".intent", "packets", "draft"), { recursive: true });
  fs.mkdirSync(path.join(root, ".intent", "packets", "active"), { recursive: true });
  fs.mkdirSync(path.join(root, ".intent", "assignments"), { recursive: true });
  return root;
}

function run(cwd, ...args) {
  return spawnSync(process.execPath, [jaWrapper, ...args], {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
}

test("日本語・英語wrapperはbyte一致する", () => {
  assert.deepEqual(fs.readFileSync(jaWrapper), fs.readFileSync(enWrapper));
});

test("nowはISO 8601 UTC日時だけを返す", () => {
  const result = run(fixture(), "now");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\n$/);
});

test("rand4は小文字英数字4文字だけを返す", () => {
  const result = run(fixture(), "rand4");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^[a-z0-9]{4}\n$/);
});

test("mkdir-intentは.intent内の指定directoryを作る", () => {
  const root = fixture();
  const result = run(root, "mkdir-intent", ".intent/discovery/example");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.statSync(path.join(root, ".intent", "discovery", "example")).isDirectory(), true);
  assert.equal(result.stdout, "");
});

test("move-packetは.intent/packets内でpacketを移動する", () => {
  const root = fixture();
  const source = path.join(root, ".intent", "packets", "draft", "pkt-example.md");
  fs.writeFileSync(source, "packet\n");
  const result = run(
    root,
    "move-packet",
    ".intent/packets/draft/pkt-example.md",
    ".intent/packets/active/pkt-example.md",
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(source), false);
  assert.equal(fs.readFileSync(path.join(root, ".intent", "packets", "active", "pkt-example.md"), "utf8"), "packet\n");
  assert.equal(result.stdout, "");
});

test("path操作は絶対path・..・.intent外を変更前に拒否する", () => {
  const root = fixture();
  const outside = path.join(root, "outside");
  const source = path.join(root, ".intent", "packets", "draft", "pkt-example.md");
  fs.writeFileSync(source, "packet\n");

  for (const invalid of [outside, ".intent/../outside", "outside"]) {
    const result = run(root, "mkdir-intent", invalid);
    assert.equal(result.status, 1, `${invalid}: ${result.stderr}`);
  }
  const move = run(root, "move-packet", ".intent/packets/draft/pkt-example.md", "outside.md");
  assert.equal(move.status, 1, move.stderr);
  assert.equal(fs.readFileSync(source, "utf8"), "packet\n");
  assert.equal(fs.existsSync(outside), false);
});

test("path操作は既存segmentのsymlinkを介した境界越えを拒否する", () => {
  const root = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "intent-plan-ops-outside-"));
  fs.symlinkSync(outside, path.join(root, ".intent", "linked"), "dir");

  const result = run(root, "mkdir-intent", ".intent/linked/created");
  assert.equal(result.status, 1, result.stderr);
  assert.equal(fs.existsSync(path.join(outside, "created")), false);
});

test("move-packetはsymlinkの移動先を拒否し、移動元を保持する", () => {
  const root = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "intent-plan-ops-packets-"));
  const source = path.join(root, ".intent", "packets", "draft", "pkt-example.md");
  fs.writeFileSync(source, "packet\n");
  fs.rmdirSync(path.join(root, ".intent", "packets", "active"));
  fs.symlinkSync(outside, path.join(root, ".intent", "packets", "active"), "dir");

  const result = run(
    root,
    "move-packet",
    ".intent/packets/draft/pkt-example.md",
    ".intent/packets/active/pkt-example.md",
  );
  assert.equal(result.status, 1, result.stderr);
  assert.equal(fs.readFileSync(source, "utf8"), "packet\n");
  assert.equal(fs.existsSync(path.join(outside, "pkt-example.md")), false);
});

test("remove-own-drafting-assignmentはissueとsessionが一致する起草宣言1件を消す", () => {
  const root = fixture();
  const own = path.join(root, ".intent", "assignments", "discovery-example-a1b2.md");
  const other = path.join(root, ".intent", "assignments", "discovery-example-z9y8.md");
  fs.writeFileSync(own, "---\nphase: drafting\nissue_dir: example\nsession: a1b2\n---\n");
  fs.writeFileSync(other, "---\nphase: drafting\nissue_dir: example\nsession: z9y8\n---\n");
  const result = run(root, "remove-own-drafting-assignment", "example", "a1b2");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(own), false);
  assert.equal(fs.existsSync(other), true);
  assert.equal(result.stdout, "");
});

test("remove-own-drafting-assignmentは該当なしなら成功し、他sessionを変更しない", () => {
  const root = fixture();
  const other = path.join(root, ".intent", "assignments", "discovery-example-z9y8.md");
  fs.writeFileSync(other, "---\nphase: drafting\nissue_dir: example\nsession: z9y8\n---\n");

  const result = run(root, "remove-own-drafting-assignment", "example", "a1b2");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(other), true);
});

test("remove-own-drafting-assignmentは一致が複数なら何も削除しない", () => {
  const root = fixture();
  const first = path.join(root, ".intent", "assignments", "first.md");
  const second = path.join(root, ".intent", "assignments", "second.md");
  const assignment = "---\nphase: drafting\nissue_dir: example\nsession: a1b2\n---\n";
  fs.writeFileSync(first, assignment);
  fs.writeFileSync(second, assignment);

  const result = run(root, "remove-own-drafting-assignment", "example", "a1b2");
  assert.equal(result.status, 1, result.stderr);
  assert.equal(fs.existsSync(first), true);
  assert.equal(fs.existsSync(second), true);
});

test("remove-own-drafting-assignmentはassignments symlinkを拒否して外部を変更しない", () => {
  const root = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "intent-plan-ops-assignments-"));
  const assignment = path.join(outside, "own.md");
  fs.writeFileSync(assignment, "---\nphase: drafting\nissue_dir: example\nsession: a1b2\n---\n");
  fs.rmdirSync(path.join(root, ".intent", "assignments"));
  fs.symlinkSync(outside, path.join(root, ".intent", "assignments"), "dir");

  const result = run(root, "remove-own-drafting-assignment", "example", "a1b2");
  assert.equal(result.status, 1, result.stderr);
  assert.equal(fs.existsSync(assignment), true);
});

test("wrapperはNULをpath入力として明示的に拒否する", () => {
  const source = fs.readFileSync(jaWrapper, "utf8");
  assert.match(source, /includes\(["']\\0["']\)/);
});

test("intent-checkは既存scriptのstdoutと終了codeをそのまま返す", () => {
  const root = fixture();
  fs.writeFileSync(
    path.join(root, ".intent", "scripts", "intent-check.mjs"),
    'process.stdout.write("intent-check: result=stale enforcement=gate\\n"); process.exitCode = 1;\n',
  );
  const result = run(root, "intent-check");
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "intent-check: result=stale enforcement=gate\n");
});

test("git-headは現在のcommit hashだけを返す", () => {
  const result = run(repoRoot, "git-head");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^[0-9a-f]{40,64}\n$/);
});

test("未知操作と引数違反は終了code 1で、代替操作をしない", () => {
  const root = fixture();
  const marker = path.join(root, ".intent", "marker.md");
  fs.writeFileSync(marker, "unchanged\n");
  assert.equal(run(root, "unknown").status, 1);
  assert.equal(run(root, "now", "extra").status, 1);
  assert.equal(run(root, "mkdir-intent").status, 1);
  assert.equal(fs.readFileSync(marker, "utf8"), "unchanged\n");
});

test("必要な既存実行環境が無ければ終了code 2でfallbackしない", () => {
  const root = fixture();
  const result = run(root, "intent-check");
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");

  const gitResult = run(root, "git-head");
  assert.equal(gitResult.status, 2);
  assert.equal(gitResult.stdout, "");
});

test("wrapperはshell文字列・外部通信・任意command実行を提供しない", () => {
  const source = fs.readFileSync(jaWrapper, "utf8");
  assert.doesNotMatch(source, /\bshell\s*:\s*true\b/);
  assert.doesNotMatch(source, /\bexec(?:Sync)?\s*\(/);
  assert.doesNotMatch(source, /https?:\/\//);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.deepEqual(
    [...source.matchAll(/^\s{2}"([a-z0-9-]+)",$/gm)].map((match) => match[1]).sort(),
    [
      "git-head",
      "intent-check",
      "mkdir-intent",
      "move-packet",
      "now",
      "rand4",
      "remove-own-drafting-assignment",
    ].sort(),
  );
});
