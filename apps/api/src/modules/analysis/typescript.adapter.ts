import crypto from "node:crypto";
import fs from "fs/promises";
import path from "path";

import { ContainerRunnerService } from "./container-runner.service";
import type {
  ToolAdapter,
  ToolAdapterResult,
  ToolEvidence,
} from "./tool-adapter.types";

const DIAGNOSTIC_PATTERN = /^(.*)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.*)$/;

export class TypeScriptAdapter implements ToolAdapter {
  readonly name = "typescript";
  readonly version = "5.x";

  async canRun(workspace: string) {
    try {
      await fs.access(path.join(workspace, "tsconfig.json"));
      return true;
    } catch {
      return false;
    }
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
        skippedReason: "No tsconfig.json was found.",
      };
    }

    const command = ["pnpm", "exec", "tsc", "--noEmit"];
    const execution = await ContainerRunnerService.run({
      command: "pnpm",
      args: command.slice(1),
      workspace,
      signal,
    });
    const evidence = this.parseOutput(
      execution.stdout + execution.stderr,
    );

    return {
      tool: this.name,
      toolVersion: this.version,
      status: execution.status === "COMPLETED"
        ? "completed"
        : "failed",
      command,
      execution,
      evidence,
    };
  }

  private parseOutput(output: string): ToolEvidence[] {
    return output
      .split(/\r?\n/)
      .map((line) => line.match(DIAGNOSTIC_PATTERN))
      .filter((match): match is RegExpMatchArray => match !== null)
      .map((match) => ({
        id: crypto.randomUUID(),
        tool: this.name,
        toolVersion: this.version,
        status: "failed",
        message: match[6],
        filePath: match[1],
        lineStart: Number(match[2]),
        columnStart: Number(match[3]),
        code: match[5],
      }));
  }
}
