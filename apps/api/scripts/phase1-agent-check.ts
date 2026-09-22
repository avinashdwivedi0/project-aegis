import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const {
    AGENT_CONTRACT_VERSION,
    AgentExecutorService,
    ProjectAnalyzerService,
    agentInputSchema,
    listAgents,
  } = await import("../src/modules/ai/agents/index");

  const agentInput = {
    contractVersion: AGENT_CONTRACT_VERSION,
    agentId: "project-analyzer" as const,
    runId: "phase-1-check",
    projectId: "project-check",
    repositoryId: "repository-check",
    projectProfile: {},
    evidence: [],
    promptVersion: "project-analyzer@1.0",
    model: "test-provider",
  };

  assert.equal(listAgents().length, 10);
  assert.equal(agentInputSchema.safeParse(agentInput).success, true);
  assert.equal(
    agentInputSchema.safeParse({ ...agentInput, repositoryId: "" }).success,
    false,
  );

  const executor = new AgentExecutorService({
    generate: async () =>
      JSON.stringify({
        status: "completed",
        findings: [],
        summary: "check passed",
      }),
  });
  const output = await executor.execute(agentInput);
  assert.equal(output.status, "completed");
  assert.equal(output.agentId, "project-analyzer");

  const failedOutput = await new AgentExecutorService({
    generate: async () => "not-json",
  }).execute(agentInput);
  assert.equal(failedOutput.status, "failed");
  assert.equal(failedOutput.errorCode, "provider-invalid-response");

  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-phase1-"));
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ dependencies: { react: "19.0.0" }, scripts: { build: "vite build", test: "vitest" } }),
  );
  await fs.writeFile(path.join(root, "index.tsx"), "export default function App() { return null; }");

  const profile = await new ProjectAnalyzerService().analyze(root);
  assert.equal(profile.projectType, "javascript");
  assert.deepEqual(profile.languages, ["typescript"]);
  assert.deepEqual(profile.frameworks, ["react"]);
  assert.deepEqual(profile.buildCommands, ["pnpm run build"]);
  assert.deepEqual(profile.testCommands, ["pnpm run test"]);
  assert.equal(profile.filesScanned, 2);

  await fs.rm(root, { recursive: true, force: true });
  console.log("PHASE1_AGENT_CHECK_OK");
}

main().catch((error) => {
  console.error("PHASE1_AGENT_CHECK_FAILED", error);
  process.exitCode = 1;
});
