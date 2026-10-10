import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ContainerRunnerService } from "../src/modules/analysis/container-runner.service.js";
import { exportedComponentGenerator } from "../src/modules/autonomous-testing/unit/exported-component.generator.js";
import { javascriptUnitDiscoveryService } from "../src/modules/autonomous-testing/unit/javascript-unit-discovery.service.js";
import type { JavaScriptUnitTarget } from "../src/modules/autonomous-testing/unit/unit.types.js";

const repository = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const selections = [
  { filePath: "dashboard/src/components/DoughnoutChart.js", name: "DoughnutChart", behavior: "doughnut-chart" as const },
  { filePath: "dashboard/src/components/VerticalGraph.js", name: "VerticalGraph", behavior: "vertical-graph" as const },
  { filePath: "frontend/src/landing_page/home/Hero.js", name: "Hero", behavior: "landing-hero" as const },
];
const candidates = await Promise.all(selections.map(async (selection) => {
  const discovered = await javascriptUnitDiscoveryService.discoverFile(repository, selection.filePath);
  const target: JavaScriptUnitTarget | undefined = discovered.find(({ name }) => name === selection.name);
  if (!target) throw new Error(`Could not discover ${selection.name} in ${selection.filePath}.`);
  return { target, source: await readFile(path.join(repository, selection.filePath), "utf8"), behavior: selection.behavior };
}));
const testSource = exportedComponentGenerator.generate(candidates);
const outputDirectory = path.resolve("results/phase1-exported-components");
await mkdir(outputDirectory, { recursive: true });
const testPath = path.join(outputDirectory, "exported-components.generated.test.cjs");
await writeFile(testPath, testSource, "utf8");
const execution = await ContainerRunnerService.run({
  command: "node",
  args: ["--test", "/generated/exported-components.generated.test.cjs"],
  workspace: repository,
  writableMounts: [{ hostPath: outputDirectory, containerPath: "/generated" }],
  timeoutMs: 60_000,
  maxOutputBytes: 1024 * 1024,
});
console.log(JSON.stringify({
  repository,
  discoveredFunctions: candidates.map(({ target }) => ({ name: target.name, filePath: target.filePath, lineStart: target.lineStart, lineEnd: target.lineEnd, kind: target.kind, exported: target.exported })),
  generatedTestPath: testPath,
  generatedTestContent: await readFile(testPath, "utf8"),
  execution: { status: execution.status, exitCode: execution.exitCode, stdout: execution.stdout, stderr: execution.stderr, durationMs: execution.durationMs },
}, null, 2));
if (execution.status !== "COMPLETED") process.exitCode = 1;
