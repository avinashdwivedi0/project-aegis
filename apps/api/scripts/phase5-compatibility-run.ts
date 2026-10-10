import { readFile } from "node:fs/promises";
import path from "node:path";

import { playwrightTestRunnerService } from "../src/modules/ai/test-runner/test-runner.service.js";

const repository = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const frontendUrl = process.argv[3] ?? "http://host.docker.internal:3001";
const dashboardUrl = process.argv[4] ?? "http://host.docker.internal:3003";
const generatedPath = path.resolve("results/phase3-black-box/signup-login.generated.spec.ts");
const original = await readFile(generatedPath, "utf8");
const generatedScenario = original
  .replace(/const frontendUrl = .*;\n/, `const frontendUrl = ${JSON.stringify(frontendUrl)};\n`)
  .replace(/const dashboardUrl = .*;\n/, `const dashboardUrl = ${JSON.stringify(dashboardUrl)};\n`);
const runId = process.env.COMPATIBILITY_RUN_ID ?? `phase5_compat_${Date.now()}`;

const execution = await playwrightTestRunnerService.run({
  runId,
  workspace: repository,
  files: [{
    path: "tests/signup-login.generated.spec.ts",
    language: "typescript",
    testCaseId: "REQ-TC-003",
    content: generatedScenario,
  }],
  parallelism: 1,
  timeoutMs: 900_000,
  compatibility: {
    browsers: ["chromium", "firefox", "webkit"],
    viewports: ["desktop", "mobile"],
  },
});

console.log(JSON.stringify({
  repository,
  generatedPath,
  runId,
  scenario: "Signup account, then log in with the created account",
  matrix: ["chromium", "firefox", "webkit"].flatMap((browser) =>
    ["desktop", "mobile"].map((viewport) => ({ browser, viewport })),
  ),
  result: {
    status: execution.status,
    total: execution.total,
    passed: execution.passed,
    failed: execution.failed,
    skipped: execution.skipped,
    tests: execution.tests,
    resultsDirectory: execution.resultsDirectory,
  },
}, null, 2));
