import assert from "node:assert/strict";

import { CodeQualityAgentService } from "../src/modules/ai/agents/code-quality.service";

const service = new CodeQualityAgentService(
  null as never,
);
const result = await service.analyze({
  runId: "run-fixture",
  projectId: "project-fixture",
  repositoryId: "repository-fixture",
  projectProfile: {},
  evidence: [],
  model: "fixture-model",
});

assert.equal(result.agentId, "code-quality");
assert.equal(result.status, "skipped");
assert.deepEqual(result.findings, []);
assert.match(result.skippedReason ?? "", /evidence/i);

console.log("Phase 5 code quality check passed.");
