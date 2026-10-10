import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../api/package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const apiBase = process.env.API_BASE_URL ?? "http://localhost:3000/api";
const browserPath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browserPort = 9236;
const profileDirectory = path.join(process.env.TEMP ?? "C:/Temp", `aegis-run-history-${randomUUID()}`);
const evidencePath = path.resolve("../api/results/phase4-ui/autonomous-run-history.png");
const workspacePath = path.resolve(process.argv[2] ?? "../api/src");
const email = `run-history-${randomUUID()}@example.test`;
let userId;
let browser;
let socket;
let nextCommandId = 1;
const pendingCommands = new Map();

function command(method, params = {}) {
  const id = nextCommandId++;
  return new Promise((resolve, reject) => {
    pendingCommands.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "Browser evaluation failed");
  return result.result?.value;
}

async function waitFor(check, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for saved run history to render.");
}

async function request(pathname, token, options = {}) {
  const response = await fetch(`${apiBase}${pathname}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${pathname} failed (${response.status}): ${data.message ?? "request failed"}`);
  return data;
}

try {
  const registration = await request("/auth/register", undefined, {
    method: "POST",
    body: JSON.stringify({ name: "Run History Verification", email, password: `Verify-${randomUUID()}!` }),
  });
  userId = registration.data.user.id;
  const token = registration.data.token;
  const project = await request("/projects", token, {
    method: "POST",
    body: JSON.stringify({ name: `Run history ${randomUUID().slice(0, 8)}` }),
  });
  const repository = await request(`/projects/${project.data.id}/repositories`, token, {
    method: "POST",
    body: JSON.stringify({ name: "Read-only history fixture", provider: "LOCAL", workspacePath }),
  });
  const repoId = repository.data.id;
  const security = await request("/autonomous-testing/security/run", token, {
    method: "POST",
    body: JSON.stringify({ repositoryId: repoId }),
  });
  const modeRun = await request("/autonomous-testing/run-modes/run", token, {
    method: "POST",
    body: JSON.stringify({ repositoryId: repoId, mode: "system" }),
  });
  const history = await request(`/autonomous-testing/runs/${encodeURIComponent(repoId)}`, token);
  const saved = history.data.find((item) => item.runId === security.data.runId);
  if (!saved) throw new Error("The API run completed but was missing from the authenticated history response.");
  const modeRunId = modeRun.data.runId ?? modeRun.data.report?.id;
  const savedMode = history.data.find((item) => item.runId === modeRunId);
  if (!savedMode) throw new Error("The aggregate run-mode report was missing from the authenticated history response.");

  await mkdir(path.dirname(evidencePath), { recursive: true });
  browser = spawn(browserPath, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--remote-allow-origins=*", `--remote-debugging-port=${browserPort}`,
    `--user-data-dir=${profileDirectory}`, "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  const target = await (async () => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const response = await fetch(`http://127.0.0.1:${browserPort}/json/list`).catch(() => null);
      if (response?.ok) {
        const page = (await response.json()).find((item) => item.type === "page" && item.webSocketDebuggerUrl);
        if (page) return page;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error("Edge DevTools did not become available.");
  })();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const pending = pendingCommands.get(message.id);
    if (!pending) return;
    pendingCommands.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result ?? {});
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1600, height: 2200, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: "http://127.0.0.1:5190/" });
  await waitFor(async () => (await evaluate("location.origin === 'http://127.0.0.1:5190' && document.readyState === 'complete'")) === true);
  await evaluate(`localStorage.setItem("token", ${JSON.stringify(token)}); localStorage.setItem("selectedProjectId", ${JSON.stringify(project.data.id)}); localStorage.setItem("selectedRepositoryId", ${JSON.stringify(repoId)}); true`);
  await command("Page.navigate", { url: "http://127.0.0.1:5190/autonomous-testing" });
  let pageText = "";
  try {
    await waitFor(async () => {
    const body = await evaluate("document.body.innerText");
    pageText = body;
    return body.includes("Saved run history")
      && body.toLowerCase().includes(security.data.runId.toLowerCase())
      && body.toLowerCase().includes(modeRunId.toLowerCase()) ? body : null;
    });
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)} Page text: ${pageText.slice(-1800)}`);
  }
  await evaluate("document.getElementById('autonomous-run-history-title')?.scrollIntoView({ block: 'center' }); true");
  await new Promise((resolve) => setTimeout(resolve, 300));
  const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true });
  await writeFile(evidencePath, Buffer.from(screenshot.data, "base64"));
  console.log(JSON.stringify({
    route: "GET /api/autonomous-testing/runs/:repositoryId",
    savedRunId: saved.runId,
    runType: saved.type,
    runStatus: saved.status,
    aggregateMode: modeRun.data.mode,
    aggregateModeRunId: savedMode.runId,
    aggregateModeStatus: savedMode.status,
    historyCount: history.data.length,
    generatedSourceAvailable: saved.generatedSourceAvailable,
    securityFindingCount: security.data.findingCount,
    uiDisplayedSavedRun: true,
    screenshot: "apps/api/results/phase4-ui/autonomous-run-history.png",
  }, null, 2));
} finally {
  socket?.close();
  if (browser && !browser.killed) browser.kill();
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
  await rm(profileDirectory, { recursive: true, force: true }).catch(() => undefined);
}
