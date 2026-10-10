import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ContainerRunnerService } from "../src/modules/analysis/container-runner.service.js";
import { javascriptUnitDiscoveryService } from "../src/modules/autonomous-testing/unit/javascript-unit-discovery.service.js";
import { passwordCharacterizationGenerator } from "../src/modules/autonomous-testing/unit/password-characterization.generator.js";
import type { CharacterizationBaseline } from "../src/modules/autonomous-testing/unit/unit.types.js";

const repository = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const relativeFile = "backend/index.js";
const baselinePath = path.resolve("results/phase1-unit-baseline.json");
const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as CharacterizationBaseline;
const discovered = await javascriptUnitDiscoveryService.discoverFile(repository, relativeFile);
const selected = discovered.filter((target) => target.name === "hashPassword" || target.name === "verifyPassword");
const testSource = passwordCharacterizationGenerator.generate(selected, baseline);
const outputDirectory = path.resolve("results/phase1-unit");
await mkdir(outputDirectory, { recursive: true });
const testFilePath = path.join(outputDirectory, "password.generated.test.cjs");
await writeFile(testFilePath, testSource, "utf8");

const execution = await ContainerRunnerService.run({
  command: "node",
  args: ["--test", "/generated/password.generated.test.cjs"],
  workspace: repository,
  writableMounts: [{ hostPath: outputDirectory, containerPath: "/generated" }],
  timeoutMs: 60_000,
  maxOutputBytes: 1024 * 1024,
});

console.log(JSON.stringify({
  repository,
  sourceFile: relativeFile,
  discoveredFunctions: discovered.map(({ name, lineStart, lineEnd, kind, parameters, isAsync, exported, branchCount, confidence, unsupportedReasons }) => ({ name, lineStart, lineEnd, kind, parameters, isAsync, exported, branchCount, confidence, unsupportedReasons })),
  generatedTestPath: testFilePath,
  generatedTestContent: testSource,
  execution: { status: execution.status, exitCode: execution.exitCode, stdout: execution.stdout, stderr: execution.stderr, durationMs: execution.durationMs },
}, null, 2));

if (execution.status !== "COMPLETED") process.exitCode = 1;
