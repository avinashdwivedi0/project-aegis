import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { ToolRunnerService } from "../src/modules/analysis/tool-runner.service";

const workspace = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase3-runner-")
);

try {
  const completed = await ToolRunnerService.run({
    command: "node",
    args: ["-e", "process.stdout.write('ready')"],
    workspace,
  });
  assert.equal(completed.status, "COMPLETED");
  assert.equal(completed.stdout, "ready");

  const failed = await ToolRunnerService.run({
    command: "node",
    args: ["-e", "process.stderr.write('failed'); process.exit(2)"],
    workspace,
  });
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.exitCode, 2);

  const timedOut = await ToolRunnerService.run({
    command: "node",
    args: ["-e", "setTimeout(() => {}, 1000)"],
    workspace,
    timeoutMs: 20,
  });
  assert.equal(timedOut.status, "TIMED_OUT");

  const abortController = new AbortController();
  const cancelledPromise = ToolRunnerService.run({
    command: "node",
    args: ["-e", "setTimeout(() => {}, 1000)"],
    workspace,
    signal: abortController.signal,
  });
  abortController.abort();
  const cancelled = await cancelledPromise;
  assert.equal(cancelled.status, "CANCELLED");

  await assert.rejects(
    () => ToolRunnerService.run({
      command: "bash" as "node",
      args: [],
      workspace,
    }),
    /not allowed/i,
  );

  console.log("Phase 3 tool runner check passed.");
} finally {
  await fs.rm(workspace, {
    recursive: true,
    force: true,
  });
}
