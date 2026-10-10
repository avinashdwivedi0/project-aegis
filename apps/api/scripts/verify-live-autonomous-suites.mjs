import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(new URL("../package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const api = process.env.AEGIS_API_BASE ?? "http://127.0.0.1:3000/api";
const workspacePath = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const email = `live-suites-${randomUUID()}@example.test`;
let userId;

async function request(route, body, token) {
  const response = await fetch(`${api}${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`${route} returned ${response.status}: ${JSON.stringify(data)}`);
  return { status: response.status, data };
}

try {
  const registration = await request("/auth/register", { name: "Live suite verification", email, password: `Aegis-${randomUUID()}!` });
  userId = registration.data.data.user.id;
  const token = registration.data.data.token;
  const project = await request("/projects", { name: `Live suites ${randomUUID().slice(0, 8)}` }, token);
  const repository = await request(`/projects/${project.data.data.id}/repositories`, {
    name: "Actual MONGO_UR source", provider: "LOCAL", workspacePath,
  }, token);
  const repositoryId = repository.data.data.id;
  const results = [];
  for (const suite of ["exported-components", "password-helpers"]) {
    const response = await request("/autonomous-testing/unit/run", { repositoryId, suite }, token);
    const data = response.data.data;
    results.push({ kind: "unit", suite, httpStatus: response.status, runId: data.runId, status: data.execution.status, exitCode: data.execution.exitCode, total: data.total, passed: data.passed, failed: data.failed, generatedFile: data.generatedTest.path, sourceTargets: data.targetFiles });
    if (data.execution.status !== "COMPLETED" || data.failed !== 0 || data.passed === 0) throw new Error(`Unit suite did not pass: ${JSON.stringify(results.at(-1))}`);
  }
  for (const suite of ["signup-login", "new-order", "dashboard-data"]) {
    const integration = await request("/autonomous-testing/integration/run", {
      repositoryId, suite, baseUrl: process.env.TARGET_BASE_URL ?? "http://host.docker.internal:3120",
    }, token);
    const data = integration.data.data;
    results.push({ kind: "integration", suite: data.suite, httpStatus: integration.status, runId: data.runId, status: data.execution.status, exitCode: data.execution.exitCode, total: data.total, passed: data.passed, failed: data.failed, generatedFile: data.generatedTest.path, discoveredRoutes: data.discoveredRoutes });
    if (data.execution.status !== "COMPLETED" || data.failed !== 0 || data.passed === 0) throw new Error(`Integration suite did not pass: ${JSON.stringify(results.at(-1))}`);
  }
  console.log(JSON.stringify({ repository: workspacePath, results }, null, 2));
} finally {
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
}
