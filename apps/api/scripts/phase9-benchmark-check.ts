import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

interface BenchmarkRepository {
  id: string;
  path: string;
  version: string;
  groundTruthFindingIds: string[];
  commands: string[];
}

interface BenchmarkManifest {
  schemaVersion: string;
  repositories: BenchmarkRepository[];
  baselines: string[];
  metrics: string[];
}

const root = path.resolve(process.cwd(), "../..");
const manifestPath = path.join(root, "evaluation", "benchmark", "manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as BenchmarkManifest;

assert.equal(manifest.schemaVersion, "phase9-v1");
assert.ok(manifest.repositories.length >= 2);
assert.ok(manifest.baselines.length >= 2);
assert.ok(manifest.metrics.includes("precision"));
assert.ok(manifest.metrics.includes("repairValidationPassRate"));

const findingIds = new Set<string>();
for (const repository of manifest.repositories) {
  assert.ok(repository.id);
  assert.ok(repository.version);
  assert.ok(repository.commands.length > 0);
  const fixturePath = path.join(root, repository.path);
  const packagePath = path.join(fixturePath, "package.json");
  const packageJson = JSON.parse(await fs.readFile(packagePath, "utf8")) as { scripts?: Record<string, string> };
  assert.ok(packageJson.scripts && Object.keys(packageJson.scripts).length > 0);
  for (const findingId of repository.groundTruthFindingIds) {
    assert.equal(findingIds.has(findingId), false, `duplicate ground-truth ID: ${findingId}`);
    findingIds.add(findingId);
  }
}

console.log(`Validated ${manifest.repositories.length} benchmark repositories and ${findingIds.size} ground-truth findings.`);
console.log("Phase 9 benchmark check passed.");
