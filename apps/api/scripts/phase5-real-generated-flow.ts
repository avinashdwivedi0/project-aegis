import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { reactFlowDiscoveryService } from "../src/modules/autonomous-testing/black-box/react-flow-discovery.service.js";
import { signupLoginPlaywrightGenerator } from "../src/modules/autonomous-testing/black-box/signup-login-playwright.generator.js";
import { playwrightTestRunnerService } from "../src/modules/ai/test-runner/test-runner.service.js";

const repository = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const browsers = (process.argv[3] ?? "chromium,firefox,webkit").split(",").map((item) => item.trim()) as Array<"chromium" | "firefox" | "webkit">;
const viewports = (process.argv[4] ?? "desktop,mobile").split(",").map((item) => item.trim()) as Array<"desktop" | "mobile">;
const frontendUrl = process.argv[5] ?? "http://host.docker.internal:3107";
const dashboardUrl = process.argv[6] ?? "http://host.docker.internal:3108";
const flow = await reactFlowDiscoveryService.discoverSignupLogin(repository);
const content = `${signupLoginPlaywrightGenerator.generate(flow, { frontend: frontendUrl, dashboard: dashboardUrl })}\n// self-healing-dom-snapshot: compatibility evidence does not attach form contents.`;
const outputDirectory = path.resolve("results/phase5-real-generated-flow");
await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "signup-login.generated.spec.ts"), content, "utf8");

const execution = await playwrightTestRunnerService.run({
  runId: `phase5_generated_${Date.now()}`,
  workspace: repository,
  files: [{ path: "tests/signup-login.generated.spec.ts", language: "typescript", testCaseId: "REQ-TC-005", content }],
  parallelism: 1,
  timeoutMs: 180_000,
  compatibility: { browsers, viewports },
});
const report = {
  repository,
  flow: flow.name,
  browsers,
  viewports,
  status: execution.status,
  total: execution.total,
  passed: execution.passed,
  failed: execution.failed,
  tests: execution.tests.map(({ title, status, durationMs, error }) => ({ title, status, durationMs, error })),
  resultsDirectory: execution.resultsDirectory,
};
await writeFile(path.join(outputDirectory, `run-${execution.runId}.json`), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
if (execution.failed > 0 || execution.status !== "passed") process.exitCode = 1;
