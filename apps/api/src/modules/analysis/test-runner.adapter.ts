import crypto from "node:crypto";
import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";

import { ContainerRunnerService } from "./container-runner.service";
import {
  createCompletionEvidence,
  type ToolAdapter,
  type ToolAdapterResult,
  type ToolEvidence,
} from "./tool-adapter.types";

type PackageManifest = {
  scripts?: {
    test?: string;
  };
};

type TestTarget = {
  directory: string;
  packageManager: "npm" | "pnpm" | "node" | "python";
};

export class TestRunnerAdapter implements ToolAdapter {
  readonly name = "test-runner";
  readonly version = "package-script";

  async canRun(workspace: string) {
    return (await this.findTestTargets(workspace)).length > 0;
  }

  async run(
    workspace: string,
    signal?: AbortSignal,
  ): Promise<ToolAdapterResult> {
    const targets = await this.findTestTargets(workspace);
    if (targets.length === 0) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        command: [],
        evidence: [],
        skippedReason: "No package test script or Node test files were found.",
      };
    }

    const executions = [];
    const evidence: ToolEvidence[] = [];
    for (const target of targets) {
      const args = target.packageManager === "npm"
        ? ["--prefix", path.posix.join("/workspace", target.directory), "test"]
        : target.packageManager === "node"
          ? ["--test"]
          : target.packageManager === "python"
            ? ["-B", "-m", "unittest", "discover", "-v"]
          : ["--dir", target.directory || ".", "test"];
      const execution = await ContainerRunnerService.run({
        command: target.packageManager === "python" ? "python" : target.packageManager,
        args,
        workspace,
        ...(target.packageManager === "python" ? { image: "python:3.12-alpine" } : {}),
        signal,
      });
      executions.push({ ...execution, directory: target.directory });
      const packageName = target.directory || "root";
      if (execution.status === "COMPLETED") {
        evidence.push(createCompletionEvidence(
          this.name,
          this.version,
          `Tests in ${packageName} completed successfully.`,
        ));
      } else {
        const output = `${execution.stdout}\n${execution.stderr}`.trim();
        evidence.push({
          id: crypto.randomUUID(),
          tool: this.name,
          toolVersion: this.version,
          status: "failed",
          message: `${packageName}: ${output || "Test command failed without output."}`,
          code: `exit:${execution.exitCode ?? "unknown"}`,
        });
      }
      if (signal?.aborted) break;
    }

    const failedExecution = executions.find(({ status }) => status !== "COMPLETED");
    const packageNames = executions.map(({ directory }) => directory || "root");
    const command: string[] = ["test", ...packageNames];
    const execution = {
      command: executions[0]?.command ?? "pnpm",
      args: command,
      status: failedExecution ? failedExecution.status : "COMPLETED",
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

  private async findTestTargets(workspace: string): Promise<TestTarget[]> {
    const ignore = [
      "**/.git/**",
      "**/node_modules/**",
      "**/vendor/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.venv/**",
      "**/results/**",
    ];
    const manifestPaths = await fg("**/package.json", {
      cwd: workspace,
      onlyFiles: true,
      ignore,
      suppressErrors: true,
    });
    const targets: TestTarget[] = [];
    for (const manifestPath of manifestPaths.sort()) {
      try {
        const content = await fs.readFile(path.join(workspace, manifestPath), "utf8");
        const manifest = JSON.parse(content) as PackageManifest;
        if (!manifest.scripts?.test) continue;
        const directory = path.posix.dirname(manifestPath) === "."
          ? ""
          : path.posix.dirname(manifestPath);
        const packageManager = await this.findPackageManager(workspace, directory);
        targets.push({ directory, packageManager });
      } catch {
        // Ignore malformed manifests and continue discovering runnable packages.
      }
    }

    const pythonTests = await fg(["**/test_*.py", "**/*_test.py"], {
      cwd: workspace,
      onlyFiles: true,
      ignore,
      suppressErrors: true,
    });
    const pythonTarget: TestTarget[] = pythonTests.length > 0
      ? [{ directory: "", packageManager: "python" }]
      : [];

    if (targets.length > 0) {
      // A root workspace test script usually delegates to its packages already.
      const jsTargets = targets.some(({ directory }) => directory === "")
        ? targets.filter(({ directory }) => directory === "")
        : targets;
      return [...jsTargets, ...pythonTarget];
    }
    if (pythonTarget.length > 0) return pythonTarget;

    const nodeTests = await fg(
      ["**/*.test.js", "**/*.test.cjs", "**/*.test.mjs", "**/*.spec.js", "**/*.spec.cjs", "**/*.spec.mjs"],
      { cwd: workspace, onlyFiles: true, ignore, suppressErrors: true },
    );
    return nodeTests.length > 0 ? [{ directory: "", packageManager: "node" }] : [];
  }

  private async findPackageManager(
    workspace: string,
    directory: string,
  ): Promise<"pnpm" | "npm"> {
    for (const candidate of [
      path.join(workspace, directory, "package-lock.json"),
      path.join(workspace, "package-lock.json"),
    ]) {
      try {
        await fs.access(candidate);
        return "npm";
      } catch {
        // Try the next lockfile location.
      }
    }
    return "pnpm";
  }
}
