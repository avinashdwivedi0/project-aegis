import "../src/config/env.js";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "../src/config/prisma.js";

const baseUrl = (process.env.AEGIS_API_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const apiUrl = new URL(baseUrl);
if (!["localhost", "127.0.0.1", "::1"].includes(apiUrl.hostname)) {
  throw new Error("Phase 6 authorization audit only permits a loopback API target.");
}
const runId = `phase6-authz-${crypto.randomUUID()}`;
const password = `Phase6-${crypto.randomBytes(18).toString("hex")}aA1!`;
const emailSuffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const accounts: Array<{ id: string; token: string }> = [];
const checks: Array<{ name: string; status: "passed" | "failed"; expected: number; actual: number }> = [];
let projectId: string | undefined;
let repositoryId: string | undefined;
let analysisRunId: string | undefined;
let patchId: string | undefined;

async function request(
  route: string,
  options: { method?: string; token?: string; body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const text = await response.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data };
}

function check(name: string, actual: number, expected: number) {
  checks.push({ name, status: actual === expected ? "passed" : "failed", expected, actual });
}

async function createAccount(label: string) {
  const response = await request("/api/auth/register", {
    method: "POST",
    body: { name: `Phase 6 ${label}`, email: `phase6-${label}-${emailSuffix}@example.invalid`, password },
  });
  if (response.status !== 201 || typeof response.data?.data?.token !== "string") {
    throw new Error(`Could not create disposable ${label} account (HTTP ${response.status}).`);
  }
  const user = response.data.data.user;
  const token = response.data.data.token as string;
  accounts.push({ id: user.id as string, token });
  return { id: user.id as string, token };
}

async function main() {
  const owner = await createAccount("owner");
  const other = await createAccount("other");

  const projectResponse = await request("/api/projects", {
    method: "POST",
    token: owner.token,
    body: { name: `Phase 6 authz ${emailSuffix}`, description: "Disposable authorization audit fixture." },
  });
  if (projectResponse.status !== 201 || typeof projectResponse.data?.data?.id !== "string") {
    throw new Error(`Could not create disposable project (HTTP ${projectResponse.status}).`);
  }
  projectId = projectResponse.data.data.id as string;

  const repositoryResponse = await request(`/api/projects/${projectId}/repositories`, {
    method: "POST",
    token: owner.token,
    body: {
      name: `Phase 6 repository ${emailSuffix}`,
      provider: "LOCAL",
      workspacePath: process.cwd(),
    },
  });
  if (repositoryResponse.status !== 201 || typeof repositoryResponse.data?.data?.id !== "string") {
    throw new Error(`Could not create disposable repository (HTTP ${repositoryResponse.status}).`);
  }
  repositoryId = repositoryResponse.data.data.id as string;

  const run = await prisma.analysisRun.create({
    data: { projectId, repositoryId, status: "FAILED", error: "phase6 authorization fixture" },
  });
  analysisRunId = run.id;
  await prisma.toolExecution.create({
    data: {
      analysisRunId,
      command: "phase6-authz-fixture",
      args: [],
      status: "COMPLETED",
      evidence: [{ message: "phase6 authorization private evidence sentinel" }],
    },
  });

  const repairJob = await prisma.repairJob.create({ data: { projectId, repositoryId, status: "PENDING" } });
  const finding = await prisma.finding.create({
    data: {
      repairJobId: repairJob.id,
      category: "phase6-authz-fixture",
      severity: "LOW",
      confidence: 1,
      title: "Disposable authorization audit finding",
      description: "Private finding body for cross-account access verification.",
      evidence: [],
      filePath: "authorization-fixture.js",
      detectionSource: "phase6-authz-audit",
    },
  });
  const patch = await prisma.patch.create({
    data: {
      findingId: finding.id,
      repairJobId: repairJob.id,
      diffContent: "",
      diffHash: crypto.createHash("sha256").update("").digest("hex"),
      patchBytes: 0,
      linesAdded: 0,
      linesRemoved: 0,
      riskScore: 0,
      target: "WORKSPACE_SANDBOX",
      lifecycle: "PATCH_GENERATED",
    },
  });
  patchId = patch.id;

  const ownerWrite = await request(`/api/projects/${projectId}/guardrails`, {
    method: "PUT",
    token: owner.token,
    body: { maxPatchRiskScore: 61, sandboxOnly: false, scope: "ADVISORY" },
  });
  check("owner can create project guardrails", ownerWrite.status, 201);
  if (ownerWrite.status !== 201) throw new Error("Owner setup for guardrail fixture failed.");

  const storedBefore = await prisma.guardrailSettings.findUnique({ where: { projectId } });
  if (!storedBefore) throw new Error("Owner guardrail setup was not persisted.");

  check("unauthenticated project read denied", (await request(`/api/projects/${projectId}`)).status, 401);
  check("unauthenticated guardrail update denied", (await request(`/api/projects/${projectId}/guardrails`, {
    method: "PUT",
    body: { maxPatchRiskScore: 1, scope: "ENFORCED" },
  })).status, 401);

  check("other account cannot read private project", (await request(`/api/projects/${projectId}`, { token: other.token })).status, 404);
  check("other account cannot read project guardrails", (await request(`/api/projects/${projectId}/guardrails`, { token: other.token })).status, 404);
  check("other account cannot change project guardrails", (await request(`/api/projects/${projectId}/guardrails`, {
    method: "PUT",
    token: other.token,
    body: { maxPatchRiskScore: 1, sandboxOnly: true, scope: "ENFORCED" },
  })).status, 404);

  const storedAfter = await prisma.guardrailSettings.findUnique({ where: { projectId } });
  const unchanged = storedAfter?.maxPatchRiskScore === storedBefore.maxPatchRiskScore
    && storedAfter?.sandboxOnly === storedBefore.sandboxOnly
    && storedAfter?.scope === storedBefore.scope;
  check("denied guardrail update leaves owner data unchanged", unchanged ? 200 : 500, 200);

  const unauthenticatedEndpoints: Array<{ method: string; route: string; body?: unknown }> = [
    { method: "GET", route: "/api/auth/me" },
    { method: "PATCH", route: "/api/auth/preferences", body: {} },
    { method: "POST", route: "/api/projects", body: { name: "Unauthorized project" } },
    { method: "GET", route: "/api/projects" },
    { method: "GET", route: `/api/projects/${projectId}` },
    { method: "PATCH", route: `/api/projects/${projectId}`, body: { name: "Unauthorized rename" } },
    { method: "DELETE", route: `/api/projects/${projectId}` },
    { method: "POST", route: `/api/projects/${projectId}/repositories`, body: { name: "Unauthorized repository" } },
    { method: "GET", route: `/api/projects/${projectId}/repositories` },
    { method: "GET", route: `/api/repositories/${repositoryId}` },
    { method: "GET", route: `/api/repositories/${repositoryId}/stats` },
    { method: "POST", route: `/api/repositories/${repositoryId}/index`, body: {} },
    { method: "PATCH", route: `/api/repositories/${repositoryId}`, body: { name: "Unauthorized rename" } },
    { method: "DELETE", route: `/api/repositories/${repositoryId}` },
    { method: "POST", route: `/api/repositories/${repositoryId}/import/github`, body: {} },
    { method: "POST", route: `/api/repositories/${repositoryId}/import/zip`, body: {} },
    { method: "GET", route: `/api/repositories/${repositoryId}/files` },
    { method: "GET", route: `/api/repositories/${repositoryId}/search?q=phase6` },
    { method: "GET", route: `/api/repositories/${repositoryId}/file?path=SESSION-STATE.md` },
    { method: "GET", route: "/api/analyses" },
    { method: "POST", route: "/api/analyses", body: {} },
    { method: "GET", route: `/api/analyses/${analysisRunId}` },
    { method: "GET", route: `/api/analyses/${analysisRunId}/events` },
    { method: "GET", route: `/api/analyses/${analysisRunId}/summary` },
    { method: "POST", route: `/api/analyses/${analysisRunId}/start`, body: {} },
    { method: "PATCH", route: `/api/analyses/${analysisRunId}/progress`, body: {} },
    { method: "POST", route: `/api/analyses/${analysisRunId}/complete`, body: {} },
    { method: "POST", route: `/api/analyses/${analysisRunId}/cancel`, body: {} },
    { method: "POST", route: `/api/analyses/${analysisRunId}/retry`, body: {} },
    { method: "GET", route: `/api/analyses/${analysisRunId}/findings` },
    { method: "GET", route: `/api/analyses/${analysisRunId}/score` },
    { method: "GET", route: `/api/analyses/${analysisRunId}/gate` },
    { method: "GET", route: `/api/analyses/${analysisRunId}/report` },
    { method: "GET", route: `/api/analyses/${analysisRunId}/report.md` },
    { method: "GET", route: `/api/repairs/patches/${patchId}` },
    { method: "POST", route: "/api/repairs/findings/not-a-real-finding/patch", body: {} },
    { method: "POST", route: `/api/repairs/patches/${patchId}/validate`, body: {} },
    { method: "POST", route: `/api/repairs/patches/${patchId}/apply`, body: {} },
    { method: "POST", route: `/api/repairs/patches/${patchId}/reject`, body: {} },
    { method: "POST", route: `/api/repairs/patches/${patchId}/pull-request`, body: {} },
    { method: "GET", route: "/api/audits" },
    { method: "GET", route: `/api/projects/${projectId}/guardrails` },
    { method: "GET", route: `/api/autonomous-testing/runs/${repositoryId}` },
    { method: "GET", route: "/api/self-healing/proposals" },
    { method: "GET", route: "/api/test-reports" },
    { method: "POST", route: `/api/ci/projects/${projectId}/ci-config`, body: { platform: "github", repositoryId, apiUrl: baseUrl } },
    { method: "POST", route: `/api/autonomous-testing/security/run`, body: { repositoryId } },
    { method: "POST", route: "/api/autonomous-testing/unit/run", body: { repositoryId, suite: "exported-components" } },
    { method: "POST", route: "/api/autonomous-testing/integration/run", body: { repositoryId, suite: "signup-login", baseUrl } },
    { method: "POST", route: "/api/autonomous-testing/run-modes/run", body: {} },
    { method: "POST", route: "/api/autonomous-testing/black-box/run", body: {} },
    { method: "POST", route: "/api/autonomous-testing/black-box/rerun", body: {} },
    { method: "POST", route: "/api/chat", body: {} },
    { method: "POST", route: "/api/requirements/analyze", body: {} },
    { method: "POST", route: "/api/test-designs", body: {} },
    { method: "POST", route: "/api/script-generators", body: {} },
    { method: "POST", route: "/api/test-runs", body: {} },
    { method: "POST", route: "/api/self-healing/proposals", body: {} },
    { method: "POST", route: "/api/failure-triage", body: {} },
    { method: "POST", route: "/api/test-workflows/run", body: {} },
  ];
  for (const endpoint of unauthenticatedEndpoints) {
    const response = await request(endpoint.route, { method: endpoint.method, body: endpoint.body });
    check(`unauthenticated ${endpoint.method} ${endpoint.route} denied`, response.status, 401);
  }

  const otherAccountEndpoints: Array<{ method: string; route: string; body?: unknown; expected?: number }> = [
    { method: "GET", route: `/api/projects/${projectId}`, expected: 404 },
    { method: "PATCH", route: `/api/projects/${projectId}`, body: { name: "Unauthorized rename" }, expected: 404 },
    { method: "DELETE", route: `/api/projects/${projectId}`, expected: 404 },
    { method: "GET", route: `/api/projects/${projectId}/repositories`, expected: 404 },
    { method: "GET", route: `/api/repositories/${repositoryId}`, expected: 404 },
    { method: "GET", route: `/api/repositories/${repositoryId}/stats`, expected: 404 },
    { method: "GET", route: `/api/repositories/${repositoryId}/files`, expected: 404 },
    { method: "GET", route: `/api/repositories/${repositoryId}/search?q=phase6`, expected: 404 },
    { method: "GET", route: `/api/repositories/${repositoryId}/file?path=SESSION-STATE.md`, expected: 404 },
    { method: "PATCH", route: `/api/repositories/${repositoryId}`, body: { name: "Unauthorized rename" }, expected: 404 },
    { method: "POST", route: `/api/repositories/${repositoryId}/index`, body: {}, expected: 404 },
    { method: "DELETE", route: `/api/repositories/${repositoryId}`, expected: 404 },
    { method: "GET", route: `/api/analyses/${analysisRunId}`, expected: 404 },
    { method: "GET", route: `/api/analyses/${analysisRunId}/events`, expected: 404 },
    { method: "GET", route: `/api/analyses/${analysisRunId}/summary`, expected: 404 },
    { method: "GET", route: `/api/analyses/${analysisRunId}/findings`, expected: 404 },
    { method: "GET", route: `/api/analyses/${analysisRunId}/score`, expected: 404 },
    { method: "GET", route: `/api/analyses/${analysisRunId}/gate`, expected: 404 },
    { method: "GET", route: `/api/analyses/${analysisRunId}/report`, expected: 404 },
    { method: "GET", route: `/api/analyses/${analysisRunId}/report.md`, expected: 404 },
    { method: "POST", route: `/api/analyses/${analysisRunId}/retry`, expected: 404 },
    { method: "GET", route: `/api/repairs/patches/${patchId}`, expected: 403 },
    { method: "POST", route: `/api/repairs/patches/${patchId}/reject`, expected: 403 },
    { method: "GET", route: `/api/projects/${projectId}/guardrails`, expected: 404 },
    { method: "PUT", route: `/api/projects/${projectId}/guardrails`, body: { maxPatchRiskScore: 1, scope: "ENFORCED" }, expected: 404 },
    { method: "POST", route: `/api/ci/projects/${projectId}/ci-config`, body: { platform: "github", repositoryId, apiUrl: baseUrl }, expected: 404 },
    { method: "GET", route: `/api/autonomous-testing/runs/${repositoryId}`, expected: 404 },
    { method: "POST", route: "/api/autonomous-testing/security/run", body: { repositoryId }, expected: 404 },
  ];
  for (const endpoint of otherAccountEndpoints) {
    const response = await request(endpoint.route, { method: endpoint.method, token: other.token, body: endpoint.body });
    check(`other account ${endpoint.method} ${endpoint.route} denied`, response.status, endpoint.expected ?? 404);
  }

  const updatedProject = await prisma.project.findUnique({ where: { id: projectId } });
  check("denied project update leaves owner data unchanged", updatedProject?.name === projectResponse.data.data.name ? 200 : 500, 200);
  const currentRun = await prisma.analysisRun.findUnique({ where: { id: analysisRunId } });
  check("denied retry leaves analysis state unchanged", currentRun?.status === "FAILED" ? 200 : 500, 200);
  const currentPatch = await prisma.patch.findUnique({ where: { id: patchId } });
  check("denied patch rejection leaves owner data unchanged", currentPatch?.lifecycle === "PATCH_GENERATED" ? 200 : 500, 200);

  const report = {
    runId,
    baseUrl,
    createdAt: new Date().toISOString(),
    scope: "Unauthenticated route checks and cross-account project, repository, analysis, report, patch, CI, guardrail, and autonomous-testing authorization using disposable accounts and records.",
    status: checks.every(({ status }) => status === "passed") ? "passed" : "failed",
    checks,
  };
  const output = path.resolve("results/phase6-authz-audit/latest.json");
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "passed") process.exitCode = 1;
}

try {
  await main();
} finally {
  if (projectId) await prisma.project.deleteMany({ where: { id: projectId } });
  if (accounts.length) await prisma.user.deleteMany({ where: { id: { in: accounts.map(({ id }) => id) } } });
  await prisma.$disconnect();
}
