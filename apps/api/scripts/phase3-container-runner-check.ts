import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  buildContainerArgs,
  ContainerRunnerService,
} from "../src/modules/analysis/container-runner.service";

const workspace = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase3-container-")
);

try {
  const args = buildContainerArgs({
    command: "node",
    args: ["-e", "console.log('isolated')"],
    workspace,
  });

  assert.deepEqual(args.slice(0, 5), [
    "run",
    "--rm",
    "--init",
    "--network=none",
    "--read-only",
  ]);
  assert.ok(args.includes("--cap-drop=ALL"));
  assert.ok(args.includes("--security-opt=no-new-privileges:true"));
  assert.ok(args.includes("--user=65532:65532"));
  assert.ok(args.includes("--pids-limit=128"));
  assert.ok(args.includes("--memory=512m"));
  assert.ok(args.includes("--cpus=1.0"));
  assert.ok(args.includes("--tmpfs=/tmp:rw,noexec,nosuid,size=64m"));
  assert.ok(args.some((value) => value.startsWith("type=bind,")));
  assert.deepEqual(args.slice(-3, -1), [
    "node",
    "-e",
  ]);
  assert.equal(args.at(-1), "console.log('isolated')");

  const liveResult = await ContainerRunnerService.run({
    command: "node",
    args: ["-e", "process.stdout.write('isolated')"],
    workspace,
  });
  assert.equal(liveResult.status, "COMPLETED");
  assert.equal(liveResult.stdout, "isolated");

  console.log("Phase 3 container runner check passed.");
} finally {
  await fs.rm(workspace, {
    recursive: true,
    force: true,
  });
}
