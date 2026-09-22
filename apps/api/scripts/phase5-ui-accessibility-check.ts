import assert from "node:assert/strict";

import { UiAccessibilityAgentService } from "../src/modules/ai/agents/ui-accessibility.service";

const service = new UiAccessibilityAgentService(null as never);
const result = await service.analyze({
  runId: "run-fixture",
  projectId: "project-fixture",
  repositoryId: "repository-fixture",
  projectProfile: {},
  evidence: [],
  model: "fixture-model",
});

assert.equal(result.agentId, "ui-accessibility");
assert.equal(result.status, "skipped");
assert.deepEqual(result.findings, []);
assert.match(result.skippedReason ?? "", /UI|accessibility/i);

console.log("Phase 5 UI accessibility check passed.");
