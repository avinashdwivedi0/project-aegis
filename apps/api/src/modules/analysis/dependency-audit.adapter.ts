import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "path";
import fg from "fast-glob";

import { ContainerRunnerService } from "./container-runner.service";
import {
  createCompletionEvidence,
  type ToolAdapter,
  type ToolAdapterResult,
  type ToolEvidence,
} from "./tool-adapter.types";

type AuditVulnerability = {
  name?: string;
  module_name?: string;
  severity?: string;
  title?: string;
  url?: string;
  via?: Array<string | { title?: string; url?: string; source?: number; severity?: string; range?: string }>;
  fixAvailable?: boolean | { version?: string };
};

type AuditReport = {
  vulnerabilities?: Record<string, AuditVulnerability>;
  advisories?: Record<string, AuditVulnerability>;
};

export class DependencyAuditAdapter implements ToolAdapter {
  readonly name = "dependency-audit";
  readonly version = "npm-audit";

  async canRun(workspace: string) {
    return (await this.lockfileDirectories(workspace)).length > 0;
  }

  async run(
    workspace: string,
    signal?: AbortSignal,
  ): Promise<ToolAdapterResult> {
    const lockfileDirectories = await this.lockfileDirectories(workspace);
    if (!lockfileDirectories.length) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        command: [],
        evidence: [],
        skippedReason: "No supported dependency lockfile was found.",
      };
    }

    const executions = [];
    const evidence: ToolEvidence[] = [];
    for (const item of lockfileDirectories) {
      const command = item.packageManager === "pnpm" ? "pnpm" : "npm";
      const args = item.packageManager === "pnpm"
        ? ["--dir", item.directory || ".", "audit", "--json"]
        : ["audit", "--prefix", path.posix.join("/workspace", item.directory), "--json"];
      const execution = await ContainerRunnerService.run({ command, args, workspace, signal });
      executions.push({ ...execution, directory: item.directory, packageManager: item.packageManager });
      evidence.push(...await this.parseOutput(execution.stdout, path.join(workspace, item.directory, item.packageManager === "pnpm" ? "pnpm-lock.yaml" : "package-lock.json"), item.directory).then((findings) => findings.map((finding) => ({
        ...finding,
        packageName: [item.directory, finding.packageName].filter(Boolean).join(":"),
      }))));
      if (signal?.aborted) break;
    }
    const failedExecution = executions.find(({ status }) => status !== "COMPLETED");
    const execution = {
      command: executions[0]?.command ?? "npm",
      args: [],
      status: failedExecution ? failedExecution.status : "COMPLETED",
      exitCode: failedExecution?.exitCode ?? 0,
      stdout: executions.map(({ directory, stdout }) => `[${directory || "."}]\n${stdout}`).join("\n"),
      stderr: executions.map(({ directory, stderr }) => stderr ? `[${directory || "."}]\n${stderr}` : "").filter(Boolean).join("\n"),
      durationMs: executions.reduce((total, item) => total + item.durationMs, 0),
    };
    const reportParsed = executions.length > 0 && executions.every(({ stdout }) => this.hasAuditReport(stdout));
    if (reportParsed && evidence.length === 0) {
      evidence.push(createCompletionEvidence(
        this.name,
        this.version,
        "Dependency audit completed with no known vulnerabilities reported.",
      ));
    }

    return {
      tool: this.name,
      toolVersion: this.version,
      status: reportParsed ? "completed" : "failed",
      checkStatus: !reportParsed ? "FAILED" : evidence.some((item) => item.filePath && item.lineStart) ? "FINDINGS" : "PASSED",
      projectsScanned: executions.length,
      failureReason: reportParsed ? undefined : execution.stderr || "Dependency audit did not return a parseable vulnerability report.",
      command: ["dependency-audit", ...execution.args],
      execution,
      evidence,
    };
  }

  private async lockfileDirectories(workspace: string) {
    const lockfiles = await fg(["**/pnpm-lock.yaml", "**/package-lock.json"], {
      cwd: workspace,
      onlyFiles: true,
      ignore: ["**/.git/**", "**/node_modules/**", "**/vendor/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/.venv/**"],
      suppressErrors: true,
    });
    const managersByDirectory = new Map<string, "pnpm" | "npm">();
    for (const lockfile of lockfiles.sort()) {
      const directory = path.posix.dirname(lockfile) === "." ? "" : path.posix.dirname(lockfile);
      const packageManager = path.posix.basename(lockfile) === "pnpm-lock.yaml" ? "pnpm" : "npm";
      const current = managersByDirectory.get(directory);
      if (!current || packageManager === "pnpm") managersByDirectory.set(directory, packageManager);
    }
    return [...managersByDirectory.entries()].map(([directory, packageManager]) => ({ directory, packageManager }));
  }

  private async parseOutput(output: string, lockfilePath: string, directory: string): Promise<ToolEvidence[]> {
    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start < 0 || end < start) {
      return [];
    }

    let report: AuditReport;
    try {
      report = JSON.parse(output.slice(start, end + 1)) as AuditReport;
    } catch {
      return [];
    }

    const vulnerabilities = report.vulnerabilities ??
      report.advisories ?? {};
    let lockfileLines: string[] = [];
    try { lockfileLines = (await fs.readFile(lockfilePath, "utf8")).split(/\r?\n/); } catch { /* A missing lockfile will be surfaced as a location-less audit result. */ }
    return Object.entries(vulnerabilities).map(([packageName, vulnerability]) => {
      const name = vulnerability.name ?? vulnerability.module_name ?? packageName;
      const advisory = vulnerability.via?.find((item) => typeof item !== "string") as Exclude<NonNullable<AuditVulnerability["via"]>[number], string> | undefined;
      const needle = packageName.replace(/^@/, "").replaceAll("/", "+");
      const lineIndex = lockfileLines.findIndex((line) => line.includes(needle) || line.includes(name));
      return {
        id: crypto.randomUUID(),
        tool: this.name,
        toolVersion: this.version,
        status: "failed" as const,
        message: `${advisory?.title ?? vulnerability.title ?? `Vulnerable dependency ${name}`}. ${typeof vulnerability.fixAvailable === "object" && vulnerability.fixAvailable.version ? `Fixed version: ${vulnerability.fixAvailable.version}.` : advisory?.range?.startsWith("<") ? `Patched version: ${advisory.range.slice(1)} (advisory affected range ${advisory.range}; npm reports no automatic fix).` : "npm did not provide a fixed version."}`,
        severity: this.normalizeSeverity(vulnerability.severity),
        packageName: name,
        code: advisory?.url ?? vulnerability.url ?? (advisory?.source ? `GHSA:${advisory.source}` : undefined),
        filePath: lineIndex >= 0 ? path.posix.join(directory, path.basename(lockfilePath)) : undefined,
        lineStart: lineIndex >= 0 ? lineIndex + 1 : undefined,
      };
    });
  }

  private hasAuditReport(output: string) {
    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start < 0 || end < start) return false;
    try {
      const report = JSON.parse(output.slice(start, end + 1)) as AuditReport;
      return Boolean(report.vulnerabilities || report.advisories);
    } catch {
      return false;
    }
  }

  private normalizeSeverity(
    severity?: string,
  ): ToolEvidence["severity"] {
    if (
      severity === "critical" ||
      severity === "high" ||
      severity === "moderate" ||
      severity === "low"
    ) {
      return severity;
    }
    return "info";
  }
}
