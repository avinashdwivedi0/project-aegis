import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { reactFlowDiscoveryService } from "../src/modules/autonomous-testing/black-box/react-flow-discovery.service.js";
import { signupLoginPlaywrightGenerator } from "../src/modules/autonomous-testing/black-box/signup-login-playwright.generator.js";
import { playwrightTestRunnerService } from "../src/modules/ai/test-runner/test-runner.service.js";

const repository = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const flow = await reactFlowDiscoveryService.discoverSignupLogin(repository);
const frontendUrl = process.argv[3] ?? "http://host.docker.internal:3001";
const dashboardUrl = process.argv[4] ?? "http://host.docker.internal:3003";
const generatedScript = signupLoginPlaywrightGenerator.generate(flow, { frontend: frontendUrl, dashboard: dashboardUrl });
const outputDirectory = path.resolve("results/phase3-black-box");
await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "signup-login.generated.spec.ts"), generatedScript, "utf8");

const run = await playwrightTestRunnerService.run({
  runId: process.env.BLACKBOX_RUN_ID ?? "phase3_signup_login",
  workspace: repository,
  files: [{ path: "tests/signup-login.generated.spec.ts", language: "typescript", testCaseId: "REQ-TC-003", content: generatedScript }],
  parallelism: 1,
  timeoutMs: 180_000,
});

console.log(JSON.stringify({
  repository,
  inferredFlow: flow,
  generatedScriptPath: path.join(outputDirectory, "signup-login.generated.spec.ts"),
  generatedScript,
  execution: run,
}, null, 2));
