import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { playwrightTestRunnerService } from "../src/modules/ai/test-runner/test-runner.service.js";

const runId = "phase-e-selected-check-results";
const baseUrl = process.env.PHASE_E_WEB_URL ?? "http://host.docker.internal:5190";
const webDist = path.resolve("../web/dist");
const staticServer = `const http=require('node:http'),fs=require('node:fs'),path=require('node:path');const root=process.env.PHASE_E_WEB_DIST;const types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname));if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(root,'index.html');res.setHeader('Content-Type',types[path.extname(f)]||'text/html');fs.createReadStream(f).pipe(res)}).listen(5190,'0.0.0.0')`;
const source = `import { test, expect } from "@playwright/test";
test("selected check cards reflect saved outcomes", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("token", "phase-e-fixture-token"));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let data;
    if (path === "/api/analyses") data = [{ id: "phase-e-ui", ref: "HEAD", status: "COMPLETED", progress: 100, createdAt: new Date().toISOString(), completedAt: new Date().toISOString(), repository: { name: "Phase E fixture" } }];
    else if (path.endsWith("/events")) data = [];
    else if (path.endsWith("/summary")) data = { runId: "phase-e-ui", tools: {
      typescript: { status: "PASSED", evidence: 1, findings: 0, projectsScanned: 2, reason: null, output: "tsc --noEmit passed" },
      eslint: { status: "FINDINGS", evidence: 1, findings: 1, projectsScanned: 3, reason: null, output: "" },
      "security-scan": { status: "FAILED", evidence: 0, findings: 0, projectsScanned: 2, reason: "Semgrep timed out in the dashboard project.", output: "" },
      "api-probe": { status: "SKIPPED", evidence: 0, findings: 0, projectsScanned: 0, reason: "No API endpoints were discovered.", output: "" },
      "test-runner": { status: "SKIPPED", evidence: 0, findings: 0, projectsScanned: 1, reason: "No test script was found in the discovered project.", output: "" }
    }, totals: { executions: 5, evidence: 2, findings: 1, skipped: 2, failed: 1 }, bySeverity: { moderate: 1 } };
    else if (path.endsWith("/gate")) data = { allowed: false, reason: "1 high or critical finding blocks the merge gate.", findings: 1 };
    else if (path.endsWith("/score")) data = { runId: "phase-e-ui", score: 91, scoringVersion: "1", findingCount: 1 };
    else if (path.endsWith("/findings")) data = [{ id: "fixture-eslint", source: "eslint", status: "failed", severity: "moderate", message: "'probeUnused' is assigned a value but never used.", filePath: "src/probe.js", lineStart: 7, code: "no-unused-vars" }];
    else if (path === "/api/analyses/phase-e-ui") data = { id: "phase-e-ui", status: "COMPLETED", progress: 100, currentStage: null, error: null };
    else data = { data: [] };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) });
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(${JSON.stringify(baseUrl)}, { waitUntil: "networkidle" });
  await page.evaluate(() => { history.pushState({}, "", "/analysis?runId=phase-e-ui"); window.dispatchEvent(new PopStateEvent("popstate")); });
  await expect(page.getByText("Selected check results")).toBeVisible();
  for (const details of await page.locator("details").all()) await details.locator("summary").click().catch(() => undefined);
  await expect(page.getByText("Projects scanned: 3")).toBeVisible();
  await expect(page.getByRole("link", { name: "Autonomous Testing page" })).toBeVisible();
  await page.screenshot({ path: "/artifacts/selected-check-results.png", fullPage: true });
});`;

const server = spawn(process.execPath, ["-e", staticServer], { cwd: process.cwd(), env: { ...process.env, PHASE_E_WEB_DIST: webDist }, stdio: "ignore", windowsHide: true });
try {
  const readyDeadline = Date.now() + 20_000;
  let ready = false;
  while (!ready && Date.now() < readyDeadline) {
    try { ready = (await fetch("http://127.0.0.1:5190")).ok; } catch { await new Promise((resolve) => setTimeout(resolve, 500)); }
  }
  if (!ready) throw new Error("The disposable static production server did not become ready.");
  const result = await playwrightTestRunnerService.run({
    runId,
    workspace: path.resolve("."),
    files: [{ path: "tests/selected-check-results.spec.ts", language: "typescript", testCaseId: "REQ-TC-990", content: source }],
    parallelism: 1,
    timeoutMs: 60_000,
  });
  const screenshotPath = path.join(result.resultsDirectory, "artifacts", "selected-check-results.png");
  await fs.access(screenshotPath);
  const outputPath = path.resolve("results/phase-e/selected-check-results.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify({ runId, baseUrl, screenshotPath, result }, null, 2)}\n`, "utf8");
  process.stdout.write(JSON.stringify({ runId, status: result.status, passed: result.passed, failed: result.failed, screenshotPath, outputPath }, null, 2) + "\n");
} finally {
  server.kill();
}
