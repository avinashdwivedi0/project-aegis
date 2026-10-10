import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const require = createRequire(new URL("../package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const api = process.env.AEGIS_API_BASE ?? "http://127.0.0.1:3000/api";
const workspace = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const sourcePath = path.join(workspace, "frontend/src/landing_page/home/Hero.js");
const beforeText = "Invest in everything";
const injectedText = "Injected regression heading";
const email = `unit-injection-${randomUUID()}@example.test`;
let userId;
let original;
let injected = false;

async function post(route, body, token) {
  const response = await fetch(`${api}${route}`, {
    method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${route} returned ${response.status}: ${JSON.stringify(data)}`);
  return data.data;
}

async function run(token, repositoryId) {
  return (await post("/autonomous-testing/unit/run", { repositoryId, suite: "exported-components" }, token));
}

try {
  const registration = await post("/auth/register", { name: "Unit Injection Verification", email, password: `Aegis-${randomUUID()}!` });
  userId = registration.user.id;
  const token = registration.token;
  const project = await post("/projects", { name: `Unit defect ${randomUUID().slice(0, 8)}` }, token);
  const repository = await post(`/projects/${project.id}/repositories`, { name: "Real component source", provider: "LOCAL", workspacePath: workspace }, token);
  const baseline = await run(token, repository.id);
  if (baseline.execution.status !== "COMPLETED" || baseline.passed !== 3 || baseline.failed !== 0) throw new Error(`Baseline failed: ${JSON.stringify({ status: baseline.execution.status, passed: baseline.passed, failed: baseline.failed })}`);

  original = await readFile(sourcePath, "utf8");
  if (original.split(beforeText).length - 1 !== 1) throw new Error("Expected exactly one source heading to inject.");
  await writeFile(sourcePath, original.replace(beforeText, injectedText), "utf8");
  injected = true;
  const broken = await run(token, repository.id);
  if (broken.execution.status !== "FAILED" || broken.failed !== 1 || broken.passed !== 2) throw new Error(`Injected defect was not reported accurately: ${JSON.stringify({ status: broken.execution.status, total: broken.total, passed: broken.passed, failed: broken.failed, stdout: broken.execution.stdout })}`);

  await writeFile(sourcePath, original, "utf8");
  injected = false;
  const restored = await run(token, repository.id);
  if (restored.execution.status !== "COMPLETED" || restored.passed !== 3 || restored.failed !== 0) throw new Error(`Restored source did not pass: ${JSON.stringify({ status: restored.execution.status, passed: restored.passed, failed: restored.failed })}`);
  const diff = execFileSync("git", ["-C", workspace, "diff", "--", "frontend/src/landing_page/home/Hero.js"], { encoding: "utf8" });
  if (diff.trim()) throw new Error(`Source did not restore cleanly:\n${diff}`);
  console.log(JSON.stringify({
    baseline: { runId: baseline.runId, status: baseline.execution.status, total: baseline.total, passed: baseline.passed, failed: baseline.failed },
    injectedHeading: { runId: broken.runId, status: broken.execution.status, total: broken.total, passed: broken.passed, failed: broken.failed, output: broken.execution.stdout },
    restored: { runId: restored.runId, status: restored.execution.status, total: restored.total, passed: restored.passed, failed: restored.failed },
    targetSourceGitDiff: "clean",
  }, null, 2));
} finally {
  if (injected && original !== undefined) await writeFile(sourcePath, original, "utf8").catch(() => undefined);
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
}
