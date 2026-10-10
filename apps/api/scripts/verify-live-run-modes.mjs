import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import path from "node:path";

const require = createRequire(new URL("../package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const api = process.env.AEGIS_API_BASE ?? "http://127.0.0.1:3000/api";
const workspacePath = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const email = `live-modes-${randomUUID()}@example.test`;
let userId;

async function post(route, body, token) {
  const response = await fetch(`${api}${route}`, {
    method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${route} returned ${response.status}: ${JSON.stringify(data)}`);
  return data.data;
}

try {
  const account = await post("/auth/register", { name: "Live Run Mode Verification", email, password: `Aegis-${randomUUID()}!` });
  userId = account.user.id;
  const project = await post("/projects", { name: `Live run modes ${randomUUID().slice(0, 8)}` }, account.token);
  const repository = await post(`/projects/${project.id}/repositories`, { name: "MONGO_UR source", provider: "LOCAL", workspacePath }, account.token);
  const common = {
    repositoryId: repository.id,
    frontendUrl: "http://host.docker.internal:3121",
    dashboardUrl: "http://host.docker.internal:3122",
    integrationBaseUrl: "http://host.docker.internal:3120",
  };
  const results = [];
  for (const mode of ["smoke", "system", "sanity", "regression"]) {
    const data = await post("/autonomous-testing/run-modes/run", { ...common, mode }, account.token);
    const totals = data.execution.totals;
    results.push({ mode, changedFiles: data.changedFiles, selectedCount: totals.selected, passed: totals.passed, failed: totals.failed, selected: data.selection.map(({ type, suite, id }) => `${type}:${suite ?? id}`), runResults: data.execution.scheduled.map(({ descriptor, status, error, result }) => ({ id: descriptor.id, status, error: error?.slice(0, 300), executionStatus: result?.execution?.status ?? result?.status, passed: result?.passed ?? result?.execution?.passed, failed: result?.failed ?? result?.execution?.failed })), gaps: data.gaps });
    console.log(JSON.stringify(results.at(-1), null, 2));
    if (totals.failed !== 0 || totals.selected !== totals.passed) throw new Error(`${mode} run failed: ${JSON.stringify(results.at(-1))}`);
  }
  if (results[0].selectedCount >= results[1].selectedCount) throw new Error(`Smoke did not select fewer checks than System: ${JSON.stringify(results.map(({ mode, selectedCount }) => ({ mode, selectedCount })))}`);
  const acceptance = await post("/autonomous-testing/run-modes/run", { ...common, mode: "acceptance" }, account.token);
  if (acceptance.acceptancePath !== "/testing?mode=acceptance") throw new Error(`Acceptance mode did not link to the requirement workflow: ${JSON.stringify(acceptance)}`);
  console.log(JSON.stringify({ repository: workspacePath, results, acceptance: { path: acceptance.acceptancePath, message: acceptance.message, selected: acceptance.selection.length } }, null, 2));
} finally {
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
}
