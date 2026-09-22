import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { TypeScriptAdapter } from "../src/modules/analysis/typescript.adapter";

const workspace = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase4-typescript-")
);

try {
  const adapter = new TypeScriptAdapter();
  assert.equal(await adapter.canRun(workspace), false);

  const skipped = await adapter.run(workspace);
  assert.equal(skipped.status, "skipped");
  assert.equal(skipped.tool, "typescript");
  assert.deepEqual(skipped.evidence, []);
  assert.match(skipped.skippedReason ?? "", /tsconfig/i);

  await fs.writeFile(
    path.join(workspace, "tsconfig.json"),
    "{}",
  );
  assert.equal(await adapter.canRun(workspace), true);

  console.log("Phase 4 TypeScript adapter check passed.");
} finally {
  await fs.rm(workspace, {
    recursive: true,
    force: true,
  });
}
