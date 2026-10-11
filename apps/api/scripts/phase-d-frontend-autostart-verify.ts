import fs from "node:fs/promises";
import path from "node:path";

import { BrowserAccessibilityAdapter } from "../src/modules/analysis/browser-accessibility.adapter.js";
import { PerformanceAdapter } from "../src/modules/analysis/performance.adapter.js";

const workspace = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const accessibilityOnly = process.argv.includes("--accessibility-only");
const performanceOnly = process.argv.includes("--performance-only");
const reportName = accessibilityOnly ? "frontend-accessibility-autostart.json" : performanceOnly ? "frontend-performance-autostart.json" : "frontend-autostart.json";
const reportPath = path.resolve("results/phase-d-api-probe", reportName);
const summarize = (result: Awaited<ReturnType<BrowserAccessibilityAdapter["run"]>>) => ({
  status: result.checkStatus ?? result.status.toUpperCase(),
  command: result.command,
  projectsScanned: result.projectsScanned ?? 0,
  failureReason: result.failureReason ?? null,
  durationMs: result.execution?.durationMs ?? 0,
  output: (result.execution?.stdout ?? "").slice(0, 4000),
  findings: result.evidence.filter((item) => item.filePath && item.lineStart).map((item) => ({ file: item.filePath, line: item.lineStart, rule: item.code, severity: item.severity, message: item.message })),
});

const accessibility = performanceOnly ? undefined : await new BrowserAccessibilityAdapter().run(workspace);
const performance = accessibilityOnly ? undefined : await new PerformanceAdapter().run(workspace);
const report = {
  generatedAt: new Date().toISOString(),
  workspace,
  frontend: {
    accessibility: accessibility ? summarize(accessibility) : null,
    performance: performance ? summarize(performance) : null,
  },
};
await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
