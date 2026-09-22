import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { BrowserAccessibilityAdapter } from "../src/modules/analysis/browser-accessibility.adapter";

const workspace = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase4-browser-")
);

try {
  const adapter = new BrowserAccessibilityAdapter();
  assert.equal(await adapter.canRun(workspace), false);

  const skipped = await adapter.run(workspace);
  assert.equal(skipped.status, "skipped");
  assert.deepEqual(skipped.evidence, []);
  assert.match(skipped.skippedReason ?? "", /playwright/i);

  await fs.writeFile(
    path.join(workspace, "playwright.config.ts"),
    "export default {};",
  );
  assert.equal(await adapter.canRun(workspace), true);

  console.log("Phase 4 browser accessibility check passed.");
} finally {
  await fs.rm(workspace, {
    recursive: true,
    force: true,
  });
}
