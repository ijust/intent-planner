const PUBLISHED_GRAPHITI_ARTIFACTS = Object.freeze([
  {
    publishedVersions: ["0.27.0", "0.27.1", "0.27.2"],
    sourcePath: "templates/en/claude/skills/intent-graphiti-sync/SKILL.md",
    relativePath: ".claude/skills/intent-graphiti-sync/SKILL.md",
    byteLength: 8512,
    sha256: "c38a9e87b670d8832a7a644f45e29ba45dd6dafea0a64b1af54518f62397ce31",
  },
  {
    publishedVersions: ["0.27.0", "0.27.1", "0.27.2"],
    sourcePath: "templates/en/codex/skills/intent-graphiti-sync/SKILL.md",
    relativePath: ".agents/skills/intent-graphiti-sync/SKILL.md",
    byteLength: 8387,
    sha256: "d0d667208e875ced8ef772bd07f84da69b2bf77aaf48d5012340c599320f15db",
  },
  {
    publishedVersions: ["0.27.0", "0.27.1", "0.27.2"],
    sourcePath: "templates/en/intent/graphiti-safety-boundary.md",
    relativePath: ".intent/graphiti-safety-boundary.md",
    byteLength: 17300,
    sha256: "c99ccbad38943600f7909a9a9dee1bbaa91ebd89d60916eef7b830119a49cecc",
  },
  {
    publishedVersions: ["0.27.0", "0.27.1", "0.27.2"],
    sourcePath: "templates/en/intent/graphiti-search-boundary.md",
    relativePath: ".intent/graphiti-search-boundary.md",
    byteLength: 3805,
    sha256: "3832b7dd3c0ad9eeedbed292a72205d65c2961764574346d1ab57b5ebb13f5af",
  },
  {
    publishedVersions: ["0.27.0", "0.27.1", "0.27.2"],
    sourcePath: "templates/en/intent/graphiti-sync-boundary.md",
    relativePath: ".intent/graphiti-sync-boundary.md",
    byteLength: 11850,
    sha256: "cbd0144dbfa06a090462205c87e184e3933a3c08629091a2d385f333cbd3b10b",
  },
  {
    publishedVersions: ["0.27.0", "0.27.1", "0.27.2"],
    sourcePath: "templates/ja/claude/skills/intent-graphiti-sync/SKILL.md",
    relativePath: ".claude/skills/intent-graphiti-sync/SKILL.md",
    byteLength: 8433,
    sha256: "798795fb6b7ae73f79c64d21f5170d32c05613de72482dbfb21d13326a88b0d5",
  },
  {
    publishedVersions: ["0.27.0", "0.27.1", "0.27.2"],
    sourcePath: "templates/ja/codex/skills/intent-graphiti-sync/SKILL.md",
    relativePath: ".agents/skills/intent-graphiti-sync/SKILL.md",
    byteLength: 8303,
    sha256: "065784145679c156146f0378b28551c2da4bf7f2ac88c933b9b1cf88cf966299",
  },
  {
    publishedVersions: ["0.27.0", "0.27.1", "0.27.2"],
    sourcePath: "templates/ja/intent/graphiti-safety-boundary.md",
    relativePath: ".intent/graphiti-safety-boundary.md",
    byteLength: 17455,
    sha256: "5e8c104b039689e18ca5294935fd37ab17e4973dae3d98171224bb2218ec6370",
  },
  {
    publishedVersions: ["0.27.0", "0.27.1", "0.27.2"],
    sourcePath: "templates/ja/intent/graphiti-search-boundary.md",
    relativePath: ".intent/graphiti-search-boundary.md",
    byteLength: 3698,
    sha256: "b8901855c6532ed2ce2d90e8619ff3fe8d31304fdb90af2bc9b1273735f2273f",
  },
  {
    publishedVersions: ["0.27.0", "0.27.1", "0.27.2"],
    sourcePath: "templates/ja/intent/graphiti-sync-boundary.md",
    relativePath: ".intent/graphiti-sync-boundary.md",
    byteLength: 12052,
    sha256: "4ad7c4f1895b998d0f256dad146bb7a1cf4500dd4298d37e1b30c1ae644d5578",
  },
].map((artifact) => Object.freeze({
  ...artifact,
  publishedVersions: Object.freeze([...artifact.publishedVersions]),
})));

