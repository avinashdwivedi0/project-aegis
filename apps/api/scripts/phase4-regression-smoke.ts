import "../src/config/env.js";

import { randomUUID } from "node:crypto";
import { prisma } from "../src/config/prisma.js";

const apiBase = "http://localhost:3000/api";
const suffix = randomUUID();
const email = `phase4-regression-${suffix}@example.test`;
const password = `Regression-${suffix}!`;
const workspacePath = "D:/Projects/project-aegis";
let userId: string | undefined;
let projectId: string | undefined;
let token: string | undefined;

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null) as Record<string, any> | null;
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} returned ${response.status}: ${JSON.stringify(body)}`);
  }
  return { status: response.status, body };
}

try {
  const registration = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Phase 4 Regression", email, password }),
  });
  token = registration.body.data.token;
  userId = registration.body.data.user.id;

  const projectResult = await request("/projects", {
    method: "POST",
    body: JSON.stringify({ name: `Phase 4 Regression ${suffix.slice(0, 8)}` }),
  });
  projectId = projectResult.body.data.id;

  const repositoryResult = await request(`/projects/${projectId}/repositories`, {
    method: "POST",
    body: JSON.stringify({
      name: "Project Aegis verification workspace",
      provider: "LOCAL",
      workspacePath,
    }),
  });
  const repositoryId = repositoryResult.body.data.id;

  const guardrailWrite = await request(`/projects/${projectId}/guardrails`, {
    method: "PUT",
    body: JSON.stringify({
      maxPatchRiskScore: 65,
      requireManualApprovalForCritical: true,
      sandboxOnly: true,
      scope: "ADVISORY",
    }),
  });
  const guardrailRead = await request(`/projects/${projectId}/guardrails`);
  if (guardrailWrite.body.data.scope !== "ADVISORY" || guardrailRead.body.data.scope !== "ADVISORY") {
    throw new Error("Guardrail advisory-only scope was not preserved.");
  }

  const selfHealing = await request("/self-healing/proposals", {
    method: "POST",
    body: JSON.stringify({
      repositoryId,
      testRunId: `phase4-regression-${suffix}`,
      testCaseId: "REQ-TC-904",
      failedLocator: "getByTestId('missing-cta')",
      domSnapshot: '<button data-testid="actual-cta">Save</button>',
      screenshot: "data:image/png;base64,aGVsbG8=",
    }),
  });
  const proposalId = selfHealing.body.data.id;
  const proposals = await request("/self-healing/proposals?repositoryId=" + repositoryId);
  if (selfHealing.body.data.contractVersion !== "1.0" || !proposals.body.data.some((item: { id: string }) => item.id === proposalId)) {
    throw new Error("Self-healing proposal response/list regression check failed.");
  }

  let ci: Awaited<ReturnType<typeof request>> | undefined;
  let ciError: string | undefined;
  try {
    ci = await request(`/ci/projects/${projectId}/ci-config`, {
      method: "POST",
      body: JSON.stringify({
        platform: "github",
        repositoryId,
        apiUrl: "https://aegis.example",
        triggers: ["pull_request"],
        analysisTypes: ["typescript"],
        mergeGate: true,
      }),
    });
    const ciContent = ci.body.data.content as string;
    if (!ciContent.includes("AEGIS_API_URL") || !ciContent.includes("pull_request")) {
      throw new Error("CI/CD generated YAML did not contain the requested URL and trigger.");
    }
  } catch (error) {
    ciError = error instanceof Error ? error.message : String(error);
  }

  const workflow = await request("/test-workflows/run", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      repositoryId,
      requirement: "A user can open https://example.com.",
      parallelism: 1,
    }),
  });
  const workflowRun = workflow.body.data.run;

  const analysis = await request("/analyses", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      repositoryId,
      ref: "phase4-regression",
      adapters: ["typescript"],
    }),
  });
  const analysisRunId = analysis.body.data.id;
  let analysisStatus = "PENDING";
  let analysisEvents: any[] = [];
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline && !["COMPLETED", "FAILED", "CANCELLED"].includes(analysisStatus)) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const [runResult, eventResult] = await Promise.all([
      request(`/analyses/${analysisRunId}`),
      request(`/analyses/${analysisRunId}/events`),
    ]);
    analysisStatus = runResult.body.data.status;
    analysisEvents = eventResult.body.data;
  }

  console.log(JSON.stringify({
    mode: process.env.AGENT_MODE,
    governance: {
      writeStatus: guardrailWrite.status,
      readStatus: guardrailRead.status,
      scope: guardrailRead.body.data.scope,
      advisoryOnly: guardrailRead.body.data.scope === "ADVISORY",
    },
    selfHealing: {
      status: selfHealing.status,
      proposalCreated: Boolean(proposalId),
      proposalListed: proposals.body.data.some((item: { id: string }) => item.id === proposalId),
      contractVersion: selfHealing.body.data.contractVersion,
    },
    ciCd: {
      status: ci?.status ?? "BLOCKED",
      filePath: ci?.body.data.filePath ?? null,
      yamlContainsExpectedTrigger: ci ? (ci.body.data.content as string).includes("pull_request") : false,
      error: ciError,
      executionStatus: "NOT RUN (configuration generation smoke only)",
    },
    requirementDrivenPlaywright: {
      status: workflow.status,
      runId: workflowRun.runId,
      result: {
        status: workflowRun.status,
        total: workflowRun.total,
        passed: workflowRun.passed,
        failed: workflowRun.failed,
      },
    },
    multiAgentOrchestration: {
      analysisRunId,
      status: analysisStatus,
      agentEvents: analysisEvents
        .filter((event) => event.agentRole && ["AGENT_STARTED", "AGENT_COMPLETED", "AGENT_FAILED"].includes(event.type))
        .map((event) => ({ agentRole: event.agentRole, type: event.type })),
    },
  }, null, 2));
} finally {
  if (projectId && userId) {
    await prisma.project.deleteMany({ where: { id: projectId, ownerId: userId } });
  }
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
