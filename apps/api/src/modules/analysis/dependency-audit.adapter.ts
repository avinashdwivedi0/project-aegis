import crypto from "node:crypto";
import fs from "fs/promises";
import path from "path";

import { ContainerRunnerService } from "./container-runner.service";
import type {
  ToolAdapter,
  ToolAdapterResult,
  ToolEvidence,
} from "./tool-adapter.types";

type AuditVulnerability = {
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
    try {
      await fs.access(path.join(workspace, "pnpm-lock.yaml"));
      return true;
    } catch {
      try {
        await fs.access(path.join(workspace, "package-lock.json"));
        return true;
      } catch {
        return false;
      }
    }
  }

  async run(
    workspace: string,
    signal?: AbortSignal,
  ): Promise<ToolAdapterResult> {
    const packageManager = await this.packageManager(workspace);

    if (!packageManager) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        command: [],
        evidence: [],
        skippedReason: "No supported dependency lockfile was found.",
      };
    }

    const command = packageManager === "pnpm"
      ? ["pnpm", "audit", "--json"]
      : ["npm", "audit", "--json"];
    const execution = await ContainerRunnerService.run({
      command: packageManager,
      args: command.slice(1),
      workspace,
      signal,
    });
    const evidence = this.parseOutput(execution.stdout);
    const reportParsed = evidence.length > 0 ||
      execution.stdout.trim().startsWith("{");

    return {
      tool: this.name,
      toolVersion: this.version,
      status: reportParsed ? "completed" : "failed",
      command,
      execution,
      evidence,
    };
  }

  private async packageManager(
    workspace: string,
  ): Promise<"pnpm" | "npm" | undefined> {
    try {
      await fs.access(path.join(workspace, "pnpm-lock.yaml"));
      return "pnpm";
    } catch {
      try {
        await fs.access(path.join(workspace, "package-lock.json"));
        return "npm";
      } catch {
        return undefined;
      }
    }
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
      packageName,
      code: vulnerability.url,
    }));
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
