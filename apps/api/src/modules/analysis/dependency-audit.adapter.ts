import crypto from "node:crypto";
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
      evidence.push(...this.parseOutput(execution.stdout).map((finding) => ({
        ...finding,
        packageName: [item.directory, finding.packageName].filter(Boolean).join(":"),
      })));
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

  private parseOutput(output: string): ToolEvidence[] {
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
    return Object.entries(vulnerabilities).map(([packageName, vulnerability]) => ({
      id: crypto.randomUUID(),
      tool: this.name,
      toolVersion: this.version,
      status: "failed",
      message: vulnerability.title ?? "Dependency vulnerability detected.",
      severity: this.normalizeSeverity(vulnerability.severity),
      packageName: vulnerability.name ?? vulnerability.module_name ?? packageName,
      code: vulnerability.url,
    }));
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
