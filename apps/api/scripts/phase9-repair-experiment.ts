import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(process.cwd(), "../..");
const source = path.join(root, "evaluation", "benchmark", "projects", "fixture-node-dependencies");
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-repair-experiment-"));
const outputPath = path.join(root, "evaluation", "results", "repair.json");
const startedAt = new Date().toISOString();
let beforeExitCode = 1;
let afterExitCode = 1;
let patchApplied = false;
let error: string | undefined;

try {
  await fs.cp(source, workspace, { recursive: true, filter: (entry) => !entry.includes(`${path.sep}node_modules`) });
  const commandOptions = { cwd: workspace, shell: process.platform === "win32", timeout: 120_000 };
  try {
    await execFileAsync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["test"], commandOptions);
    beforeExitCode = 0;
  } catch (failure) {
    beforeExitCode = typeof (failure as { code?: unknown }).code === "number" ? (failure as { code: number }).code : 1;
  }

  const testPath = path.join(workspace, "test", "failing.test.js");
  const content = await fs.readFile(testPath, "utf8");
  const repaired = content.replace("assert.equal(2 + 2, 5);", "assert.equal(2 + 2, 4);");
  if (repaired === content) throw new Error("Expected seeded assertion was not found.");
  await fs.writeFile(testPath, repaired);
  patchApplied = true;

  try {
    await execFileAsync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["test"], commandOptions);
    afterExitCode = 0;
  } catch (failure) {
    afterExitCode = typeof (failure as { code?: unknown }).code === "number" ? (failure as { code: number }).code : 1;
  }
} catch (failure) {
  error = failure instanceof Error ? failure.message : String(failure);
} finally {
  await fs.rm(workspace, { recursive: true, force: true });
}

const result = {
  schemaVersion: "phase9-repair-v1",
  generatedAt: new Date().toISOString(),
  fixture: "fixture-node-dependencies",
  beforeExitCode,
  afterExitCode,
  patchApplied,
  validationPassed: patchApplied && afterExitCode === 0,
  regression: patchApplied && afterExitCode !== 0,
  error: error ?? null,
};
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify({ startedAt, ...result }, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
