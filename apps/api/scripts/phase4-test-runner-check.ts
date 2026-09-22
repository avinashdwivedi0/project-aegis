import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { TestRunnerAdapter } from "../src/modules/analysis/test-runner.adapter";

const workspace = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase4-tests-")
);

try {
  const adapter = new TestRunnerAdapter();
  assert.equal(await adapter.canRun(workspace), false);

  const skipped = await adapter.run(workspace);
  assert.equal(skipped.status, "skipped");
  assert.deepEqual(skipped.evidence, []);

  await fs.writeFile(
    path.join(workspace, "package.json"),
    JSON.stringify({ scripts: { test: "node test.js" } }),
  );
  assert.equal(await adapter.canRun(workspace), true);

  console.log("Phase 4 test runner check passed.");
} finally {
  await fs.rm(workspace, {
    recursive: true,
    force: true,
  });
}
