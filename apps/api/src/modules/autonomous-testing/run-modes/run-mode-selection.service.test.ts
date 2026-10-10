import assert from "node:assert/strict";
import test from "node:test";

import {
  RunModeSelectionService,
  type GeneratedTestDescriptor,
} from "./run-mode-selection.service.js";

const inventory: GeneratedTestDescriptor[] = [
  { id: "unit-password", type: "unit", sourceFiles: ["backend/index.js"], tags: ["critical"], previousStatus: "passed" },
  { id: "unit-components", type: "unit", sourceFiles: ["dashboard/src/components/Hero.js"], tags: [], previousStatus: "passed" },
  { id: "integration-signup", type: "integration", sourceFiles: ["backend/index.js"], tags: ["critical"], previousStatus: "passed" },
  { id: "integration-order", type: "integration", sourceFiles: ["backend/index.js"], tags: ["critical"], previousStatus: "passed" },
  { id: "blackbox-signup-login", type: "black-box", sourceFiles: ["frontend/src/landing_page/signup/Signup.js"], tags: ["critical"], previousStatus: "passed" },
  { id: "compatibility-signup-login", type: "compatibility", sourceFiles: ["frontend/src/landing_page/signup/Signup.js"], tags: ["critical"], previousStatus: "passed" },
  { id: "security-scan", type: "security", sourceFiles: ["qa-analysis-injected-issue.js"], tags: [], previousStatus: "unknown" },
];

test("run mode selectors choose critical, changed, full, prior-pass, and UAT sets", () => {
  const service = new RunModeSelectionService();
  const changed = ["backend/index.js"];

  assert.deepEqual(service.select("smoke", inventory).selected.map(({ id }) => id), [
    "unit-password", "integration-signup", "integration-order", "blackbox-signup-login", "compatibility-signup-login",
  ]);
  assert.deepEqual(service.select("sanity", inventory, changed).selected.map(({ id }) => id), [
    "unit-password", "integration-signup", "integration-order",
  ]);
  assert.equal(service.select("system", inventory).selected.length, inventory.length);
  assert.deepEqual(service.select("regression", inventory, changed).selected.map(({ id }) => id), [
    "unit-password", "integration-signup", "integration-order",
  ]);
  assert.equal(service.select("acceptance", inventory).selected.length, 0);
});

test("run mode scheduler respects the concurrency limit and preserves descriptor order", async () => {
  const service = new RunModeSelectionService();
  let active = 0;
  let peak = 0;
  const scheduled = await service.schedule(["unit", "integration", "black-box", "security"], 2, async (item) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return `${item}-done`;
  });

  assert.equal(peak, 2);
  assert.deepEqual(scheduled.map(({ result }) => result), [
    "unit-done", "integration-done", "black-box-done", "security-done",
  ]);
});

test("run mode execution aggregates real executor outcomes", async () => {
  const service = new RunModeSelectionService();
  const report = await service.execute("smoke", inventory, [], 2, async ({ id }) => {
    if (id === "unit-password") throw new Error("injected executor failure");
    return `${id}: completed`;
  });

  assert.equal(report.totals.selected, 5);
  assert.equal(report.totals.passed, 4);
  assert.equal(report.totals.failed, 1);
  assert.equal(report.scheduled.find(({ descriptor }) => descriptor.id === "unit-password")?.error, "injected executor failure");
});

test("repository-wide checks are selected for every non-empty change set", () => {
  const service = new RunModeSelectionService();
  const inventoryWithRepoWideScan = [
    { id: "security", type: "security" as const, sourceFiles: ["*"], tags: [], previousStatus: "passed" as const },
  ];
  assert.equal(service.select("sanity", inventoryWithRepoWideScan, ["frontend/src/App.js"]).selected.length, 1);
  assert.equal(service.select("sanity", inventoryWithRepoWideScan, []).selected.length, 0);
});
