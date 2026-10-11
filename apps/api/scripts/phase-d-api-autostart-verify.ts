import fs from "node:fs/promises";
import path from "node:path";

import { ApiProbeAdapter } from "../src/modules/analysis/api-probe.adapter.js";

const workspace = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const result = await new ApiProbeAdapter().run(workspace);
const report = {
  generatedAt: new Date().toISOString(),
  workspace,
  check: {
    status: result.checkStatus ?? result.status.toUpperCase(),
    projectsScanned: result.projectsScanned ?? 0,
    failureReason: result.failureReason ?? null,
    execution: { status: result.execution?.status ?? null, stdout: result.execution?.stdout ?? "", stderr: result.execution?.stderr ?? "", durationMs: result.execution?.durationMs ?? 0 },
    findings: result.evidence.filter((item) => item.filePath && item.lineStart).map((item) => ({ file: item.filePath, line: item.lineStart, rule: item.code, severity: item.severity, message: item.message })),
  },
};
const outputPath = path.resolve("results/phase-d-api-probe/autostart-mongo.json");
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
