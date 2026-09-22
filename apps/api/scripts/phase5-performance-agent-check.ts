import assert from "node:assert/strict";

import { PerformanceAgentService } from "../src/modules/ai/agents/performance.service";

const service = new PerformanceAgentService(null as never);
const result = await service.analyze({
  runId: "run-fixture",
  projectId: "project-fixture",
  repositoryId: "repository-fixture",
  projectProfile: {},
  evidence: [],
  model: "fixture-model",
});

assert.equal(result.agentId, "performance");
assert.equal(result.status, "skipped");
assert.deepEqual(result.findings, []);
assert.match(result.skippedReason ?? "", /performance/i);

console.log("Phase 5 performance agent check passed.");
