import crypto from "node:crypto";
import fs from "fs/promises";
import path from "path";

import { ContainerRunnerService } from "./container-runner.service";
import type {
  ToolAdapter,
  ToolAdapterResult,
  ToolEvidence,
} from "./tool-adapter.types";

type PackageManifest = {
  scripts?: {
    test?: string;
  };
};

export class TestRunnerAdapter implements ToolAdapter {
  readonly name = "test-runner";
  readonly version = "package-script";

  async canRun(workspace: string) {
    const manifest = await this.readManifest(workspace);
    return Boolean(manifest?.scripts?.test);
  }

  async run(
    workspace: string,
    signal?: AbortSignal,
  ): Promise<ToolAdapterResult> {
    const manifest = await this.readManifest(workspace);
    if (!manifest?.scripts?.test) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        command: [],
        evidence: [],
        skippedReason: "No package.json test script was found.",
      };
    }

    const packageManager = await this.findPackageManager(workspace);
    const command = packageManager === "npm"
      ? ["npm", "test"]
      : ["pnpm", "test"];
    const execution = await ContainerRunnerService.run({
      command: packageManager,
      args: ["test"],
      workspace,
      signal,
    });
    const output = `${execution.stdout}\n${execution.stderr}`.trim();
    const evidence = execution.status === "COMPLETED"
      ? []
      : [{
          id: crypto.randomUUID(),
          tool: this.name,
          toolVersion: this.version,
          status: "failed" as const,
          message: output || "Test command failed without output.",
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

  private async readManifest(
    workspace: string,
  ): Promise<PackageManifest | undefined> {
    try {
      const content = await fs.readFile(
        path.join(workspace, "package.json"),
        "utf8",
      );
      return JSON.parse(content) as PackageManifest;
    } catch {
      return undefined;
    }
  }

  private async findPackageManager(
    workspace: string,
  ): Promise<"pnpm" | "npm"> {
    try {
      await fs.access(path.join(workspace, "package-lock.json"));
      return "npm";
    } catch {
      return "pnpm";
    }
  }
}
