import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { DependencyAuditAdapter } from "../src/modules/analysis/dependency-audit.adapter";

const workspace = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase4-audit-")
);

try {
  const adapter = new DependencyAuditAdapter();
  assert.equal(await adapter.canRun(workspace), false);

  const skipped = await adapter.run(workspace);
  assert.equal(skipped.status, "skipped");
  assert.deepEqual(skipped.evidence, []);
  assert.match(skipped.skippedReason ?? "", /lockfile/i);

  await fs.writeFile(
    path.join(workspace, "pnpm-lock.yaml"),
    "lockfileVersion: '9.0'",
  );
  assert.equal(await adapter.canRun(workspace), true);

  console.log("Phase 4 dependency audit check passed.");
} finally {
  await fs.rm(workspace, {
    recursive: true,
    force: true,
  });
}
