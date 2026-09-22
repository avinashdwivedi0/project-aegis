import assert from "node:assert/strict";

import { SecurityAgentService } from "../src/modules/ai/agents/security.service";

const service = new SecurityAgentService(null as never);
const result = await service.analyze({
  runId: "run-fixture",
  projectId: "project-fixture",
  repositoryId: "repository-fixture",
  projectProfile: {},
  evidence: [],
  model: "fixture-model",
});

assert.equal(result.agentId, "security");
assert.equal(result.status, "skipped");
assert.deepEqual(result.findings, []);
assert.match(result.skippedReason ?? "", /security/i);

console.log("Phase 5 security agent check passed.");
