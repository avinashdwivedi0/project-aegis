import { execFile } from "node:child_process";
import { execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  RUN_MODES,
  runModeSelectionService,
  type GeneratedTestDescriptor,
  type RunMode,
} from "../src/modules/autonomous-testing/run-modes/run-mode-selection.service.js";

const execFileAsync = promisify(execFile);
const repository = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const mode = (process.argv[3] ?? "system") as RunMode;
if (!RUN_MODES.includes(mode)) throw new Error(`Unsupported run mode: ${mode}`);
const latestCommitFiles = execFileSync("git", ["-C", repository, "show", "--pretty=format:", "--name-only", "HEAD"], { encoding: "utf8" });
const changedFiles = (process.argv[4] ?? latestCommitFiles)
  .split(",").map((file) => file.trim()).filter(Boolean);
const apiUrl = process.argv[5] ?? "http://host.docker.internal:3106";
const frontendUrl = process.argv[6] ?? "http://host.docker.internal:3107";
const dashboardUrl = process.argv[7] ?? "http://host.docker.internal:3108";

type RegisteredCheck = GeneratedTestDescriptor & { script: string; args: string[] };
const inventory: RegisteredCheck[] = [
  { id: "unit-password", type: "unit", sourceFiles: ["backend/index.js"], tags: ["critical"], previousStatus: "passed", script: "phase1-unit-run.ts", args: [repository] },
  { id: "unit-components", type: "unit", sourceFiles: ["dashboard/src/components/Hero.js"], tags: ["critical"], previousStatus: "passed", script: "phase1-exported-component-run.ts", args: [repository] },
  { id: "integration-signup-login", type: "integration", sourceFiles: ["backend/index.js"], tags: ["critical"], previousStatus: "passed", script: "phase2-integration-run.ts", args: [repository, apiUrl] },
  { id: "integration-new-order", type: "integration", sourceFiles: ["backend/index.js"], tags: ["critical"], previousStatus: "passed", script: "phase2-order-integration-run.ts", args: [repository, apiUrl, "mongodb://host.docker.internal:27017/project_aegis_phase7"] },
  { id: "blackbox-signup-login", type: "black-box", sourceFiles: ["frontend/src/landing_page/signup/Signup.js"], tags: ["critical"], previousStatus: "passed", script: "phase3-black-box-run.ts", args: [repository, frontendUrl, dashboardUrl] },
  { id: "compatibility-chromium-webkit", type: "compatibility", sourceFiles: ["frontend/src/landing_page/signup/Signup.js"], tags: ["critical"], previousStatus: "passed", script: "phase5-browser-matrix-control.ts", args: [repository, "chromium,webkit", "desktop,mobile", "120000"] },
  { id: "security-nested-config", type: "security", sourceFiles: ["*"], tags: [], previousStatus: "passed", script: "phase6-security-repro.ts", args: [] },
];

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const report = await runModeSelectionService.execute(
  mode,
  inventory,
  changedFiles,
  1,
  async (descriptor) => {
    const registered = inventory.find(({ id }) => id === descriptor.id);
    if (!registered) throw new Error(`No runner registered for ${descriptor.id}.`);
    const { stdout, stderr } = await execFileAsync(
      pnpmCommand,
      ["exec", "tsx", `scripts/${registered.script}`, ...registered.args],
      { cwd: process.cwd(), timeout: 360_000, maxBuffer: 12 * 1024 * 1024, windowsHide: true, shell: process.platform === "win32" },
    );
    const lines = stdout.trim().split(/\r?\n/);
    return [...lines.slice(-8), ...(stderr.trim() ? [`stderr: ${stderr.trim().slice(-1000)}`] : [])].join("\n");
  },
);

const serialized = { repository, mode, changedFiles, selectionReason: report.selection.reason,
  selectedIds: report.selection.selected.map(({ id }) => id),
  results: report.scheduled.map(({ descriptor, status, output, error }) => ({ id: descriptor.id, type: descriptor.type, status, output, error })),
  totals: report.totals,
  acceptance: mode === "acceptance" ? "Use the Testing page Acceptance (UAT) link; this mode intentionally delegates to the existing human requirement workflow." : undefined,
};
const reportDirectory = path.resolve("results/phase7-run-modes");
await mkdir(reportDirectory, { recursive: true });
await writeFile(path.join(reportDirectory, `${mode}-latest.json`), JSON.stringify(serialized, null, 2), "utf8");
console.log(JSON.stringify(serialized, null, 2));

if (report.totals.failed > 0) process.exitCode = 1;
