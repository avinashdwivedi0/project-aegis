import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { EslintAdapter } from "../src/modules/analysis/eslint.adapter";

const workspace = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase4-eslint-")
);

try {
  const adapter = new EslintAdapter();
  assert.equal(await adapter.canRun(workspace), false);

  const skipped = await adapter.run(workspace);
  assert.equal(skipped.status, "skipped");
  assert.deepEqual(skipped.evidence, []);
  assert.match(skipped.skippedReason ?? "", /eslint/i);

  await fs.writeFile(
    path.join(workspace, "eslint.config.mjs"),
    "export default [];",
  );
  assert.equal(await adapter.canRun(workspace), true);

  console.log("Phase 4 ESLint adapter check passed.");
} finally {
  await fs.rm(workspace, {
    recursive: true,
    force: true,
  });
}
