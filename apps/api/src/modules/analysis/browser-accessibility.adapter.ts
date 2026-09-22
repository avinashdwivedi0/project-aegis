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
  "playwright.config.ts",
  "playwright.config.js",
  "playwright.config.mjs",
  "playwright.config.cjs",
];

export class BrowserAccessibilityAdapter implements ToolAdapter {
  readonly name = "browser-accessibility";
  readonly version = "playwright";

  async canRun(workspace: string) {
    for (const file of CONFIG_FILES) {
      try {
        await fs.access(path.join(workspace, file));
        return true;
      } catch {
        // Continue checking supported Playwright config names.
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
        skippedReason: "No Playwright configuration was found.",
      };
    }

    const command = ["pnpm", "exec", "playwright", "test"];
    const execution = await ContainerRunnerService.run({
      command: "pnpm",
      args: command.slice(1),
      workspace,
      signal,
    });
    const output = `${execution.stdout}\n${execution.stderr}`.trim();
    const evidence: ToolEvidence[] = execution.status === "COMPLETED"
      ? []
      : [{
          id: crypto.randomUUID(),
          tool: this.name,
          toolVersion: this.version,
          status: "failed",
          message: output || "Browser or accessibility tests failed.",
          code: `exit:${execution.exitCode ?? "unknown"}`,
        }];

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
}
