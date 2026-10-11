import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

import { ApiProbeAdapter } from "../src/modules/analysis/api-probe.adapter.js";
import { PerformanceAdapter } from "../src/modules/analysis/performance.adapter.js";
import { BrowserAccessibilityAdapter } from "../src/modules/analysis/browser-accessibility.adapter.js";

const workspace = path.join(os.tmpdir(), `aegis-phase-d-api-${crypto.randomUUID()}`);
const container = `aegis-phase-d-api-${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
const port = 38761;
await fs.mkdir(path.join(workspace, "backend"), { recursive: true });
await fs.mkdir(path.join(workspace, "frontend", "src"), { recursive: true });
await fs.writeFile(path.join(workspace, "backend", "index.js"), 'const app = require("express")();\napp.get("/broken", (_req, res) => res.status(500).json({ error: "injected endpoint regression" }));\nconst routes = [{ path: "/slow" }];\n');
await fs.writeFile(path.join(workspace, "frontend", "index.html"), '<!doctype html><html lang="en"><head><title>Probe</title></head><body><main><img src="photo.png"></main></body></html>');
await fs.writeFile(path.join(workspace, "frontend", "src", "Routes.jsx"), 'export const routes = [{ path: "/" }, { path: "/slow" }];\n');

try {
  execFileSync("docker", ["run", "--detach", "--rm", "--name", container, "--publish", `${port}:${port}`, "node:22-alpine", "node", "-e", `require('node:http').createServer((req,res)=>setTimeout(()=>{res.statusCode=req.url==='/broken'?500:200;if(req.url==='/'||req.url==='/slow'){res.setHeader('content-type','text/html');res.end('<html lang="en"><head><title>Probe</title></head><body><main><img src="photo.png"></main></body></html>');return}res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:res.statusCode<500}))},80)).listen(${port},'0.0.0.0')`], { stdio: "pipe" });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const previous = process.env.AEGIS_API_PROBE_URL;
  process.env.AEGIS_API_PROBE_URL = `http://host.docker.internal:${port}`;
  let result;
  let performanceResult;
  try { result = await new ApiProbeAdapter().run(workspace); }
  finally { if (previous === undefined) delete process.env.AEGIS_API_PROBE_URL; else process.env.AEGIS_API_PROBE_URL = previous; }
  const previousPerformanceUrl = process.env.AEGIS_PERFORMANCE_URL;
  const previousPerformanceThreshold = process.env.AEGIS_PERFORMANCE_P95_LIMIT_MS;
  process.env.AEGIS_PERFORMANCE_URL = `http://host.docker.internal:${port}`;
  process.env.AEGIS_PERFORMANCE_P95_LIMIT_MS = "10";
  try { performanceResult = await new PerformanceAdapter().run(workspace); }
  finally {
    if (previousPerformanceUrl === undefined) delete process.env.AEGIS_PERFORMANCE_URL; else process.env.AEGIS_PERFORMANCE_URL = previousPerformanceUrl;
    if (previousPerformanceThreshold === undefined) delete process.env.AEGIS_PERFORMANCE_P95_LIMIT_MS; else process.env.AEGIS_PERFORMANCE_P95_LIMIT_MS = previousPerformanceThreshold;
  }
  const previousAccessibilityUrl = process.env.AEGIS_ACCESSIBILITY_URL;
  process.env.AEGIS_ACCESSIBILITY_URL = `http://host.docker.internal:${port}`;
  let accessibilityResult;
  try { accessibilityResult = await new BrowserAccessibilityAdapter().run(workspace); }
  finally { if (previousAccessibilityUrl === undefined) delete process.env.AEGIS_ACCESSIBILITY_URL; else process.env.AEGIS_ACCESSIBILITY_URL = previousAccessibilityUrl; }
  const report = {
    generatedAt: new Date().toISOString(),
    injected: { endpoint: "GET /broken", expectedStatus: 500 },
    check: {
      status: result.checkStatus ?? result.status.toUpperCase(),
      projectsScanned: result.projectsScanned ?? 0,
      failureReason: result.failureReason ?? null,
      findings: result.evidence.filter((item) => item.filePath && item.lineStart).map((item) => ({ file: item.filePath, line: item.lineStart, rule: item.code, severity: item.severity, message: item.message })),
      output: result.execution?.stdout ?? "",
    },
    performance: {
      status: performanceResult.checkStatus ?? performanceResult.status.toUpperCase(),
      failureReason: performanceResult.failureReason ?? null,
      output: performanceResult.execution?.stdout ?? "",
      findings: performanceResult.evidence.filter((item) => item.filePath && item.lineStart).map((item) => ({ file: item.filePath, line: item.lineStart, rule: item.code, severity: item.severity, message: item.message })),
    },
    accessibility: {
      status: accessibilityResult.checkStatus ?? accessibilityResult.status.toUpperCase(),
      failureReason: accessibilityResult.failureReason ?? null,
      findings: accessibilityResult.evidence.filter((item) => item.filePath && item.lineStart).map((item) => ({ file: item.filePath, line: item.lineStart, rule: item.code, severity: item.severity, message: item.message })),
      testOutput: `${accessibilityResult.evidence.length} line-specific axe violation(s) from the generated Playwright run.`,
    },
  };
  const outputPath = path.resolve("results/phase-d-api-probe/latest.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  try { execFileSync("docker", ["rm", "--force", container], { stdio: "ignore" }); } catch { /* Container may not have started. */ }
  await fs.rm(workspace, { recursive: true, force: true });
}
