import assert from "node:assert/strict";

import { AdapterRegistry } from "../src/modules/analysis/adapter.registry";

const names = AdapterRegistry.all().map((adapter) => adapter.name);
assert.deepEqual(names, [
  "typescript",
  "eslint",
  "dependency-audit",
  "security-scan",
  "test-runner",
  "api-probe",
  "browser-accessibility",
  "performance",
]);
assert.equal(AdapterRegistry.get("missing"), undefined);

console.log("Phase 4 adapter pipeline check passed.");
