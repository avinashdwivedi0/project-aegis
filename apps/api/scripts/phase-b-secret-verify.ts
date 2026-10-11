import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

import { SecurityScanAdapter } from "../src/modules/analysis/security-scan.adapter.js";

const workspace = path.join(os.tmpdir(), `aegis-phase-b-secret-${crypto.randomUUID()}`);
await fs.mkdir(workspace, { recursive: true });
await fs.writeFile(path.join(workspace, "service.js"), 'const apiSecret = "phaseBProbe_39ea1c7b2d4f0123";\nmodule.exports = apiSecret.length > 0;\n');
try {
  const result = await new SecurityScanAdapter().run(workspace);
  const report = {
    generatedAt: new Date().toISOString(),
    injected: { file: "service.js", line: 1, kind: "fake hardcoded secret" },
    check: {
      status: result.checkStatus ?? result.status.toUpperCase(),
      projectsScanned: result.projectsScanned ?? 0,
      failureReason: result.failureReason ?? null,
      findings: result.evidence.filter((item) => item.filePath && item.lineStart).map((item) => ({ file: item.filePath, line: item.lineStart, rule: item.code, severity: item.severity, message: item.message })),
    },
  };
  const outputPath = path.resolve("results/phase-b-static-checks/secret-injection.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await fs.rm(workspace, { recursive: true, force: true });
}
