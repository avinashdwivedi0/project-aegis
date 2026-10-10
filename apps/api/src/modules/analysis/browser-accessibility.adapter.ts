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

const CONFIG_FILES = [
  "playwright.config.ts",
  "playwright.config.js",
  "playwright.config.mjs",
  "playwright.config.cjs",
];

export class BrowserAccessibilityAdapter implements ToolAdapter {
  readonly name = "browser-accessibility";
  readonly version = "playwright";

  async canRun(workspace: string) {
    return (await this.findConfigDirectories(workspace)).length > 0;
  }

  async run(
    workspace: string,
    signal?: AbortSignal,
  ): Promise<ToolAdapterResult> {
    const directories = await this.findConfigDirectories(workspace);
    if (directories.length === 0) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        command: [],
        evidence: [],
        skippedReason: "No Playwright configuration was found.",
      };
    }

    const executions = [];
    const evidence: ToolEvidence[] = [];
    for (const directory of directories) {
      const args = ["--dir", directory || ".", "exec", "playwright", "test"];
      const execution = await ContainerRunnerService.run({
        command: "pnpm",
        args,
        workspace,
        signal,
      });
      executions.push({ ...execution, directory });
      if (execution.status === "COMPLETED") {
        evidence.push(createCompletionEvidence(
          this.name,
          this.version,
          `Playwright completed successfully in ${directory || "the repository root"}.`,
        ));
      } else {
        const output = `${execution.stdout}\n${execution.stderr}`.trim();
        evidence.push({
          id: crypto.randomUUID(),
          tool: this.name,
          toolVersion: this.version,
          status: "failed",
          message: `${directory || "root"}: ${output || "Browser or accessibility tests failed."}`,
          code: `exit:${execution.exitCode ?? "unknown"}`,
        });
      }
      if (signal?.aborted) break;
    }
    const failedExecution = executions.find(({ status }) => status !== "COMPLETED");
    const command = ["pnpm", "exec", "playwright", "test", ...directories];
    const execution = {
      command: "pnpm" as const,
      args: command.slice(1),
      status: failedExecution ? failedExecution.status : "COMPLETED" as const,
      exitCode: failedExecution?.exitCode ?? 0,
      stdout: executions.map(({ directory, stdout }) => `[${directory || "root"}]\n${stdout}`).join("\n"),
      stderr: executions.map(({ directory, stderr }) => stderr ? `[${directory || "root"}]\n${stderr}` : "").filter(Boolean).join("\n"),
      durationMs: executions.reduce((total, item) => total + item.durationMs, 0),
    };

    return {
      tool: this.name,
      toolVersion: this.version,
      status: failedExecution === undefined
        ? "completed"
        : "failed",
      command,
      execution,
      evidence,
    };
  }

  private async findConfigDirectories(workspace: string): Promise<string[]> {
    const patterns = CONFIG_FILES.flatMap((name) => [name, `**/${name}`]);
    const configs = await fg(patterns, {
      cwd: workspace,
      onlyFiles: true,
      dot: true,
      ignore: [
        "**/.git/**",
        "**/node_modules/**",
        "**/vendor/**",
        "**/dist/**",
        "**/build/**",
        "**/coverage/**",
        "**/results/**",
        "**/.venv/**",
      ],
      suppressErrors: true,
    });
    return [...new Set(configs.map((config) => {
      const directory = path.posix.dirname(config);
      return directory === "." ? "" : directory;
    }))].sort();
  }
}
