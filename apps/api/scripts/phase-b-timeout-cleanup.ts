import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

import { ContainerRunnerService } from "../src/modules/analysis/container-runner.service.js";

const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-timeout-"));
try {
  await fs.writeFile(path.join(workspace, ".env"), "PHASE_B_SENTINEL=must_not_enter_container\n", "utf8");
  const maskExecution = await ContainerRunnerService.run({ command: "node", args: ["-e", "const v=require('node:fs').readFileSync('/workspace/.env','utf8');process.stdout.write(v||'MASKED')"], workspace });
  if (maskExecution.stdout.includes("must_not_enter_container")) throw new Error("Credential mask failed: .env contents reached the container.");
  const execution = await ContainerRunnerService.run({ command: "node", args: ["-e", "setTimeout(()=>{},30000)"], workspace, timeoutMs: 1_000 });
  const report = { runId: crypto.randomUUID(), credentialMask: maskExecution.stdout, timeoutStatus: execution.status, timeoutDurationMs: execution.durationMs, exitCode: execution.exitCode };
  const outputPath = path.resolve("results/phase-b-static-checks/container-timeout-cleanup.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await fs.rm(workspace, { recursive: true, force: true });
}
