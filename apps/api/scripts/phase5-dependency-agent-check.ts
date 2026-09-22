import assert from "node:assert/strict";

import { DependencyAgentService } from "../src/modules/ai/agents/dependency.service";

const service = new DependencyAgentService(null as never);
const result = await service.analyze({
  runId: "run-fixture",
  projectId: "project-fixture",
  repositoryId: "repository-fixture",
  projectProfile: {},
  evidence: [],
  model: "fixture-model",
});

assert.equal(result.agentId, "dependency");
assert.equal(result.status, "skipped");
assert.deepEqual(result.findings, []);
assert.match(result.skippedReason ?? "", /dependency/i);

console.log("Phase 5 dependency agent check passed.");
