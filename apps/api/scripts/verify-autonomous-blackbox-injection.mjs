import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const apiBase = process.env.AEGIS_API_BASE ?? "http://127.0.0.1:3000/api";
const workspacePath = process.argv[2];
if (!workspacePath) throw new Error("Pass a real repository workspace path.");
const repoPath = path.resolve(workspacePath);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "../../..");
const sourcePath = path.join(repoPath, "frontend", "src", "landing_page", "signup", "Signup.js");
const compileLogPath = path.join(projectRoot, "apps/api/results/phase7-target-services/frontend-live.log");
const oldCta = 'isSubmitting ? "Creating account..." : "Create account"';
const injectedCta = 'isSubmitting ? "Creating account..." : "Create account injected-break"';
const suffix = randomUUID();
const email = `autonomous-injection-${suffix}@example.test`;
const password = `Aegis-${suffix}!`;
const prisma = new PrismaClient();
let userId;
let originalSource;
let injectionApplied = false;
let token;
let projectId;
let repositoryId;

const waitForFrontendCompile = async (previousSize) => {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      const current = await readFile(compileLogPath, "utf8");
      if (current.length > previousSize && /webpack compiled successfully/i.test(current.slice(previousSize))) return;
    } catch { /* startup log may be rotating */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Frontend did not report a successful compile after the button injection/restoration.");
};

async function post(route, body, authToken = token) {
  const response = await fetch(`${apiBase}${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(authToken ? { authorization: `Bearer ${authToken}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function runLive() {
  const response = await post("/autonomous-testing/black-box/run", {
    repositoryId,
    frontendUrl: process.env.FRONTEND_URL ?? "http://host.docker.internal:3121",
    dashboardUrl: process.env.DASHBOARD_URL ?? "http://host.docker.internal:3122",
  });
  if (response.status !== 200) throw new Error(`Autonomous run request failed (${response.status}): ${JSON.stringify(response.body)}`);
  return response.body.data.execution;
}

async function rerunSaved(baselineRunId) {
  const response = await post("/autonomous-testing/black-box/rerun", { repositoryId, baselineRunId });
  if (response.status !== 200) throw new Error(`Regression request failed (${response.status}): ${JSON.stringify(response.body)}`);
  return response.body.data.execution;
}

try {
  const registration = await post("/auth/register", {
    name: "Autonomous Injection Verification",
    email,
    password,
  }, undefined);
  if (registration.status !== 201) throw new Error(`Registration failed (${registration.status}): ${JSON.stringify(registration.body)}`);
  userId = registration.body.data.user.id;
  token = registration.body.data.token;

  const project = await post("/projects", { name: `Blackbox injection ${suffix.slice(0, 8)}` });
  if (project.status !== 201) throw new Error(`Project creation failed (${project.status}).`);
  projectId = project.body.data.id;
  const repository = await post(`/projects/${projectId}/repositories`, {
    name: "Real signup/login source",
    provider: "LOCAL",
    workspacePath: repoPath,
  });
  if (repository.status !== 201) throw new Error(`Repository creation failed (${repository.status}).`);
  repositoryId = repository.body.data.id;

  const baseline = await runLive();
  if (baseline.status !== "passed" || baseline.failed !== 0 || baseline.passed !== 1) {
    throw new Error(`Baseline was not clean: ${JSON.stringify({ status: baseline.status, passed: baseline.passed, failed: baseline.failed })}`);
  }

  originalSource = await readFile(sourcePath, "utf8");
  if (originalSource.split(oldCta).length - 1 !== 1) throw new Error("Expected exactly one real signup CTA source expression.");
  const originalCompileLog = (await readFile(compileLogPath, "utf8")).length;
  await writeFile(sourcePath, originalSource.replace(oldCta, injectedCta), "utf8");
  injectionApplied = true;
  await waitForFrontendCompile(originalCompileLog);
  const frontendBundleResponse = await fetch(`http://127.0.0.1:3121/static/js/bundle.js?verify=${Date.now()}`);
  const frontendBundle = await frontendBundleResponse.text();
  if (!frontendBundle.includes("Create account injected-break")) {
    throw new Error("Frontend emitted a successful build but its served bundle did not contain the injected CTA text.");
  }
  const injected = await rerunSaved(baseline.runId);
  if (injected.status !== "failed" || injected.failed !== 1 || injected.total !== 1) {
    throw new Error(`Injected button-text defect was not caught: ${JSON.stringify({ status: injected.status, total: injected.total, passed: injected.passed, failed: injected.failed })}`);
  }

  const restoreCompileLog = (await readFile(compileLogPath, "utf8")).length;
  await writeFile(sourcePath, originalSource, "utf8");
  injectionApplied = false;
  await waitForFrontendCompile(restoreCompileLog);
  const restored = await rerunSaved(baseline.runId);
  if (restored.status !== "passed" || restored.failed !== 0 || restored.passed !== 1) {
    throw new Error(`Restored flow did not pass: ${JSON.stringify({ status: restored.status, passed: restored.passed, failed: restored.failed })}`);
  }
  const diff = execFileSync("git", ["-C", repoPath, "diff", "--", "frontend/src/landing_page/signup/Signup.js"], { encoding: "utf8" });
  if (diff.trim()) throw new Error(`Target source did not restore cleanly:\n${diff}`);

  console.log(JSON.stringify({
    baseline: { status: baseline.status, total: baseline.total, passed: baseline.passed, failed: baseline.failed },
    injectedButtonText: { status: injected.status, total: injected.total, passed: injected.passed, failed: injected.failed, error: injected.tests?.[0]?.error },
    restored: { status: restored.status, total: restored.total, passed: restored.passed, failed: restored.failed },
    targetSourceGitDiff: "clean",
  }, null, 2));
} finally {
  if (injectionApplied && originalSource !== undefined) await writeFile(sourcePath, originalSource, "utf8").catch(() => undefined);
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
}
