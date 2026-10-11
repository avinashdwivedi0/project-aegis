import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

import { DependencyAuditAdapter } from "../src/modules/analysis/dependency-audit.adapter.js";
import { TestRunnerAdapter } from "../src/modules/analysis/test-runner.adapter.js";

const workspace = path.join(os.tmpdir(), `aegis-phase-c-${crypto.randomUUID()}`);
await fs.mkdir(path.join(workspace, "vulnerable"), { recursive: true });
await fs.mkdir(path.join(workspace, "tested"), { recursive: true });
await fs.writeFile(path.join(workspace, "vulnerable", "package.json"), JSON.stringify({ name: "phase-c-vulnerable-fixture", version: "1.0.0", dependencies: { lodash: "4.17.20" } }, null, 2));
await fs.writeFile(path.join(workspace, "vulnerable", "package-lock.json"), JSON.stringify({
  name: "phase-c-vulnerable-fixture", version: "1.0.0", lockfileVersion: 3,
  packages: {
    "": { name: "phase-c-vulnerable-fixture", version: "1.0.0", dependencies: { lodash: "4.17.20" } },
    "node_modules/lodash": { version: "4.17.20", resolved: "https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz" },
  },
}, null, 2));
await fs.writeFile(path.join(workspace, "tested", "package.json"), JSON.stringify({ name: "phase-c-test-fixture", version: "1.0.0", scripts: { test: "node --test" } }, null, 2));
await fs.writeFile(path.join(workspace, "tested", "package-lock.json"), JSON.stringify({ name: "phase-c-test-fixture", version: "1.0.0", lockfileVersion: 3, packages: { "": { name: "phase-c-test-fixture", version: "1.0.0" } } }, null, 2));
await fs.writeFile(path.join(workspace, "tested", "smoke.test.js"), 'const test = require("node:test"); const assert = require("node:assert/strict"); test("fixture arithmetic", () => assert.equal(2 + 2, 4));\n');

try {
  const results = [
    await new DependencyAuditAdapter().run(workspace),
    await new TestRunnerAdapter().run(workspace),
  ];
  const report = {
    generatedAt: new Date().toISOString(),
    workspace,
    checks: results.map((result) => ({
      checkType: result.tool,
      status: result.checkStatus ?? (result.status === "failed" ? "FAILED" : result.status === "skipped" ? "SKIPPED" : result.evidence.some((item) => item.status === "failed") ? "FINDINGS" : "PASSED"),
      projectsScanned: result.projectsScanned ?? 0,
      skippedReason: result.skippedReason ?? null,
      failureReason: result.failureReason ?? null,
      output: result.execution?.stdout ?? "",
      error: result.execution?.stderr ?? "",
      findings: result.evidence.filter((item) => item.status === "failed").map((item) => ({
        file: item.filePath ?? null,
        line: item.lineStart ?? null,
        package: item.packageName ?? null,
        rule: item.code ?? null,
        severity: item.severity ?? "info",
        message: item.message,
      })),
    })),
  };
  const outputPath = path.resolve("results/phase-c-checks/latest.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await fs.rm(workspace, { recursive: true, force: true });
}
