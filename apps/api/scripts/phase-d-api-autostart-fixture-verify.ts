import fs from "node:fs/promises";
import path from "node:path";

import { ApiProbeAdapter } from "../src/modules/analysis/api-probe.adapter.js";

const fixtureRoot = path.resolve(".phase-d-api-autostart-fixture");
const backend = path.join(fixtureRoot, "backend");
const reportPath = path.resolve("results/phase-d-api-probe/autostart-fixture.json");

await fs.rm(fixtureRoot, { recursive: true, force: true });
await fs.mkdir(backend, { recursive: true });
try {
  await fs.writeFile(path.join(backend, "package.json"), JSON.stringify({ name: "phase-d-autostart-fixture", main: "index.js" }), "utf8");
  await fs.writeFile(path.join(backend, "index.js"), [
    'const http = require("node:http");',
    'const PORT = process.env.PORT || 43822;',
    'const app = { get: (route, handler) => routes.set(route, handler) };',
    'const routes = new Map();',
    'app.get("/health", (_req, res) => { res.statusCode = 200; res.end("healthy"); });',
    'http.createServer((req, res) => routes.get(req.url)?.(req, res) ?? (res.statusCode = 404, res.end("missing"))).listen(PORT);',
  ].join("\n"), "utf8");
  const result = await new ApiProbeAdapter().run(fixtureRoot);
  const report = {
    generatedAt: new Date().toISOString(),
    status: result.checkStatus ?? result.status.toUpperCase(),
    failureReason: result.failureReason ?? null,
    execution: { stdout: result.execution?.stdout ?? "", stderr: result.execution?.stderr ?? "", durationMs: result.execution?.durationMs ?? 0 },
    findings: result.evidence.filter((evidence) => evidence.filePath && evidence.lineStart).map((evidence) => ({ file: evidence.filePath, line: evidence.lineStart, rule: evidence.code, message: evidence.message })),
  };
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
}
