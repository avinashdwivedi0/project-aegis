import crypto from "node:crypto";
import fs from "fs/promises";
import path from "path";

import { ContainerRunnerService } from "./container-runner.service";
import type {
  ToolAdapter,
  ToolAdapterResult,
  ToolEvidence,
} from "./tool-adapter.types";

const CONFIG_FILES = [
  ".semgrep.yml",
  ".semgrep.yaml",
  "semgrep.yml",
  "semgrep.yaml",
];

type SemgrepResult = {
  check_id?: string;
  path?: string;
  start?: { line?: number; col?: number };
  extra?: {
    message?: string;
    severity?: string;
  };
};

export class SecurityScanAdapter implements ToolAdapter {
  readonly name = "security-scan";
  readonly version = "semgrep";

  async canRun(workspace: string) {
    for (const file of CONFIG_FILES) {
      try {
        await fs.access(path.join(workspace, file));
        return true;
      } catch {
        // Continue checking supported Semgrep config names.
      }
    }

    return false;
  }

  async run(
    workspace: string,
    signal?: AbortSignal,
  ): Promise<ToolAdapterResult> {
    if (!(await this.canRun(workspace))) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        command: [],
        evidence: [],
        skippedReason: "No Semgrep configuration was found.",
      };
    }

    const command = ["semgrep", "--json", "--config", ".", "."];
    const execution = await ContainerRunnerService.run({
      command: "semgrep",
      args: command.slice(1),
      workspace,
      image: "semgrep/semgrep:latest",
      signal,
    });
    const evidence = this.parseOutput(
      execution.stdout,
      workspace,
    );
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

  private parseOutput(
    output: string,
    workspace: string,
  ): ToolEvidence[] {
    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start < 0 || end < start) {
      return [];
    }

    let results: SemgrepResult[];
    try {
      const report = JSON.parse(output.slice(start, end + 1)) as {
        results?: SemgrepResult[];
      };
      results = report.results ?? [];
    } catch {
      return [];
    }

    return results.map((result) => ({
      id: crypto.randomUUID(),
      tool: this.name,
      toolVersion: this.version,
      status: "failed",
      message: result.extra?.message ?? "Security issue detected.",
      severity: this.normalizeSeverity(result.extra?.severity),
      filePath: result.path
        ? path.relative(workspace, result.path)
        : undefined,
      lineStart: result.start?.line,
      columnStart: result.start?.col,
      code: result.check_id,
    }));
  }

  private normalizeSeverity(
    severity?: string,
  ): ToolEvidence["severity"] {
    const normalized = severity?.toLowerCase();
    if (
      normalized === "critical" ||
      normalized === "high" ||
      normalized === "moderate" ||
      normalized === "low"
    ) {
      return normalized;
    }
    return "info";
  }
}
