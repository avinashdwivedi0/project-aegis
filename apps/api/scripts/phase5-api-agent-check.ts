import assert from "node:assert/strict";

import { ApiAgentService } from "../src/modules/ai/agents/api.service";

const service = new ApiAgentService(null as never);
const result = await service.analyze({
  runId: "run-fixture",
  projectId: "project-fixture",
  repositoryId: "repository-fixture",
  projectProfile: {},
  evidence: [],
  model: "fixture-model",
});

assert.equal(result.agentId, "api");
assert.equal(result.status, "skipped");
assert.deepEqual(result.findings, []);
assert.match(result.skippedReason ?? "", /API/i);

console.log("Phase 5 API agent check passed.");
