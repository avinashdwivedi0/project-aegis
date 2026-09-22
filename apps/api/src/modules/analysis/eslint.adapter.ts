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
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  ".eslintrc",
  ".eslintrc.json",
  ".eslintrc.js",
  ".eslintrc.cjs",
];

type EslintMessage = {
  ruleId?: string | null;
  severity: number;
  message: string;
  line?: number;
  column?: number;
};

type EslintFileResult = {
  filePath: string;
  messages: EslintMessage[];
};

export class EslintAdapter implements ToolAdapter {
  readonly name = "eslint";
  readonly version = "10.x";

  async canRun(workspace: string) {
    for (const file of CONFIG_FILES) {
      try {
        await fs.access(path.join(workspace, file));
        return true;
      } catch {
        // Continue checking supported config names.
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
        skippedReason: "No ESLint configuration was found.",
      };
    }

    const command = ["pnpm", "exec", "eslint", ".", "--format", "json"];
    const execution = await ContainerRunnerService.run({
      command: "pnpm",
      args: command.slice(1),
      workspace,
      signal,
    });

    return {
      tool: this.name,
      toolVersion: this.version,
      status: execution.status === "COMPLETED"
        ? "completed"
        : "failed",
      command,
      execution,
      evidence: this.parseOutput(
        execution.stdout,
        workspace,
      ),
    };
  }

  private parseOutput(
    output: string,
    workspace: string,
  ): ToolEvidence[] {
    const start = output.indexOf("[");
    const end = output.lastIndexOf("]");

    if (start < 0 || end < start) {
      return [];
    }

    let files: EslintFileResult[];
    try {
      files = JSON.parse(output.slice(start, end + 1)) as EslintFileResult[];
    } catch {
      return [];
    }

    return files.flatMap((file) =>
      file.messages.map((message) => ({
        id: crypto.randomUUID(),
        tool: this.name,
        toolVersion: this.version,
        status: message.severity > 0 ? "failed" : "completed",
        message: message.message,
        filePath: path.relative(workspace, file.filePath),
        lineStart: message.line,
        columnStart: message.column,
        code: message.ruleId ?? undefined,
      })),
    );
  }
}
