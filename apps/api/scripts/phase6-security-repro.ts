import fs from "node:fs/promises";
import path from "node:path";

import { SecurityScanAdapter } from "../src/modules/analysis/security-scan.adapter.js";

const workspace = path.resolve("results/phase6-security-repro/monorepo");
const packageDirectory = path.join(workspace, "packages", "api");
const sourceDirectory = path.join(packageDirectory, "src");
const configPath = path.join(packageDirectory, ".semgrep.yml");
const sourcePath = path.join(sourceDirectory, "credentials.js");
const safeSource = 'export const credentialStatus = "unset";\n';
const injectedSource = 'export const api_key = "sk_test_NOT_A_REAL_SECRET_123456789";\n';

await fs.mkdir(sourceDirectory, { recursive: true });
await fs.writeFile(configPath, `rules:
  - id: hardcoded-api-secret
    languages: [javascript]
    message: Hardcoded API secret detected
    severity: ERROR
    pattern-regex: (?i)(api[_-]?key|secret|password)\\s*=\\s*["'][A-Za-z0-9_-]{16,}["']
`, "utf8");
await fs.writeFile(sourcePath, safeSource, "utf8");

const adapter = new SecurityScanAdapter();
if (!(await adapter.canRun(workspace))) {
  throw new Error("SecurityScanAdapter did not discover the nested Semgrep config.");
}

const baseline = await adapter.run(workspace);
console.log(JSON.stringify({ baselineStatus: baseline.status, baselineExecution: baseline.execution }, null, 2));
if (baseline.status !== "completed" || baseline.evidence.length !== 0) {
  throw new Error(`Expected a clean baseline, got ${baseline.status} with ${baseline.evidence.length} findings.`);
}

let injected;
try {
  await fs.writeFile(sourcePath, injectedSource, "utf8");
  injected = await adapter.run(workspace);
} finally {
  await fs.writeFile(sourcePath, safeSource, "utf8");
}

const finding = injected.evidence.find((item) => item.code?.endsWith("hardcoded-api-secret"));
if (
  injected.status !== "completed" ||
  injected.evidence.length !== 1 ||
  !finding?.code?.endsWith("hardcoded-api-secret") ||
  finding?.filePath !== "packages/api/src/credentials.js" ||
  finding.lineStart !== 1 ||
  finding.severity !== "high"
) {
  throw new Error(`Injected secret was not identified at the expected nested file and line: ${JSON.stringify(injected.evidence)}`);
}

const restored = await adapter.run(workspace);
if (restored.status !== "completed" || restored.evidence.length !== 0) {
  throw new Error(`Restored source still produced findings: ${JSON.stringify(restored.evidence)}`);
}

console.log(JSON.stringify({
  nestedConfig: path.relative(workspace, configPath).replaceAll("\\", "/"),
  baseline: { status: baseline.status, findings: baseline.evidence.length },
  injectedSource: injectedSource.trim(),
  injected: {
    status: injected.status,
    findings: injected.evidence.map(({ code, filePath, lineStart, message, severity }) => ({ code, filePath, lineStart, message, severity })),
  },
  restoredSource: (await fs.readFile(sourcePath, "utf8")).trim(),
  restored: { status: restored.status, findings: restored.evidence.length },
  command: injected.command,
  rawExecution: injected.execution,
}, null, 2));
