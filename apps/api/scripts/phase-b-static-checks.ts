import fs from "node:fs/promises";
import path from "node:path";

import { EslintAdapter } from "../src/modules/analysis/eslint.adapter.js";
import { PythonSyntaxAdapter } from "../src/modules/analysis/python-syntax.adapter.js";
import { SecurityScanAdapter } from "../src/modules/analysis/security-scan.adapter.js";
import { TypeScriptAdapter } from "../src/modules/analysis/typescript.adapter.js";
import type { ToolAdapterResult } from "../src/modules/analysis/tool-adapter.types.js";

const workspace = process.argv[2];
if (!workspace) throw new Error("Usage: tsx scripts/phase-b-static-checks.ts <repository-workspace>");
const requestedChecks = process.argv[3]?.split(",").filter(Boolean);

const adapters = [new TypeScriptAdapter(), new PythonSyntaxAdapter(), new EslintAdapter(), new SecurityScanAdapter()];
const results: ToolAdapterResult[] = [];
for (const adapter of adapters.filter((item) => !requestedChecks || requestedChecks.includes(item.name))) {
  results.push(await adapter.run(path.resolve(workspace)));
}

const report = {
  workspace: path.resolve(workspace),
  generatedAt: new Date().toISOString(),
  checks: results.map((result) => ({
    checkType: result.tool,
    status: result.checkStatus ?? result.status.toUpperCase(),
    projectsScanned: result.projectsScanned ?? null,
    skippedReason: result.skippedReason ?? null,
    failureReason: result.failureReason ?? null,
    findings: result.evidence.filter((finding) => finding.filePath).map((finding) => ({
      tool: finding.tool,
      file: finding.filePath,
      line: finding.lineStart ?? null,
      column: finding.columnStart ?? null,
      rule: finding.code ?? null,
      severity: finding.severity ?? "info",
      message: finding.message,
    })),
  })),
};
const output = `${JSON.stringify(report, null, 2)}\n`;
const resultDirectory = path.resolve("results/phase-b-static-checks");
await fs.mkdir(resultDirectory, { recursive: true });
await fs.writeFile(path.join(resultDirectory, requestedChecks ? `${requestedChecks.join("-")}.json` : "latest.json"), output, "utf8");
process.stdout.write(output);
