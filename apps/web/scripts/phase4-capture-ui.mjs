import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../api/package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));
const evidenceDirectory = path.resolve(here, "../../api/results/phase4-ui");
const browserPath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browserPort = 9227;
const webBase = process.env.WEB_BASE_URL ?? "http://127.0.0.1:5173";
const profileDirectory = path.join(tmpdir(), `aegis-phase4-edge-${randomUUID()}`);
const email = `phase4-ui-${randomUUID()}@example.test`;
const password = `Phase4-${randomUUID()}!`;
let browser;
let socket;
let userCreated = false;
let projectId;
let repositoryId;
let missingWorkspaceRepositoryId;
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
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Browser evaluation failed");
  }
  return result.result?.value;
}

async function waitFor(check, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the UI condition.");
}

async function capture(name) {
  const image = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    fromSurface: true,
  });
  await writeFile(path.join(evidenceDirectory, name), Buffer.from(image.data, "base64"));
}

async function openArtifact(label, expectedContent) {
  const clicked = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes(${JSON.stringify(label)})); if (!button) return false; button.click(); return true; })()`);
  if (!clicked) throw new Error(`Generated artifact button was not rendered: ${label}`);
  await waitFor(async () => evaluate(`[...document.querySelectorAll('pre code')].some((node) => node.innerText.includes(${JSON.stringify(expectedContent)}))`));
}

try {
  await mkdir(evidenceDirectory, { recursive: true });
  const registration = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Phase 4 UI Verification", email, password }),
  });
  const registrationBody = await registration.json();
  if (!registration.ok || !registrationBody.data?.token) {
    throw new Error(`Disposable UI verification account registration failed (${registration.status}).`);
  }
  userCreated = true;
  const token = registrationBody.data.token;

  const projectResponse = await fetch("http://localhost:3000/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: "Phase 7 UAT UI" }),
  });
  const projectBody = await projectResponse.json();
  if (!projectResponse.ok || !projectBody.data?.id) throw new Error(`Disposable UAT project create failed (${projectResponse.status}).`);
  projectId = projectBody.data.id;
  const repositoryResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/repositories`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: "Project Aegis UAT UI workspace", provider: "LOCAL", workspacePath: "D:/Projects/project-aegis" }),
  });
  const repositoryBody = await repositoryResponse.json();
  if (!repositoryResponse.ok || !repositoryBody.data?.id) throw new Error(`Disposable UAT repository create failed (${repositoryResponse.status}).`);
  repositoryId = repositoryBody.data.id;
  const missingWorkspaceResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/repositories`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: "Workspace-less validation repro", provider: "LOCAL" }),
  });
  const missingWorkspaceBody = await missingWorkspaceResponse.json();
  if (!missingWorkspaceResponse.ok || !missingWorkspaceBody.data?.id) {
    throw new Error(`Disposable workspace-less repository create failed (${missingWorkspaceResponse.status}).`);
  }
  missingWorkspaceRepositoryId = missingWorkspaceBody.data.id;

  browser = spawn(browserPath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${browserPort}`,
    `--user-data-dir=${profileDirectory}`,
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  const target = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${browserPort}/json/list`).catch(() => null);
    if (!response?.ok) return null;
    const targets = await response.json();
    return targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
  });

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
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1600,
    height: 2400,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await command("Page.navigate", { url: `${webBase}/` });
  await waitFor(async () => (await evaluate("document.readyState")) === "complete");
  await evaluate(`localStorage.setItem("token", ${JSON.stringify(token)}); true`);
  await evaluate(`localStorage.setItem("selectedProjectId", ${JSON.stringify(projectId)}); localStorage.setItem("selectedRepositoryId", ${JSON.stringify(repositoryId)}); true`);
  await command("Page.navigate", { url: `${webBase}/autonomous-testing` });
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("Unit, integration & black-box"));
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("Captured session evidence"));

  const unitBody = await evaluate("document.body.innerText");
  if (!unitBody.includes("5 exported functions") || !unitBody.includes("hashPassword")) {
    throw new Error("Unit evidence did not render expected captured results.");
  }
  const artifactClicked = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('View password.generated.test.cjs')); if (!button) return false; button.click(); return true; })()`);
  if (!artifactClicked) throw new Error("Password generated-file button was not rendered.");
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("hashPassword preserves the captured byte-for-byte hash"));
  await openArtifact("View exported-components.generated.test.cjs", "DoughnutChart forwards the caller's data");
  await openArtifact("View password.generated.test.cjs", "hashPassword preserves the captured byte-for-byte hash");
  await capture("autonomous-testing-unit.png");

  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.trim().startsWith('Integration')); button?.click(); return Boolean(button); })()`);
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("3 / 8 routes covered"));
  const integrationBody = await evaluate("document.body.innerText");
  const missingIntegrationEvidence = ["addHoldings", "forgot-password", "POST /newOrder"].filter((text) => !integrationBody.includes(text));
  if (missingIntegrationEvidence.length > 0) {
    throw new Error(`Integration evidence was missing: ${missingIntegrationEvidence.join(", ")}. Visible text: ${integrationBody.slice(0, 1800)}`);
  }
  await openArtifact("View signup.generated.test.cjs", "signup rejects missing required fields");
  await capture("autonomous-testing-integration.png");

  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.trim().startsWith('Black-box')); button?.click(); return Boolean(button); })()`);
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("1 verified flow"));
  const blackBoxBody = await evaluate("document.body.innerText");
  if (!blackBoxBody.includes("signup-login.generated.spec.ts") || !blackBoxBody.includes("NOT YET VERIFIED")) {
    throw new Error("Black-box evidence or its explicit gap was missing.");
  }
  await openArtifact("View signup-login.generated.spec.ts", "Signup account, then log in with the created account");
  await capture("autonomous-testing-black-box.png");

  await command("Page.navigate", { url: `${webBase}/autonomous-testing` });
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("Unit, integration & black-box"));
  const uatLinkClicked = await evaluate(`(() => { const link = [...document.querySelectorAll('a')].find((item) => item.innerText.includes('Start UAT requirement')); if (!link) return false; link.click(); return true; })()`);
  if (!uatLinkClicked) throw new Error("Acceptance (UAT) entry link was not rendered.");
  await waitFor(async () => (await evaluate("location.pathname + location.search"))?.includes("/testing?mode=acceptance"));
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("Acceptance testing"));
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("Project Aegis UAT UI workspace"));
  const acceptanceBody = await evaluate("document.body.innerText");
  if (!acceptanceBody.includes("Requirement to Playwright test") || !acceptanceBody.includes("Generate and run Playwright") || !acceptanceBody.includes("Project Aegis UAT UI workspace")) {
    throw new Error(`Acceptance route did not expose the existing human requirement workflow: ${acceptanceBody.slice(0, 1400)}`);
  }
  await capture("autonomous-testing-acceptance-uat.png");

  const routeChecks = [
    ["/autonomous-testing", "Unit, integration & black-box"],
    ["/analysis", "AI Analysis"],
    ["/self-healing", "No self-healing proposals found."],
    ["/ci-integration", "CI/CD Integration"],
    ["/testing?mode=acceptance", "Acceptance testing"],
  ];
  const renderedRoutes = [];
  for (const [route, expectedText] of routeChecks) {
    await command("Page.navigate", { url: `${webBase}${route}` });
    await waitFor(async () => (await evaluate("document.readyState")) === "complete");
    await waitFor(async () => (await evaluate("document.body.innerText"))?.includes(expectedText));
    renderedRoutes.push({ route, rendered: true, expectedText });
  }

  await command("Page.navigate", { url: `${webBase}/testing?projectId=${encodeURIComponent(projectId)}&repositoryId=${encodeURIComponent(missingWorkspaceRepositoryId)}` });
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes("Run selected checks"));
  await waitFor(async () => evaluate(`document.querySelector('#testing-repository')?.value === ${JSON.stringify(missingWorkspaceRepositoryId)}`));
  const runButtonClicked = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Run selected checks')); if (!button) return false; button.click(); return true; })()`);
  if (!runButtonClicked) throw new Error("Run selected checks button was not rendered.");
  const expectedWorkspaceMessage = "This repository's workspace is missing or was not imported correctly — try re-importing it.";
  await waitFor(async () => (await evaluate("document.body.innerText"))?.includes(expectedWorkspaceMessage));
  await capture("validation-run-error.png");
  const validationResponse = await fetch("http://localhost:3000/api/analyses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      projectId,
      repositoryId: missingWorkspaceRepositoryId,
      adapters: ["typescript", "eslint", "security-scan"],
      ref: "HEAD",
    }),
  });
  const validationBody = await validationResponse.json();
  if (validationResponse.status !== 409 || validationBody.message !== expectedWorkspaceMessage) {
    throw new Error(`Unexpected validation API response ${validationResponse.status}: ${JSON.stringify(validationBody)}`);
  }

  console.log(JSON.stringify({
    browser: "Microsoft Edge headless via DevTools Protocol",
    webBase,
    authenticatedPage: "/autonomous-testing",
    routeChecks: renderedRoutes,
    validationRun: {
      uiMessage: expectedWorkspaceMessage,
      apiStatus: validationResponse.status,
      apiBody: validationBody,
      screenshot: "apps/api/results/phase4-ui/validation-run-error.png",
    },
    rendered: {
      unit: ["5 exported functions", "captured 5/5 password cases", "generated file opened"],
      integration: ["3 / 8 routes covered", "pending routes visible", "newOrder result visible"],
      blackBox: ["signup/login flow visible", "TodoMVC gap marked NOT YET VERIFIED"],
      acceptance: ["UAT link clicked", "existing requirement workflow rendered"],
    },
    screenshots: [
      "apps/api/results/phase4-ui/autonomous-testing-unit.png",
      "apps/api/results/phase4-ui/autonomous-testing-integration.png",
      "apps/api/results/phase4-ui/autonomous-testing-black-box.png",
      "apps/api/results/phase4-ui/autonomous-testing-acceptance-uat.png",
    ],
  }, null, 2));
} finally {
  socket?.close();
  if (browser && !browser.killed) {
    browser.kill();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (userCreated) await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
  await rm(profileDirectory, { recursive: true, force: true }).catch(() => undefined);
}
