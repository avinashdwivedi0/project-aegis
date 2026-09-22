import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { PerformanceAdapter } from "../src/modules/analysis/performance.adapter";

const workspace = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase4-performance-")
);

try {
  delete process.env.AEGIS_PERFORMANCE_URL;
  const adapter = new PerformanceAdapter();
  assert.equal(await adapter.canRun(workspace), false);

  const skipped = await adapter.run(workspace);
  assert.equal(skipped.status, "skipped");
  assert.deepEqual(skipped.evidence, []);
  assert.match(skipped.skippedReason ?? "", /not configured/i);

  console.log("Phase 4 performance check passed.");
} finally {
  await fs.rm(workspace, {
    recursive: true,
    force: true,
  });
}
