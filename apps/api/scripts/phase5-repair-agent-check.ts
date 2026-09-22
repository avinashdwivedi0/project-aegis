import assert from "node:assert/strict";

import { RepairAgentService } from "../src/modules/ai/agents/repair.service";

const service = new RepairAgentService(null as never);
const result = await service.analyze({
  runId: "run-fixture",
  projectId: "project-fixture",
  repositoryId: "repository-fixture",
  projectProfile: {},
  findingTitle: "",
  findingDescription: "",
  evidence: [],
  model: "fixture-model",
});

assert.equal(result.agentId, "repair");
assert.equal(result.status, "skipped");
assert.deepEqual(result.findings, []);
assert.match(result.skippedReason ?? "", /context/i);

console.log("Phase 5 repair agent check passed.");
