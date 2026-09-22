import assert from "node:assert/strict";

import { TestAgentService } from "../src/modules/ai/agents/test.service";

const service = new TestAgentService(null as never);
const result = await service.analyze({
  runId: "run-fixture",
  projectId: "project-fixture",
  repositoryId: "repository-fixture",
  projectProfile: {},
  evidence: [],
  model: "fixture-model",
});

assert.equal(result.agentId, "test");
assert.equal(result.status, "skipped");
assert.deepEqual(result.findings, []);
assert.match(result.skippedReason ?? "", /test/i);

console.log("Phase 5 test agent check passed.");
