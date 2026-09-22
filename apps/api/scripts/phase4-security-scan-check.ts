import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { SecurityScanAdapter } from "../src/modules/analysis/security-scan.adapter";

const workspace = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase4-security-")
);

try {
  const adapter = new SecurityScanAdapter();
  assert.equal(await adapter.canRun(workspace), false);

  const skipped = await adapter.run(workspace);
  assert.equal(skipped.status, "skipped");
  assert.deepEqual(skipped.evidence, []);
  assert.match(skipped.skippedReason ?? "", /semgrep/i);

  await fs.writeFile(
    path.join(workspace, ".semgrep.yml"),
    "rules: []",
  );
  assert.equal(await adapter.canRun(workspace), true);

  console.log("Phase 4 security scan check passed.");
} finally {
  await fs.rm(workspace, {
    recursive: true,
    force: true,
  });
}
