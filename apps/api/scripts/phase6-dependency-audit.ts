import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { DependencyAuditAdapter } from "../src/modules/analysis/dependency-audit.adapter.js";

const workspace = path.resolve(process.argv[2] ?? "../..");
const adapter = new DependencyAuditAdapter();
if (!(await adapter.canRun(workspace))) {
  console.log(JSON.stringify({ workspace, status: "skipped", reason: "No supported root or nested npm/pnpm lockfile was found." }, null, 2));
  process.exit(0);
}

const result = await adapter.run(workspace);
const output = {
  workspace,
  status: result.status,
  executionStatus: result.execution?.status,
  findingCount: result.evidence.length,
  severityCounts: result.evidence.reduce((all, item) => ({ ...all, [item.severity ?? "info"]: (all[item.severity ?? "info"] ?? 0) + 1 }), {} as Record<string, number>),
  findings: result.evidence.map(({ packageName, severity, message, code }) => ({ packageName, severity, message, advisory: code })),
  stderr: result.execution?.stderr,
};
const reportPath = path.resolve("results/phase6-dependency-audit/latest.json");
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(output, null, 2), "utf8");
console.log(JSON.stringify({ ...output, reportPath }, null, 2));
if (result.status !== "completed") process.exitCode = 1;
