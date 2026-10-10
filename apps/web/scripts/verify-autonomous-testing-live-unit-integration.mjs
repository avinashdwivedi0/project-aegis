import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../api/package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));
const evidenceDirectory = path.resolve(here, "../../api/results/phase4-ui");
const browserPath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browserPort = 9236;
const webBase = process.env.WEB_BASE_URL ?? "http://127.0.0.1:5190";
const workspacePath = process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86";
const profileDirectory = path.join(process.env.TEMP ?? "C:/Temp", `aegis-live-suites-${randomUUID()}`);
const email = `live-suite-ui-${randomUUID()}@example.test`;
const password = `Aegis-${randomUUID()}!`;
let browser;
let socket;
let userId;
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
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "Browser evaluation failed");
  return result.result?.value;
}

async function waitFor(check, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for a live generated suite in the UI.");
}

async function post(route, body, token) {
  const response = await fetch(`http://localhost:3000/api${route}`, {
    method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${route} returned ${response.status}: ${JSON.stringify(data)}`);
  return data.data;
}

async function screenshot(name) {
  const captured = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true });
  const screenshotPath = path.join(evidenceDirectory, name);
  await writeFile(screenshotPath, Buffer.from(captured.data, "base64"));
  return screenshotPath;
}

async function scrollToHeading(text) {
  const scrolled = await evaluate(`(() => { const heading = [...document.querySelectorAll('h2')].find((item) => item.innerText.includes(${JSON.stringify(text)})); if (!heading) return false; heading.scrollIntoView({ block: 'center' }); return true; })()`);
  if (!scrolled) throw new Error(`Could not scroll to result heading: ${text}`);
  await new Promise((resolve) => setTimeout(resolve, 300));
}

try {
  await mkdir(evidenceDirectory, { recursive: true });
  const registration = await post("/auth/register", { name: "Live Unit Integration UI Verification", email, password });
  userId = registration.user.id;
  const token = registration.token;
  const project = await post("/projects", { name: `Live suite UI ${randomUUID().slice(0, 8)}` }, token);
  const repository = await post(`/projects/${project.id}/repositories`, { name: "MONGO_UR source", provider: "LOCAL", workspacePath }, token);

  browser = spawn(browserPath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-allow-origins=*", `--remote-debugging-port=${browserPort}`, `--user-data-dir=${profileDirectory}`, "about:blank"], { stdio: "ignore", windowsHide: true });
  const target = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${browserPort}/json/list`).catch(() => null);
    if (!response?.ok) return null;
    return (await response.json()).find((item) => item.type === "page" && item.webSocketDebuggerUrl);
  }, 20_000);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const commandResult = pending.get(message.id);
    if (!commandResult) return;
    pending.delete(message.id);
    if (message.error) commandResult.reject(new Error(message.error.message));
    else commandResult.resolve(message.result ?? {});
  });
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1600, height: 2000, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: `${webBase}/` });
  await waitFor(async () => (await evaluate("document.readyState")) === "complete", 20_000);
  await evaluate(`localStorage.setItem("token", ${JSON.stringify(token)}); localStorage.setItem("selectedProjectId", ${JSON.stringify(project.id)}); localStorage.setItem("selectedRepositoryId", ${JSON.stringify(repository.id)}); true`);
  await command("Page.navigate", { url: `${webBase}/autonomous-testing` });
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("Generate and run unit checks"));
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes(repository.name));

  const select = async (option) => evaluate(`(() => { const item = [...document.querySelectorAll('select')].find((element) => [...element.options].some((candidate) => candidate.value === ${JSON.stringify(option)})); if (!item) return false; const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(item, ${JSON.stringify(option)}); item.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  if (!await select("exported-components")) throw new Error("Unit recipe selector was not found.");
  const unitClick = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Generate and run unit checks')); if (!button || button.disabled) return false; button.click(); return true; })()`);
  if (!unitClick) throw new Error("Unit run button was disabled or missing.");
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("unit · exported-components"));
  const unitBody = await evaluate("document.body.innerText");
  if (!unitBody.includes("3 passed, 0 failed, 0 skipped (3 total)")) throw new Error(`Unit UI showed unexpected result: ${unitBody.slice(-1400)}`);
  await scrollToHeading("unit · exported-components");
  const unitScreenshot = await screenshot("autonomous-testing-live-unit.png");

  if (!await select("dashboard-data")) throw new Error("Integration boundary selector was not found.");
  await evaluate(`(() => { const input = [...document.querySelectorAll('input[type="url"]')].find((item) => item.placeholder.includes('3120')); if (!input) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, 'http://host.docker.internal:3120'); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const integrationClick = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Generate and run integration checks')); if (!button || button.disabled) return false; button.click(); return true; })()`);
  if (!integrationClick) throw new Error("Integration run button was disabled or missing.");
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("integration · dashboard-data"));
  const integrationBody = await evaluate("document.body.innerText");
  if (!integrationBody.includes("4 passed, 0 failed, 0 skipped (4 total)") || !integrationBody.includes("5/8")) throw new Error(`Integration UI showed unexpected result: ${integrationBody.slice(-1500)}`);
  await scrollToHeading("integration · dashboard-data");
  const integrationScreenshot = await screenshot("autonomous-testing-live-integration.png");

  const securityClick = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Run secret scan')); if (!button || button.disabled) return false; button.click(); return true; })()`);
  if (!securityClick) throw new Error("Secret scan button was disabled or missing.");
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("passed: 0 findings across"));
  const securityBody = await evaluate("document.body.innerText");
  const securitySummary = securityBody.match(/passed: 0 findings across \d+ files/)?.[0];
  await scrollToHeading("Repository secret scan");
  const securityScreenshot = await screenshot("autonomous-testing-live-security.png");

  await evaluate(`(() => { const inputs = [...document.querySelectorAll('input[type="url"]')]; const values = ['http://host.docker.internal:3121', 'http://host.docker.internal:3122']; inputs.slice(0, 2).forEach((input, i) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, values[i]); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }); return true; })()`);
  if (!await select("smoke")) throw new Error("Smoke run-mode selector was not found.");
  const modeClick = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Run selected mode')); if (!button || button.disabled) return false; button.click(); return true; })()`);
  if (!modeClick) throw new Error("Run selected mode button was disabled or missing.");
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("Smoke Run ·"), 240_000);
  const modeBody = await evaluate("document.body.innerText");
  if (!modeBody.includes("5 passed, 0 failed (5 selected)")) throw new Error(`Smoke mode UI showed unexpected result: ${modeBody.slice(-1800)}`);
  await scrollToHeading("Smoke Run ·");
  const modeScreenshot = await screenshot("autonomous-testing-live-smoke.png");

  if (!await select("acceptance")) throw new Error("Acceptance mode selector was not found.");
  const acceptanceClick = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Run selected mode')); if (!button || button.disabled) return false; button.click(); return true; })()`);
  if (!acceptanceClick) throw new Error("Acceptance mode button was disabled or missing.");
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("Open Acceptance requirement workflow"));
  const acceptanceHref = await evaluate(`document.querySelector('a[href="/testing?mode=acceptance"]')?.getAttribute('href') ?? null`);
  if (acceptanceHref !== "/testing?mode=acceptance") throw new Error(`Acceptance mode UI points to an unexpected workflow: ${acceptanceHref}`);
  await scrollToHeading("Acceptance");
  const acceptanceScreenshot = await screenshot("autonomous-testing-live-acceptance.png");

  console.log(JSON.stringify({
    browser: "Microsoft Edge headless via DevTools Protocol",
    page: `${webBase}/autonomous-testing`, project: project.name, repository: repository.name,
    unit: { result: "3 passed, 0 failed", screenshot: path.relative(path.resolve(here, "../.."), unitScreenshot) },
    integration: { boundary: "remaining 5 routes", routeCoverage: "5/8 (3/8 covered by the other two suites)", result: "4 passed, 0 failed", screenshot: path.relative(path.resolve(here, "../.."), integrationScreenshot) },
    security: { result: securitySummary, screenshot: path.relative(path.resolve(here, "../.."), securityScreenshot) },
    smoke: { result: "5 passed, 0 failed; selected fewer tests than System in the real API comparison", screenshot: path.relative(path.resolve(here, "../.."), modeScreenshot) },
    acceptance: { path: acceptanceHref, screenshot: path.relative(path.resolve(here, "../.."), acceptanceScreenshot) },
  }, null, 2));
} finally {
  socket?.close();
  if (browser && !browser.killed) browser.kill();
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
  await rm(profileDirectory, { recursive: true, force: true }).catch(() => undefined);
}
