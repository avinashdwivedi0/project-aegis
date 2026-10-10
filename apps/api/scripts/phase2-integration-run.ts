import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ContainerRunnerService } from "../src/modules/analysis/container-runner.service.js";
import { javascriptRouteDiscoveryService } from "../src/modules/autonomous-testing/integration/javascript-route-discovery.service.js";
import { signupIntegrationGenerator } from "../src/modules/autonomous-testing/integration/signup-integration.generator.js";

const repository = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const baseUrl = process.argv[3] ?? "http://host.docker.internal:3002";
const discovery = await javascriptRouteDiscoveryService.discover(repository);
const generated = signupIntegrationGenerator.generate(discovery.routes, baseUrl);
const outputDirectory = path.resolve("results/phase2-integration");
await mkdir(outputDirectory, { recursive: true });
const generatedTestPath = path.join(outputDirectory, "signup.generated.test.cjs");
await writeFile(generatedTestPath, generated, "utf8");
const execution = await ContainerRunnerService.run({
  command: "node",
  args: ["--test", "/generated/signup.generated.test.cjs"],
  workspace: repository,
  writableMounts: [{ hostPath: outputDirectory, containerPath: "/generated" }],
  environment: { BASE_URL: baseUrl },
  timeoutMs: 60_000,
  maxOutputBytes: 1024 * 1024,
});
console.log(JSON.stringify({
  repository,
  contractKind: discovery.contractKind,
  contractFiles: discovery.contractFiles,
  routes: discovery.routes.map(({ method, path: routePath, filePath, line }) => ({ method, path: routePath, filePath, line })),
  generatedTestPath,
  generatedTestContent: await readFile(generatedTestPath, "utf8"),
  execution: { status: execution.status, exitCode: execution.exitCode, stdout: execution.stdout, stderr: execution.stderr, durationMs: execution.durationMs },
}, null, 2));
if (execution.status !== "COMPLETED") process.exitCode = 1;
