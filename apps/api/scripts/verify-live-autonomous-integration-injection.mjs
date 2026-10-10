import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { spawn } from "node:child_process";
import path from "node:path";

const require = createRequire(new URL("../package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const api = process.env.AEGIS_API_BASE ?? "http://127.0.0.1:3000/api";
const workspace = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const sourcePath = path.join(workspace, "backend/index.js");
const originalLine = "  let allHoldings = await HoldingsModel.find({});";
const injectedLine = '  let allHoldings = await HoldingsModel.find({ name: { $in: [] } });';
const email = `integration-injection-${randomUUID()}@example.test`;
let userId;
let original;
let injected = false;
let injectedTarget;
let injectedTargetLog = "";

async function post(route, body, token) {
  const response = await fetch(`${api}${route}`, {
    method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${route} returned ${response.status}: ${JSON.stringify(data)}`);
  return data.data;
}

async function run(token, repositoryId, baseUrl = process.env.TARGET_BASE_URL ?? "http://host.docker.internal:3120") {
  return await post("/autonomous-testing/integration/run", {
    repositoryId, suite: "dashboard-data", baseUrl,
  }, token);
}

async function waitForInjectedTarget() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:3123/", { signal: AbortSignal.timeout(1000) });
      if (response.status < 500 && injectedTargetLog.includes("DB connected!")) return;
    } catch { /* wait for Mongo and the new process */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Injected disposable backend did not start on port 3123. Output: ${injectedTargetLog}`);
}

function summary(result) {
  return { runId: result.runId, status: result.execution.status, total: result.total, passed: result.passed, failed: result.failed, stdout: result.execution.stdout };
}

try {
  const account = await post("/auth/register", { name: "Integration Injection Verification", email, password: `Aegis-${randomUUID()}!` });
  userId = account.user.id;
  const project = await post("/projects", { name: `Integration defect ${randomUUID().slice(0, 8)}` }, account.token);
  const repository = await post(`/projects/${project.id}/repositories`, { name: "Real route source", provider: "LOCAL", workspacePath: workspace }, account.token);
  const baseline = await run(account.token, repository.id);
  if (baseline.execution.status !== "COMPLETED" || baseline.passed !== 4 || baseline.failed !== 0) throw new Error(`Baseline failed: ${JSON.stringify(summary(baseline))}`);

  original = await readFile(sourcePath, "utf8");
  if (original.split(originalLine).length - 1 !== 1) throw new Error("Expected exactly one allHoldings database query line.");
  await writeFile(sourcePath, original.replace(originalLine, injectedLine), "utf8");
  injected = true;
  injectedTarget = spawn("node", ["index.js"], {
    cwd: path.dirname(sourcePath),
    env: { ...process.env, PORT: "3123", MONGO_URL: "mongodb://127.0.0.1:27019/aegis_phase2_injection" },
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  injectedTarget.stdout.on("data", (chunk) => { injectedTargetLog += chunk.toString(); });
  injectedTarget.stderr.on("data", (chunk) => { injectedTargetLog += chunk.toString(); });
  await waitForInjectedTarget();
  const broken = await run(account.token, repository.id, "http://host.docker.internal:3123");
  if (broken.execution.status !== "FAILED" || broken.failed !== 1 || broken.passed !== 3) throw new Error(`Injected integration bug was not caught: ${JSON.stringify(summary(broken))}`);

  await writeFile(sourcePath, original, "utf8");
  injected = false;
  injectedTarget.kill();
  injectedTarget = undefined;
  const restored = await run(account.token, repository.id);
  if (restored.execution.status !== "COMPLETED" || restored.passed !== 4 || restored.failed !== 0) throw new Error(`Restored integration flow failed: ${JSON.stringify(summary(restored))}`);
  const diff = execFileSync("git", ["-C", workspace, "diff", "--", "backend/index.js"], { encoding: "utf8" });
  if (diff.trim()) throw new Error(`Backend source did not restore cleanly:\n${diff}`);
  console.log(JSON.stringify({ baseline: summary(baseline), injectedReadDefect: summary(broken), restored: summary(restored), targetSourceGitDiff: "clean" }, null, 2));
} finally {
  if (injectedTarget && !injectedTarget.killed) injectedTarget.kill();
  if (injected && original !== undefined) await writeFile(sourcePath, original, "utf8").catch(() => undefined);
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
}
