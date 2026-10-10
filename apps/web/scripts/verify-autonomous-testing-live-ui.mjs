import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../api/package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));
const evidenceDirectory = path.resolve(here, "../../api/results/phase4-ui");
const browserPath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browserPort = 9235;
const webBase = process.env.WEB_BASE_URL ?? "http://127.0.0.1:5190";
const workspacePath = process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86";
const profileDirectory = path.join(process.env.TEMP ?? "C:/Temp", `aegis-live-autonomous-${randomUUID()}`);
const email = `live-autonomous-${randomUUID()}@example.test`;
const password = `Aegis-${randomUUID()}!`;
let browser;
let socket;
let userId;
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

async function waitFor(check, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the live autonomous-testing UI.");
}

try {
  await mkdir(evidenceDirectory, { recursive: true });
  const registrationResponse = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Live Autonomous UI Verification", email, password }),
  });
  const registration = await registrationResponse.json();
  if (!registrationResponse.ok) throw new Error(`Registration failed (${registrationResponse.status}).`);
  userId = registration.data.user.id;
  const token = registration.data.token;

  const projectResponse = await fetch("http://localhost:3000/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: `Live autonomous ${randomUUID().slice(0, 8)}` }),
  });
  const project = await projectResponse.json();
  if (!projectResponse.ok) throw new Error(`Project creation failed (${projectResponse.status}).`);

  const repositoryResponse = await fetch(`http://localhost:3000/api/projects/${project.data.id}/repositories`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: "Live signup/login source", provider: "LOCAL", workspacePath }),
  });
  const repository = await repositoryResponse.json();
  if (!repositoryResponse.ok) throw new Error(`Repository creation failed (${repositoryResponse.status}).`);

  browser = spawn(browserPath, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--remote-allow-origins=*", `--remote-debugging-port=${browserPort}`,
    `--user-data-dir=${profileDirectory}`, "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  const target = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${browserPort}/json/list`).catch(() => null);
    if (!response?.ok) return null;
    return (await response.json()).find((item) => item.type === "page" && item.webSocketDebuggerUrl);
  }, 20_000);
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
  await command("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1800, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: `${webBase}/` });
  await waitFor(async () => (await evaluate("document.readyState")) === "complete", 20_000);
  await evaluate(`localStorage.setItem("token", ${JSON.stringify(token)}); localStorage.setItem("selectedProjectId", ${JSON.stringify(project.data.id)}); localStorage.setItem("selectedRepositoryId", ${JSON.stringify(repository.data.id)}); true`);
  await command("Page.navigate", { url: `${webBase}/autonomous-testing` });
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("Live repository tests"), 20_000);
  await waitFor(async () => evaluate(`document.querySelector('select:nth-of-type(1)') !== null && document.body.innerText.includes(${JSON.stringify(repository.data.name)})`), 20_000);

  const inputValues = ["http://host.docker.internal:3121", "http://host.docker.internal:3122"];
  await evaluate(`(() => { const inputs = [...document.querySelectorAll('input[type="url"]')]; const values = ${JSON.stringify(inputValues)}; if (inputs.length !== 2) return false; inputs.forEach((input, i) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, values[i]); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }); return true; })()`);
  const clicked = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Infer and run black-box flow')); if (!button || button.disabled) return false; button.click(); return true; })()`);
  if (!clicked) throw new Error("Live black-box run button was unavailable or disabled.");

  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("Signup account, then log in with the created account"));
  const body = await evaluate("document.body.innerText");
  const runId = body.match(/run (autonomous-blackbox-[a-f0-9-]+)/)?.[1];
  if (!runId || !body.includes("passed: 1 passed, 0 failed")) {
    throw new Error(`Live UI did not show a passing execution result: ${body.slice(-1600)}`);
  }
  const generatedFileOpened = await evaluate(`(() => { const summary = [...document.querySelectorAll('summary')].find((item) => item.innerText.includes('View generated Playwright file')); if (!summary) return false; summary.click(); return true; })()`);
  if (!generatedFileOpened) throw new Error("Generated Playwright file disclosure was missing.");
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("getByRole('button', { name: \"Create account\""));
  const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true });
  const screenshotPath = path.join(evidenceDirectory, "autonomous-testing-live-blackbox.png");
  const { writeFile } = await import("node:fs/promises");
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  console.log(JSON.stringify({
    browser: "Microsoft Edge headless via DevTools Protocol",
    page: `${webBase}/autonomous-testing`,
    project: project.data.name,
    repository: repository.data.name,
    discoveredFlow: "Signup account, then log in with the created account",
    runId,
    uiSummary: body.match(/passed: 1 passed, 0 failed/)?.[0],
    generatedFile: "tests/signup-login.inferred.spec.ts",
    screenshot: "apps/api/results/phase4-ui/autonomous-testing-live-blackbox.png",
  }, null, 2));
} finally {
  socket?.close();
  if (browser && !browser.killed) browser.kill();
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
  await rm(profileDirectory, { recursive: true, force: true }).catch(() => undefined);
}
