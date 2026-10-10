import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { ContainerRunnerService } from "./container-runner.service";
import { projectDiscoveryService } from "./project-discovery.service";
import {
  createCompletionEvidence,
  type ToolAdapter,
  type ToolAdapterResult,
  type ToolEvidence,
} from "./tool-adapter.types";

const DIAGNOSTIC_PATTERN = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.*)$/;

export class TypeScriptAdapter implements ToolAdapter {
  readonly name = "typescript";
  readonly version = "5.x";

  async canRun(workspace: string): Promise<boolean> {
    return (await this.findProjects(workspace)).length > 0;
  }

  async run(workspace: string, signal?: AbortSignal): Promise<ToolAdapterResult> {
    const projects = await this.findProjects(workspace);
    if (projects.length === 0) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        checkStatus: "SKIPPED",
        projectsScanned: 0,
        command: [],
        evidence: [],
        skippedReason: "No tsconfig.json files were found.",
      };
    }

    const evidence: ToolEvidence[] = [];
    const executions: Array<{
      config: string;
      command: "node" | "pnpm";
      args: string[];
      status: "COMPLETED" | "FAILED" | "TIMED_OUT" | "CANCELLED";
      exitCode: number | null;
      stdout: string;
      stderr: string;
      durationMs: number;
      diagnostics: number;
    }> = [];

    for (const project of projects) {
      const config = path.posix.join(project.relativeRoot === "." ? "" : project.relativeRoot, "tsconfig.json");
      const localTsc = await this.findLocalTsc(workspace, project.root);
      const command = localTsc ? "node" as const : "pnpm" as const;
      const args = localTsc
        ? [localTsc.containerPath, "--noEmit", "--project", path.posix.join("/workspace", config)]
        : ["--dir", path.posix.join("/workspace", project.relativeRoot === "." ? "" : project.relativeRoot), "exec", "tsc", "--noEmit", "--project", path.posix.join("/workspace", config)];
      try {
        const execution = await ContainerRunnerService.run({
          command,
          args,
          workspace,
          readonlyMounts: localTsc
            ? [localTsc.mount, ...await this.findPnpmStoreMount(workspace, project.root)]
            : undefined,
          signal,
        });
        const diagnostics = this.parseOutput(execution.stdout + execution.stderr, workspace);
        evidence.push(...diagnostics);
        if (execution.status === "COMPLETED" && diagnostics.length === 0) {
          evidence.push(createCompletionEvidence(this.name, this.version, `tsc --noEmit passed for ${config}.`));
        }
        executions.push({
          config,
          command,
          args,
          status: execution.status,
          exitCode: execution.exitCode,
          stdout: execution.stdout,
          stderr: execution.stderr,
          durationMs: execution.durationMs,
          diagnostics: diagnostics.length,
        });
      } catch (error) {
        executions.push({
          config,
          command,
          args,
          status: "FAILED",
          exitCode: null,
          stdout: "",
          stderr: error instanceof Error ? error.message : String(error),
          durationMs: 0,
          diagnostics: 0,
        });
      }
      if (signal?.aborted) break;
    }

    const diagnosticCount = evidence.filter((item) => item.filePath && item.lineStart).length;
    const failedExecution = executions.find((item) => item.status !== "COMPLETED" && item.diagnostics === 0);
    const executionStatus: "COMPLETED" | "FAILED" = executions.every((item) => item.status === "COMPLETED") ? "COMPLETED" : "FAILED";
    const execution = {
      command: executions[0]?.command ?? "pnpm" as const,
      args: executions.flatMap((item) => item.args),
      status: executionStatus,
      exitCode: executionStatus === "COMPLETED" ? 0 : (failedExecution?.exitCode ?? 2),
      stdout: executions.map(({ config, stdout }) => `[${config}]\n${stdout}`).join("\n"),
      stderr: executions.map(({ config, stderr }) => stderr ? `[${config}]\n${stderr}` : "").filter(Boolean).join("\n"),
      durationMs: executions.reduce((total, item) => total + item.durationMs, 0),
    };
    const hasDiagnostics = diagnosticCount > 0;
    const failed = executions.some((item) => item.status !== "COMPLETED" && item.diagnostics === 0);

    return {
      tool: this.name,
      toolVersion: this.version,
      status: failed ? "failed" : "completed",
      checkStatus: failed ? "FAILED" : hasDiagnostics ? "FINDINGS" : "PASSED",
      projectsScanned: executions.length,
      failureReason: failed ? execution.stderr || execution.stdout || "TypeScript compiler was unavailable or failed without diagnostics." : undefined,
      command: [...new Set(executions.map((item) => item.command)), "tsc", "--noEmit", "--project", ...projects.map(({ relativeRoot }) => path.posix.join(relativeRoot, "tsconfig.json"))],
      execution,
      evidence,
    };
  }

  private async findProjects(workspace: string) {
    const projects = await projectDiscoveryService.discover(workspace);
    return projects.filter((project) => project.markers.includes("tsconfig.json"));
  }

  private async findLocalTsc(workspace: string, projectRoot: string): Promise<{ containerPath: string; mount: { hostPath: string; containerPath: string } } | undefined> {
    const candidates: string[] = [];
    let current = path.resolve(projectRoot);
    const boundary = path.parse(current).root;
    const workspacePath = path.resolve(workspace);
    let searchParentPackage = !(await this.fileExists(path.join(workspacePath, "package.json")));
    while (true) {
      candidates.push(path.join(current, "node_modules", "typescript", "bin", "tsc"));
      if (current === boundary) break;
      const parent = path.dirname(current);
      if (current === workspacePath && !searchParentPackage) break;
      current = parent;
      if (searchParentPackage && current !== workspacePath && await this.fileExists(path.join(current, "package.json"))) {
        candidates.push(path.join(current, "node_modules", "typescript", "bin", "tsc"));
        break;
      }
    }
    candidates.push(path.join(workspace, "node_modules", "typescript", "bin", "tsc"));
    for (const candidate of [...new Set(candidates)]) {
      try {
        const resolved = await fs.realpath(candidate);
        const packageRoot = path.dirname(path.dirname(resolved));
        return {
          containerPath: "/aegis-tools/typescript/bin/tsc",
          mount: { hostPath: packageRoot, containerPath: "/aegis-tools/typescript" },
        };
      } catch {
        // If TypeScript is not installed locally, attempt the package manager and report its actual error.
      }
    }
    return undefined;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async findPnpmStoreMount(workspace: string, projectRoot: string): Promise<Array<{ hostPath: string; containerPath: string }>> {
    let current = path.resolve(projectRoot);
    const boundary = path.parse(current).root;
    while (true) {
      const candidate = path.join(current, "node_modules");
      try {
        await fs.access(path.join(candidate, ".pnpm"));
        return [{ hostPath: candidate, containerPath: "/node_modules" }];
      } catch {
        if (current === boundary) break;
        current = path.dirname(current);
      }
    }
    if (path.resolve(workspace) !== path.resolve(projectRoot)) return this.findPnpmStoreMount(workspace, workspace);
    return [];
  }

  private parseOutput(output: string, workspace: string): ToolEvidence[] {
    return output.split(/\r?\n/).flatMap((line) => {
      const match = line.match(DIAGNOSTIC_PATTERN);
      if (!match) return [];
      const rawPath = match[1].replaceAll("\\", "/");
      const filePath = rawPath.startsWith("/workspace/")
        ? rawPath.slice("/workspace/".length)
        : path.isAbsolute(rawPath)
          ? path.relative(workspace, rawPath).replaceAll("\\", "/")
          : rawPath.replace(/^\.\//, "");
      return [{
        id: crypto.randomUUID(),
        tool: this.name,
        toolVersion: this.version,
        status: "failed" as const,
        severity: match[4] === "error" ? "high" as const : "moderate" as const,
        message: match[6],
        filePath,
        lineStart: Number(match[2]),
        columnStart: Number(match[3]),
        code: match[5],
      }];
    });
  }
}