export function listPublishedGraphitiArtifacts() {
  return PUBLISHED_GRAPHITI_ARTIFACTS.map((artifact) => ({
    ...artifact,
    publishedVersions: [...artifact.publishedVersions],
  }));
}

function pathContainsSymlink(targetDir, candidate) {
  const relative = path.relative(targetDir, candidate);
  let current = targetDir;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) return true;
    } catch (error) {
      if (error && error.code === "ENOENT") return false;
      throw error;
    }
  }
  return false;
}

export function planGraphitiRetirement(targetDir) {
  const resolvedTarget = path.resolve(targetDir);
  const byRelativePath = new Map();
  for (const artifact of PUBLISHED_GRAPHITI_ARTIFACTS) {
    const group = byRelativePath.get(artifact.relativePath) ?? [];
    group.push(artifact);
    byRelativePath.set(artifact.relativePath, group);
  }

  return [...byRelativePath].map(([relativePath, fingerprints]) => {
    const candidate = path.resolve(resolvedTarget, relativePath);
    const insideTarget =
      candidate !== resolvedTarget && candidate.startsWith(`${resolvedTarget}${path.sep}`);
    if (!insideTarget) {
      return { relativePath, outcome: "retain", reason: "unreadable" };
    }
    try {
      if (pathContainsSymlink(resolvedTarget, candidate)) {
        return { relativePath, outcome: "retain", reason: "not-regular-file" };
      }
    } catch {
      return { relativePath, outcome: "retain", reason: "unreadable" };
    }

    let stat;
    try {
      stat = fs.lstatSync(candidate);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return { relativePath, outcome: "absent", reason: "missing" };
      }
      return { relativePath, outcome: "retain", reason: "unreadable" };
    }

    if (!stat.isFile()) {
      return { relativePath, outcome: "retain", reason: "not-regular-file" };
    }

    try {
      const bytes = fs.readFileSync(candidate);
      const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
      const matched = fingerprints.find(
        (fingerprint) =>
          fingerprint.byteLength === bytes.length && fingerprint.sha256 === sha256,
      );
      if (matched) {
        return {
          relativePath,
          outcome: "remove",
          reason: "published-match",
          matchedVersion: matched.publishedVersions[0],
        };
      }
      return { relativePath, outcome: "retain", reason: "edited-or-unknown" };
    } catch {
      return { relativePath, outcome: "retain", reason: "unreadable" };
    }
  });
}

export function applyGraphitiRetirement(targetDir, decisions) {
  const fixedPaths = new Set(PUBLISHED_GRAPHITI_ARTIFACTS.map(({ relativePath }) => relativePath));
  const requested = new Set(
    decisions
      .filter(
        ({ relativePath, outcome }) =>
          outcome === "remove" && fixedPaths.has(relativePath),
      )
      .map(({ relativePath }) => relativePath),
  );
  const current = new Map(
    planGraphitiRetirement(targetDir).map((decision) => [decision.relativePath, decision]),
  );
  const removed = [];
  const retained = [];

  for (const relativePath of requested) {
    const rechecked = current.get(relativePath);
    if (!rechecked || rechecked.outcome === "absent") continue;
    if (rechecked.outcome !== "remove") {
      retained.push(rechecked);
      continue;
    }

    try {
      fs.unlinkSync(path.resolve(targetDir, relativePath));
      removed.push(relativePath);
    } catch {
      retained.push({
        relativePath,
        outcome: "retain",
        reason: "delete-failed",
      });
    }
  }

  return { removed, retained };
}
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
