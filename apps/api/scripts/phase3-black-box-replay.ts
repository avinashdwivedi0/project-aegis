import { readFile } from "node:fs/promises";
import path from "node:path";

import { playwrightTestRunnerService } from "../src/modules/ai/test-runner/test-runner.service.js";

const repository = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const generatedPath = path.resolve("results/phase3-black-box/signup-login.generated.spec.ts");
const content = await readFile(generatedPath, "utf8");
const run = await playwrightTestRunnerService.run({
  runId: process.env.BLACKBOX_RUN_ID ?? "phase3_signup_login_replay",
  workspace: repository,
  files: [{ path: "tests/signup-login.generated.spec.ts", language: "typescript", testCaseId: "REQ-TC-003", content }],
  parallelism: 1,
  timeoutMs: 180_000,
});
console.log(JSON.stringify({ repository, generatedPath, execution: run }, null, 2));
