import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { ApiProbeAdapter } from "../src/modules/analysis/api-probe.adapter";

const workspace = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase4-api-")
);

try {
  const adapter = new ApiProbeAdapter();
  const skipped = await adapter.run(workspace);
  assert.equal(skipped.status, "skipped");
  assert.match(skipped.skippedReason ?? "", /OpenAPI|Swagger/i);

  await fs.writeFile(
    path.join(workspace, "openapi.json"),
    JSON.stringify({ openapi: "3.0.0", paths: {} }),
  );
  delete process.env.AEGIS_API_PROBE_URL;
  const unconfigured = await adapter.run(workspace);
  assert.equal(unconfigured.status, "skipped");
  assert.match(unconfigured.skippedReason ?? "", /not configured/i);

  console.log("Phase 4 API probe check passed.");
} finally {
  await fs.rm(workspace, {
    recursive: true,
    force: true,
  });
}
