import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const require = createRequire(new URL("../../api/package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const email = `diagnostic-${randomUUID()}@example.test`;
const password = `Diagnostic-${randomUUID()}!`;
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const debugPort = 9231;
const profile = path.join(tmpdir(), `aegis-500-diagnostic-${randomUUID()}`);
let userId;
let browser;
let socket;
let nextId = 1;
const pending = new Map();

function command(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "Browser evaluation failed");
  return result.result?.value;
}

async function waitFor(check, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for the UI request.");
}

async function apiRequest(method, url, body, token) {
  return fetch(`http://localhost:3000/api${url}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

try {
  const registration = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Temporary 500 Diagnostics", email, password }),
  });
  const registrationBody = await registration.json();
  if (!registration.ok || !registrationBody.data?.token) {
    throw new Error(`Disposable account registration failed with HTTP ${registration.status}.`);
  }
  userId = registrationBody.data.user?.id;
  const token = registrationBody.data.token;

  const projectResponse = await apiRequest("POST", "/projects", {
    name: `500 diagnostics ${Date.now()}`,
    description: "Disposable project for reproducing missing repository workspace errors.",
  }, token);
  const projectBody = await projectResponse.json();
  if (!projectResponse.ok || !projectBody.data?.id) {
    throw new Error(`Disposable project creation failed with HTTP ${projectResponse.status}.`);
  }
  const projectId = projectBody.data.id;

  const repositoryResponse = await apiRequest("POST", `/projects/${projectId}/repositories`, {
    name: "Workspace Missing Diagnostic Repo",
    provider: "LOCAL",
  }, token);
  const repositoryBody = await repositoryResponse.json();
  if (!repositoryResponse.ok || !repositoryBody.data?.id) {
    throw new Error(`Disposable repository creation failed with HTTP ${repositoryResponse.status}.`);
  }
  const repositoryId = repositoryBody.data.id;

  browser = spawn(edgePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  const target = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`).catch(() => null);
    if (!response?.ok) return null;
    const targets = await response.json();
    return targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
  });
  socket = new WebSocket(target.webSocketDebuggerUrl);
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message));
    else item.resolve(message.result ?? {});
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  await command("Page.enable");
  await command("Runtime.enable");
  await command("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      window.__aegisRequests = [];
      const open = XMLHttpRequest.prototype.open;
      const send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this.__aegisMethod = method;
        this.__aegisUrl = String(url);
        return open.call(this, method, url, ...rest);
      };
      XMLHttpRequest.prototype.send = function(body) {
        this.addEventListener('loadend', () => {
          if (this.__aegisUrl?.includes('/api/analyses') || this.__aegisUrl?.includes('/api/test-workflows/run')) {
            window.__aegisRequests.push({ method: this.__aegisMethod, url: this.__aegisUrl, requestBody: body ?? null, status: this.status, responseBody: this.responseText });
          }
        });
        return send.call(this, body);
      };
    })();`,
  });
  await command("Page.navigate", { url: "http://127.0.0.1:5173/" });
  await waitFor(async () => (await evaluate("document.readyState")) === "complete");
  await evaluate(`localStorage.setItem('token', ${JSON.stringify(token)}); localStorage.setItem('selectedProjectId', ${JSON.stringify(projectId)}); localStorage.setItem('selectedRepositoryId', ${JSON.stringify(repositoryId)}); true`);
  await command("Page.navigate", { url: "http://127.0.0.1:5173/testing" });
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("Requirement to Playwright test"));
  await waitFor(async () => (await evaluate("[...document.querySelectorAll('#testing-repository option')].some((item) => item.value === " + JSON.stringify(repositoryId) + ")")));

  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Run selected checks')); if (!button) return false; button.click(); return true; })()`);
  await waitFor(async () => (await evaluate("window.__aegisRequests?.some((request) => request.url.includes('/api/analyses') && request.method === 'POST')")));

  await evaluate(`(() => { const textarea = document.querySelector('textarea'); if (!textarea) return false; const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; setter.call(textarea, 'A user can open https://example.com.'); textarea.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await waitFor(async () => (await evaluate("document.querySelector('textarea')?.value")) === "A user can open https://example.com.");
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Generate and run Playwright')); if (!button || button.disabled) return false; button.click(); return true; })()`);
  await waitFor(async () => (await evaluate("window.__aegisRequests?.some((request) => request.url.includes('/api/test-workflows/run') && request.method === 'POST')")), 180_000);

  const requests = await evaluate("window.__aegisRequests.filter((request) => request.url.includes('/api/analyses') || request.url.includes('/api/test-workflows/run'))");
  console.log(JSON.stringify({
    ui: "http://127.0.0.1:5173/testing",
    projectId,
    repositoryId,
    repositoryHasWorkspacePath: false,
    capturedRequests: requests,
  }, null, 2));
} finally {
  socket?.close();
  if (browser && !browser.killed) {
    browser.kill();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (userId) await prisma.project.deleteMany({ where: { ownerId: userId } });
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
  await rm(profile, { recursive: true, force: true }).catch(() => undefined);
}
