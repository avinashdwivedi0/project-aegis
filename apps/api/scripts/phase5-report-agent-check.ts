import assert from "node:assert/strict";

import { ReportAgentService } from "../src/modules/ai/agents/report.service";

const service = new ReportAgentService(null as never);
const result = await service.analyze({
  runId: "run-fixture",
  projectId: "project-fixture",
  repositoryId: "repository-fixture",
  projectProfile: {},
  evidence: [],
  model: "fixture-model",
});

assert.equal(result.agentId, "report");
assert.equal(result.status, "skipped");
assert.deepEqual(result.findings, []);
assert.match(result.skippedReason ?? "", /evidence/i);

console.log("Phase 5 report agent check passed.");
