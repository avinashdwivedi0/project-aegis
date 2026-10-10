import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { access, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(new URL("../package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const api = process.env.AEGIS_API_BASE ?? "http://127.0.0.1:3000/api";
const workspace = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const injectedPath = path.join(workspace, "aegis-secret-scan-injected.js");
const email = `secret-scan-${randomUUID()}@example.test`;
let userId;
let injectionCreated = false;

async function post(route, body, token) {
  const response = await fetch(`${api}${route}`, {
    method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${route} returned ${response.status}: ${JSON.stringify(data)}`);
  return data.data;
}

async function scan(token, repositoryId) {
  return await post("/autonomous-testing/security/run", { repositoryId }, token);
}

try {
  const account = await post("/auth/register", { name: "Secret Scan Verification", email, password: `Aegis-${randomUUID()}!` });
  userId = account.user.id;
  const project = await post("/projects", { name: `Secret scan ${randomUUID().slice(0, 8)}` }, account.token);
  const repository = await post(`/projects/${project.id}/repositories`, { name: "Real source repository", provider: "LOCAL", workspacePath: workspace }, account.token);
  const baseline = await scan(account.token, repository.id);
  if (baseline.findings.some(({ filePath }) => filePath === "aegis-secret-scan-injected.js")) throw new Error("Temporary injection file unexpectedly existed before baseline.");

  await writeFile(injectedPath, 'const API_KEY = "sk-proj-AEGIS-INJECTED-0123456789abcdef0123456789";\n', "utf8");
  injectionCreated = true;
  const injected = await scan(account.token, repository.id);
  const finding = injected.findings.find(({ filePath, line, ruleId }) => filePath === "aegis-secret-scan-injected.js" && line === 1 && ruleId === "hardcoded-secret-assignment");
  if (!finding) throw new Error(`Injected key was not detected at the correct line: ${JSON.stringify(injected.findings)}`);
  if (JSON.stringify(injected.findings).includes("sk-proj-AEGIS-INJECTED-TEST")) throw new Error("Finding response leaked the literal secret value.");

  await rm(injectedPath, { force: true });
  injectionCreated = false;
  const restored = await scan(account.token, repository.id);
  if (restored.findings.some(({ filePath }) => filePath === "aegis-secret-scan-injected.js")) throw new Error("Finding remained after the temporary source was removed.");
  const remainingTargetPath = await access(injectedPath).then(() => true).catch(() => false);
  if (remainingTargetPath) throw new Error("Temporary secret injection file still exists after cleanup.");
  console.log(JSON.stringify({
    baseline: { runId: baseline.runId, status: baseline.status, scannedFiles: baseline.scannedFiles, findingCount: baseline.findingCount },
    injected: { runId: injected.runId, status: injected.status, findingCount: injected.findingCount, finding },
    restored: { runId: restored.runId, status: restored.status, findingCount: restored.findingCount, injectedPathExists: false },
  }, null, 2));
} finally {
  if (injectionCreated) await rm(injectedPath, { force: true }).catch(() => undefined);
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
}
